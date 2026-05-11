import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Parallel fetch using service role to bypass RLS
    const [objectiveRes, shiftsRes, patrolRoundsRes, routesRes, inventoryRes, guardBookRes] = await Promise.all([
      supabase.from('objectives').select('*').eq('id', id).single(),
      supabase.from('guard_shifts').select('*').eq('objective_id', id).order('checkin_time', { ascending: false }).limit(50),
      supabase.from('patrol_rounds').select('*, resources:resource_id(name)').eq('objective_id', id).order('round_start', { ascending: false }).limit(20),
      supabase.from('patrol_routes').select('id').eq('objective_id', id),
      supabase.from('inventory_items').select('*').eq('assigned_to_objective', id),
      supabase.from('guard_book_entries').select('*').eq('objective_id', id).order('created_at', { ascending: false }).limit(30)
    ]);

    let patrolRounds = patrolRoundsRes.data || [];

    // Fallback if the join failed (PostgREST might not resolve resources automatically if FKs were dropped)
    if (patrolRounds.length > 0 && (!patrolRounds[0].resources || typeof patrolRounds[0].resources === 'string')) {
       // Manual join if necessary
       const resourceIds = [...new Set(patrolRounds.map(r => r.resource_id).filter(Boolean))];
       if (resourceIds.length > 0) {
         const { data: resData } = await supabase.from('resources').select('id, name').in('id', resourceIds);
         if (resData) {
           const nameMap = Object.fromEntries(resData.map(r => [r.id, r.name]));
           patrolRounds = patrolRounds.map(r => ({
             ...r,
             resources: { name: nameMap[r.resource_id] || 'Desconocido' }
           }));
         }
       }
    }

    if (objectiveRes.error) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 });
    }

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
      shifts: shiftsRes.data || [],
      patrolRounds: patrolRounds,
      checkpoints: checkpoints,
      inventory: inventoryRes.data || [],
      guardBook: guardBookRes.data || []
    });
  } catch (error: any) {
    console.error("Error fetching objective details:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
