import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // 1. Fetch Profile
    let { data: profile, error: profileErr } = await supabase
      .from('resources')
      .select('*, objectives!current_objective_id(name)')
      .eq('id', id)
      .single();

    if (profileErr) {
      const fallback = await supabase.from('resources').select('*').eq('id', id).single();
      if (fallback.error) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
      profile = fallback.data;
    }

    // 2. Fetch Shifts (considering assigned_to linking if exists)
    const operatorIds = [id];
    if (profile?.assigned_to) operatorIds.push(profile.assigned_to);

    const { data: shifts, error: shiftsErr } = await supabase
      .from('guard_shifts')
      .select('*, objectives!objective_id(name)')
      .in('operator_id', operatorIds)
      .order('checkin_time', { ascending: false })
      .limit(100);

    return NextResponse.json({
      profile,
      shifts: shifts || []
    });
  } catch (error: any) {
    console.error("Error fetching employee details:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
