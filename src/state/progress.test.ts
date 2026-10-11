import test from 'node:test';
import assert from 'node:assert/strict';
import { M } from '../core';
import type { Profile } from '../core/types';
import { nextAdventure, levelName } from './progress';

test('nextAdventure: first level on a new profile, the next open level after progress, null when all is cleared', () => {
  const fresh = M.createProfile('2026-10-04');
  assert.deepEqual(nextAdventure(fresh), ['plain', 1]);
  const two = M.applyLevel(M.applyLevel(fresh, 'plain', 1, 3).profile, 'plain', 2, 2).profile;
  assert.deepEqual(nextAdventure(two), ['plain', 3]);
  const stars: Record<string, number> = {};
  for (const w of M.WORLD_ORDER) for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) stars[`${w}-${n}`] = 3;
  // The Volcan boss beaten: the bonus levels come next, world by world, then nothing.
  assert.deepEqual(nextAdventure({ ...fresh, adventure: { stars } }), ['plain', 21]);
  for (const w of M.WORLD_ORDER) for (let n = 21; n <= 25; n++) stars[`${w}-${n}`] = 1;
  assert.equal(nextAdventure({ ...fresh, adventure: { stars } }), null);
});

test('bonus levels: open after the Volcan boss, stars apart, a sticker for all 40', () => {
  const fresh = M.createProfile('2026-10-04');
  const stars: Record<string, number> = {};
  for (const w of M.WORLD_ORDER) for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) stars[`${w}-${n}`] = 3;
  delete stars['volcano-20'];
  let p: Profile = { ...fresh, adventure: { stars } };
  assert.equal(M.levelOpen(p, 'plain', 21), false);
  p = M.applyLevel(p, 'volcano', 20, 3).profile;
  assert.equal(M.levelOpen(p, 'plain', 21), true);
  assert.equal(M.levelOpen(p, 'plain', 22), false);
  assert.equal(M.levelOpen(p, 'plain', 26), false);
  const before = M.totalStars(p);
  const res = M.applyLevel(p, 'plain', 21, 3);
  assert.equal(res.report.total, 10 + 3 * 3);
  assert.equal(M.totalStars(res.profile), before); // main stars unchanged
  assert.equal(M.bonusStars(res.profile), 3);
  assert.equal(M.canSkip(res.profile, 'plain', 22), false);
  assert.equal(M.skipLevel({ ...res.profile, coins: 999 }, 'plain', 22), null);
  for (const w of M.WORLD_ORDER) for (let n = 21; n <= 25; n++) p = M.applyLevel(p, w, n, 1).profile;
  assert.ok(M.bonusCleared(p));
  assert.ok(M.checkStickers(p, '2026-10-04').fresh.some((s: { id: string }) => s.id === 'bonus'));
});

test('levelName: Niveau n, Épreuve at 10, Boss at 20', () => {
  assert.equal(levelName(7), 'Niveau 7');
  assert.equal(levelName(10), 'Épreuve');
  assert.equal(levelName(20), 'Boss');
  assert.equal(levelName(21), 'Bonus 1');
  assert.equal(levelName(25), 'Revanche');
});
