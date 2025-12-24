import { registerSW } from 'virtual:pwa-register';

/**
 * Minimal PWA update helper.
 *
 * - `initPWAUpdate()` should be called once (in main.tsx)
 * - components can subscribe via `subscribeToPWAUpdate()`
 * - when `needRefresh` becomes true, show a button that calls `applyPWAUpdate()`
 */

type UpdateSWFn = (reloadPage?: boolean) => Promise<void> | void;

let initialized = false;
let updateSW: UpdateSWFn | null = null;
let needRefresh = false;

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
};

export function initPWAUpdate() {
  if (initialized) return;
  initialized = true;

  updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Try to check updates right away (some devices need a manual update() call).
      try {
        registration?.update();
      } catch {
        // ignore
      }
      // eslint-disable-next-line no-console
      console.log('[PWA] Service worker registered');
    },
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onOfflineReady() {
      // Optional: could show a toast “offline ready”
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.log('[PWA] Service worker register error', error);
    },
  });
}

export function getPWAUpdateState() {
  return { needRefresh };
}

export function subscribeToPWAUpdate(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function applyPWAUpdate() {
  if (!updateSW) return;
  // Passing true triggers skipWaiting and reload.
  await updateSW(true);
}

export async function checkForPWAUpdate() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.update();
  } catch {
    // ignore
  }
}
