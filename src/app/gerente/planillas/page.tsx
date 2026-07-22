'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calculator,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Building2,
  Calendar,
  Filter,
  ChevronRight,
  ChevronDown,
  Moon,
  ListFilter,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

type PayrollData = {
  shifts: any[]
  nomina: any[]
  facturacion: any[]
  totals: {
    total_minutes: number
    total_hours: number
    total_formatted: string
    total_pay: number
    total_billing: number
    shifts_count: number
  }
}

export default function PayrollPage() {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'nomina' | 'facturacion' | 'minucioso'>('nomina')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetchPayroll = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      const res = await fetch(`/api/payroll?${params}`)
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP Error ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Error inesperado al cargar planillas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayroll()
  }, [startDate, endDate])

  const exportNomina = () => {
    if (!data) return
    const wsData: any[] = []

    wsData.push({
      'Apellido y Nombre': '=== RESUMEN DE NÓMINA Y LIQUIDACIÓN ===',
      Función: '',
      'Turnos Realizados': '',
      'Duración Exacta (Reloj)': '',
      'Horas Decimales': '',
      'Horas Diurnas': '',
      'Horas Nocturnas': '',
      'Tarifa/Hora': '',
      'Total Haberes': '',
    })

    data.nomina.forEach((r) => {
      wsData.push({
        'Apellido y Nombre': r.operator_name,
        Función: r.operator_role,
        'Turnos Realizados': r.shifts_count,
        'Duración Exacta (Reloj)': r.total_formatted,
        'Horas Decimales': (r.total_hours ?? 0).toFixed(2),
        'Horas Diurnas': r.day_formatted,
        'Horas Nocturnas': r.night_formatted,
        'Tarifa/Hora': `$${(r.hourly_pay_rate ?? 0).toLocaleString('es-AR')}`,
        'Total Haberes': `$${(r.total_pay ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      })
    })

    wsData.push({})
    wsData.push({
      'Apellido y Nombre': '=== DETALLE AUDITADO TURNO POR TURNO ===',
      Función: '',
      'Turnos Realizados': '',
      'Duración Exacta (Reloj)': '',
      'Horas Decimales': '',
      'Horas Diurnas': '',
      'Horas Nocturnas': '',
      'Tarifa/Hora': '',
      'Total Haberes': '',
    })

    data.shifts.forEach((s) => {
      wsData.push({
        'Apellido y Nombre': s.operator_name,
        Función: s.operator_role,
        'Turnos Realizados': s.objective_name,
        'Duración Exacta (Reloj)': `${new Date(s.checkin_time).toLocaleString('es-AR')} a ${new Date(s.checkout_time).toLocaleString('es-AR')}`,
        'Horas Decimales': s.total_formatted,
        'Horas Diurnas': s.day_formatted,
        'Horas Nocturnas': s.night_formatted,
        'Tarifa/Hora': `$${(s.hourly_pay_rate ?? 0).toLocaleString('es-AR')}`,
        'Total Haberes': `$${(s.pay_amount ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      })
    })

    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Liquidación Nómina')
    XLSX.writeFile(wb, `Nomina_704_${startDate}_${endDate}.xlsx`)
  }

  const exportFacturacion = () => {
    if (!data) return
    const ws = XLSX.utils.json_to_sheet(
      data.facturacion.map((r) => ({
        'Puesto de Servicio': r.objective_name,
        'Personal Asignado': r.operators.join(', '),
        'Turnos Cubiertos': r.shifts_count,
        'Duración Exacta (Reloj)': r.total_formatted,
        'Horas Facturables': (r.total_hours ?? 0).toFixed(2),
        'Horas Nocturnas': r.night_formatted,
        'Tarifa/Hora Cliente': `$${(r.hourly_billing_rate ?? 0).toLocaleString('es-AR')}`,
        'Total a Facturar': `$${(r.total_billing ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturación')
    XLSX.writeFile(wb, `Facturacion_704_${startDate}_${endDate}.xlsx`)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white border-t-4 border-red-500 shadow-xl rounded-2xl p-8">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-black text-zinc-900 uppercase mb-2">Error en el Módulo</h2>
          <p className="text-xs text-zinc-500 font-medium mb-6 leading-relaxed">
            {error}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => fetchPayroll()}
              className="h-11 w-full bg-zinc-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-zinc-800 transition-all uppercase tracking-widest"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-3 sm:p-5 lg:p-8 pb-28 font-sans max-w-[1600px] mx-auto w-full overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-13 sm:h-13 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
            <Calculator size={24} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-zinc-950 tracking-tighter uppercase">Cómputo de Haberes</h1>
            <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 mt-0.5 uppercase tracking-[0.15em]">
              Auditoría Minuciosa por Fichaje · Entrada, Salida y Duración Real
            </p>
          </div>
        </div>

        <button
          onClick={activeTab === 'facturacion' ? exportFacturacion : exportNomina}
          disabled={loading || !data}
          className="flex items-center justify-center gap-2 h-10 sm:h-11 px-4 sm:px-5 bg-zinc-900 text-white rounded-xl font-bold text-xs shadow-md hover:bg-zinc-800 transition-all disabled:opacity-40 uppercase tracking-widest shrink-0"
        >
          <FileSpreadsheet size={16} className="text-[#D4AF37]" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* DATE FILTER BAR */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-3 sm:p-4 flex flex-wrap gap-3 sm:gap-4 items-center mb-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <Filter size={14} />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">Período Auditado</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 uppercase"
            />
          </div>
          <span className="text-zinc-300 font-bold text-xs">/</span>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-zinc-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 uppercase"
            />
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          {
            label: 'Horas Trabajadas',
            value: data?.totals?.total_formatted ?? '0 min',
            subvalue: `${data?.totals?.total_hours?.toFixed(2) ?? '0.00'} hs`,
            icon: Clock,
            color: 'text-zinc-900',
            bg: 'bg-zinc-100',
          },
          {
            label: 'Fichajes / Turnos',
            value: `${data?.totals?.shifts_count ?? 0} registros`,
            subvalue: 'Auditoría 100% verificado',
            icon: Users,
            color: 'text-zinc-900',
            bg: 'bg-zinc-100',
          },
          {
            label: 'Nómina a Pagar',
            value: `$${(data?.totals?.total_pay ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
            subvalue: 'Cómputo por operador',
            icon: DollarSign,
            color: 'text-[#D4AF37]',
            bg: 'bg-[#D4AF37]/5',
          },
          {
            label: 'Total a Facturar',
            value: `$${(data?.totals?.total_billing ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
            subvalue: 'Facturación a clientes',
            icon: TrendingUp,
            color: 'text-[#D4AF37]',
            bg: 'bg-[#D4AF37]/5',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 overflow-hidden"
          >
            <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors shrink-0', stat.bg)}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-zinc-950 leading-none truncate text-sm sm:text-base lg:text-lg">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 mt-1 truncate">{stat.subvalue}</p>
              <p className="text-[8px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-wider mt-0.5 truncate">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* VISTAS SELECCIONABLES */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { id: 'nomina', label: 'Resumen por Operador', icon: Users },
          { id: 'minucioso', label: 'Detalle Minucioso de Fichajes', icon: ListFilter },
          { id: 'facturacion', label: 'Facturación por Puesto', icon: Building2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all',
              activeTab === tab.id
                ? 'bg-zinc-900 text-white shadow-md'
                : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800'
            )}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* RESPONSIVE TABLE CONTAINER */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-200 text-[9px] sm:text-[10px] font-black text-zinc-900 uppercase tracking-[0.15em]">
                {activeTab === 'nomina' ? (
                  <>
                    <th className="px-3 sm:px-4 py-3 w-8" />
                    <th className="px-3 sm:px-4 py-3">Apellido y Nombre</th>
                    <th className="px-3 sm:px-4 py-3 text-center">Fichajes</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Duración Acumulada</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Horas Nocturnas</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Tarifa/Hora</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-[#D4AF37]">Total Haberes</th>
                  </>
                ) : activeTab === 'minucioso' ? (
                  <>
                    <th className="px-3 sm:px-4 py-3">Fecha</th>
                    <th className="px-3 sm:px-4 py-3">Operador</th>
                    <th className="px-3 sm:px-4 py-3">Puesto / Objetivo</th>
                    <th className="px-3 sm:px-4 py-3 text-center">Entrada</th>
                    <th className="px-3 sm:px-4 py-3 text-center">Salida</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Duración Exacta</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Nocturnas</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Tarifa/H</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-[#D4AF37]">Subtotal $</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 sm:px-4 py-3">Puesto de Servicio</th>
                    <th className="px-3 sm:px-4 py-3">Personal Asignado</th>
                    <th className="px-3 sm:px-4 py-3 text-center">Turnos</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Duración Acumulada</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Tarifa/Hora</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-[#D4AF37]">Total Facturación</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-[40%]" />
                          <div className="h-2 bg-zinc-100 rounded-full animate-pulse w-[20%]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'nomina' ? (
                (data?.nomina ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      No hay registros en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  (data?.nomina ?? []).map((r) => {
                    const isExpanded = expandedRow === r.operator_id
                    return (
                      <React.Fragment key={r.operator_id}>
                        <tr
                          onClick={() => setExpandedRow(isExpanded ? null : r.operator_id)}
                          className={cn(
                            "hover:bg-zinc-50/80 transition-colors border-b border-zinc-50 cursor-pointer",
                            isExpanded && "bg-amber-500/5"
                          )}
                        >
                          <td className="px-3 sm:px-4 py-3.5 text-zinc-400">
                            {isExpanded ? <ChevronDown size={14} className="text-[#D4AF37]" /> : <ChevronRight size={14} />}
                          </td>
                          <td className="px-3 sm:px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[9px] font-black text-white shrink-0">
                                {r.operator_name?.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-zinc-900 tracking-tight block truncate text-xs sm:text-sm">{r.operator_name}</span>
                                <span className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-wide truncate block">{r.operator_role}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-white border border-zinc-200 text-xs font-black text-zinc-950">
                              {r.shifts_count}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3.5 text-right">
                            <span className="font-mono font-black text-zinc-950 text-xs sm:text-sm block">
                              {r.total_formatted}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 font-mono block">
                              ({(r.total_hours ?? 0).toFixed(2)} hs)
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-[10px]">
                              <Moon size={10} /> {r.night_formatted}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3.5 text-right font-mono text-zinc-600 text-xs">
                            ${(r.hourly_pay_rate ?? 0).toLocaleString('es-AR')}
                          </td>
                          <td className="px-3 sm:px-4 py-3.5 text-right">
                            <span className="font-black text-[#D4AF37] text-xs sm:text-sm lg:text-base font-mono">
                              ${(r.total_pay ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>

                        {/* EXPANDED SHIFT AUDIT DETAILS */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-3 sm:p-5 bg-zinc-900 text-white">
                              <div className="bg-zinc-950 rounded-2xl p-3 sm:p-4 border border-zinc-800 space-y-3">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
                                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#D4AF37]">
                                    Detalle Auditado Fichaje por Fichaje ({r.operator_name})
                                  </p>
                                  <span className="text-[9px] font-bold text-zinc-400">Total: {r.shifts_detail?.length} fichajes</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {r.shifts_detail?.map((shift: any, idx: number) => (
                                    <div key={shift.id || idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                        <div>
                                          <p className="font-bold text-white uppercase text-xs">{shift.objective_name}</p>
                                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                            {new Date(shift.checkin_time).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            {' ➔ '}
                                            {new Date(shift.checkout_time).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
                                        <span className="text-zinc-300 bg-white/10 px-2 py-0.5 rounded">
                                          Duración: <strong className="text-white">{shift.total_formatted}</strong> ({shift.total_hours.toFixed(2)} hs)
                                        </span>
                                        {shift.night_minutes > 0 && (
                                          <span className="text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                            <Moon size={9} /> Noct: {shift.night_formatted}
                                          </span>
                                        )}
                                        <span className="text-[#D4AF37] font-black text-xs ml-auto">
                                          ${shift.pay_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )
              ) : activeTab === 'minucioso' ? (
                // VISTA MINUCIOSA TURNO POR TURNO
                (data?.shifts ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      No hay fichajes registrados en este período
                    </td>
                  </tr>
                ) : (
                  (data?.shifts ?? []).map((s: any) => {
                    const checkin = new Date(s.checkin_time)
                    const checkout = new Date(s.checkout_time)
                    return (
                      <tr key={s.id} className="hover:bg-zinc-50/80 transition-colors border-b border-zinc-50">
                        <td className="px-3 sm:px-4 py-3 font-bold text-zinc-900 font-mono text-xs">
                          {checkin.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="px-3 sm:px-4 py-3 font-bold text-zinc-800 text-xs uppercase">
                          {s.operator_name}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-zinc-600 text-xs font-bold uppercase">
                          {s.objective_name}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center font-mono text-xs text-zinc-700">
                          {checkin.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center font-mono text-xs text-zinc-700">
                          {checkout.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right">
                          <span className="font-mono font-black text-zinc-950 text-xs block">
                            {s.total_formatted}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-400 font-mono block">
                            ({s.total_hours.toFixed(2)} hs)
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right">
                          {s.night_minutes > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-[10px]">
                              <Moon size={9} /> {s.night_formatted}
                            </span>
                          ) : (
                            <span className="text-zinc-300 text-[10px] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right font-mono text-zinc-600 text-xs">
                          ${(s.hourly_pay_rate ?? 0).toLocaleString('es-AR')}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right font-mono font-black text-[#D4AF37] text-xs sm:text-sm">
                          ${(s.pay_amount ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })
                )
              ) : (data?.facturacion ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No hay registros en el período seleccionado
                  </td>
                </tr>
              ) : (
                (data?.facturacion ?? []).map((r) => (
                  <tr key={r.objective_id} className="hover:bg-zinc-50/80 transition-colors border-b border-zinc-50 last:border-0">
                    <td className="px-3 sm:px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                          <Building2 size={15} className="text-[#D4AF37]" />
                        </div>
                        <span className="font-bold text-zinc-900 tracking-tight text-xs sm:text-sm">{r.objective_name}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-zinc-600 text-[9px] sm:text-[10px] font-black uppercase tracking-wide max-w-[180px] truncate">
                      {r.operators.join(', ')}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-white border border-zinc-200 text-xs font-black text-zinc-950">
                        {r.shifts_count}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-right">
                      <span className="font-mono font-black text-zinc-950 text-xs sm:text-sm block">
                        {r.total_formatted}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 font-mono block">
                        ({(r.total_hours ?? 0).toFixed(2)} hs)
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-right font-mono text-zinc-600 text-xs">
                      ${(r.hourly_billing_rate ?? 0).toLocaleString('es-AR')}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-right">
                      <span className="font-black text-[#D4AF37] text-xs sm:text-sm lg:text-base font-mono">
                        ${(r.total_billing ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* TOTALS FOOTER */}
            {!loading && data && (data.nomina.length > 0 || data.facturacion.length > 0) && (
              <tfoot>
                <tr className="bg-zinc-900 text-white">
                  <td colSpan={activeTab === 'minucioso' ? 5 : 3} className="px-3 sm:px-4 py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-400">
                    TOTAL DEL PERÍODO AUDITADO
                  </td>
                  <td className="px-3 sm:px-4 py-3.5 text-right font-mono font-black text-[#D4AF37]">
                    <span className="text-sm sm:text-base block">{data.totals?.total_formatted}</span>
                    <span className="text-[9px] sm:text-[10px] text-zinc-400">({(data.totals?.total_hours ?? 0).toFixed(2)} hs acumuladas)</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3.5" colSpan={activeTab === 'nomina' ? 2 : activeTab === 'minucioso' ? 2 : 1} />
                  <td className="px-3 sm:px-4 py-3.5 text-right font-mono font-black text-[#D4AF37] text-sm sm:text-lg lg:text-xl">
                    ${(activeTab === 'facturacion' ? (data.totals?.total_billing ?? 0) : (data.totals?.total_pay ?? 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
