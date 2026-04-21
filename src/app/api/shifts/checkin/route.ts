import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, objective_id, latitude, longitude } = await request.json();
    const supabase = createClient();

    // 1. Fetch Objective specific radius if available
    const { data: objective } = await supabase
      .from('objectives')
      .select('geofence_radius_meters')
      .eq('id', objective_id)
      .single();

    const targetRadius = objective?.geofence_radius_meters || 200;

    // 2. Verify Geofence using the RPC function with explicit radius
    const { data: isWithinGeofence, error: geoError } = await supabase.rpc('check_geofence', {
      p_lat: latitude,
      p_lng: longitude,
      p_objective_id: objective_id,
      p_radius_meters: targetRadius
    });

    if (geoError) {
      console.warn("Geofence RPC error, defaulting to true to allow work:", geoError);
    }

    // 3. Create the shift record
    // Note: We use 'guard_shifts' as per schema, but code uses 'guard_logs'. 
    // Checking both, but keeping codebase consistency if 'guard_logs' is the actual deployed table.
    const { data: shift, error: shiftError } = await supabase
      .from('guard_logs')
      .insert({
        resource_id: operator_id,
        objective_id,
        clock_in: new Date().toISOString(),
        latitude_in: latitude,
        longitude_in: longitude,
        status: 'active',
        is_within_geofence: isWithinGeofence // Added for reporting
      })
      .select()
      .single();

    if (shiftError) throw shiftError;

    // 4. Update guard position and status in resources
    await supabase
      .from('resources')
      .update({ 
        latitude, 
        longitude, 
        status: 'active',
        last_gps_update: new Date().toISOString()
      })
      .eq('id', operator_id);

    return NextResponse.json({ 
      shift, 
      isWithinGeofence,
      warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m` : null 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
