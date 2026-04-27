import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, objective_id, latitude, longitude } = await request.json();
    const supabase = createClient();

    // 1. Fetch Objective specific radius if available
    let targetRadius = 200;
    if (objective_id && objective_id !== 'null') {
      try {
        const { data: objective } = await supabase
          .from('objectives')
          .select('geofence_radius_meters')
          .eq('id', objective_id)
          .maybeSingle();
        if (objective?.geofence_radius_meters) targetRadius = objective.geofence_radius_meters;
      } catch (e) {}
    }

    // 2. Verify Geofence using the RPC function with explicit radius
    let isWithinGeofence = true;
    if (objective_id && objective_id !== 'null') {
      const { data, error: geoError } = await supabase.rpc('check_geofence', {
        p_lat: latitude,
        p_lng: longitude,
        p_objective_id: objective_id,
        p_radius_meters: targetRadius
      });
      if (!geoError) isWithinGeofence = data;
    }

    // 3. Create the shift record
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operator_id);
    
    if (!isUUID) {
      console.log('Skipping DB insert for demo/bypass operator');
      return NextResponse.json({ 
        shift: { id: 'demo-shift-' + Date.now(), status: 'active' }, 
        isWithinGeofence,
        warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m (MODO DEMO)` : null 
      });
    }

    const { data: shift, error: shiftError } = await supabase
      .from('guard_shifts')
      .insert({
        operator_id: operator_id,
        objective_id: (objective_id && objective_id !== 'null') ? objective_id : null,
        checkin_time: new Date().toISOString(),
        checkin_latitude: latitude,
        checkin_longitude: longitude,
        status: 'active',
        checkin_within_geofence: isWithinGeofence
      })
      .select()
      .single();

    if (shiftError) {
      console.error('Shift insert error:', shiftError);
      throw shiftError;
    }

    // 4. Update guard position and status in resources
    // Safety check: only use .or() if operator_id looks like a UUID to avoid Postgres casting errors
    
    const updatePayload = { 
      latitude, 
      longitude, 
      status: 'active',
      current_objective_id: (objective_id && objective_id !== 'null') ? objective_id : null,
      last_gps_update: new Date().toISOString()
    };

    if (isUUID) {
      await supabase
        .from('resources')
        .update(updatePayload)
        .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`);
    } else {
      await supabase
        .from('resources')
        .update(updatePayload)
        .eq('id', operator_id);
    }

    return NextResponse.json({ 
      shift, 
      isWithinGeofence,
      warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m` : null 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
