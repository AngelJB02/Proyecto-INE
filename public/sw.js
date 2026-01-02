self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-cache').then((cache) => cache.add('/'))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
