import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { shift_id, latitude, longitude } = await request.json();
    const supabase = createClient();

    // 1. Get the current shift to calculate duration
    const { data: currentShift, error: fetchError } = await supabase
      .from('guard_logs')
      .select('*')
      .eq('id', shift_id)
      .single();

    if (fetchError || !currentShift) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    const checkoutTime = new Date().toISOString();
    const checkinTime = new Date(currentShift.clock_in);
    const durationMs = new Date(checkoutTime).getTime() - checkinTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // 2. Update the shift record
    const { data: shift, error: shiftError } = await supabase
      .from('guard_logs')
      .update({
        clock_out: checkoutTime,
        latitude_out: latitude,
        longitude_out: longitude,
        status: 'finished'
      })
      .eq('id', shift_id)
      .select()
      .single();

    if (shiftError) throw shiftError;

    // 3. Update resource status to 'disponible' or similar
    if (currentShift.resource_id) {
      await supabase
        .from('resources')
        .update({ status: 'disponible', last_active: checkoutTime })
        .eq('id', currentShift.resource_id);
    }

    return NextResponse.json({ shift });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
