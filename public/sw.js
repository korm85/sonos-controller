// MikSonos Service Worker — enables PWA install
const CACHE = 'miksonos-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(['/', '/manifest.json']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only cache static assets from our server
  const url = new URL(e.request.url);
  if (url.hostname === '192.168.1.214' || url.hostname === 'localhost') {
    // API calls — network only
    if (url.pathname.startsWith('/api/')) {
      e.respondWith(fetch(e.request));
      return;
    }
    // Static files — cache first, network fallback
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});
