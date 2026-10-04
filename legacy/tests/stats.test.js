const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../www/src/core/logic.js');
require('../www/src/core/worlds.js');
const M = require('../www/src/core/meta.js');

const fresh = () => M.createProfile('2026-10-01');
const run = (mode, score, extra = {}) => ({ ...L.runStats(L.createGame(1)), mode, score, ...extra });

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

test('secret stickers unlock from lifetime records and modes', () => {
  const ids = (p) => M.checkStickers(p, '2026-10-01').fresh.map((s) => s.id);
  let p = fresh();
  p = M.applyRun(p, run('classic', 3200, { undos: 0, discards: 0, perfects: 2, bestBomb: 21 })).profile;
  const got = ids(p);
  for (const id of ['bomb21', 'clean3k', 'perfect2']) assert.ok(got.includes(id), id);

  // An undo spoils "Sans filet".
  const q = M.applyRun(fresh(), run('classic', 5000, { undos: 1 })).profile;
  assert.ok(!ids(q).includes('clean3k'));

  let r = fresh();
  for (const m of ['classic', 'chrono', 'chill']) r = M.applyRun(r, run(m, 10)).profile;
  assert.ok(ids(r).includes('allmodes'));
  assert.ok(ids({ ...fresh(), coins: 2000 }).includes('hoard'));
  assert.ok(M.STICKERS.filter((s) => s.secret).every((s) => s.page === 'secret' && s.reward === 40));
});

test('quit ends a run in progress and marks it, but not a finished one', () => {
  const s = L.createGame(7);
  const q = L.quit(s);
  assert.equal(q.over, true);
  assert.equal(q.quit, true);
  assert.equal(L.quit(q), null);
});
