import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure the PWA service worker is registered as early as possible.
// (Some Android devices only show the install option after the SW controls the page.)
import { initPWAUpdate } from "@/utils/pwaUpdate";

initPWAUpdate();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
