/* 
  Modern PWA Service Worker
  - Precaching of core shell
  - Runtime caching with stale-while-revalidate
  - Navigation preload + offline fallback
  - Auto-update with skipWaiting + clients.claim
*/
const VERSION = 'v1-' + (self.registration?.scope || '') + '-' + '2025-09-30';
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

// Customize these for your app shell
const CORE_ASSETS = [
  '/', 
  '/offline.html', 
  '/manifest.webmanifest',
  // Add your main CSS/JS bundles here if they are static paths, e.g.:
  // '/assets/index.css', '/assets/index.js'
];

// Enable Navigation Preload for faster navigations
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    // clean old caches
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('precache-') || k.startsWith('runtime-')) && k !== PRECACHE && k !== RUNTIME ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PRECACHE).then((cache) => cache.addAll(CORE_ASSETS)));
});

// Utility: SWR strategy
async function staleWhileRevalidate(request, cacheName = RUNTIME) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((response) => {
    // Only cache successful, basic/opaque responses for GET
    try {
      if (response && request.method === 'GET' && (response.ok || response.type === 'opaqueredirect' || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
    } catch {}
    return response;
  }).catch(() => undefined);
  return cached || networkFetch || undefined;
}

// Handle navigations: try preload -> network -> cache -> offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate' || (request.destination === '' && request.headers.get('accept')?.includes('text/html'));

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const network = await fetch(request);
        return network;
      } catch (err) {
        const cache = await caches.open(PRECACHE);
        const cached = await cache.match('/offline.html');
        return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  // Images: Cache First with SWR refresh in background
  if (request.destination === 'image') {
    event.respondWith((async () => {
      const cache = await caches.open('images-' + VERSION);
      const cached = await cache.match(request);
      const network = fetch(request).then((res) => {
        try {
          if (res && res.ok) cache.put(request, res.clone());
        } catch {}
        return res;
      }).catch(() => undefined);
      return cached || network || (await caches.match('/icons/icon-192.png'));
    })());
    return;
  }

  // API GETs: SWR (works well with Supabase/REST when GET)
  if (url.origin !== self.location.origin && request.method === 'GET') {
    event.respondWith(staleWhileRevalidate(request, 'x-origin-' + url.origin));
    return;
  }

  // Same-origin GET: SWR
  event.respondWith(staleWhileRevalidate(request));
});

// Listen for "SKIP_WAITING" messages to activate a new SW immediately
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
