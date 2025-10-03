const VERSION = 'undoing-sw-v4';
const CORE = [
  '/', '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/pwa/pwa.css',
  '/pwa/pwa.js',
  '/pwa/lockdown.js',
  '/pwa/config.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const copy = fresh.clone();
        const cache = await caches.open(VERSION);
        cache.put(url.pathname === '/' ? '/' : req, copy);
        return fresh;
      } catch (err) {
        const cache = await caches.open(VERSION);
        return (await cache.match(req)) || (await cache.match('/offline.html'));
      }
    })());
    return;
  }
  if (req.method === 'GET') {
    e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    })));
  }
});

// Update flow
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
