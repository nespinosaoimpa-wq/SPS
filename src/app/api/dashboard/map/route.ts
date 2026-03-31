import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();

    // Parallel fetch for dashboard data
    const [objectives, resources, incidents] = await Promise.all([
      supabase.from('objectives').select('*').eq('is_active', true),
      supabase.from('resources').select('*').neq('status', 'baja'),
      supabase.from('incident_reports').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    if (objectives.error) throw objectives.error;

    return NextResponse.json({
      objectives: objectives.data,
      resources: resources.data,
      recentIncidents: incidents.data
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
