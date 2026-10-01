/*
 * Cubo Blocks — translations. Pure, no DOM. French is the source language: the code keeps its
 * French text, wrapped in tr('…') or tr`… ${x} …`, and that text is the key into the active
 * dictionary. Without a dictionary (French, or node tests) tr returns the text unchanged.
 *
 * Template keys write each ${…} as {}: tr`Efface ${n} lignes` looks up 'Efface {} lignes'.
 * A dictionary value is a string ({} filled in order, {0} {1}… by index) or a function of the
 * values, for plurals or word order the string form cannot express.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GridlockI18n = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LANGS = ['fr', 'en'];
  const LOCALES = { fr: 'fr-FR', en: 'en-US' };
  const dicts = {};
  let lang = 'fr';
  let dict = null;

  function fill(value, args) {
    if (typeof value === 'function') return value(...args);
    let i = 0;
    return value.replace(/\{(\d*)\}/g, (_, n) => String(args[n === '' ? i++ : Number(n)]));
  }

  // tr('text') or tr`text ${x}`.
  function tr(first, ...args) {
    if (Array.isArray(first) && first.raw) {
      const key = first.join('{}');
      const value = dict && dict[key];
      if (value != null) return fill(value, args);
      let out = first[0];
      for (let i = 0; i < args.length; i++) out += String(args[i]) + first[i + 1];
      return out;
    }
    const value = dict && dict[first];
    return value != null ? fill(value, []) : first;
  }

  // Picks a supported language from a list like navigator.languages ('en-GB', 'fr'...).
  function detect(list) {
    for (const tag of list || []) {
      const code = String(tag).toLowerCase().split('-')[0];
      if (LANGS.includes(code)) return code;
    }
    return 'en';
  }

  return {
    LANGS,
    tr,
    detect,
    add(code, entries) { dicts[code] = Object.assign(dicts[code] || {}, entries); },
    dict: (code) => dicts[code] || null,
    setLang(code) {
      lang = LANGS.includes(code) ? code : 'fr';
      dict = lang === 'fr' ? null : dicts[lang] || null;
    },
    lang: () => lang,
    // Plural rule: French counts 0 and 1 as singular, English only 1.
    many: (n) => (lang === 'fr' ? n > 1 : n !== 1),
    locale: () => LOCALES[lang],
    fill,
  };
});
