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
    const [objectiveRes, shiftsRes, patrolRoundsRes, routesRes] = await Promise.all([
      supabase.from('objectives').select('*').eq('id', id).single(),
      supabase.from('guard_shifts').select('*').eq('objective_id', id).order('checkin_time', { ascending: false }).limit(50),
      supabase.from('patrol_rounds').select('*, resources(name)').eq('objective_id', id).order('round_start', { ascending: false }).limit(20),
      supabase.from('patrol_routes').select('id').eq('objective_id', id)
    ]);

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
      patrolRounds: patrolRoundsRes.data || [],
      checkpoints: checkpoints
    });
  } catch (error: any) {
    console.error("Error fetching objective details:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
