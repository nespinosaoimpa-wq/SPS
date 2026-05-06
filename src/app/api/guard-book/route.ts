import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/guard-book?objective_id=X&date=YYYY-MM-DD
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
        resources (id, name),
        objectives (id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (objectiveId) {
      query = query.eq('objective_id', objectiveId);
    }

    if (date) {
      const start = `${date}T00:00:00.000Z`;
      const end = `${date}T23:59:59.999Z`;
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[GUARD_BOOK_GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/guard-book — insert a new entry
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
    } = body;

    // Validate FKs exist before inserting to avoid silent failures
    if (!objective_id || objective_id === 'objetivo_demo') {
      return NextResponse.json({ error: 'objective_id inválido o faltante' }, { status: 400 });
    }
    if (!rawResourceId || rawResourceId === 'recurso_demo') {
      return NextResponse.json({ error: 'resource_id inválido o faltante' }, { status: 400 });
    }

    // RESOLVE: If rawResourceId is a UUID, find the actual resource.id
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
        resource_id,
        entry_type,
        content,
        latitude,
        longitude,
        urgency,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // If critical alarm, insert into alarms table for push notification
    if (urgency === 'critica' || entry_type === 'emergencia') {
      await supabase.from('alarms').insert({
        triggered_by: resource_id,
        objective_id,
        alarm_type: entry_type || 'panico',
        message: content,
        latitude,
        longitude,
        status: 'active',
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GUARD_BOOK_POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
