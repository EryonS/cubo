// Cubo Blocks — Picks the language (the player's choice in Réglages, else the device's) and
// translates the static HTML. Runs before the core modules, whose tables call tr() as they load.
// CuboBlocksLang.apply() switches language live: static HTML again, then the core modules re-run.
'use strict';

(() => {
  const I = window.CuboBlocksI18n;
  const KEY = 'cuboblocks.lang'; // 'auto' | 'fr' | 'en'
  let pref = 'auto';
  try {
    // Saved as gridlock.lang before the rename: moved once.
    const old = localStorage.getItem('gridlock.lang');
    if (old !== null && localStorage.getItem(KEY) === null) localStorage.setItem(KEY, old);
    localStorage.removeItem('gridlock.lang');
    pref = localStorage.getItem(KEY) || 'auto';
  } catch { /* private mode */ }
  const device = I.detect(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]);
  const langOf = (p) => (p === 'auto' ? device : p);
  I.setLang(langOf(pref));
  document.documentElement.lang = I.lang();

  // The French text of index.html, kept to translate it again after a switch: text nodes, and
  // label attributes per element. A node the app has since replaced is skipped (it re-renders).
  const ATTRS = ['aria-label', 'title', 'alt', 'placeholder'];
  const texts = new Map();
  const attrs = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.trim()) texts.set(n, n.nodeValue);
  for (const el of document.body.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(','))) {
    attrs.set(el, Object.fromEntries(ATTRS.filter((a) => el.hasAttribute(a)).map((a) => [a, el.getAttribute(a)])));
  }
  function translateDom() {
    for (const [n, fr] of texts) {
      if (!n.isConnected) continue;
      const t = fr.trim();
      n.nodeValue = fr.replace(t, I.tr(t));
    }
    for (const [el, map] of attrs) for (const [a, fr] of Object.entries(map)) el.setAttribute(a, I.tr(fr));
  }
  if (I.lang() !== 'fr') translateDom();

  // Core modules whose tables hold translated text, in load order. Each one runs again and its
  // fresh exports are copied onto the object the app already holds (window.CuboBlocksMeta...).
  const CORE = [['worlds', 'CuboBlocksWorlds'], ['levels', 'CuboBlocksLevels'], ['tutorial', 'CuboBlocksTutorial'], ['puzzles', 'CuboBlocksPuzzles'], ['meta', 'CuboBlocksMeta']];
  function rerun([file, name]) {
    return new Promise((resolve, reject) => {
      const kept = window[name];
      const s = document.createElement('script');
      s.src = `src/core/${file}.js`;
      s.onload = () => {
        Object.assign(kept, window[name]);
        window[name] = kept;
        s.remove();
        resolve();
      };
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  window.CuboBlocksLang = {
    pref: () => pref,
    device: () => device,
    // Saves the choice and switches; resolves once the core tables are in the new language.
    async apply(next) {
      try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
      pref = next;
      I.setLang(langOf(next));
      document.documentElement.lang = I.lang();
      translateDom();
      for (const mod of CORE) await rerun(mod);
    },
  };
})();
