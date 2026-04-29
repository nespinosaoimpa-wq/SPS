import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { shift_id, latitude, longitude } = await request.json();
    
    const cookieStore = await cookies();
    let supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Ultimate fallback: Use Service Role Key if available to bypass RLS on server
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // 1. Get the current shift to calculate duration
    if (shift_id.startsWith('demo-shift-')) {
       return NextResponse.json({ 
         shift: { id: shift_id, status: 'completado' } 
       });
    }

    const { data: currentShift, error: fetchError } = await supabase
      .from('guard_shifts')
      .select('*')
      .eq('id', shift_id)
      .single();

    if (fetchError || !currentShift) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    const checkoutTime = new Date().toISOString();
    const checkinTime = new Date(currentShift.checkin_time);
    const durationMs = new Date(checkoutTime).getTime() - checkinTime.getTime();
    
    // 2. Update the shift record
    const { data: shift, error: shiftError } = await supabase
      .from('guard_shifts')
      .update({
        checkout_time: checkoutTime,
        checkout_latitude: latitude,
        checkout_longitude: longitude,
        status: 'completado'
      })
      .eq('id', shift_id)
      .select()
      .single();

    if (shiftError) throw shiftError;

    // 3. Update resource status to 'disponible' or similar
    if (currentShift.operator_id) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentShift.operator_id);
      if (isUUID) {
        await supabase
          .from('resources')
          .update({ 
            status: 'disponible',
            current_objective_id: null 
          })
          .or(`id.eq.${currentShift.operator_id},assigned_to.eq.${currentShift.operator_id}`);
      }
    }

    return NextResponse.json({ shift });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
