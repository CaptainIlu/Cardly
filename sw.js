// Cardly service worker — network-first, cache-fallback.
// Goal: every time the device is online, always fetch the latest index.html
// (and any other GET request) from the network, so a new deploy on GitHub
// Pages shows up immediately on next launch/reload. The cache only exists
// to let the installed app still open while offline.
const CACHE_NAME = 'cardly-runtime';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
