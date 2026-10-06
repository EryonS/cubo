// Kill switch for the old web game's service worker (cuboblocks-v*, cache first, registered at /sw.js).
// Browsers re-fetch this file on every visit: this version takes over, deletes every cache, unregisters
// itself and reloads the open tabs, which then get the live site from the network. Keep it until old
// visitors are gone (it costs nothing: the current site registers no service worker).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const tabs = await self.clients.matchAll({ type: 'window' });
    tabs.forEach((tab) => tab.navigate(tab.url));
  })());
});
