const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/meta.js');

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
  let p = clearWorld(fresh(), 'plain', 2);
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
