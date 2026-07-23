import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/notifications/push — Save push subscription or send push notification
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { action, subscription, userId, notification } = body;

    // Action 1: Register push subscription
    if (action === 'subscribe' || subscription) {
      if (!userId) {
        return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
      }

      // Upsert subscription into user_push_subscriptions or update resources metadata
      try {
        await supabase.from('resources').update({
          push_subscription: JSON.stringify(subscription),
          last_push_registration: new Date().toISOString()
        }).eq('id', userId);
      } catch (e) {
        console.warn('[PUSH_API] Optional resources column update omitted:', e);
      }

      return NextResponse.json({ success: true, message: 'Suscripción push registrada correctamente' });
    }

    // Action 2: Trigger server-side push notification
    if (action === 'send' || notification) {
      const { resource_id, title, body: notifBody, image, url } = notification || body;

      if (!title) {
        return NextResponse.json({ error: 'title es requerido' }, { status: 400 });
      }

      // Store in notifications table for Supabase Realtime dispatch
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          resource_id: resource_id || 'all',
          type: 'push_broadcast',
          title,
          body: notifBody || '',
          data: {
            image: image || null,
            url: url || '/operador',
            timestamp: Date.now()
          },
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, notification: data });
    }

    return NextResponse.json({ error: 'Acción no válida (subscribe o send)' }, { status: 400 });
  } catch (error: any) {
    console.error('[PUSH_API_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
