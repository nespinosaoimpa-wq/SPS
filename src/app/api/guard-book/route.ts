import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/guard-book?objective_id=X&date=YYYY-MM-DD&limit=100
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = createServiceClient();

    let query = supabase
      .from('guard_book_entries')
      .select(`
        *,
        objectives:objective_id ( id, name, address )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (objectiveId && objectiveId !== 'all') {
      query = query.eq('objective_id', objectiveId);
    }

    if (date && date !== 'all') {
      // Calculate start and end of day in GMT-3 / Argentina time (03:00 UTC to 03:00 UTC next day)
      const startIso = new Date(`${date}T00:00:00-03:00`).toISOString();
      const endIso   = new Date(`${date}T23:59:59.999-03:00`).toISOString();
      query = query.gte('created_at', startIso).lte('created_at', endIso);
    }

    const { data: entries, error } = await query;
    if (error) {
      console.error('[GUARD_BOOK_GET] Error fetching entries:', error);
      throw error;
    }

    const rawList = entries || [];

    // Manually enrich operator resources to prevent PGRST200 schema embedding errors
    const operatorIds = Array.from(
      new Set(
        rawList
          .map((e: any) => e.operator_id || e.resource_id)
          .filter(Boolean)
      )
    );

    let resourceMap: Record<string, any> = {};
    if (operatorIds.length > 0) {
      const { data: resources } = await supabase
        .from('resources')
        .select('id, name, avatar_url, role')
        .in('id', operatorIds);

      (resources || []).forEach((r: any) => {
        resourceMap[r.id] = r;
      });
    }

    // ── Enrich entries with resource data & abandon duration calculation ──────
    const enriched = rawList.map((entry: any) => {
      const opId = entry.operator_id || entry.resource_id;
      const resourceData = opId ? resourceMap[opId] : null;

      const legacyEntry = {
        ...entry,
        resource_id: opId,
        resources: resourceData || { id: opId, name: opId || 'Operador', avatar_url: null, role: 'Guardia' }
      };

      if (legacyEntry.entry_type !== 'incidente') return legacyEntry;

      const abandonTs = new Date(legacyEntry.created_at).getTime();

      // Buscar el evento de retorno más próximo posterior
      const reentryEvent = rawList.find((e: any) =>
        (e.operator_id || e.resource_id) === legacyEntry.resource_id &&
        e.objective_id === legacyEntry.objective_id &&
        new Date(e.created_at).getTime() > abandonTs &&
        (
          e.entry_type === 'fichaje' ||
          (e.entry_type === 'incidente' && (e.content || '').toLowerCase().includes('reingres'))
        )
      );

      if (reentryEvent) {
        const reentryTs = new Date(reentryEvent.created_at).getTime();
        return {
          ...legacyEntry,
          abandon_duration_seconds: Math.round((reentryTs - abandonTs) / 1000),
        };
      }

      return legacyEntry;
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('[GUARD_BOOK_GET] Server Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/guard-book
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const {
      objective_id,
      resource_id: rawResourceId,
      entry_type,
      content,
      latitude,
      longitude,
      urgency = 'normal',
      image_url = null,
      audio_url = null,
    } = body;

    if (!objective_id || objective_id === 'objetivo_demo') {
      return NextResponse.json({ error: 'objective_id inválido o faltante' }, { status: 400 });
    }
    if (!rawResourceId || rawResourceId === 'recurso_demo') {
      return NextResponse.json({ error: 'resource_id inválido o faltante' }, { status: 400 });
    }

    let resource_id = rawResourceId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawResourceId);
    
    if (isUUID) {
      const { data: res } = await supabase
        .from('resources')
        .select('id')
        .or(`id.eq.${rawResourceId},assigned_to.eq.${rawResourceId}`)
        .maybeSingle();
      if (res?.id) resource_id = res.id;
    }

    const { data, error } = await supabase
      .from('guard_book_entries')
      .insert({
        objective_id,
        operator_id: resource_id,
        entry_type,
        content,
        latitude,
        longitude,
        urgency,
        image_url,
        audio_url,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const responseData = data ? { ...data, resource_id: data.operator_id } : data;

    if (urgency === 'critica' || entry_type === 'emergencia') {
      let operatorName = resource_id;
      let objectiveName = '';
      try {
        const { data: resData } = await supabase.from('resources').select('name').eq('id', resource_id).maybeSingle();
        if (resData?.name) operatorName = resData.name;
        const { data: objData } = await supabase.from('objectives').select('name').eq('id', objective_id).maybeSingle();
        if (objData?.name) objectiveName = objData.name;
      } catch (e) {}

      await supabase.from('alarms').insert({
        title: `🚨 ${entry_type.toUpperCase()}: ${objectiveName}`,
        message: `${operatorName}: ${content || 'Sin descripción'}`,
        severity: 'critica',
        objective_id,
        operator_id: resource_id,
        entry_id: data?.id,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[GUARD_BOOK_POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
