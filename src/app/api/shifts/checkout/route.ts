import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const STANDARD_SHIFT_MINUTES = 480; // 8 horas

export async function POST(request: Request) {
  try {
    const { shift_id, latitude, longitude } = await request.json();
    
    // Handle demo mode
    if (!shift_id || shift_id.startsWith('demo-shift-')) {
       return NextResponse.json({ 
         shift: { id: shift_id, status: 'completado' } 
       });
    }

    const supabase = createServiceClient();

    // 1. Get the current shift to calculate duration
    const { data: currentShift, error: fetchError } = await supabase
      .from('guard_shifts')
      .select('*')
      .eq('id', shift_id)
      .single();

    if (fetchError || !currentShift) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // 2. Calculate hours worked
    const checkoutTime = new Date().toISOString();
    const checkinTime = new Date(currentShift.checkin_time);
    const durationMs = new Date(checkoutTime).getTime() - checkinTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    const overtimeMinutes = Math.max(0, durationMinutes - STANDARD_SHIFT_MINUTES);

    // 3. Update the shift record with calculated hours
    const { data: shift, error: shiftError } = await supabase
      .from('guard_shifts')
      .update({
        checkout_time: checkoutTime,
        checkout_latitude: latitude,
        checkout_longitude: longitude,
        status: 'completado',
        duration_minutes: durationMinutes,
        overtime_minutes: overtimeMinutes,
      })
      .eq('id', shift_id)
      .select()
      .single();

    if (shiftError) throw shiftError;

    // 4. Update resource back to disponible and clear objective
    if (currentShift.operator_id) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentShift.operator_id);
      const orConditions = [`id.eq.${currentShift.operator_id}`];
      if (isUUID) {
        orConditions.push(`assigned_to.eq.${currentShift.operator_id}`);
      }
      
      await supabase
        .from('resources')
        .update({ 
          status: 'disponible',
          current_objective_id: null,
          current_shift_id: null,
        })
        .or(orConditions.join(','));
    }

    // 5. Insert auto checkout log in guard book
    if (currentShift.objective_id) {
      await supabase.from('guard_book_entries').insert({
        objective_id: currentShift.objective_id,
        resource_id: currentShift.operator_id,
        entry_type: 'fichaje',
        content: `CIERRE DE TURNO — Duración: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m${overtimeMinutes > 0 ? ` (Horas extra: ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m)` : ''}`,
        latitude,
        longitude,
        urgency: 'normal',
      });
    }

    return NextResponse.json({ shift, durationMinutes, overtimeMinutes });
  } catch (error: any) {
    console.error('[CHECKOUT]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
