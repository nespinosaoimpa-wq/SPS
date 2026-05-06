import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, email, objective_id, latitude, longitude } = await request.json();

    const supabase = createServiceClient();

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

    // 2. Verify Geofence
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

    // 3. Resolve the real resource ID to avoid FK violation
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operator_id);

    let finalOperatorId = operator_id;

    // Build query to find resource by id OR assigned_to OR email
    let resourceQuery = supabase.from('resources').select('id, assigned_to');
    if (email) {
      resourceQuery = resourceQuery.or(`id.eq.${operator_id},assigned_to.eq.${operator_id},email.ilike.${email}`);
    } else {
      resourceQuery = resourceQuery.or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`);
    }

    const { data: resourceRecord } = await resourceQuery.maybeSingle();

    if (resourceRecord) {
      finalOperatorId = resourceRecord.id;
      // Auto-link Auth UUID ↔ resource if not yet linked
      if (isUUID && resourceRecord.assigned_to !== operator_id) {
        await supabase.from('resources').update({ assigned_to: operator_id }).eq('id', resourceRecord.id);
      }
    } else if (!isUUID) {
      // Non-UUID and not found in resources — demo/bypass mode
      return NextResponse.json({
        shift: { id: 'demo-shift-' + Date.now(), status: 'active' },
        isWithinGeofence,
        warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m (MODO DEMO)` : null
      });
    }

    // 4. Create the shift record
    const { data: shift, error: shiftError } = await supabase
      .from('guard_shifts')
      .insert({
        operator_id: finalOperatorId,
        objective_id: (objective_id && objective_id !== 'null') ? objective_id : null,
        checkin_time: new Date().toISOString(),
        checkin_latitude: latitude,
        checkin_longitude: longitude,
        status: 'activo',
        checkin_within_geofence: isWithinGeofence,
      })
      .select()
      .single();

    if (shiftError) {
      console.error('[CHECKIN] Shift insert error:', shiftError);
      throw shiftError;
    }

    // 5. Update resource: set active, link shift and objective
    await supabase
      .from('resources')
      .update({
        latitude,
        longitude,
        status: 'activo',
        current_objective_id: (objective_id && objective_id !== 'null') ? objective_id : null,
        current_shift_id: shift.id,
        last_gps_update: new Date().toISOString(),
      })
      .eq('id', finalOperatorId);

    // 6. Auto-insert check-in log in guard book
    if (finalOperatorId && objective_id && objective_id !== 'null') {
      await supabase.from('guard_book_entries').insert({
        objective_id: objective_id,
        resource_id: finalOperatorId,
        entry_type: 'fichaje',
        content: `INICIO DE TURNO — Operador fichó la entrada${isWithinGeofence ? '' : ' ⚠️ FUERA DE GEOCERCA'}`,
        latitude,
        longitude,
        urgency: isWithinGeofence ? 'normal' : 'alta',
      });
    }

    return NextResponse.json({
      shift,
      isWithinGeofence,
      warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m` : null
    });
  } catch (error: any) {
    console.error('[CHECKIN]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
