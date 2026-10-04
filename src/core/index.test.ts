import test from 'node:test';
import assert from 'node:assert/strict';
import { L, LV } from './index';

test('the index registers the world rules into logic', () => {
  // Sous-marin trial: its setup rule scatters 10 bubbles.
  const s = L.createGame(7, { mode: 'adventure', stage: LV.level('sea', LV.TRIAL) });
  assert.equal(s.special.filter((sp) => sp && sp.kind === 'bubble').length, 10);
});
