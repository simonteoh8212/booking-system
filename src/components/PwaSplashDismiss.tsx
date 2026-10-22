"use client";

import { useEffect } from "react";

export function PwaSplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("pwa-splash");
    if (!splash) return;

    // Smoothly fade out the splash screen once React client components hydrate
    const timer = setTimeout(() => {
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      setTimeout(() => {
        splash.style.display = "none";
      }, 350);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
