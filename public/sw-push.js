/* Push handler imported by Workbox service worker */

const parsePushData = (event) => {
  if (!event?.data) return {};
  try { return event.data.json(); } catch {
    try { return { title: 'Notificação', body: event.data.text() }; } catch { return {}; }
  }
};

self.addEventListener('push', (event) => {
  const payload = parsePushData(event);
  const title = payload.title || 'UDG';
  const body = payload.body || '';
  const icon = payload.icon || '/icon-192.png';
  const badge = payload.badge || '/icon-192.png';
  const image = payload.image;
  const data = payload.data || {};
  const tag = payload.tag || 'udg';

  event.waitUntil((async () => {
    // when app is open, also notify pages (sound/toast)
    try {
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clientsArr) {
        c.postMessage({ type: 'PUSH_RECEIVED', payload: { title, body, icon, image, data, tag } });
      }
    } catch {}

    await self.registration.showNotification(title, {
      body,
      icon,
      badge,
      image,
      data,
      tag,
      renotify: true,
      requireInteraction: false,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification?.data && event.notification.data.url) ? event.notification.data.url : '/';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url.includes(url)) {
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
