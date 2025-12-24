/* eslint-disable no-restricted-globals */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Precache gerado pelo VitePWA/Workbox
precacheAndRoute(self.__WB_MANIFEST);

// -----------------------------
// PUSH NOTIFICATIONS
// -----------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    const text = event.data.text();
    payload = { title: "UDG", body: text || "Nova notificação", url: "/news" };
  }

  const title = payload.title || "UDG";
  const options = {
    body: payload.body || "Nova notificação",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icons/icon-72.png",
    tag: payload.tag || "push",
    data: {
      url: payload.url || "/news",
      soundUrl: payload.soundUrl || "/sounds/push.mp3",
      ...(payload.data || {}),
    },
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      // Se o app estiver aberto, toque som via postMessage
      try {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of clients) {
          c.postMessage({ type: "PLAY_NOTIFICATION_SOUND", soundUrl: options.data.soundUrl });
        }
      } catch {}
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event?.notification?.data?.url || "/news";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Preferir focar aba existente
      for (const client of allClients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return;
        }
      }

      // Senão, abrir nova aba
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
