// public/sw-push.js
// Handlers de Push/NotificationClick para o Service Worker gerado pelo vite-plugin-pwa (Workbox).

function parsePayload(event) {
  const fallback = {
    title: "UDG",
    body: "Nova notificação",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "udg-general",
    url: "/news",
    data: {},
    actions: [
      { action: "open", title: "Abrir" },
      { action: "dismiss", title: "Fechar" },
    ],
  };

  if (!event.data) return fallback;

  try {
    const json = event.data.json();
    const title = json.title ?? fallback.title;
    const body = json.body ?? json.message ?? fallback.body;
    const url = json.url ?? json?.data?.url ?? fallback.url;
    return {
      ...fallback,
      ...json,
      title,
      body,
      url,
      data: { ...(json.data || {}), url },
    };
  } catch {
    const text = event.data.text();
    return { ...fallback, body: text || fallback.body };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePayload(event);

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    data: payload.data,
    actions: payload.actions,
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    renotify: Boolean(payload.renotify),
    timestamp: payload.timestamp || Date.now(),
    vibrate: payload.vibrate || [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const urlToOpen = event.notification?.data?.url || "/news";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
