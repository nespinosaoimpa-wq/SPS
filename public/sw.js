// 704 Service Worker — V4 (Safer Network-First Strategy)
const CACHE_NAME = 'sps-v4';

// Minimal list of critical assets
const ASSETS_TO_CACHE = [
  '/login',
  '/icons/icon-192x192.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  // Skip internal next assets and API/Auth
  if (url.pathname.startsWith('/api/') || url.pathname.includes('auth') || url.pathname.includes('_next')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(m => m || caches.match('/login')))
  );
});
