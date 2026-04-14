import { createClient, isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!isConfigured) {
      // Combined mock data for the dashboard map
      return NextResponse.json({
        objectives: [
          { id: 'OBJ-001', name: 'Puerto Santa Fe', address: 'Dique 1', latitude: -31.6450, longitude: -60.6950, status: 'Activo' },
          { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo' },
        ],
        resources: [
          { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente', current_objective_id: 'OBJ-001', status: 'active' },
          { id: 'S-802', name: 'CARLOS GIMENEZ', role: 'Vigilador', current_objective_id: 'OBJ-002', status: 'active' },
        ],
        recentIncidents: [
          { id: 'INC-001', incident_type: 'Vehículo Sospechoso', description: 'Camioneta blanca rondando', created_at: new Date().toISOString() }
        ]
      });
    }

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
