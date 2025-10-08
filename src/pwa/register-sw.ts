// PWA registration with scope restricted to /pwa/
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/pwa/sw.js', { scope: '/pwa/' })
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.error('SW registration failed:', err));
    });
  }
}
