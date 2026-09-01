import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = createServiceClient();

    const { shift_id, operator_id, custom_checkout_time } = body;

    // 1. Fetch active shifts
    let query = supabase
      .from('guard_shifts')
      .select('*, resources(*), objectives(*)')
      .in('status', ['activo', 'active']);

    if (shift_id) query = query.eq('id', shift_id);
    if (operator_id) query = query.or(`operator_id.eq.${operator_id},resource_id.eq.${operator_id}`);

    const { data: activeShifts, error } = await query;

    if (error || !activeShifts || activeShifts.length === 0) {
      return NextResponse.json({ 
        message: 'No se encontraron turnos activos pendientes de cierre.',
        closed_count: 0 
      });
    }

    const closedShifts: any[] = [];

    for (const shift of activeShifts) {
      const checkinTime = new Date(shift.checkin_time);
      
      // Determine effective checkout time
      let checkoutDate: Date;
      if (custom_checkout_time) {
        checkoutDate = new Date(custom_checkout_time);
      } else {
        // Default: If shift checkin was > 8 hours ago, cap at 8 hours (480 mins) from checkin
        const now = new Date();
        const diffHours = (now.getTime() - checkinTime.getTime()) / (1000 * 60 * 60);
        if (diffHours > 12) {
          checkoutDate = new Date(checkinTime.getTime() + 8 * 60 * 60 * 1000); // 8h default
        } else {
          checkoutDate = now;
        }
      }

      const checkoutTimeIso = checkoutDate.toISOString();
      const durationMs = Math.max(0, checkoutDate.getTime() - checkinTime.getTime());
      const durationMinutes = Math.round(durationMs / 60000);
      const totalHours = parseFloat((durationMs / 3600000).toFixed(2));
      const overtimeMinutes = Math.max(0, durationMinutes - 480);

      // Update shift
      const { data: updated } = await supabase
        .from('guard_shifts')
        .update({
          checkout_time: checkoutTimeIso,
          status: 'completado',
          duration_minutes: durationMinutes,
          total_hours: totalHours,
          overtime_minutes: overtimeMinutes,
        })
        .eq('id', shift.id)
        .select()
        .single();

      // Free resource status
      if (shift.operator_id || shift.resource_id) {
        const resId = shift.operator_id || shift.resource_id;
        await supabase
          .from('resources')
          .update({
            status: 'inactivo',
            current_objective_id: null,
            current_shift_id: null
          })
          .eq('id', resId);
      }

      // Free objective status
      if (shift.objective_id) {
        await supabase
          .from('objectives')
          .update({
            manned_status: 'Activo',
            current_operator_id: null
          })
          .eq('id', shift.objective_id);
      }

      closedShifts.push(updated || shift);
    }

    return NextResponse.json({
      success: true,
      message: `Se cerraron exitosamente ${closedShifts.length} turno(s) pendiente(s).`,
      closed_count: closedShifts.length,
      shifts: closedShifts
    });
  } catch (error: any) {
    console.error('[ADMIN_CLOSE_SHIFTS_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error cerrando turnos' }, { status: 500 });
  }
}

// GET endpoint to list all currently open/active shifts for admin review
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: activeShifts } = await supabase
      .from('guard_shifts')
      .select('id, checkin_time, status, operator_id, objective_id, resources(id, name, email), objectives(id, name)')
      .in('status', ['activo', 'active'])
      .order('checkin_time', { ascending: false });

    return NextResponse.json({
      count: activeShifts?.length || 0,
      activeShifts: activeShifts || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
