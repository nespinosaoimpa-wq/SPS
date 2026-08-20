// 704 Service Worker — V7 (Ultra-Safe Mapbox Cache-First + Web Push Notifications)
const CACHE_NAME = 'sps-v7';

// Minimal list of critical static assets (DO NOT cache HTML routes)
const ASSETS_TO_CACHE = [
  '/icons/icon-192x192.png',
  '/icons/apple-touch-icon.png',
  '/logo_704.jpeg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => console.warn('SW Install: partial asset cache failure')))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // NEVER intercept API, auth, Next.js internal calls, or navigation requests.
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('auth') || 
    url.pathname.includes('_next') ||
    event.request.mode === 'navigate'
  ) {
    return;
  }

  // Cache-First for Mapbox Tiles (Saves 99.9% of map data transfer on Vercel)
  if (url.hostname.includes('mapbox.com') && (url.pathname.includes('/tiles/') || url.pathname.includes('/fonts/'))) {
    event.respondWith(
      caches.open('mapbox-tiles-v2').then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res.status === 200) {
              cache.put(event.request, res.clone());
            }
            return res;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
    return;
  }

  // Network-first for static assets
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(m => m || new Response('', { status: 404 })))
  );
});

// ─── WEB PUSH NOTIFICATIONS LISTENER ───
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '⚡ CONTROL DE HOMBRE VIVO';
  const options = {
    body: data.body || 'Gerencia requiere tu verificación de presencia inmediata. Toca para responder.',
    icon: data.icon || '/logo_704.jpeg',
    image: data.image || data.thumbnail || null,
    badge: data.badge || '/icons/icon-192x192.png',
    vibrate: data.vibrate || [500, 150, 500, 150, 500, 150, 800],
    tag: data.tag || '704-hombre-vivo-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/operador',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── NOTIFICATION CLICK LISTENER ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/operador';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── SPRINT 3: KEEPALIVE LISTENER ───
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEPALIVE') {
    event.source.postMessage({ type: 'KEEPALIVE_ACK', timestamp: Date.now() });
  }
});
