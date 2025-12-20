import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure the PWA service worker is registered as early as possible.
// This improves installability on some Android devices (including some Xiaomi models)
// where the install option appears only after the SW controls the page.
import { registerSW } from 'virtual:pwa-register';

// We keep a global handle so UI components can trigger an update reliably.
// (Avoids duplicating registerSW calls across the app.)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event('pwa:need-refresh'));
  },
  onOfflineReady() {
    window.dispatchEvent(new Event('pwa:offline-ready'));
  },
  onRegisteredSW(_swUrl, registration) {
    // eslint-disable-next-line no-console
    console.log('[PWA] Service worker registered');
    (window as any).__swRegistration = registration;
  },
  onRegisterError(error) {
    // eslint-disable-next-line no-console
    console.log('[PWA] Service worker register error', error);
  },
});

(window as any).__updateSW = updateSW;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
