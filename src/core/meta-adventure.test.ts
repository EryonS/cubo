// @ts-nocheck -- ported as is from legacy/tests (loose fixtures); run by tsx, not type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './meta';

const fresh = () => ({ ...M.createProfile('2026-09-30'), coins: 1000 });
function clearWorld(p, world, stars = 3) {
  for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) p = M.applyLevel(p, world, n, stars).profile;
  return p;
}

test('only the first world and its first level are open at start', () => {
  const p = fresh();
  assert.equal(M.worldOpen(p, 'plain'), true);
  assert.equal(M.worldOpen(p, 'sea'), false);
  assert.equal(M.levelOpen(p, 'plain', 1), true);
  assert.equal(M.levelOpen(p, 'plain', 2), false);
});

test('first clear pays, new stars pay, replays without progress pay nothing', () => {
  let r = M.applyLevel(fresh(), 'plain', 1, 1);
  assert.equal(r.report.total, 10 + 5);
  r = M.applyLevel(r.profile, 'plain', 1, 3);
  assert.equal(r.report.total, 10);
  assert.equal(M.levelStars(r.profile, 'plain', 1), 3);
  r = M.applyLevel(r.profile, 'plain', 1, 2);
  assert.equal(r.report.total, 0);
  assert.equal(M.levelStars(r.profile, 'plain', 1), 3);
});

test('beating a boss unlocks the world theme once and opens the next world', () => {
  const p = clearWorld(fresh(), 'plain', 2);
  assert.ok(p.owned.boards.includes('plain'));
  assert.equal(M.worldOpen(p, 'sea'), true); // 20 stars >= 18
  const again = M.applyLevel(p, 'plain', 10, 3);
  assert.equal(again.report.themeUnlocked, null);
});

test('a world stays closed without enough stars', () => {
  const p = clearWorld(fresh(), 'plain', 1); // 10 stars < 18
  assert.equal(M.worldOpen(p, 'sea'), false);
});

test('skipping costs coins, gives no star, and is refused on bosses', () => {
  let p = fresh();
  const skipped = M.skipLevel(p, 'plain', 1);
  assert.equal(skipped.coins, 1000 - M.SKIP_COST);
  assert.equal(M.levelCleared(skipped, 'plain', 1), true);
  assert.equal(M.levelStars(skipped, 'plain', 1), 0);
  p = clearWorld(fresh(), 'plain', 3);
  assert.equal(M.skipLevel({ ...p, coins: 9999 }, 'sea', 10), null);
  assert.equal(M.skipLevel({ ...fresh(), coins: 10 }, 'plain', 1), null);
});

test('extra moves get pricier within an attempt', () => {
  assert.deepEqual([0, 1, 2].map(M.extraMovesCost), [20, 40, 80]);
});

test('a boss pays the theme price back when the theme was already bought', () => {
  let p = { ...fresh(), coins: 500 };
  p = M.buy(p, 'boards', 'plain');
  const coins = p.coins;
  for (let n = 1; n < M.LEVELS_PER_WORLD; n++) p = M.applyLevel(p, 'plain', n, 3).profile;
  const before = p.coins;
  const boss = M.applyLevel(p, 'plain', M.LEVELS_PER_WORLD, 3);
  assert.equal(boss.report.themeUnlocked, null);
  const refund = boss.report.earned.find((l) => l.label.includes('déjà à toi'));
  assert.equal(refund.coins, 150);
  assert.equal(boss.profile.coins - before, boss.report.total);
  assert.ok(coins < before);
  // Beating the boss again pays no second refund.
  const again = M.applyLevel(boss.profile, 'plain', M.LEVELS_PER_WORLD, 3);
  assert.equal(again.report.earned.some((l) => l.label.includes('déjà à toi')), false);
});

test('the paid skip shows up only after two failed attempts', () => {
  let p = fresh();
  assert.equal(M.canSkip(p, 'plain', 1), false);
  p = M.recordFail(p, 'plain', 1);
  assert.equal(M.canSkip(p, 'plain', 1), false);
  p = M.recordFail(p, 'plain', 1);
  assert.equal(M.levelFails(p, 'plain', 1), 2);
  assert.equal(M.canSkip(p, 'plain', 1), true);
  assert.equal(M.canSkip(p, 'plain', 2), false);
  p = M.applyLevel(p, 'plain', 1, 1).profile;
  assert.equal(M.canSkip(p, 'plain', 1), false);
  // Never on a boss.
  let q = fresh();
  for (let k = 0; k < 3; k++) q = M.recordFail(q, 'plain', M.LEVELS_PER_WORLD);
  assert.equal(M.canSkip(q, 'plain', M.LEVELS_PER_WORLD), false);
});

test('a world with every star is mastered and earns its sticker once', () => {
  const two = clearWorld(fresh(), 'plain', 2);
  assert.equal(M.worldMastered(two, 'plain'), false);
  assert.ok(!M.checkStickers(two, '2026-10-01').fresh.some((s) => s.id === 'master-plain'));
  const all = clearWorld(two, 'plain', 3);
  assert.equal(M.worldMastered(all, 'plain'), true);
  const res = M.checkStickers(all, '2026-10-01');
  const st = res.fresh.find((s) => s.id === 'master-plain');
  assert.ok(st);
  assert.equal(st.page, 'master');
  assert.ok(!M.checkStickers(res.profile, '2026-10-02').fresh.some((s) => s.id === 'master-plain'));
});

test('a test-mode profile (dev) opens every world, level, free world and puzzle', () => {
  const p = { ...fresh(), dev: true };
  for (const w of M.WORLD_ORDER) {
    assert.ok(M.worldOpen(p, w), w);
    assert.ok(M.levelOpen(p, w, M.LEVELS_PER_WORLD), w);
    assert.ok(M.worldFreeOpen(p, w), w);
  }
  assert.equal(M.worldOpen(p, 'nowhere'), false);
  assert.ok(M.puzzleOpen(p, 50));
  assert.ok(M.surpriseOpen(p));
  assert.equal(M.levelOpen(fresh(), 'plain', 2), false);
});
