/* Dbweb service worker
 * Shows /offline.html when a page navigation fails because the user is offline.
 * Place this file at your site ROOT (so its scope covers the whole site).
 * Bump VERSION whenever you change offline.html so users get the new copy.
 */
const VERSION = 'v2';
const CACHE = 'Dbweb-offline-' + VERSION;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // clean up old versions
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('Dbweb-offline-') && k !== CACHE).map((k) => caches.delete(k))
      );
      // faster navigations while online
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch (_) {}
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle page navigations (not images, API calls, etc.)
  if (req.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        return await fetch(req);
      } catch (err) {
        // Network failed → serve the offline page
        const cache = await caches.open(CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return offline || new Response('You are offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});