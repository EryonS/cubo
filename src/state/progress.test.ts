import test from 'node:test';
import assert from 'node:assert/strict';
import { M } from '../core';
import { nextAdventure, levelName } from './progress';

test('nextAdventure: first level on a new profile, the next open level after progress, null when all is cleared', () => {
  const fresh = M.createProfile('2026-10-04');
  assert.deepEqual(nextAdventure(fresh), ['plain', 1]);
  const two = M.applyLevel(M.applyLevel(fresh, 'plain', 1, 3).profile, 'plain', 2, 2).profile;
  assert.deepEqual(nextAdventure(two), ['plain', 3]);
  const stars: Record<string, number> = {};
  for (const w of M.WORLD_ORDER) for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) stars[`${w}-${n}`] = 3;
  assert.equal(nextAdventure({ ...fresh, adventure: { stars } }), null);
});

test('levelName: Niveau n, Épreuve at 10, Boss at 20', () => {
  assert.equal(levelName(7), 'Niveau 7');
  assert.equal(levelName(10), 'Épreuve');
  assert.equal(levelName(20), 'Boss');
});
