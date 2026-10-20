/* Condamine Golf GPS — v9.2 service worker repair.
   Network-first navigation; local course assets cached for offline use.
   Does not intercept Supabase or other third-party APIs. */
const CACHE_NAME = 'condamine-golf-v9-2-core';
const OFFLINE_FILES = [
  './index.html',
  './live-competition.js',
  './offline-course.jpg',
  './manifest.webmanifest',
  './apple-touch-icon.png'
];
const OLD_PREFIXES = ['condamine-', 'condamine-golf-'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Do not let one missing image or icon prevent activation.
    await Promise.all(OFFLINE_FILES.map(async file => {
      try {
        const response = await fetch(new Request(file, { cache: 'reload' }));
        if (response.ok) await cache.put(file, response);
      } catch (error) {
        console.warn('Optional offline resource unavailable:', file, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name !== CACHE_NAME && OLD_PREFIXES.some(prefix => name.startsWith(prefix))) {
        await caches.delete(name);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Let Supabase, CDNs and live satellite providers work normally.
  // Leaflet and imagery fallback are handled by the page itself.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./index.html')) ||
               (await cache.match(request)) ||
               new Response('Offline app not yet downloaded. Connect to the internet and open the golf app once.', {
                 status: 503,
                 headers: { 'Content-Type': 'text/plain; charset=utf-8' }
               });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Network first for scripts and other app assets, then offline cache.
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      return (await cache.match(request)) || Response.error();
    }
  })());
});
