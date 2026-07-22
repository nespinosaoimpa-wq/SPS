import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Format minutes into human-readable format:
 * - If less than 60 mins: "26 min"
 * - If 60+ mins: "8h 30m"
 */
function formatHHMM(totalMins: number): string {
  const mins = Math.max(0, Math.round(totalMins))
  if (mins < 60) {
    return `${mins} min`
  }
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/**
 * Calculates exact minute-by-minute breakdown of a shift:
 * - Day minutes (06:00 - 21:00)
 * - Night minutes (21:00 - 06:00)
 */
function calculateShiftBreakdown(checkinIso: string, checkoutIso: string) {
  const checkin = new Date(checkinIso)
  const checkout = new Date(checkoutIso)
  const durationMs = Math.max(0, checkout.getTime() - checkin.getTime())
  const totalMinutes = Math.round(durationMs / 60000)
  const totalHours = parseFloat((totalMinutes / 60).toFixed(2))

  let nightMinutes = 0
  let dayMinutes = 0

  let curr = new Date(checkin.getTime())
  const endMs = checkout.getTime()

  // Iterate minute by minute for 100% exact precision
  while (curr.getTime() < endMs) {
    const hour = curr.getHours() // Local time hour
    if (hour >= 21 || hour < 6) {
      nightMinutes++
    } else {
      dayMinutes++
    }
    curr.setMinutes(curr.getMinutes() + 1)
  }

  return {
    totalMinutes,
    totalHours,
    totalFormatted: formatHHMM(totalMinutes),
    dayMinutes,
    dayHours: parseFloat((dayMinutes / 60).toFixed(2)),
    dayFormatted: formatHHMM(dayMinutes),
    nightMinutes,
    nightHours: parseFloat((nightMinutes / 60).toFixed(2)),
    nightFormatted: formatHHMM(nightMinutes),
  }
}

/**
 * GET /api/payroll?start_date=&end_date=&operator_id=&view=nomina|facturacion
 */
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') ?? searchParams.get('from')
    const endDate = searchParams.get('end_date') ?? searchParams.get('to')
    const operatorId = searchParams.get('operator_id')
    const objectiveIdFilter = searchParams.get('objective_id')

    let query = supabase
      .from('guard_shifts')
      .select(
        `
        *,
        resources!operator_id ( * ),
        objectives!objective_id ( * )
      `
      )
      .order('checkin_time', { ascending: false })

    if (operatorId) query = query.eq('operator_id', operatorId)
    if (objectiveIdFilter) query = query.eq('objective_id', objectiveIdFilter)

    const { data: shifts, error } = await query
    if (error) throw error

    // Determine filter bounds in UTC / local representation
    const filterStartMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0
    const filterEndMs   = endDate   ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity

    // Filter shifts that overlap with the date window
    const filteredShifts = (shifts ?? []).filter((shift: any) => {
      const checkinMs = new Date(shift.checkin_time).getTime()
      const checkoutMs = shift.checkout_time ? new Date(shift.checkout_time).getTime() : Date.now()
      
      // Shift overlaps window if checkin <= filterEnd AND checkout >= filterStart
      return checkinMs <= filterEndMs && checkoutMs >= filterStartMs
    })

    const rows = filteredShifts.map((shift: any) => {
      const isShiftActive = !shift.checkout_time
      const effectiveCheckoutTime = shift.checkout_time || new Date().toISOString()
      const breakdown = calculateShiftBreakdown(shift.checkin_time, effectiveCheckoutTime)

      // Tarifa de nómina (pago al operador)
      const payRate: number = parseFloat(shift.resources?.hourly_pay_rate ?? shift.resources?.salary ?? 3500)
      const payAmount = parseFloat((breakdown.totalHours * payRate).toFixed(2))

      // Tarifa de facturación (cobro al cliente)
      const billingRate: number = parseFloat(shift.objectives?.hourly_billing_rate ?? 4500)
      const billingAmount = parseFloat((breakdown.totalHours * billingRate).toFixed(2))

      return {
        id: shift.id,
        is_active: isShiftActive,
        // Personal
        operator_id: shift.operator_id,
        operator_name: shift.resources?.name ?? 'Operador Desconocido',
        operator_role: shift.resources?.role ?? 'Guardia',
        // Objetivo
        objective_id: shift.objective_id,
        objective_name: shift.objectives?.name ?? 'Puesto General',
        // Tiempos exactos
        checkin_time: shift.checkin_time,
        checkout_time: shift.checkout_time,
        total_minutes: breakdown.totalMinutes,
        total_hours: breakdown.totalHours,
        total_formatted: breakdown.totalFormatted,
        // Desglose de jornada
        day_minutes: breakdown.dayMinutes,
        day_hours: breakdown.dayHours,
        day_formatted: breakdown.dayFormatted,
        night_minutes: breakdown.nightMinutes,
        night_hours: breakdown.nightHours,
        night_formatted: breakdown.nightFormatted,
        // Nómina & Facturación
        hourly_pay_rate: payRate,
        pay_amount: payAmount,
        hourly_billing_rate: billingRate,
        billing_amount: billingAmount,
      }
    })

    // Resumen agrupado por operador (Nómina)
    const nominaByOperator: Record<string, any> = {}
    rows.forEach((r) => {
      if (!nominaByOperator[r.operator_id]) {
        nominaByOperator[r.operator_id] = {
          operator_id: r.operator_id,
          operator_name: r.operator_name,
          operator_role: r.operator_role,
          hourly_pay_rate: r.hourly_pay_rate,
          total_minutes: 0,
          total_hours: 0,
          day_minutes: 0,
          night_minutes: 0,
          total_pay: 0,
          shifts_count: 0,
          shifts_detail: [],
        }
      }
      const op = nominaByOperator[r.operator_id]
      op.total_minutes += r.total_minutes
      op.day_minutes += r.day_minutes
      op.night_minutes += r.night_minutes
      op.total_hours = parseFloat((op.total_minutes / 60).toFixed(2))
      op.total_pay = parseFloat((op.total_pay + r.pay_amount).toFixed(2))
      op.shifts_count++
      op.shifts_detail.push(r)
    })

    const nominaArray = Object.values(nominaByOperator).map((op: any) => ({
      ...op,
      total_formatted: formatHHMM(op.total_minutes),
      day_formatted: formatHHMM(op.day_minutes),
      night_formatted: formatHHMM(op.night_minutes),
    }))

    // Resumen agrupado por objetivo (Facturación)
    const facturacionByObjective: Record<string, any> = {}
    rows.forEach((r) => {
      if (!facturacionByObjective[r.objective_id]) {
        facturacionByObjective[r.objective_id] = {
          objective_id: r.objective_id,
          objective_name: r.objective_name,
          hourly_billing_rate: r.hourly_billing_rate,
          total_minutes: 0,
          total_hours: 0,
          night_minutes: 0,
          total_billing: 0,
          shifts_count: 0,
          operators: new Set<string>(),
          shifts_detail: [],
        }
      }
      const obj = facturacionByObjective[r.objective_id]
      obj.total_minutes += r.total_minutes
      obj.night_minutes += r.night_minutes
      obj.total_hours = parseFloat((obj.total_minutes / 60).toFixed(2))
      obj.total_billing = parseFloat((obj.total_billing + r.billing_amount).toFixed(2))
      obj.shifts_count++
      obj.operators.add(r.operator_name)
      obj.shifts_detail.push(r)
    })

    const facturacionArray = Object.values(facturacionByObjective).map((obj: any) => ({
      ...obj,
      operators: Array.from(obj.operators),
      total_formatted: formatHHMM(obj.total_minutes),
      night_formatted: formatHHMM(obj.night_minutes),
    }))

    const sumMinutes = rows.reduce((s, r) => s + r.total_minutes, 0)
    const sumPay = rows.reduce((s, r) => s + r.pay_amount, 0)
    const sumBilling = rows.reduce((s, r) => s + r.billing_amount, 0)

    return NextResponse.json({
      shifts: rows,
      nomina: nominaArray,
      facturacion: facturacionArray,
      totals: {
        total_minutes: sumMinutes,
        total_hours: parseFloat((sumMinutes / 60).toFixed(2)),
        total_formatted: formatHHMM(sumMinutes),
        total_pay: parseFloat(sumPay.toFixed(2)),
        total_billing: parseFloat(sumBilling.toFixed(2)),
        shifts_count: rows.length,
      },
    })
  } catch (error: any) {
    console.error('[PAYROLL] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
