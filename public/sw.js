/**
 * Zikkit Service Worker — Kill Switch v1
 *
 * This Service Worker exists ONLY to remove the previous broken SW
 * from all users' browsers. It does nothing else.
 *
 * When a user visits the site, this SW:
 * 1. Activates immediately
 * 2. Unregisters itself
 * 3. Clears all caches
 * 4. Reloads all open tabs
 *
 * After every active user has visited once, no SW remains.
 * New users never get a SW at all (we don't register it from layout).
 */

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Clear all caches
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (e) {
        console.warn('[Zikkit SW] Cache clear failed:', e);
      }

      // 2. Unregister this service worker
      try {
        await self.registration.unregister();
      } catch (e) {
        console.warn('[Zikkit SW] Unregister failed:', e);
      }

      // 3. Force all open tabs to reload (so they pick up the no-SW state)
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        });
      } catch (e) {
        console.warn('[Zikkit SW] Client reload failed:', e);
      }
    })()
  );
});

// NEVER intercept fetch requests — let everything pass through normally
// This prevents the "Failed to convert value to Response" bug
