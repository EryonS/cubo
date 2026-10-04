// @ts-nocheck -- ported as is from legacy/tests (loose fixtures); run by tsx, not type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from './logic';
import * as P from './puzzles';

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

import * as M from './meta';
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

test('packs 5-6: 60 puzzles, the first 40 keep their quotas', () => {
  assert.equal(P.COUNT, 60);
  assert.deepEqual([1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 40].map(P.quotaOf), [3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8]);
  for (let n = 41; n <= 60; n++) assert.ok(P.quotaOf(n) >= 8 && P.quotaOf(n) <= 10);
});

const surprise = (seed) => L.createGame(1, { mode: 'puzzle', puzzle: P.surprise(seed) });

test('puzzle surprise: every piece in the tray, covers the drawing, stable per seed', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const pz = P.surprise(seed);
    assert.ok(pz.free);
    assert.ok(pz.pieces.length >= P.SURPRISE_MIN && pz.pieces.length <= P.SURPRISE_MAX, 'seed ' + seed);
    const seen = new Array(S * S).fill(0);
    for (const f of pz.fixed) for (const i of f.cells) seen[i] += 1;
    for (const p of pz.pieces) for (const i of p.sol) seen[i] += 1;
    pz.mask.forEach((inside, i) => assert.equal(seen[i], inside ? 1 : 0));
    const st = surprise(seed);
    assert.equal(st.tray.length, pz.pieces.length);
    assert.equal(st.puzzle.queue.length, 0);
    assert.equal(st.next, null);
  }
  assert.deepEqual(P.surprise(9), P.surprise(9));
});

test('puzzle surprise: placed pieces can be lifted back to their slot, undo puts them back', () => {
  let st = surprise(3);
  const hinted = L.puzzleHint(st);
  st = hinted.state;
  const slot = hinted.events.slot;
  assert.equal(st.tray[slot], null);
  const [r, c] = hinted.events.placed[0];
  const lifted = L.liftPuzzle(st, r, c);
  assert.equal(lifted.slot, slot);
  assert.ok(lifted.state.tray[slot]);
  assert.equal(lifted.state.puzzle.placed, 0);
  assert.ok(hinted.events.placed.every(([rr, cc]) => !lifted.state.board[rr * S + cc]));
  assert.deepEqual(L.undo(lifted.state).state.board, st.board);
  // Fixed pieces and empty cells cannot be lifted, nor anything in a numbered puzzle.
  const fixed = P.surprise(3).fixed[0].cells[0];
  assert.equal(L.liftPuzzle(st, Math.floor(fixed / S), fixed % S), null);
  assert.equal(L.liftPuzzle(start(1), 0, 0), null);
});

test('puzzle surprise: hints solve it; reward and unlock', () => {
  let st = surprise(5);
  while (!st.over) st = L.puzzleHint(st).state;
  assert.ok(st.puzzle.won);
  const done = { puzzles: {} };
  for (let n = 1; n <= 40; n++) done.puzzles[n] = 3;
  assert.equal(M.surpriseOpen({ puzzles: { 1: 3 } }), false);
  assert.equal(M.surpriseOpen(done), true);
  const p = { coins: 0, lifetime: {}, ...done };
  const a = M.applySurprise(p, 0);
  assert.equal(a.report.total, M.SURPRISE_COINS);
  assert.equal(M.surprisesSolved(a.profile), 1);
  assert.equal(M.applySurprise(a.profile, 2).report.total, M.SURPRISE_HINTED);
});
