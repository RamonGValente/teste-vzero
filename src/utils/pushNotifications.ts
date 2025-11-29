import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPush(userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn("VITE_VAPID_PUBLIC_KEY não configurada; push desabilitado.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const reg = await navigator.serviceWorker.register("/sw.js");

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const raw = sub.toJSON();

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: raw.endpoint,
      keys_p256dh: raw.keys?.p256dh,
      keys_auth: raw.keys?.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
}
