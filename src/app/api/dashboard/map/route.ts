import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isConfigured) {
      return NextResponse.json({
        objectives: [
          { id: 'OBJ-001', name: 'Puerto 704', address: 'Dique 1', latitude: -31.6450, longitude: -60.6950, status: 'Activo', is_manned: true },
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

    // Auto-generate alerts for unassigned shifts in the next 24 hours
    try {
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const { data: unassignedReqs } = await supabase
        .from('shift_requirements')
        .select('id, objective_id, start_time, objectives:objective_id(name)')
        .eq('status', 'unassigned')
        .lte('start_time', next24h.toISOString())
        .gt('start_time', now.toISOString());

      if (unassignedReqs && unassignedReqs.length > 0) {
        for (const req of unassignedReqs) {
          const { data: existingAlarm } = await supabase
            .from('alarms')
            .select('id')
            .eq('objective_id', req.objective_id)
            .eq('alarm_type', 'cobertura_pendiente')
            .eq('status', 'active')
            .limit(1);

          if (!existingAlarm || existingAlarm.length === 0) {
            const formattedTime = new Date(req.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            await supabase.from('alarms').insert({
              triggered_by: 'system_scheduler',
              objective_id: req.objective_id,
              alarm_type: 'cobertura_pendiente',
              message: `🚨 ALERTA COBERTURA: Falta asignar personal para el turno de las ${formattedTime} hs en ${req.objectives?.name || 'objetivo'}`,
              status: 'active'
            });
          }
        }
      }
    } catch (e) {
      console.error('[AUTO_ALERT_SCHEDULER_ERROR]', e);
    }

    // Safely fetch guard book entries (including all recent incidents & alerts for heatmap density)
    const fetchGuardBookEntries = async () => {
      try {
        const { data, error } = await supabase.from('guard_book_entries')
          .select('*, objectives:objective_id(latitude, longitude, name)')
          .neq('entry_type', 'fichaje')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data || [];
      } catch (e: any) {
        console.warn("⚠️ guard_book_entries query failed, falling back:", e.message || e);
        return [];
      }
    };

    // Safely fetch raw incidents
    const fetchIncidents = async () => {
      try {
        const { data, error } = await supabase.from('incidents')
          .select('*, objectives:objective_id(latitude, longitude, name)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data || [];
      } catch (e: any) {
        console.warn("⚠️ incidents query failed, falling back:", e.message || e);
        return [];
      }
    };

    // Parallel fetch
    const [objectivesRes, resourcesRes, guardBookData, shiftsRes, incidentsData] = await Promise.all([
      supabase.from('objectives')
        .select('*, assigned_personnel:resources!current_objective_id(*)')
        .or('is_active.eq.true,status.eq.Activo'),
      supabase.from('resources')
        .select('*')
        .in('status', ['activo', 'active'])
        .gte('last_gps_update', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      fetchGuardBookEntries(),
      supabase.from('guard_shifts')
        .select('id, checkin_time, operator_id, objective_id, status')
        .is('checkout_time', null)
        .order('checkin_time', { ascending: false }),
      fetchIncidents()
    ]);

    if (objectivesRes.error) console.error("❌ Objectives fetch error:", JSON.stringify(objectivesRes.error));
    if (resourcesRes.error) console.error("❌ Resources fetch error:", JSON.stringify(resourcesRes.error));
    if (shiftsRes.error) console.error("❌ Shifts fetch error:", JSON.stringify(shiftsRes.error));

    // Consolidate entries from both tables
    const recentIncidentsFromGuardBook = (guardBookData || []).map((inc: any) => ({
      ...inc,
      resource_id: inc.operator_id || inc.resource_id,
      latitude: inc.latitude || inc.objectives?.latitude,
      longitude: inc.longitude || inc.objectives?.longitude,
    }));

    const recentIncidentsFromRawIncidents = (incidentsData || []).map((inc: any) => ({
      ...inc,
      resource_id: inc.operator_id || inc.resource_id,
      urgency: inc.status === 'critica' || inc.status === 'crítica' ? 'critica' : 'normal',
      latitude: inc.latitude || inc.objectives?.latitude,
      longitude: inc.longitude || inc.objectives?.longitude,
    }));

    const recentIncidents = [...recentIncidentsFromGuardBook, ...recentIncidentsFromRawIncidents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);

    return NextResponse.json({
      objectives: objectivesRes.data || [],
      resources: resourcesRes.data || [],
      recentIncidents,
      activeShifts: shiftsRes.data || []
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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
