// Cubo Blocks — Android back button: closes what is on top, like the screen's own close button.
'use strict';

// ---------- back button ----------
// Order: the confirm dialog, then the top overlay (its close button, or resume from pause), then a
// hub page other than Jouer (back to Jouer), then the board (opens pause). On Jouer the app goes
// to the background instead of quitting, so the run in progress stays where it was.
function nativeBack() {
  if (askDone) { askDone(false); return; }
  const top = [...document.querySelectorAll('.overlay.show')].reverse()
    .find((el) => !Object.values(HUBS).includes(el));
  if (top) {
    if (top === pauseEl) { closePause(); return; }
    const close = top.querySelector('button.close, [data-act="back"]');
    if (close) close.click();
    return; // end-of-run sheets have no way back: they wait for a choice
  }
  const hub = currentHub();
  if (hub && hub !== 'menu') { goTab('menu'); return; }
  if (hub === 'menu') { Capacitor.Plugins.App.minimizeApp(); return; }
  openPause();
}
if (window.Capacitor && Capacitor.isNativePlatform() && Capacitor.Plugins.App) {
  Capacitor.Plugins.App.addListener('backButton', () => { sfx.turn(); nativeBack(); });
}
