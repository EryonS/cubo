const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
require('../src/worlds.js');
const LV = require('../src/levels.js');
const M = require('../src/meta.js');

const fresh = () => M.createProfile('2026-10-01');
const run = (mode, score, extra = {}) => ({ ...L.runStats(L.createGame(1)), mode, score, ...extra });

// ---------- weekend event ----------

test('the event runs on Saturday and Sunday, and a weekday points to the coming weekend', () => {
  const sat = LV.weekend('2026-10-03');
  const sun = LV.weekend('2026-10-04');
  const wed = LV.weekend('2026-10-07');
  assert.equal(sat.active, true);
  assert.equal(sun.active, true);
  assert.equal(wed.active, false);
  assert.equal(sat.id, '2026-10-03');
  assert.equal(sun.id, '2026-10-03');
  assert.equal(wed.id, '2026-10-10');
  assert.equal(sat.world, sun.world);
});

test('each week brings another world, never Arcade', () => {
  const week = (w) => new Date(Date.parse('2026-10-03T00:00:00Z') + w * 7 * 86400000).toISOString().slice(0, 10);
  const worlds = Array.from({ length: 30 }, (_, w) => LV.weekend(week(w)).world);
  assert.equal(new Set(worlds.slice(0, 7)).size, 7);
  assert.ok(!worlds.includes('arcade'));
  // Weeks before the first event still map to a world.
  assert.ok(LV.weekend('2026-09-26').world);
});

test('an event run is classic with its world rules and starting specials', () => {
  const ev = { id: '2026-10-03', world: 'volcano', setup: { kind: 'ember', count: 3 } };
  const s = L.createGame(7, { mode: 'classic', event: ev });
  assert.equal(s.mode, 'classic');
  assert.equal(s.stage, null);
  assert.equal(s.special.filter(Boolean).length, 3);
  assert.equal(L.runStats(s).mode, 'event');
  // Chrono and chill ignore the event.
  assert.equal(L.createGame(7, { mode: 'chrono', event: ev }).event, null);
});

test('world rules act after each move of an event run (embers age and harden)', () => {
  const ev = { id: '2026-10-03', world: 'volcano', setup: { kind: 'ember', count: 1 } };
  let s = L.createGame(3, { mode: 'classic', event: ev });
  const i = s.special.findIndex(Boolean);
  // Play safe single cells far from the ember until it hardens (fuse 8 moves).
  for (let k = 0; k < 8; k++) {
    const piece = { id: 900 + k, cells: [[0, 0]], w: 1, h: 1, color: 1, bonus: null };
    s = { ...s, tray: [piece, s.tray[1], s.tray[2]], board: s.board.map((v, j) => (j === i ? v : 0)) };
    const spot = s.board.findIndex((v, j) => !v && Math.floor(j / 8) !== Math.floor(i / 8) && j % 8 !== i % 8);
    s = L.place(s, 0, Math.floor(spot / 8), spot % 8).state;
  }
  assert.equal(s.special[i].kind, 'rock');
});

test('event tiers pay once per weekend and keep the best score', () => {
  let p = fresh();
  let res = M.applyEvent(p, '2026-10-03', 2700);
  assert.deepEqual(res.report.earned.map((l) => l.coins), [20, 40]);
  p = res.profile;
  assert.equal(p.coins, 60);
  res = M.applyEvent(p, '2026-10-03', 1200);
  assert.equal(res.report.total, 0);
  assert.equal(M.eventOf(res.profile, '2026-10-03').best, 2700);
  assert.equal(M.eventOf(res.profile, '2026-10-03').games, 2);
  res = M.applyEvent(res.profile, '2026-10-03', 5100);
  assert.deepEqual(res.report.earned.map((l) => l.coins), [80]);
  assert.equal(res.report.record, true);
  // Next weekend starts over.
  assert.equal(M.applyEvent(res.profile, '2026-10-10', 1000).report.total, 20);
});

// ---------- per-mode stats ----------

test('runs feed per-mode stats and a capped history', () => {
  let p = fresh();
  p = M.applyRun(p, run('classic', 1000, { bestCombo: 4, lines: 12 })).profile;
  p = M.applyRun(p, run('classic', 3000, { bestCombo: 2, lines: 30 })).profile;
  p = M.applyRun(p, run('chrono', 500)).profile;
  const c = M.modeStats(p, 'classic');
  assert.deepEqual(c, { games: 2, total: 4000, best: 3000, bestCombo: 4, lines: 42 });
  assert.equal(M.modeStats(p, 'chill').games, 0);
  assert.deepEqual(M.recentScores(p, 'classic', 10), [1000, 3000]);
  for (let k = 0; k < M.HISTORY + 5; k++) p = M.applyRun(p, run('chill', k)).profile;
  assert.equal(p.history.length, M.HISTORY);
  assert.equal(M.recentScores(p, 'chill', 3).join(), [M.HISTORY + 2, M.HISTORY + 3, M.HISTORY + 4].join());
});

test('a run without a mode (old callers) leaves mode stats alone', () => {
  const p = M.applyRun(fresh(), { score: 10, lines: 1 }).profile;
  assert.equal(p.modes, undefined);
  assert.equal(p.history, undefined);
});

// ---------- secret stickers ----------

test('secret stickers unlock from lifetime records, modes and weekends', () => {
  const ids = (p) => M.checkStickers(p, '2026-10-01').fresh.map((s) => s.id);
  let p = fresh();
  p = M.applyRun(p, run('classic', 3200, { undos: 0, discards: 0, perfects: 2, bestBomb: 21 })).profile;
  const got = ids(p);
  for (const id of ['bomb21', 'clean3k', 'perfect2']) assert.ok(got.includes(id), id);

  // An undo spoils "Sans filet".
  const q = M.applyRun(fresh(), run('classic', 5000, { undos: 1 })).profile;
  assert.ok(!ids(q).includes('clean3k'));

  let r = fresh();
  for (const m of ['classic', 'chrono', 'chill', 'event']) r = M.applyRun(r, run(m, 10)).profile;
  assert.ok(ids(r).includes('allmodes'));
  for (const d of ['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24']) r = M.applyEvent(r, d, 0).profile;
  assert.ok(ids(r).includes('weekend4'));
  assert.ok(ids({ ...fresh(), coins: 2000 }).includes('hoard'));
  assert.ok(M.STICKERS.filter((s) => s.secret).every((s) => s.page === 'secret' && s.reward === 40));
});
