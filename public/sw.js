const CACHE_NAME = 'zikkit-v1';
const PRECACHE = ['/dashboard', '/jobs', '/schedule', '/leads'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore.googleapis.com') || e.request.url.includes('identitytoolkit')) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || new Response('Offline', { status: 503 })))
  );
});
