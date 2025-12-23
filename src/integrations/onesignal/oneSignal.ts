/* OneSignal Web SDK (v16) helper */

export type OneSignalLike = any;

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

export async function getOneSignal(timeoutMs = 7000): Promise<OneSignalLike | null> {
  if (typeof window === 'undefined') return null;
  if (window.OneSignal) return window.OneSignal as OneSignalLike;

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(() => {
      window.clearTimeout(timer);
      resolve((window.OneSignal as OneSignalLike) ?? null);
    });
  });
}

export async function withOneSignal(
  fn: (os: OneSignalLike) => void | Promise<void>,
  timeoutMs = 7000
): Promise<void> {
  const os = await getOneSignal(timeoutMs);
  if (!os) return;
  try {
    await fn(os);
  } catch (err) {
    console.warn('[OneSignal] erro', err);
  }
}
