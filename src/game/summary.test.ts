import test from 'node:test';
import assert from 'node:assert/strict';
import { runSummary } from './summary';

test('personal bests are flagged only against a non-zero lifetime best', () => {
  const t = runSummary({ stats: { lines: 5, bestCombo: 4, bestMulti: 2, pieces: 9 }, lifeBefore: { bestCombo: 3, bestMulti: 0 } });
  assert.equal(t[1].best, true);
  assert.equal(t[2].best, false);
  assert.equal(t[3].value, '9');
});
test('no combo shows a dash', () => {
  const t = runSummary({ stats: { bestCombo: 1 }, lifeBefore: {} });
  assert.equal(t[1].value, '–');
});
