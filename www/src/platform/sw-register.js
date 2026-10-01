// Cubo Blocks — Service worker registration (web only; the native app ships its files inside the bundle).
'use strict';

(() => {
  // Capacitor serves the app from https://localhost on Android: no service worker there either.
  if (window.Capacitor && window.Capacitor.isNativePlatform()) return;
  // Offline support; service workers need http(s), so skip when opened as a local file.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // A new version takes over in the background: reload once so the home-screen app shows it
    // right away instead of on the next launch. The game state is already saved on every move.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then((reg) => document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      }));
  }
})();
