import test from 'node:test';
import assert from 'node:assert/strict';
import { LV, M } from '../core';
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

test('settleLevel: a win after bought moves still pays; event levels are left alone', () => {
  const a = settleLevel(p0, loss, 'k1', freshFlags(), '2026-10-04');
  const b = settleLevel(a.profile, { ...loss, won: true, stars: 1 }, 'k1', a.flags, '2026-10-04');
  assert.equal(M.levelStars(b.profile, 'plain', 2), 1);
  const d = settleLevel(p0, { ...win, event: 'xmas' }, 'k3', freshFlags(), '2026-10-04');
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

test('settleLevel: a won daily feeds the streak once per start; a lost one pays nothing', () => {
  const day = '2026-10-04';
  const won = { world: 'plain', n: 3, stars: 2, won: true, daily: day };
  const a = settleLevel(p0, won, 'd1', freshFlags(), day);
  assert.equal(M.dailyOf(a.profile, day).stars, 2);
  assert.equal(a.report?.streak?.count, 1);
  assert.ok(a.report && a.report.total > 0);
  const b = settleLevel(a.profile, won, 'd1', a.flags, day);
  assert.equal(b.report, null);
  const lost = settleLevel(p0, { ...won, won: false, stars: 0 }, 'd2', freshFlags(), day);
  assert.equal(lost.profile, p0);
  assert.equal(lost.report, null);
  assert.ok(LV.daily(day).daily);
});
