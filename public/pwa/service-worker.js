// Lightweight service worker with offline-first for navigation and static assets
const CACHE_NAME = 'pwa-shell-v1';
const CORE_ASSETS = [
  '/', 
  '/index.html',
  '/pwa/pwa.css',
  '/pwa/pwa.js',
  '/pwa/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Network falling back to cache for navigations, cache-first for static
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('/', copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // cache-first for GET
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return res;
      }))
    );
  }
});
