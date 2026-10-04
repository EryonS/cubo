import test from 'node:test';
import assert from 'node:assert/strict';
import * as I from '../core/i18n';
import { allKeys, loadDict } from '../../scripts/i18n-keys';

const en = loadDict();
const { keys, dynamic } = allKeys();
const holes = (s: string) => (s.match(/\{\d*\}/g) || []).length;
const tags = (s: string) => (s.match(/<\/?[a-z][^>]*>/g) || []).join('');

test('every text marked with tr() has an English translation', () => {
  const missing = Object.keys(keys).filter((k) => !(k in en));
  assert.deepEqual(missing, [], 'run `npm run i18n` to list them with their files');
});

// Screens come over one milestone at a time: the dictionary keeps the keys of screens not ported yet.
test.skip('the English dictionary has no leftover keys (enforced at milestone 10)', () => {
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
