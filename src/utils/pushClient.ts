import { supabase } from '@/integrations/supabase/client';

export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

export const getServiceWorkerRegistration = async () => {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker não suportado');
  return await navigator.serviceWorker.ready;
};

const getAuthHeader = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Usuário não autenticado');
  return { Authorization: `Bearer ${token}` };
};

const getVapidPublicKey = async () => {
  const res = await fetch('/.netlify/functions/get-vapid-public-key');
  if (!res.ok) throw new Error('Não foi possível obter VAPID public key');
  const json = await res.json();
  if (!json?.publicKey) throw new Error('VAPID public key ausente');
  return json.publicKey as string;
};

export const subscribeToPush = async () => {
  if (!isPushSupported()) throw new Error('Push não suportado neste navegador');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificação não concedida');

  const reg = await getServiceWorkerRegistration();
  const publicKey = await getVapidPublicKey();

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const body = { subscription: subscription.toJSON() };

  const resp = await fetch('/.netlify/functions/save-subscription', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Falha ao salvar inscrição: ${msg}`);
  }

  return subscription;
};

export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return false;
  const reg = await getServiceWorkerRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  try {
    const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
    await fetch('/.netlify/functions/delete-subscription', {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {}

  await sub.unsubscribe();
  return true;
};

export const sendPushEvent = async (payload: any) => {
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const resp = await fetch('/.netlify/functions/send-push', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Falha ao enviar push: ${msg}`);
  }
  return await resp.json();
};

export const sendTestPush = async () => {
  return await sendPushEvent({ eventType: 'test' });
};
