"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (Story 1.1 baseline; extended in Epic 4).
 * Registration is a no-op in browsers without service worker support.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // avoid dev caching noise
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal for the app shell.
    });
  }, []);
  return null;
}
