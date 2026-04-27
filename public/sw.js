// 704 Service Worker — V3 (Network-First with Offline Fallback)
const CACHE_NAME = 'sps-v3';
const OLD_CACHES = ['sps-v1', 'sps-v2'];

const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

// INSTALL: Cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ACTIVATE: Purge old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH: Network-First Strategy with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests (API calls, auth, etc.)
  if (event.request.method !== 'GET') return;
  
  // Skip API routes and auth callbacks
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.includes('auth')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If successful, clone it to the cache
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails, serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          // For navigation requests, serve the cached login page
          if (event.request.mode === 'navigate') {
            return caches.match('/login');
          }
          
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
