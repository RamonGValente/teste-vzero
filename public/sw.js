// Very simple service worker for root scope
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  clients.claim();
});
self.addEventListener('fetch', (event) => {
  // passthrough
});
