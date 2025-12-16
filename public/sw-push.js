// ============================================
// PUSH HANDLERS (importado pelo SW do Workbox)
// ============================================
// Este arquivo é carregado via workbox.importScripts pelo vite-plugin-pwa.
// Ele NÃO cria um novo Service Worker; apenas adiciona handlers de push/click.

function parsePushPayload(event) {
  const fallback = {
    title: 'UDG',
    body: 'Nova notificação',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'udg-general',
    url: '/news',
    data: {},
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' }
    ]
  };

  if (!event.data) return fallback;

  try {
    const json = event.data.json();
    const merged = { ...fallback, ...json };
    merged.body = json.body ?? json.message ?? fallback.body;
    merged.url = json.url ?? json?.data?.url ?? fallback.url;
    merged.data = { ...fallback.data, ...(json.data || {}), url: merged.url };
    return merged;
  } catch (e) {
    const text = event.data.text();
    return { ...fallback, body: text || fallback.body };
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);

  const title = payload.title || 'UDG';
  const options = {
    body: payload.body || 'Nova notificação',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'udg-general',
    data: payload.data || { url: payload.url || '/news' },
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    renotify: Boolean(payload.renotify),
    timestamp: payload.timestamp || Date.now(),
    vibrate: payload.vibrate || [200, 100, 200],
    actions: payload.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/news';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const target = new URL(urlToOpen, self.location.origin);
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === target.pathname && 'focus' in client) {
            return client.focus();
          }
        } catch (_) {
          // ignore
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
