const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../www/src/core/meta.js');
const L = require('../www/src/core/logic.js');
const LV = require('../www/src/core/levels.js');

const fresh = () => ({ ...M.createProfile('2026-10-01'), coins: 500 });
// Plays and wins `day`'s daily on `today`.
const win = (p, day, today, stars = 3) => M.applyDaily(M.countDaily(p, day, today), day, today, stars);

test('date helpers', () => {
  assert.equal(M.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(M.dayDiff('2026-02-27', '2026-03-01'), 2);
  assert.equal(M.monthDays('2028-02').length, 29);
});

test('the daily level is the same for everyone on a day and changes with the day', () => {
  assert.deepEqual(LV.daily('2026-10-05'), LV.daily('2026-10-05'));
  assert.notDeepEqual(LV.daily('2026-10-05'), LV.daily('2026-10-06'));
  const a = L.createGame(LV.daily('2026-10-05').seed, { mode: 'adventure', stage: LV.daily('2026-10-05') });
  const b = L.createGame(LV.daily('2026-10-05').seed, { mode: 'adventure', stage: LV.daily('2026-10-05') });
  assert.deepEqual(a.tray, b.tray);
});

test('today has 3 attempts, past days are unlimited, future days are locked', () => {
  let p = fresh();
  for (let k = 0; k < 3; k++) p = M.countDaily(p, '2026-10-01', '2026-10-01');
  assert.equal(M.countDaily(p, '2026-10-01', '2026-10-01'), null);
  assert.equal(M.dailyAttemptsLeft(p, '2026-09-20', '2026-10-01'), Infinity);
  assert.equal(M.countDaily(p, '2026-10-02', '2026-10-01'), null);
});

test('streak grows day after day and resets after a missed day', () => {
  let p = fresh();
  p = win(p, '2026-10-01', '2026-10-01').profile;
  p = win(p, '2026-10-02', '2026-10-02').profile;
  assert.equal(M.streakNow(p, '2026-10-02'), 2);
  assert.equal(M.streakNow(p, '2026-10-03'), 2); // still alive until the day is over
  assert.equal(M.streakNow(p, '2026-10-04'), 0);
  p = win(p, '2026-10-04', '2026-10-04').profile;
  assert.equal(M.streakOf(p).count, 1);
  assert.equal(M.streakOf(p).best, 2);
});

test('a freeze covers one missed day', () => {
  let p = win(fresh(), '2026-10-01', '2026-10-01').profile;
  p = M.buyFreeze(p);
  assert.equal(M.streakOf(p).freezes, 1);
  p = win(p, '2026-10-03', '2026-10-03').profile;
  assert.equal(M.streakOf(p).count, 2);
  assert.equal(M.streakOf(p).freezes, 0);
});

test('replaying a past day pays once and never feeds the streak', () => {
  let r = win(fresh(), '2026-09-20', '2026-10-01');
  assert.equal(r.report.streak, null);
  assert.equal(r.report.total, 10);
  r = win(r.profile, '2026-09-20', '2026-10-01');
  assert.equal(r.report.total, 0);
});

test('day 7 opens the weekly chest, day 30 gives the exclusive skin', () => {
  let p = fresh();
  let report;
  for (let d = 0; d < 30; d++) {
    const day = M.addDays('2026-10-01', d);
    ({ profile: p, report } = win(p, day, day));
    if (d === 6) assert.ok(report.earned.some((l) => l.label === 'Coffre de la semaine'));
  }
  assert.deepEqual(report.unlocked, M.STREAK_SKIN);
  assert.ok(p.owned.blocks.includes('gold'));
  assert.equal(M.buy({ ...p, coins: 1e6 }, 'blocks', 'gold'), null); // never sold
});

test('month trophy: silver with every day cleared, gold with 3 stars everywhere', () => {
  let p = fresh();
  const days = M.monthDays('2026-09');
  for (const d of days) p = win(p, d, '2026-10-01', d === days[3] ? 2 : 3).profile;
  assert.equal(M.monthTrophy(p, '2026-09'), 'silver');
  p = win(p, days[3], '2026-10-01', 3).profile;
  assert.equal(M.monthTrophy(p, '2026-09'), 'gold');
  assert.equal(M.monthTrophy(p, '2026-10'), null);
});

test('stickers pay once when their condition turns true', () => {
  let p = fresh();
  p = M.applyRun(p, { lines: 3, bestCombo: 5, bestMulti: 1, perfects: 0, bonusUsed: 0, bombCells: 0, pieces: 10, coins: 0, score: 100, used: {} }).profile;
  let r = M.checkStickers(p, '2026-10-01');
  assert.deepEqual(r.fresh.map((s) => s.id), ['combo5']);
  assert.equal(r.profile.coins, p.coins + M.STICKER_REWARD);
  r = M.checkStickers(r.profile, '2026-10-02');
  assert.equal(r.fresh.length, 0);
});

test('lifetime stats accumulate across runs', () => {
  const run = { lines: 4, bestCombo: 3, bestMulti: 2, perfects: 1, bonusUsed: 1, bombCells: 0, pieces: 20, coins: 2, score: 900, used: { bomb: 1 } };
  let p = M.applyRun(fresh(), run).profile;
  p = M.applyRun(p, { ...run, bestCombo: 6, score: 300 }).profile;
  assert.equal(p.lifetime.games, 2);
  assert.equal(p.lifetime.lines, 8);
  assert.equal(p.lifetime.bestCombo, 6);
  assert.equal(p.lifetime.score, 900);
  assert.equal(p.lifetime.used.bomb, 2);
});

test('migrate v3 gives back daily attempts on days not won yet', () => {
  const v3 = { ...fresh(), version: 3, daily: { '2026-10-01': { attempts: 3 }, '2026-09-30': { attempts: 2, stars: 2 } } };
  const { profile } = M.migrate(v3);
  assert.equal(M.dailyAttemptsLeft(profile, '2026-10-01', '2026-10-01'), 3);
  assert.equal(profile.daily['2026-09-30'].attempts, 2);
  assert.equal(profile.adventure, v3.adventure);
});

test('out of daily attempts: an ad gives 3 back once, coins buy single tries at a rising price', () => {
  const day = '2026-10-01';
  let p = { ...fresh(), coins: 200 };
  assert.equal(M.adDailyRefill(p, day, day), null); // attempts left: nothing to refill
  for (let k = 0; k < 3; k++) p = M.countDaily(p, day, day);
  assert.equal(M.canRefillDaily(p, day, day), true);
  p = M.adDailyRefill(p, day, day);
  assert.equal(M.dailyAttemptsLeft(p, day, day), 3);
  for (let k = 0; k < 3; k++) p = M.countDaily(p, day, day);
  assert.equal(M.dailyAdReady(p, day, day), false);
  assert.equal(M.dailyTryCost(p, day), 30);
  p = M.buyDailyTry(p, day, day);
  assert.equal(p.coins, 170);
  assert.equal(M.dailyAttemptsLeft(p, day, day), 1);
  p = M.countDaily(p, day, day);
  assert.equal(M.dailyTryCost(p, day), 60);
  assert.equal(M.buyDailyTry(p, '2026-09-30', day), null); // only today
  p = M.applyDaily(p, day, day, 1).profile;
  assert.equal(M.canRefillDaily(p, day, day), false); // won: streak safe
});
