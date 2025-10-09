// Service Worker (basic scaffold). Não altera lógica do sistema — apenas cache básico para PWA.
const CACHE_NAME = 'sistema-pwa-v1';
const PRECACHE_URLS = [
  '/', '/browser-landing.html', '/pwa/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Try network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
