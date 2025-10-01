// Robust SW registration with update hooks
// --- environment detection ---
function isLocalhostLike(host) {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.localhost') ||
    host === '[::1]'
  );
}

function isLanDevHost(host) {
  // Allow your dev LAN IP explicitly (read from window.location.hostname)
  return host === '192.168.2.116';
}

/**
 * Decide if we *can* try to register a SW here.
 * SW requires secure context (HTTPS), except for localhost/127.0.0.1.
 * 192.168.x.x is NOT considered secure by browsers over HTTP, so we gracefully skip
 * and log instructions to use HTTPS locally (mkcert or dev server --https).
 */
function canUseServiceWorker() {
  const { protocol, hostname } = window.location;
  const secure = (protocol === 'https:' || window.isSecureContext === true);
  if (secure) return true;
  if (protocol === 'http:' && isLocalhostLike(hostname)) return true; // special dev exemption
  // http on LAN will not work for SW (and install prompt) on Chromium/Safari/Firefox.
  return false;
}

export function registerSW(options = {}) {
  if (!('serviceWorker' in navigator)) return;

  if (!canUseServiceWorker()) {
    console.warn('[PWA] SW desabilitado: contexto inseguro (HTTP) fora de localhost). Para usar em LAN (192.168.2.116), rode com HTTPS (mkcert) ou via Netlify dev.');
    options.onRegisterError?.(new Error('Insecure context: use HTTPS or localhost'));
    return;
  }

  const swUrl = options.swUrl || '/sw.js';

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl).then((registration) => {
      // Update found
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            const isUpdate = navigator.serviceWorker.controller;
            if (isUpdate && options.onNeedRefresh) {
              options.onNeedRefresh(() => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              });
            } else if (options.onOfflineReady) {
              options.onOfflineReady();
            }
          }
        });
      });
    }).catch((err) => {
      console.error('[PWA] SW registration failed:', err);
      options.onRegisterError?.(err);
    });

    // Listen for controllerchange (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (options.onUpdated) options.onUpdated();
    });
  });
}
