// Cross-platform install experience
let deferredPrompt = null;
let installed = false;

export function setupInstallDetector({ onChange } = {}) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    onChange?.({ canInstall: true, installed });
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    onChange?.({ canInstall: false, installed });
  });

  // iOS doesn't fire beforeinstallprompt; expose hint
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isIOS && isSafari) {
    onChange?.({ canInstall: false, installed, iosA2HS: true });
  }
}

export async function promptInstall() {
  if (!deferredPrompt) {
    // Fallback for browsers without the event (e.g., iOS Safari)
    return { outcome: 'unsupported' };
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return { outcome };
}
