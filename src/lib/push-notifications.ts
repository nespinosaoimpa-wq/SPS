/**
 * 704 OS Native Push Notification & Emergency Siren Utility
 * High-volume audio alert engine and Web Push notifications.
 */

export interface NativeNotificationOptions {
  title: string;
  body: string;
  image?: string | null;
  icon?: string;
  url?: string;
  tag?: string;
  sound?: boolean;
  type?: 'normal' | 'emergency';
  requireInteraction?: boolean;
  vibrate?: number[];
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[Push] Permission request error:', e);
    return false;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  } catch (e) {
    console.warn('[Push] Service worker registration failed:', e);
    return null;
  }
}

/**
 * Subscribe this device to real Web Push notifications via VAPID.
 * Stores the subscription endpoint in Supabase so the server can push to it.
 */
export async function subscribeToPush(userId: string, resourceId?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('PushManager' in window)) return false;

  try {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn('[Push] VAPID public key not configured');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Convert VAPID key to Uint8Array
      const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
      const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // Send subscription to server
    const subJson = subscription.toJSON();
    await fetch('/api/notifications/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        user_id: userId,
        resource_id: resourceId || userId,
        subscription: {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth
          }
        }
      })
    });

    console.log('[Push] ✅ Device subscribed to Web Push successfully');
    return true;
  } catch (e) {
    console.warn('[Push] Subscribe error:', e);
    return false;
  }
}

// ─── MASTER AUDIO CONTEXT & SIREN ENGINE ───
let masterAudioCtx: AudioContext | null = null;
let activeAlarmOsc1: OscillatorNode | null = null;
let activeAlarmOsc2: OscillatorNode | null = null;
let activeAlarmGain: GainNode | null = null;
let activeAlarmInterval: any = null;

export function unlockAudioContext() {
  if (typeof window === 'undefined') return;
  try {
    if (!masterAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        masterAudioCtx = new AudioCtx();
      }
    }
    if (masterAudioCtx && masterAudioCtx.state === 'suspended') {
      masterAudioCtx.resume();
    }
  } catch (e) {
    console.warn('[AudioUnlock] Error:', e);
  }
}

// Auto-bind audio unlocker on user interactions
if (typeof window !== 'undefined') {
  const unlockOnGesture = () => {
    unlockAudioContext();
  };
  window.addEventListener('click', unlockOnGesture);
  window.addEventListener('touchstart', unlockOnGesture);
  window.addEventListener('keydown', unlockOnGesture);
}

/**
 * Start soft, professional Hombre Vivo chime & subtle vibration pulse.
 * Plays a gentle 2-tone harmonic chime every 1.8s until stopCrazyHombreVivoAlarm() is called.
 */
export function startCrazyHombreVivoAlarm() {
  if (typeof window === 'undefined') return;
  unlockAudioContext();

  stopCrazyHombreVivoAlarm(); // Reset existing instance

  try {
    const ctx = masterAudioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    masterAudioCtx = ctx;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playSoftChime = () => {
      if (!masterAudioCtx) return;
      try {
        const now = masterAudioCtx.currentTime;
        const osc1 = masterAudioCtx.createOscillator();
        const osc2 = masterAudioCtx.createOscillator();
        const gain = masterAudioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterAudioCtx.destination);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.start(now);
        osc1.stop(now + 0.2);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([150, 100, 150]);
        }
      } catch (e) {}
    };

    playSoftChime();
    activeAlarmInterval = setInterval(playSoftChime, 1800);

  } catch (e) {
    console.warn('[HombreVivoAudio] Error:', e);
  }
}

/**
 * Stop emergency siren and clear vibration
 */
export function stopCrazyHombreVivoAlarm() {
  try {
    if (activeAlarmInterval) {
      clearInterval(activeAlarmInterval);
      activeAlarmInterval = null;
    }
    if (activeAlarmOsc1) {
      activeAlarmOsc1.stop();
      activeAlarmOsc1.disconnect();
      activeAlarmOsc1 = null;
    }
    if (activeAlarmOsc2) {
      activeAlarmOsc2.stop();
      activeAlarmOsc2.disconnect();
      activeAlarmOsc2 = null;
    }
    if (activeAlarmGain) {
      activeAlarmGain.disconnect();
      activeAlarmGain = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  } catch (e) {
    console.warn('[CrazyAlarm] Stop error:', e);
  }
}

/**
 * Display a native OS notification with title, body, and thumbnail image
 */
export async function showNativeNotification(options: NativeNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (options.sound) {
    if (options.type === 'emergency') {
      startCrazyHombreVivoAlarm();
    } else {
      playAlertTone('normal');
    }
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    const notificationTitle = options.title || '🚨 704 OS Táctico';
    const notificationOptions: any = {
      body: options.body,
      icon: options.icon || '/logo_704.jpeg',
      image: options.image || undefined,
      badge: '/icons/icon-192x192.png',
      vibrate: options.vibrate || [500, 150, 500, 150, 800],
      tag: options.tag || '704-notification-' + Date.now(),
      requireInteraction: options.requireInteraction ?? (options.type === 'emergency'),
      renotify: true,
      data: {
        url: options.url || '/operador'
      }
    };

    if (registration && 'showNotification' in registration) {
      await registration.showNotification(notificationTitle, notificationOptions);
      return true;
    }

    const n = new Notification(notificationTitle, notificationOptions);
    n.onclick = () => {
      window.focus();
      if (options.url) window.location.href = options.url;
    };
    return true;
  } catch (e) {
    console.warn('[Push] Failed to show native notification:', e);
    return false;
  }
}

export function playAlertTone(type: 'normal' | 'emergency' = 'normal') {
  if (type === 'emergency') {
    startCrazyHombreVivoAlarm();
    return;
  }
  if (typeof window === 'undefined') return;

  try {
    unlockAudioContext();
    const ctx = masterAudioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}
