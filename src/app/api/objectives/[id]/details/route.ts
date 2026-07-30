import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isConfigured) {
      return NextResponse.json({
        objective: { id, name: 'OBJETIVO MOCK', address: 'Calle Ficticia 123', status: 'Activo' },
        shifts: [],
        patrolRounds: [],
        checkpoints: [],
        inventory: [],
        guardBook: []
      });
    }

    const supabase = createServiceClient();

    // Parallel fetch using service role to bypass RLS
    const [objectiveRes, shiftsRes, patrolRoundsRes, routesRes, inventoryRes, guardBookRes] = await Promise.all([
      supabase.from('objectives').select('*').eq('id', id).single(),
      supabase.from('guard_shifts').select('*').eq('objective_id', id).order('checkin_time', { ascending: false }).limit(50),
      supabase.from('patrol_rounds').select('*').eq('objective_id', id).order('start_time', { ascending: false }).limit(20),
      supabase.from('patrol_routes').select('id').eq('objective_id', id),
      supabase.from('resource_inventory').select('*').eq('objective_id', id),
      supabase.from('guard_book_entries').select('*').eq('objective_id', id).order('created_at', { ascending: false }).limit(30)
    ]);

    if (objectiveRes.error || !objectiveRes.data) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 });
    }

    // Collect all operator IDs for manual join
    const operatorIds = new Set([
      ...(shiftsRes.data || []).map((s: any) => s.operator_id),
      ...(patrolRoundsRes.data || []).map((r: any) => r.operator_id || r.resource_id),
      ...(guardBookRes.data || []).map((g: any) => g.operator_id || g.resource_id)
    ].filter(Boolean));

    const { data: resData } = await supabase.from('resources').select('id, name, avatar_url').in('id', Array.from(operatorIds));
    const resMap = Object.fromEntries(resData?.map(r => [r.id, { name: r.name, avatar: r.avatar_url }]) || []);

    // Fetch geofencing_incidents for these shifts to deduct abandonment time
    const shiftIds = (shiftsRes.data || []).map((s: any) => s.id)
    let incidentsByShift: Record<string, any[]> = {}

    if (shiftIds.length > 0) {
      const { data: incidents } = await supabase
        .from('geofencing_incidents')
        .select('*')
        .in('shift_id', shiftIds)

      if (incidents) {
        incidents.forEach((inc: any) => {
          if (!incidentsByShift[inc.shift_id]) incidentsByShift[inc.shift_id] = []
          incidentsByShift[inc.shift_id].push(inc)
        })
      }
    }

    const shifts = (shiftsRes.data || []).map((s: any) => {
      const checkinMs = new Date(s.checkin_time).getTime()
      const checkoutMs = s.checkout_time ? new Date(s.checkout_time).getTime() : Date.now()
      const grossMs = Math.max(0, checkoutMs - checkinMs)
      const grossMins = Math.round(grossMs / 60000)

      // Calculate total abandoned minutes strictly within shift bounds
      const shiftIncidents = incidentsByShift[s.id] || []
      let totalAbandonedMs = 0

      shiftIncidents.forEach((inc: any) => {
        const rawExitMs = new Date(inc.exit_at).getTime()
        const rawReturnMs = inc.return_at ? new Date(inc.return_at).getTime() : checkoutMs
        const effectiveExitMs = Math.max(rawExitMs, checkinMs)
        const effectiveReturnMs = Math.min(rawReturnMs, checkoutMs)

        if (effectiveReturnMs > effectiveExitMs) {
          totalAbandonedMs += (effectiveReturnMs - effectiveExitMs)
        }
      })

      const abandonedMins = Math.round(totalAbandonedMs / 60000)
      const netMins = Math.max(0, grossMins - abandonedMins)
      const netHours = parseFloat((netMins / 60).toFixed(2))

      const formatMin = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${(m % 60).toString().padStart(2, '0')}m`

      return {
        ...s,
        operator_name: resMap[s.operator_id]?.name || s.operator_id,
        operator_avatar: resMap[s.operator_id]?.avatar || null,
        gross_minutes: grossMins,
        gross_hours: parseFloat((grossMins / 60).toFixed(2)),
        gross_formatted: formatMin(grossMins),
        total_minutes: netMins,
        total_hours: netHours,
        total_formatted: formatMin(netMins),
        abandoned_minutes: abandonedMins,
        abandoned_formatted: formatMin(abandonedMins)
      }
    });

    const patrolRounds = (patrolRoundsRes.data || []).map((r: any) => ({
      ...r,
      resources: { name: resMap[r.operator_id || r.resource_id]?.name || 'Desconocido' }
    }));

    const guardBook = (guardBookRes.data || []).map((g: any) => {
      const opId = g.operator_id || g.resource_id;
      return {
        ...g,
        resource_id: opId,
        resource_name: resMap[opId]?.name || opId,
        resources: { name: resMap[opId]?.name || 'Desconocido', avatar_url: resMap[opId]?.avatar }
      };
    });

    // If there are routes, fetch checkpoints
    let checkpoints: any[] = [];
    const routeIds = routesRes.data?.map(r => r.id) || [];
    if (routeIds.length > 0) {
      const { data } = await supabase
        .from('patrol_checkpoints')
        .select('*')
        .in('route_id', routeIds)
        .order('sequence_order', { ascending: true });
      checkpoints = data || [];
    }

    return NextResponse.json({
      objective: objectiveRes.data,
      shifts,
      patrolRounds,
      checkpoints,
      inventory: inventoryRes.data || [],
      guardBook
    });
  } catch (error: any) {
    console.error("Error fetching objective details:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
