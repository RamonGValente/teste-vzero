import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure the PWA service worker is registered as early as possible.
// This improves installability on some Android devices (including some Xiaomi models)
// where the install option appears only after the SW controls the page.
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, _registration) {
    // eslint-disable-next-line no-console
    console.log('[PWA] Service worker registered');
  },
  onRegisterError(error) {
    // eslint-disable-next-line no-console
    console.log('[PWA] Service worker register error', error);
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
