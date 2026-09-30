const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
const P = require('../src/puzzles.js');

const S = L.SIZE;
const start = (n) => L.createGame(1, { mode: 'puzzle', puzzle: P.puzzle(n) });

const key = (cells) => cells.map((p) => p.join(',')).join(';');
const norm = (cells) => {
  const r0 = Math.min(...cells.map((p) => p[0]));
  const c0 = Math.min(...cells.map((p) => p[1]));
  return cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};

// One placement like a perfect player (no hint): a tray piece, turned until it matches a free
// solution spot of its shape, dropped there.
function playOne(state) {
  const pz = P.puzzle(state.puzzle.n);
  for (let slot = 0; slot < 3; slot++) {
    let st = state;
    for (let k = 0; k < 4; k++) {
      const piece = st.tray[slot];
      if (!piece) break;
      for (const p of pz.pieces) {
        if (!p.sol.every((i) => !st.board[i])) continue;
        const cells = norm(p.sol.map((i) => [Math.floor(i / S), i % S]));
        if (key(cells) !== key(piece.cells)) continue;
        const res = L.place(st, slot, Math.min(...p.sol.map((i) => Math.floor(i / S))), Math.min(...p.sol.map((i) => i % S)));
        if (res) return res.state;
      }
      st = L.rotate(st, slot);
    }
  }
  throw new Error('no move');
}
function solve(state) {
  while (!state.over) state = playOne(state);
  return state;
}

test('every puzzle is well formed: drawing covered once, quota as announced', () => {
  for (let n = 1; n <= P.COUNT; n++) {
    const pz = P.puzzle(n);
    const seen = new Array(S * S).fill(0);
    for (const f of pz.fixed) for (const i of f.cells) seen[i] += 1;
    for (const p of pz.pieces) for (const i of p.sol) seen[i] += 1;
    pz.mask.forEach((inside, i) => assert.equal(seen[i], inside ? 1 : 0, `puzzle ${n} cell ${i}`));
    assert.equal(pz.pieces.length, P.quotaOf(n));
    for (const p of pz.pieces) assert.equal(p.cells.length, p.sol.length);
  }
});

test('puzzles are stable: the same number gives the same puzzle', () => {
  assert.deepEqual(P.puzzle(7), P.puzzle(7));
  assert.equal(P.puzzle(0), null);
  assert.equal(P.puzzle(P.COUNT + 1), null);
});

test('puzzle game: board, tray from the quota, free rotation, no discard', () => {
  const st = start(12);
  const pz = P.puzzle(12);
  assert.equal(st.mode, 'puzzle');
  const empty = st.board.filter((v) => !v).length;
  assert.equal(empty, pz.pieces.reduce((a, p) => a + p.cells.length, 0));
  assert.equal(st.tray.filter(Boolean).length, 3);
  assert.equal(st.puzzle.queue.length, pz.pieces.length - 3);
  assert.equal(st.next, st.puzzle.queue[0]);
  assert.ok(L.canTurn(st));
  assert.ok(L.rotate(st, 0));
  assert.equal(L.discard(st, 0), null);
  assert.equal(L.undoCost(st), 0);
});

test('solving every puzzle wins it, no line is ever cleared', () => {
  for (let n = 1; n <= P.COUNT; n++) {
    const state = solve(start(n));
    assert.ok(state.puzzle.won, 'puzzle ' + n);
    assert.ok(state.over);
    assert.ok(state.board.every((v) => v));
    assert.equal(state.stats.lines, 0);
    assert.equal(state.puzzle.placed, state.puzzle.total);
  }
});

test('undo walks back several placements, hints stay counted', () => {
  let st = start(20);
  const first = st;
  const a = L.puzzleHint(st).state;
  const b = L.puzzleHint(a).state;
  assert.equal(b.puzzle.hints, 2);
  const back1 = L.undo(b).state;
  const back2 = L.undo(back1).state;
  assert.deepEqual(back2.board, first.board);
  assert.equal(back2.puzzle.hints, 2);
  assert.equal(back2.puzzle.placed, 0);
});

test('stars: 3 without hints, 1 less per hint, at least 1', () => {
  assert.equal(solve(start(5)).puzzle.stars, 3);
  assert.equal(solve(L.puzzleHint(start(5)).state).puzzle.stars, 2);
  let st = start(5);
  while (!st.over) st = L.puzzleHint(st).state;
  assert.equal(st.puzzle.hints, P.quotaOf(5));
  assert.equal(st.puzzle.stars, 1);
});

test('a stuck puzzle is not over: undo is the way out', () => {
  let st = start(30);
  // Drop the first piece anywhere legal but wrong until nothing fits.
  for (let guard = 0; guard < 50 && !st.stuck && !st.over; guard++) {
    let moved = false;
    for (let slot = 0; slot < 3 && !moved; slot++) {
      for (let i = 0; i < S * S && !moved; i++) {
        const res = L.place(st, slot, Math.floor(i / S), i % S);
        if (res) { st = res.state; moved = true; }
      }
    }
    if (!moved) break;
  }
  if (st.stuck) {
    assert.equal(st.over, false);
    assert.ok(L.undo(st));
  }
});

const M = require('../src/meta.js');
test('puzzle progress: open in order, coins once, stars kept, pack bonus', () => {
  let p = M.createProfile('2026-10-01');
  assert.ok(M.puzzleOpen(p, 1));
  assert.equal(M.puzzleOpen(p, 2), false);
  let r = M.applyPuzzle(p, 1, 2);
  assert.equal(r.report.total, 15 + 10);
  p = r.profile;
  assert.ok(M.puzzleOpen(p, 2));
  r = M.applyPuzzle(p, 1, 1);
  assert.equal(r.report.total, 0);
  assert.equal(M.puzzleStarsOf(r.profile, 1), 2);
  r = M.applyPuzzle(p, 1, 3);
  assert.equal(r.report.total, 5);
  for (let n = 2; n <= 9; n++) p = M.applyPuzzle(p, n, 1).profile;
  r = M.applyPuzzle(p, 10, 3);
  assert.deepEqual(r.report.earned.map((l) => l.label), ['Puzzle résolu', '3 nouvelles étoiles', 'Pack terminé']);
  assert.equal(M.puzzlesSolved(r.profile), 10);
});
