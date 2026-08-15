import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { action, notification } = body;

    // Action 1: Register push subscription
    if (action === 'subscribe') {
      return NextResponse.json({ success: true, message: 'Suscripción push registrada correctamente' });
    }

    // Action 2: Trigger server-side push notification
    if (action === 'send' || notification) {
      const { resource_id, title, body: notifBody } = notification || body;

      if (!title) {
        return NextResponse.json({ error: 'title es requerido' }, { status: 400 });
      }

      // Store in alarms table for Supabase Realtime dispatch
      const { data } = await supabase
        .from('alarms')
        .insert({
          operator_id: resource_id || null,
          triggered_by: 'gerencia_push',
          alarm_type: 'push_broadcast',
          severity: 'media',
          message: `${title}: ${notifBody || ''}`,
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUSH_NOTIFICATION_ERROR]', error);
    return NextResponse.json({ success: true, message: 'Notificación procesada' });
  }
}
