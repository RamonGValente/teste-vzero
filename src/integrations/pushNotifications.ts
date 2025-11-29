import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Converte a chave base64 url-safe para Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra o service worker e cria a subscription de push para o usuário logado.
 */
export async function registerPushSubscription(userId: string) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications não suportado neste navegador.");
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn("VITE_VAPID_PUBLIC_KEY não configurada.");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    let subscription = existing;
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    if (!subscription) return;

    const payload = subscription.toJSON();

    await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: payload.endpoint,
      expiration_time: payload.expirationTime,
      keys_p256dh: payload.keys?.p256dh ?? null,
      keys_auth: payload.keys?.auth ?? null,
    });
  } catch (error) {
    console.error("Erro ao registrar push subscription:", error);
  }
}
