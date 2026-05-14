import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, email, objective_id, latitude, longitude } = await request.json();

    const supabase = createServiceClient();

    // 1. Fetch Objective specific radius if available
    let targetRadius = 70;
    let objectiveLocation: { lat: number, lng: number } | null = null;
    if (objective_id && objective_id !== 'null') {
      try {
        const { data: objective } = await supabase
          .from('objectives')
          .select('geofence_radius_meters, latitude, longitude')
          .eq('id', objective_id)
          .maybeSingle();
        if (objective?.geofence_radius_meters) targetRadius = objective.geofence_radius_meters;
        if (objective?.latitude) objectiveLocation = { lat: objective.latitude, lng: objective.longitude };
      } catch (e) {}
    }

    // 2. Verify Geofence (STRICT ENFORCEMENT)
    // ... (logic remains same)
    let isWithinGeofence = true;
    if (objective_id && objective_id !== 'null') {
      const { data, error: geoError } = await supabase.rpc('check_geofence', {
        p_lat: latitude,
        p_lng: longitude,
        p_objective_id: objective_id,
        p_radius_meters: targetRadius
      });
      
      if (!geoError) isWithinGeofence = data;
      
      // STRICT BLOCK: Phase 3 Requirement
      if (!isWithinGeofence) {
        return NextResponse.json({ 
          error: 'FUERA DE RANGO',
          message: `Tu ubicación actual está fuera del radio permitido (${targetRadius}m) para este objetivo.`,
          isWithinGeofence: false,
          targetRadius
        }, { status: 403 });
      }
    }

    // 3. Resolve the resource record — ALWAYS use resources.id for guard_shifts
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operator_id);

    let resourceRecord: any = null;

    let orConditions = [`id.eq.${operator_id}`];
    if (isUUID) {
      orConditions.push(`assigned_to.eq.${operator_id}`);
    }
    if (email) {
      orConditions.push(`email.ilike.${email}`);
    }

    let resourceQuery = supabase.from('resources').select('id, assigned_to, email, name, role');
    resourceQuery = resourceQuery.or(orConditions.join(','));

    const { data: foundResource } = await resourceQuery.maybeSingle();
    resourceRecord = foundResource;

    if (resourceRecord) {
      // Auto-link Auth UUID ↔ resource if not yet linked
      if (isUUID && resourceRecord.assigned_to !== operator_id) {
        await supabase.from('resources').update({ assigned_to: operator_id }).eq('id', resourceRecord.id);
      }
    } else if (!isUUID) {
      // Non-UUID and not found in resources — demo/bypass mode
      return NextResponse.json({
        shift: { id: 'demo-shift-' + Date.now(), status: 'activo' },
        isWithinGeofence,
        warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m (MODO DEMO)` : null
      });
    } else {
      // UUID user not found in resources — create a resource record using the Auth UUID
      const tempId = operator_id; // USE THE UUID DIRECTLY!
      const { data: newResource } = await supabase.from('resources').upsert({
        id: tempId,
        name: email?.split('@')[0] || 'Operador',
        role: 'Vigilador',
        status: 'activo',
        email: email || null,
        assigned_to: operator_id,
        latitude,
        longitude,
      }, { onConflict: 'id' }).select().single();

      resourceRecord = newResource || { id: tempId };
    }

    // CRITICAL: Always use a valid UUID for guard_shifts.operator_id
    const finalResourceId = resourceRecord.id;

    // 4. Create the shift record
    const { data: shift, error: shiftError } = await supabase
      .from('guard_shifts')
      .insert({
        operator_id: finalResourceId,
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
      .eq('id', finalResourceId);

    // 6. Update objective: mark as covered
    if (objective_id && objective_id !== 'null') {
      await supabase
        .from('objectives')
        .update({
          manned_status: 'Cubierto',
          current_operator_id: finalResourceId
        })
        .eq('id', objective_id);
    }

    // 7. Auto-insert check-in log in guard book
    if (finalResourceId && objective_id && objective_id !== 'null') {
      await supabase.from('guard_book_entries').insert({
        objective_id: objective_id,
        resource_id: finalResourceId,
        entry_type: 'fichaje',
        content: `INICIO DE TURNO — Operador fichó la entrada${isWithinGeofence ? '' : ' ⚠️ FUERA DE GEOCERCA'}`,
        latitude,
        longitude,
        urgency: isWithinGeofence ? 'normal' : 'alta',
      });
    }

    return NextResponse.json({
      shift,
      resource_id: finalResourceId,
      isWithinGeofence,
      objectiveLocation,
      geofenceRadius: targetRadius,
      warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m` : null
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      level: 'error',
      context: 'CHECKIN_API',
      message: error.message || 'Internal Server Error',
      stack: error.stack
    }));
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
