import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/notifications?resource_id=X&unread_only=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');

    if (!resourceId) {
      return NextResponse.json({ error: 'resource_id es requerido' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data } = await supabase
      .from('alarms')
      .select('*')
      .or(`operator_id.eq.${resourceId},triggered_by.eq.${resourceId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    const formatted = (data || []).map((a: any) => ({
      id: a.id,
      resource_id: a.operator_id || resourceId,
      type: a.alarm_type || 'general',
      title: a.alarm_type === 'mensaje_gerencia' ? 'Mensaje de Gerencia' : 'Notificación Táctica',
      body: a.message,
      is_read: a.status === 'acknowledged' || a.status === 'resolved',
      created_at: a.created_at
    }));

    return NextResponse.json(formatted);
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
    const msgText = `${title}: ${notifBody || ''}`.trim();

    // 1. Insert into alarms as active message notification
    const { data: alarmData, error: alarmError } = await supabase
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

    if (alarmError) {
      console.warn('[NOTIFICATIONS_POST_ALARM_WARN]', alarmError);
    }

    // 2. Also record in guard_book_entries for audit log
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
    } else if (notification_ids && notification_ids.length > 0) {
      await supabase
        .from('alarms')
        .update({ status: 'acknowledged' })
        .in('id', notification_ids);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NOTIFICATIONS_PATCH]', error);
    return NextResponse.json({ success: true });
  }
}
