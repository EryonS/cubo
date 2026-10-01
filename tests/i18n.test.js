const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../www/src/core/i18n.js');
const { allKeys, loadDict } = require('../tools/i18n-keys.js');

const en = loadDict('en');
const { keys, dynamic } = allKeys();
const holes = (s) => (s.match(/\{\d*\}/g) || []).length;
const tags = (s) => (s.match(/<\/?[a-z][^>]*>/g) || []).join('');

test('every text marked with tr() and every static text of index.html has an English translation', () => {
  const missing = Object.keys(keys).filter((k) => !(k in en));
  assert.deepEqual(missing, [], 'run `npm run i18n` to list them with their files');
});

test('the English dictionary has no leftover keys', () => {
  assert.deepEqual(Object.keys(en).filter((k) => !(k in keys)), []);
});

test('tr() is always called on literal text, so every key can be checked', () => {
  assert.deepEqual(dynamic, []);
});

test('translations keep the same values and markup as their French text', () => {
  for (const [k, v] of Object.entries(en)) {
    if (typeof v === 'function') {
      assert.equal(typeof v(1, '', '', 'x'), 'string', k);
      continue;
    }
    assert.equal(holes(v), holes(k), 'placeholders differ: ' + k);
    assert.equal(tags(v).replace(/>[^<]*/g, '>'), tags(k).replace(/>[^<]*/g, '>'), 'markup differs: ' + k);
  }
});

test('tr fills values, falls back to French, and handles plurals', () => {
  I.setLang('en');
  const n = 3;
  assert.equal(I.tr`Efface ${n} lignes`, 'Clear 3 lines');
  assert.equal(I.tr`${1} coups`, '1 move');
  assert.equal(I.tr`${n} coups`, '3 moves');
  assert.equal(I.tr('Texte sans traduction'), 'Texte sans traduction');
  assert.equal(I.locale(), 'en-US');
  I.setLang('fr');
  assert.equal(I.tr`Efface ${n} lignes`, 'Efface 3 lignes');
  assert.equal(I.locale(), 'fr-FR');
});

test('detect picks the first supported device language, English otherwise', () => {
  assert.equal(I.detect(['fr-CA', 'en-US']), 'fr');
  assert.equal(I.detect(['en-GB']), 'en');
  assert.equal(I.detect(['de-DE', 'fr-FR']), 'fr');
  assert.equal(I.detect(['ja-JP']), 'en');
  assert.equal(I.detect([]), 'en');
});
