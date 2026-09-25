import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { sendPushToUser, VAPID_PUBLIC_KEY } from '@/lib/web-push-config';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();
    const { action } = body;

    // ─── SUBSCRIBE: Store push subscription from operator's device ───
    if (action === 'subscribe') {
      const { subscription, user_id, resource_id } = body;
      if (!subscription?.endpoint || !subscription?.keys) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
      }

      const p256dh = subscription.keys.p256dh;
      const authKey = subscription.keys.auth;

      if (!p256dh || !authKey) {
        return NextResponse.json({ error: 'Missing p256dh or auth keys' }, { status: 400 });
      }

      // Remove any existing subscription for this endpoint to prevent duplicates
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      // Insert subscription records matching the real columns: id, user_id, endpoint, p256dh, auth_key
      const rowsToInsert = [
        {
          user_id: String(user_id || 'unknown'),
          endpoint: subscription.endpoint,
          p256dh: p256dh,
          auth_key: authKey,
        }
      ];

      if (resource_id && String(resource_id) !== String(user_id)) {
        rowsToInsert.push({
          user_id: String(resource_id),
          endpoint: subscription.endpoint,
          p256dh: p256dh,
          auth_key: authKey,
        });
      }

      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert(rowsToInsert)
        .select();

      if (error) {
        console.error('[PushSubscribe] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: data?.length, message: 'Push subscription stored' });
    }

    // ─── UNSUBSCRIBE: Remove push subscription ───
    if (action === 'unsubscribe') {
      const { endpoint } = body;
      if (endpoint) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }
      return NextResponse.json({ success: true });
    }

    // ─── SEND: Send real Web Push notification to a specific user ───
    if (action === 'send') {
      const { resource_id, notification } = body;
      if (!resource_id) {
        return NextResponse.json({ error: 'resource_id is required' }, { status: 400 });
      }

      const payload = {
        title: notification?.title || '🚨 704 OS',
        body: notification?.body || 'Tenés una nueva alerta.',
        icon: notification?.icon || '/logo_704.jpeg',
        image: notification?.image || undefined,
        url: notification?.url || '/operador',
        tag: notification?.tag || '704-push-' + Date.now(),
        vibrate: notification?.vibrate || [500, 150, 500, 150, 800],
        requireInteraction: notification?.requireInteraction ?? false
      };

      const result = await sendPushToUser(resource_id, payload);
      return NextResponse.json({ success: true, ...result });
    }

    // ─── GET VAPID PUBLIC KEY ───
    if (action === 'vapid-key') {
      return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUSH_NOTIFICATION_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Push error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}
