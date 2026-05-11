import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const revalidate = 10; // Cache on edge for 10 seconds to prevent DB overload

export async function GET() {
  try {
    if (!isConfigured) {
      return NextResponse.json({
        objectives: [
          { id: 'OBJ-001', name: 'Puerto SPS 704', address: 'Dique 1', latitude: -31.6450, longitude: -60.6950, status: 'Activo', is_manned: true },
          { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo', is_manned: false },
        ],
        resources: [
          { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente', current_objective_id: 'OBJ-001', status: 'activo', latitude: -31.640, longitude: -60.700 },
        ],
        recentIncidents: [],
        activeShifts: []
      }, {
        headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate' }
      });
    }

    const supabase = createServiceClient();

    // Parallel fetch — using select('*') for objectives to avoid column name mismatches
    const [objectivesRes, resourcesRes, incidentsRes, shiftsRes] = await Promise.all([
      supabase.from('objectives')
        .select('*')
        .eq('is_active', true),
      supabase.from('resources')
        .select('*')
        .in('status', ['activo', 'active']),
      supabase.from('guard_book_entries')
        .select('*')
        .neq('status', 'resolved')
        .neq('status', 'resuelto')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('guard_shifts')
        .select('id, checkin_time, operator_id, objective_id, status')
        .is('checkout_time', null)
        .order('checkin_time', { ascending: false })
    ]);

    if (objectivesRes.error) console.error("❌ Objectives fetch error:", JSON.stringify(objectivesRes.error));
    if (resourcesRes.error) console.error("❌ Resources fetch error:", JSON.stringify(resourcesRes.error));
    if (incidentsRes.error) console.error("❌ Incidents fetch error:", JSON.stringify(incidentsRes.error));
    if (shiftsRes.error) console.error("❌ Shifts fetch error:", JSON.stringify(shiftsRes.error));

    return NextResponse.json({
      objectives: objectivesRes.data || [],
      resources: resourcesRes.data || [],
      recentIncidents: incidentsRes.data || [],
      activeShifts: shiftsRes.data || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=59'
      }
    });
  } catch (error: any) {
    console.error("Dashboard API overall error:", error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}
