import webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase-server';

const DEFAULT_VAPID_PUBLIC_KEY = 'BEqvUtBUz02g4zaA8wZEFvojNGr5cbSi3VPfush3kVrNXydpcV7wsW3t1nfKBGlYuuQ8dOvQxuNqeWLQN58tmvQ';
const DEFAULT_VAPID_PRIVATE_KEY = 'PHk5OwwKy5CJ-hnJ6iba7uEzm1rlWLUFQ-U7TgcsWzI';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:soporte@704seguridad.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn('[WebPush] setVapidDetails error:', e);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

/**
 * Send a real Web Push notification to all devices registered for given user/resource IDs.
 * Cleans up expired subscriptions automatically (404/410).
 * Uses urgency: 'high' to wake up mobile devices when locked/in sleep mode.
 */
export async function sendPushToUser(
  userIds: string | string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[WebPush] VAPID keys not configured, skipping push');
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String);
  if (ids.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const supabase = createServiceClient();
  let sent = 0, failed = 0, cleaned = 0;

  // Query subscriptions matching any of the user/resource IDs
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', ids);

  if (subsError) {
    console.error('[WebPush] Query subscriptions error:', subsError);
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  if (!subs || subs.length === 0) {
    console.log(`[WebPush] No subscriptions found for target IDs: ${ids.join(', ')}`);
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  // De-duplicate subscriptions by endpoint so one device doesn't get duplicate pushes
  const uniqueSubs = Array.from(new Map(subs.map(s => [s.endpoint, s])).values());
  const pushPayloadStr = JSON.stringify(payload);

  // Critical push options for mobile wakeup:
  // TTL = 300s (5 mins for time-sensitive check)
  // urgency = 'high' forces FCM / APNs to wake up the radio on locked phones
  const pushOptions = {
    TTL: 300,
    urgency: 'high' as const,
    headers: {
      'Urgency': 'high'
    }
  };

  for (const sub of uniqueSubs) {
    const p256dh = sub.p256dh || sub.keys_p256dh;
    const auth = sub.auth_key || sub.keys_auth;

    if (!sub.endpoint || !p256dh || !auth) continue;

    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: p256dh,
        auth: auth
      }
    };

    try {
      await webpush.sendNotification(subscription, pushPayloadStr, pushOptions);
      sent++;
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired or unsubscribed, clean up
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
        cleaned++;
      } else {
        console.error(`[WebPush] Error sending to ${sub.endpoint.slice(0, 50)}:`, err?.message || err);
        failed++;
      }
    }
  }

  console.log(`[WebPush] Results for [${ids.join(', ')}]: sent=${sent}, failed=${failed}, cleaned=${cleaned}`);
  return { sent, failed, cleaned };
}

export { VAPID_PUBLIC_KEY };
