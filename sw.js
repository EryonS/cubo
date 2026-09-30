/*
 * Gridlock — offline support. Caches every file on install and serves from cache first,
 * so the game runs in airplane mode. Bump CACHE on each release to ship an update.
 */
const CACHE = 'gridlock-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/logic.js',
  './src/worlds.js',
  './src/levels.js',
  './src/tutorial.js',
  './src/meta.js',
  './src/ads.js',
  './src/main.js',
  './fonts/baloo2.woff2',
  './fonts/pressstart2p.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        // Offline navigation to an unknown URL: fall back to the game.
        .catch(() => (request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    }),
  );
});
