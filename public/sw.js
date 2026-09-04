// 704 Service Worker — V10 (Instant Fresh Navigation + Automatic Cache Purge)
const CACHE_NAME = 'sps-v10-static';
const RUNTIME_CACHE = 'sps-v10-runtime';

const ASSETS_TO_CACHE = [
  '/',
  '/operador',
  '/gerente',
  '/logo_704.jpeg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/maskable-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE && k !== 'mapbox-tiles-v2').map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // 1. Bypass API routes and Supabase calls
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    return;
  }

  // 2. Cache-First for Mapbox Tiles & Fonts
  if (url.hostname.includes('mapbox.com') && (url.pathname.includes('/tiles/') || url.pathname.includes('/fonts/'))) {
    event.respondWith(
      caches.open('mapbox-tiles-v2').then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res.status === 200) cache.put(event.request, res.clone());
            return res;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
    return;
  }

  // 3. Cache-First for Next.js Static Assets
  if (url.pathname.includes('/_next/static/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res.status === 200) cache.put(event.request, res.clone());
            return res;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
    return;
  }

  // 4. Network-First for Navigation (Ensures instant updates for page navigations)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkRes) => {
        if (networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return networkRes;
      }).catch(() => caches.match(event.request).then(cached => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Default Stale-While-Revalidate for other GET requests
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkRes) => {
        if (networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return networkRes;
      }).catch(() => cached || new Response('Offline', { status: 503 }));

      return cached || fetchPromise;
    })
  );
});

// ─── WEB PUSH NOTIFICATION HANDLER ───
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } 
    catch (e) { data = { body: event.data.text() }; }
  }

  const title = data.title || '⚡ CONTROL DE HOMBRE VIVO';
  const options = {
    body: data.body || 'Gerencia requiere tu verificación de presencia inmediata.',
    icon: data.icon || '/logo_704.jpeg',
    badge: '/icons/icon-192x192.png',
    vibrate: data.vibrate || [500, 150, 500, 150, 500, 150, 800],
    tag: data.tag || '704-push-' + Date.now(),
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    data: {
      url: data.url || '/operador',
      alarm_id: data.data?.alarm_id || null,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: options.data
          });
        });
      });
    })
  );
});

// ─── NOTIFICATION CLICK ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/operador';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEPALIVE') {
    event.source.postMessage({ type: 'KEEPALIVE_ACK', timestamp: Date.now() });
  }
});
