import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, objective_id, latitude, longitude } = await request.json();
    const supabase = createClient();

    // 1. Verify Geofence using the RPC function
    const { data: isWithinGeofence, error: geoError } = await supabase.rpc('check_geofence', {
      p_lat: latitude,
      p_lng: longitude,
      p_objective_id: objective_id
    });

    if (geoError) throw geoError;

    // 2. Create the shift record
    const { data: shift, error: shiftError } = await supabase
      .from('guard_logs')
      .insert({
        resource_id: operator_id,
        objective_id,
        clock_in: new Date().toISOString(),
        latitude_in: latitude,
        longitude_in: longitude,
        status: 'active'
      })
      .select()
      .single();

    if (shiftError) throw shiftError;

    return NextResponse.json({ 
      shift, 
      warning: !isWithinGeofence ? 'Check-in realizado fuera del radio permitido' : null 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
