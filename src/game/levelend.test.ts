import test from 'node:test';
import assert from 'node:assert/strict';
import { M } from '../core';
import { freshFlags, lastOpenWorld, levelMood, nextLevelOf, settleLevel } from './levelend';

const p0 = M.createProfile('2026-10-04');
const win = { world: 'plain', n: 1, stars: 3, won: true };
const loss = { world: 'plain', n: 2, stars: 0, won: false };

test('settleLevel: a win is paid once per start', () => {
  const a = settleLevel(p0, win, 'k1', freshFlags(), '2026-10-04');
  assert.equal(M.levelStars(a.profile, 'plain', 1), 3);
  assert.ok(a.report && a.report.total > 0);
  const b = settleLevel(a.profile, win, 'k1', a.flags, '2026-10-04');
  assert.equal(b.report, null);
  assert.equal(b.profile, a.profile);
  // a new start pays its stars again only if better
  const c = settleLevel(a.profile, win, 'k2', a.flags, '2026-10-04');
  assert.equal(c.report?.earned.some((l) => l.coins > 0 && /étoile/.test(l.label)), false);
});

test('settleLevel: one fail per start, even if called twice (bought moves running out again)', () => {
  const a = settleLevel(p0, loss, 'k1', freshFlags(), '2026-10-04');
  assert.equal(M.levelFails(a.profile, 'plain', 2), 1);
  const b = settleLevel(a.profile, loss, 'k1', a.flags, '2026-10-04');
  assert.equal(M.levelFails(b.profile, 'plain', 2), 1);
  const c = settleLevel(b.profile, loss, 'k2', b.flags, '2026-10-04');
  assert.equal(M.levelFails(c.profile, 'plain', 2), 2);
});

test('settleLevel: a win after bought moves still pays; daily and event levels are left alone', () => {
  const a = settleLevel(p0, loss, 'k1', freshFlags(), '2026-10-04');
  const b = settleLevel(a.profile, { ...loss, won: true, stars: 1 }, 'k1', a.flags, '2026-10-04');
  assert.equal(M.levelStars(b.profile, 'plain', 2), 1);
  const d = settleLevel(p0, { ...win, daily: {} }, 'k3', freshFlags(), '2026-10-04');
  assert.equal(d.profile, p0);
});

test('nextLevelOf, lastOpenWorld, levelMood', () => {
  assert.deepEqual(nextLevelOf(p0, 'plain', 4), ['plain', 5]);
  assert.equal(nextLevelOf(p0, 'plain', 20), null);
  assert.equal(lastOpenWorld(p0), 'plain');
  assert.equal(levelMood(false, 0), 'sad');
  assert.equal(levelMood(true, 3), 'star');
  assert.equal(levelMood(true, 1), 'party');
});
