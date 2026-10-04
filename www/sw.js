/*
 * Cubo Blocks — offline support. Caches every file on install and serves from cache first,
 * so the game runs in airplane mode. Bump CACHE on each release to ship an update.
 */
const CACHE = 'cuboblocks-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/hud.css',
  './css/menus.css',
  './css/overlays.css',
  './css/shop.css',
  './css/aventure.css',
  './css/profile.css',
  './css/tutorial.css',
  './css/stats.css',
  './css/hubs.css',
  './css/phone.css',
  './src/platform/store.js',
  './src/core/i18n.js',
  './src/i18n/en.js',
  './src/i18n/setup.js',
  './src/core/logic.js',
  './src/core/worlds.js',
  './src/core/levels.js',
  './src/core/tutorial.js',
  './src/core/puzzles.js',
  './src/core/meta.js',
  './src/core/sync.js',
  './src/platform/ads.js',
  './src/platform/cloud.js',
  './src/app/base.js',
  './src/ui/icons.js',
  './src/themes/setup.js',
  './src/themes/worlds.js',
  './src/themes/events.js',
  './src/themes/draw.js',
  './src/themes/skins.js',
  './src/platform/storage.js',
  './src/game/anim-state.js',
  './src/themes/current.js',
  './src/render/layout.js',
  './src/audio/sfx.js',
  './src/audio/music.js',
  './src/platform/haptics.js',
  './src/render/helpers.js',
  './src/game/cells.js',
  './src/game/boss.js',
  './src/game/drag.js',
  './src/game/flow.js',
  './src/screens/gameover.js',
  './src/ui/swipe.js',
  './src/ui/dialog.js',
  './src/screens/home.js',
  './src/screens/puzzles.js',
  './src/screens/aventure.js',
  './src/screens/events.js',
  './src/screens/daily.js',
  './src/screens/profile.js',
  './src/screens/defis.js',
  './src/screens/stats.js',
  './src/screens/account.js',
  './src/screens/settings.js',
  './src/screens/pause.js',
  './src/game/undo.js',
  './src/screens/shop.js',
  './src/ui/inventory.js',
  './src/ui/tabbar.js',
  './src/ui/fit-text.js',
  './src/screens/tutorial.js',
  './src/ui/tips.js',
  './src/mascot/cubo.js',
  './src/mascot/body.js',
  './src/mascot/hats.js',
  './src/mascot/fx.js',
  './src/mascot/say.js',
  './src/render/loop.js',
  './src/render/hud.js',
  './src/render/board.js',
  './src/render/effects.js',
  './src/platform/native.js',
  './src/boot.js',
  './src/platform/sw-register.js',
  './fonts/baloo2.woff2',
  './fonts/pressstart2p.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache (GitHub Pages keeps files 10 min), otherwise a
  // new version could store the old files and stay stuck on them.
  const fresh = ASSETS.map((url) => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(fresh)).then(() => self.skipWaiting()));
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
