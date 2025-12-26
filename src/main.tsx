import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register the PWA service worker ONCE, as early as possible.
// (Update prompts are shown after login by <PwaUpdateListener />.)
import { initPWAUpdate } from "@/utils/pwaUpdate";

initPWAUpdate();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
