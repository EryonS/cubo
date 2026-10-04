/*
 * Cubo Blocks — Native backup of the saves. Loaded first, before any file reads localStorage.
 * The game keeps reading and writing localStorage (synchronous), and in the native app every
 * write is copied to @capacitor/preferences, which iOS does not purge like a WebView's storage.
 * At start-up, if localStorage lost the saves but the backup has them, they are put back and the
 * page reloads once. CuboBlocksStore.set(key, text) replaces localStorage.setItem for game keys.
 */
(function (root) {
  'use strict';

  const KEYS = ['cuboblocks.v2', 'cuboblocks.profile.v1', 'cuboblocks.lang', 'cuboblocks.sync'];
  const cap = root.Capacitor;
  const Prefs = cap && cap.isNativePlatform() && cap.Plugins.Preferences ? cap.Plugins.Preferences : null;

  const has = (key) => { try { return localStorage.getItem(key) !== null; } catch { return false; } };

  // Copies wait for the restore check: until then the game may write a fresh profile over the
  // purged one, and that must not reach the backup. They also stop if a reload is coming.
  let restoring = false;
  const ready = !Prefs || has('cuboblocks.profile.v1') ? Promise.resolve() : (async () => {
    const found = await Promise.all(KEYS.map((key) => Prefs.get({ key }).then((r) => r.value).catch(() => null)));
    if (found.every((v) => v === null)) return; // first launch: nothing backed up yet
    restoring = true;
    KEYS.forEach((key, i) => { try { if (found[i] !== null) localStorage.setItem(key, found[i]); } catch { /* full */ } });
    root.location.reload();
  })().catch(() => {});

  // save() runs after every move: the copy is debounced, and flushed when the app goes away.
  const pending = new Map();
  let timer = 0;
  function flush() {
    clearTimeout(timer);
    timer = 0;
    if (restoring) return Promise.resolve();
    const writes = [...pending].map(([key, value]) =>
      (value === null ? Prefs.remove({ key }) : Prefs.set({ key, value })).catch(() => {}));
    pending.clear();
    return Promise.all(writes);
  }
  function copy(key, value) {
    if (!Prefs) return;
    pending.set(key, value);
    if (!timer) timer = setTimeout(() => ready.then(flush), 500);
  }
  if (Prefs) document.addEventListener('visibilitychange', () => { if (document.hidden) ready.then(flush); });

  function set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private mode, full */ }
    copy(key, value);
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
    copy(key, null);
  }

  // Writes the pending copies now (before a reload).
  const flushNow = () => (Prefs ? ready.then(flush) : Promise.resolve());

  root.CuboBlocksStore = { set, remove, ready, flush: flushNow };
})(window);
