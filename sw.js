// ===== PWA Service Worker — SPA-friendly with activation-safe navigations =====
const CACHE_NAME = 'lofi-gen-v11'; // bump on change
const BASE_PATH  = './'; // e.g. '/8-beat/' on GitHub Pages
const APP_SHELL  = `${BASE_PATH}index.html`;

const urlsToCache = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  // include this if you use the catcher page approach:
  // `${BASE_PATH}activate.html`,
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1) SPA navigation: always serve the app shell (works with ?activate=KEY)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first so you get fresh HTML when online
          const net = await fetch(req);
          return net;
        } catch {
          // Offline fallback: serve cached index.html regardless of query string
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(APP_SHELL, { ignoreSearch: true });
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 2) Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache same-origin GET requests
        try {
          const url = new URL(req.url);
          if (req.method === 'GET' && url.origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
        } catch {}
        return res;
      });
    })
  );
});
