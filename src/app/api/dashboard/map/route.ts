import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!isConfigured) {
      return NextResponse.json({
        objectives: [
          { id: 'OBJ-001', name: 'Puerto SPS 704', address: 'Dique 1', latitude: -31.6450, longitude: -60.6950, status: 'Activo' },
          { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo' },
        ],
        resources: [
          { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente', current_objective_id: 'OBJ-001', status: 'activo', latitude: -31.640, longitude: -60.700 },
        ],
        recentIncidents: [],
        activeShifts: []
      });
    }

    const supabase = createServiceClient();

    // Parallel fetch for dashboard data
    const [objectivesRes, resourcesRes, incidentsRes, shiftsRes] = await Promise.all([
      supabase.from('objectives').select('*').eq('status', 'Activo'),
      supabase.from('resources').select('*, objectives(name)').neq('status', 'baja'),
      supabase.from('guard_book_entries').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('guard_shifts').select('*').is('checkout_time', null).order('checkin_time', { ascending: false })
    ]);

    if (objectivesRes.error) console.error("Objectives fetch error:", objectivesRes.error);
    if (resourcesRes.error) console.error("Resources fetch error:", resourcesRes.error);
    if (shiftsRes.error) console.error("Shifts fetch error:", shiftsRes.error);

    return NextResponse.json({
      objectives: objectivesRes.data || [],
      resources: resourcesRes.data || [],
      recentIncidents: incidentsRes.data || [],
      activeShifts: shiftsRes.data || []
    });
  } catch (error: any) {
    console.error("Dashboard API overall error:", error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}
