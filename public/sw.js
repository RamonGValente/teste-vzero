// ============================================
// SERVICE WORKER PARA WORLD FLOW
// ============================================

// Cache name
const CACHE_NAME = 'worldflow-v1';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/notification.mp3',
  '/badge-72.png',
  '/icon-192x192.png',
  '/notification-sound.mp3'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: Todos os assets cacheados');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Erro ao cachear assets:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Cache limpo, assumindo controle');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Não fazer cache para APIs
  const url = new URL(event.request.url);
  
  if (url.pathname.includes('/api/') || 
      url.pathname.includes('.netlify/functions/') ||
      url.hostname.includes('supabase.co') ||
      event.request.method !== 'GET') {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          // If both cache and network fail, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  console.log('Service Worker: Push recebido', event.data ? event.data.text() : 'Sem dados');
  
  if (!event.data) {
    console.warn('Service Worker: Push sem dados');
    return;
  }
  
  let payload;
  try {
    payload = event.data.json();
    console.log('Service Worker: Payload JSON:', payload);
  } catch (e) {
    console.log('Service Worker: Dados não são JSON, usando texto');
    const textData = event.data.text();
    payload = {
      title: "World Flow",
      body: textData || "Nova notificação",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: "general",
      data: { url: "/news" }
    };
  }

  const title = payload.title || "World Flow";
  const options = {
    body: payload.body || "Nova notificação",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/badge-72.png",
    image: payload.image,
    tag: payload.tag || "general",
    data: payload.data || { url: payload.url || "/news" },
    vibrate: payload.vibrate || [200, 100, 200],
    timestamp: payload.timestamp || Date.now(),
    requireInteraction: payload.requireInteraction || false,
    silent: payload.silent || false,
    renotify: payload.renotify || false,
    actions: payload.actions || [
      {
        action: "open",
        title: "Abrir"
      },
      {
        action: "dismiss",
        title: "Fechar"
      }
    ]
  };

  console.log('Service Worker: Exibindo notificação:', title, options);
  
  // Wait until the notification is shown
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('Service Worker: Notificação exibida com sucesso');
        
        // Tocar som de notificação se disponível
        if (!options.silent) {
          // Tentar tocar som via API de áudio
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'PLAY_NOTIFICATION_SOUND'
              });
            });
          });
        }
      })
      .catch(error => {
        console.error('Service Worker: Erro ao exibir notificação:', error);
      })
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log('Service Worker: Notificação clicada:', event.notification.tag);
  event.notification.close();

  // Handle action buttons
  if (event.action === "dismiss" || event.action === "close") {
    console.log('Service Worker: Notificação descartada');
    return;
  }

  const urlToOpen = event.notification.data?.url || "/news";

  event.waitUntil(
    clients.matchAll({ 
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        
        if (clientUrl.pathname === targetUrl.pathname && "focus" in client) {
          console.log('Service Worker: Focando janela existente');
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        console.log('Service Worker: Abrindo nova janela:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    }).catch(error => {
      console.error('Service Worker: Erro ao lidar com clique de notificação:', error);
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notificação fechada:', event.notification.tag);
});

// ============================================
// BACKGROUND SYNC
// ============================================

// Background sync for offline support
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sync event:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      syncNotifications()
    );
  } else if (event.tag === 'sync-pending-subscriptions') {
    event.waitUntil(
      syncPendingSubscriptions()
    );
  }
});

async function syncNotifications() {
  try {
    console.log('Service Worker: Sincronizando notificações offline...');
    
    // Verificar se há notificações pendentes no localStorage (via clients)
    const clients = await self.clients.matchAll();
    let pendingNotifications = [];
    
    for (const client of clients) {
      const response = await client.postMessage({
        type: 'GET_PENDING_NOTIFICATIONS'
      });
      
      // Note: Isso requer implementação no cliente
      if (response && response.pending) {
        pendingNotifications = pendingNotifications.concat(response.pending);
      }
    }
    
    console.log('Service Worker: Notificações pendentes:', pendingNotifications.length);
    
    // Aqui você implementaria o envio das notificações pendentes para o servidor
    if (pendingNotifications.length > 0) {
      // Exemplo: Enviar para o servidor
      // await fetch('/api/sync-notifications', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ notifications: pendingNotifications })
      // });
    }
    
  } catch (error) {
    console.error('Service Worker: Erro na sincronização:', error);
  }
}

async function syncPendingSubscriptions() {
  try {
    console.log('Service Worker: Sincronizando inscrições pendentes...');
    
    // Verificar se há inscrições pendentes no localStorage
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/pending-subscriptions');
    
    if (response) {
      const pendingSubscriptions = await response.json();
      
      // Enviar cada subscription pendente para o servidor
      for (const sub of pendingSubscriptions) {
        try {
          const result = await fetch('/.netlify/functions/save-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub)
          });
          
          if (result.ok) {
            console.log('Service Worker: Subscription enviada com sucesso');
            // Remover da lista de pendentes
            // Implementar lógica de remoção
          }
        } catch (error) {
          console.error('Service Worker: Erro ao enviar subscription:', error);
        }
      }
    }
    
  } catch (error) {
    console.error('Service Worker: Erro na sincronização de subscriptions:', error);
  }
}

// ============================================
// PERIODIC SYNC (para atualizações em background)
// ============================================

if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    console.log('Service Worker: Periodic sync:', event.tag);
    
    if (event.tag === 'update-notifications') {
      event.waitUntil(
        updateNotificationsInBackground()
      );
    }
  });
}

async function updateNotificationsInBackground() {
  console.log('Service Worker: Atualizando notificações em background...');
  
  try {
    // Buscar novas notificações do servidor
    const response = await fetch('/api/get-notifications', {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.ok) {
      const notifications = await response.json();
      
      // Armazenar notificações no cache
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/background-notifications', new Response(JSON.stringify(notifications)));
      
      console.log('Service Worker: Notificações atualizadas em background:', notifications.length);
      
      // Notificar clientes sobre novas notificações
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_NOTIFICATIONS_UPDATE',
          data: { count: notifications.length }
        });
      });
    }
  } catch (error) {
    console.error('Service Worker: Erro ao atualizar notificações em background:', error);
  }
}

// ============================================
// MESSAGE HANDLING (comunicação com clientes)
// ============================================

self.addEventListener('message', (event) => {
  console.log('Service Worker: Mensagem recebida do cliente:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'TEST_NOTIFICATION':
      self.registration.showNotification("Teste do World Flow", {
        body: "Esta é uma notificação de teste do Service Worker!",
        icon: "/icon-192.png",
        badge: "/badge-72.png",
        tag: "test",
        data: { url: "/news" }
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'GET_SUBSCRIPTION':
      self.registration.pushManager.getSubscription().then(subscription => {
        event.ports[0].postMessage({ subscription });
      });
      break;
  }
});

// ============================================
// UTILIDADES
// ============================================

// Função para verificar se está dentro do horário silencioso
function isQuietHours(startTime, endTime) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  if (startTotalMinutes <= endTotalMinutes) {
    // Horário normal (dentro do mesmo dia)
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
  } else {
    // Horário que atravessa a meia-noite
    return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes < endTotalMinutes;
  }
}

// Função para tocar som de notificação
function playNotificationSound() {
  // Esta função seria chamada quando uma notificação é recebida
  // O som real é tocado no cliente, não no Service Worker
  console.log('Service Worker: Solicitando reprodução de som de notificação');
}