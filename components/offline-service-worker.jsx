"use client";

import { useEffect } from "react";

export default function OfflineServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline fallback is progressive enhancement; don't interrupt the site if registration fails.
    });
  }, []);

  return null;
}
