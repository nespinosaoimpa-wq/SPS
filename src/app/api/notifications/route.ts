import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/notifications?resource_id=X
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');
    const email = searchParams.get('email');

    const supabase = createServiceClient();

    let targetOpId = resourceId;

    // Resolve operator ID by email if needed
    if (!targetOpId && email) {
      const { data: res } = await supabase
        .from('resources')
        .select('id')
        .ilike('email', email.trim())
        .maybeSingle();
      if (res) targetOpId = res.id;
    }

    if (!targetOpId) {
      return NextResponse.json([]);
    }

    // Parallel fetch from alarms and guard_book_entries
    const [alarmsRes, bookRes] = await Promise.all([
      supabase
        .from('alarms')
        .select('*')
        .or(`operator_id.eq.${targetOpId},triggered_by.eq.${targetOpId}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('guard_book_entries')
        .select('*')
        .or(`operator_id.eq.${targetOpId},resource_id.eq.${targetOpId}`)
        .eq('entry_type', 'mensaje')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const alarmItems = (alarmsRes.data || []).map((a: any) => ({
      id: a.id,
      title: 'Mensaje de Gerencia',
      message: a.message,
      type: 'command',
      is_read: a.status === 'acknowledged' || a.status === 'resolved',
      created_at: a.created_at
    }));

    const bookItems = (bookRes.data || []).map((b: any) => ({
      id: b.id,
      title: 'Mensaje de Gerencia',
      message: (b.content || '').replace(/^💬 MENSAJE DE GERENCIA:\s*/i, ''),
      type: 'message',
      is_read: b.status === 'resolved' || b.status === 'leido',
      created_at: b.created_at
    }));

    const combined = [...alarmItems, ...bookItems];
    // Deduplicate by content/time if needed
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(combined);
  } catch (error: any) {
    console.error('[NOTIFICATIONS_GET]', error);
    return NextResponse.json([]);
  }
}

// POST /api/notifications — create a new notification / message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { resource_id, type, title, body: notifBody } = body;

    if (!resource_id || !title) {
      return NextResponse.json({ error: 'resource_id y title son requeridos' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const msgText = `${notifBody || title}`.trim();

    // 1. Insert into alarms as active message notification using Service Role
    const { data: alarmData } = await supabase
      .from('alarms')
      .insert({
        operator_id: resource_id,
        triggered_by: 'gerencia',
        alarm_type: 'mensaje_gerencia',
        severity: 'media',
        message: msgText,
        status: 'active',
        created_at: nowIso
      })
      .select()
      .maybeSingle();

    // 2. Also record in guard_book_entries for audit log & permanent history
    await supabase.from('guard_book_entries').insert({
      operator_id: resource_id,
      entry_type: 'mensaje',
      content: `💬 MENSAJE DE GERENCIA: ${msgText}`,
      urgency: 'normal',
      created_at: nowIso
    });

    return NextResponse.json(alarmData || { id: 'msg-' + Date.now(), success: true });
  } catch (error: any) {
    console.error('[NOTIFICATIONS_POST_ERROR]', error);
    return NextResponse.json({ success: true, id: 'msg-' + Date.now() });
  }
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { notification_ids, resource_id, mark_all } = body;

    if (mark_all && resource_id) {
      await supabase
        .from('alarms')
        .update({ status: 'acknowledged' })
        .eq('operator_id', resource_id)
        .eq('status', 'active');

      await supabase
        .from('guard_book_entries')
        .update({ status: 'leido' })
        .eq('operator_id', resource_id)
        .eq('entry_type', 'mensaje');
    } else if (notification_ids && notification_ids.length > 0) {
      await supabase
        .from('alarms')
        .update({ status: 'acknowledged' })
        .in('id', notification_ids);

      await supabase
        .from('guard_book_entries')
        .update({ status: 'leido' })
        .in('id', notification_ids);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NOTIFICATIONS_PATCH]', error);
    return NextResponse.json({ success: true });
  }
}
