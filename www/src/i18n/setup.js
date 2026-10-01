// Cubo Blocks — Picks the language (the player's choice in Réglages, else the device's) and
// translates the static HTML. Runs before the core modules, whose tables call tr() as they load.
'use strict';

(() => {
  const I = window.GridlockI18n;
  const KEY = 'gridlock.lang'; // 'auto' | 'fr' | 'en'; changing it reloads the page
  let pref = 'auto';
  try { pref = localStorage.getItem(KEY) || 'auto'; } catch { /* private mode */ }
  const device = I.detect(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]);
  I.setLang(pref === 'auto' ? device : pref);
  document.documentElement.lang = I.lang();

  // Every text node and label attribute of index.html whose French text has a translation.
  const ATTRS = ['aria-label', 'title', 'alt', 'placeholder'];
  function translateDom(root) {
    if (I.lang() === 'fr') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.nodeValue.trim();
      if (!t) continue;
      const v = I.tr(t);
      if (v !== t) n.nodeValue = n.nodeValue.replace(t, v);
    }
    for (const el of root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(','))) {
      for (const a of ATTRS) {
        const t = el.getAttribute(a);
        if (t && I.tr(t) !== t) el.setAttribute(a, I.tr(t));
      }
    }
  }
  translateDom(document.body);

  window.GridlockLang = {
    pref: () => pref,
    device: () => device,
    set(next) {
      try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
      pref = next;
    },
  };
})();
