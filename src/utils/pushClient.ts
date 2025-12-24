import { supabase } from '@/integrations/supabase/client';
import { getOneSignal } from '@/integrations/onesignal/oneSignal';

export type PushEventType = 'message' | 'mention' | 'attention_call' | 'friend_request' | 'comment' | 'post' | 'test';

export type SendPushEventPayload =
  | { eventType: 'message'; messageId: string }
  | { eventType: 'mention'; mentionId: string }
  | { eventType: 'attention_call'; attentionCallId: string }
  | { eventType: 'friend_request'; friendRequestId: string }
  | { eventType: 'comment'; commentId: string }
  | { eventType: 'post'; postId: string }
  | { eventType: 'test' };

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!('serviceWorker' in navigator)) return null;
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getPushPermissionState(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission;
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  const os = await getOneSignal();
  if (!os?.User?.PushSubscription) return false;
  return !!os.User.PushSubscription.optedIn;
}

export async function subscribeToPush(): Promise<boolean> {
  const os = await getOneSignal();
  if (!os?.User?.PushSubscription) return false;

  try {
    // Recommended: request native permission prompt from a user gesture
    try {
      await os?.Notifications?.requestPermission();
    } catch {
      // ignore
    }

    await os.User.PushSubscription.optIn();
  } catch (e) {
    console.warn('[Push] optIn falhou', e);
  }

  return !!os.User.PushSubscription.optedIn;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const os = await getOneSignal();
  if (!os?.User?.PushSubscription) return false;

  try {
    await os.User.PushSubscription.optOut();
  } catch (e) {
    console.warn('[Push] optOut falhou', e);
  }

  return !os.User.PushSubscription.optedIn;
}

async function getSupabaseAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { 'Content-Type': 'application/json' };

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function sendPushEvent(payload: SendPushEventPayload): Promise<void> {
  const headers = await getSupabaseAuthHeaders();

  const res = await fetch('/.netlify/functions/send-push', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`send-push falhou: ${res.status} ${text}`);
  }
}

export async function sendTestPush(): Promise<void> {
  await sendPushEvent({ eventType: 'test' });
}
