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
 * Start high-volume continuous emergency siren & vibration loop
 * Plays non-stop until stopCrazyHombreVivoAlarm() is called.
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

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    // Full Volume 1.0
    gain.gain.setValueAtTime(1.0, ctx.currentTime);

    const now = ctx.currentTime;
    osc1.frequency.setValueAtTime(850, now);
    osc2.frequency.setValueAtTime(1300, now);

    osc1.start(now);
    osc2.start(now);

    activeAlarmOsc1 = osc1;
    activeAlarmOsc2 = osc2;
    activeAlarmGain = gain;

    let step = 0;
    activeAlarmInterval = setInterval(() => {
      if (!masterAudioCtx || !activeAlarmGain) return;
      const t = masterAudioCtx.currentTime;
      step++;
      const freq1 = step % 2 === 0 ? 850 : 1450;
      const freq2 = step % 2 === 0 ? 1200 : 1800;

      if (activeAlarmOsc1) activeAlarmOsc1.frequency.setValueAtTime(freq1, t);
      if (activeAlarmOsc2) activeAlarmOsc2.frequency.setValueAtTime(freq2, t);

      // Hardware vibration pulse non-stop
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([600, 100, 600, 100]);
      }
    }, 220);

  } catch (e) {
    console.warn('[CrazyAlarm] Audio playback error:', e);
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
