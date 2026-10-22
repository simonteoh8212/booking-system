"use client";

import { useEffect } from "react";

/**
 * Registers the Service Worker (`/sw.js`) once the page is loaded.
 * This enables the app-shell cache strategy that eliminates the black
 * screen when launching from a home screen shortcut (Chrome or Safari).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Wait until the window is fully loaded to avoid competing with
    // critical resources on the first load.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          // Check for updates on every page load
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
