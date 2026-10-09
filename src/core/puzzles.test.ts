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
  for (let slot = 0; slot < state.tray.length; slot++) {
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

test('puzzle game: board, the whole quota in the tray, free rotation, no discard', () => {
  const st = start(12);
  const pz = P.puzzle(12);
  assert.equal(st.mode, 'puzzle');
  const empty = st.board.filter((v) => !v).length;
  assert.equal(empty, pz.pieces.reduce((a, p) => a + p.cells.length, 0));
  assert.equal(st.tray.filter(Boolean).length, pz.pieces.length);
  assert.ok(st.puzzle.free);
  assert.equal(st.puzzle.queue.length, 0);
  assert.equal(st.next, null);
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
  const st = start(20);
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
  assert.equal(r.report.total, 3 * 2 + 2 * 3); // 3 pieces, 2 stars
  p = r.profile;
  assert.ok(M.puzzleOpen(p, 2));
  r = M.applyPuzzle(p, 1, 1);
  assert.equal(r.report.total, 0);
  assert.equal(M.puzzleStarsOf(r.profile, 1), 2);
  r = M.applyPuzzle(p, 1, 3);
  assert.equal(r.report.total, 3);
  for (let n = 2; n <= 10; n++) p = M.applyPuzzle(p, n, 1).profile;
  // the pack goes on with its added puzzles (ids 81-85) before pack 2 (id 11)
  assert.ok(M.puzzleOpen(p, 81));
  assert.equal(M.puzzleOpen(p, 11), false);
  for (let n = 81; n <= 84; n++) p = M.applyPuzzle(p, n, 1).profile;
  r = M.applyPuzzle(p, 85, 3);
  assert.deepEqual(r.report.earned.map((l) => l.label), ['Puzzle résolu', '3 nouvelles étoiles', 'Pack terminé']);
  assert.equal(M.puzzlesSolved(r.profile), 15);
  assert.ok(M.puzzleOpen(r.profile, 11));
  // a puzzle solved before stays open
  assert.ok(M.puzzleOpen({ ...M.createProfile('2026-10-01'), puzzles: { 30: 2 } }, 30));
});

test('packs of 15: ids 1-80 first, then 5 added ones per pack, played in pack order', () => {
  assert.equal(P.COUNT, 120);
  assert.equal(P.PER_PACK, 15);
  assert.deepEqual(P.packIds(0), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 81, 82, 83, 84, 85]);
  assert.deepEqual(P.packIds(7).slice(10), [116, 117, 118, 119, 120]);
  assert.deepEqual([...P.ORDER].sort((a, b) => a - b), Array.from({ length: P.COUNT }, (_, i) => i + 1));
  assert.deepEqual([1, 10, 81, 85, 11, 120].map(P.rankOf), [1, 10, 11, 15, 16, 120]);
  assert.deepEqual([P.nextOf(10), P.nextOf(85), P.prevOf(11), P.prevOf(1), P.nextOf(120)], [81, 11, 85, null, null]);
  for (let n = 1; n <= P.COUNT; n++) assert.equal(P.puzzle(n).pack, P.packOf(n));
  // an added puzzle takes the quota of its pack's 10th, Mythique alternates 9 and 10
  assert.deepEqual([81, 85, 96, 106].map(P.quotaOf), [P.quotaOf(10), P.quotaOf(10), P.quotaOf(40), P.quotaOf(60)]);
  for (let n = 111; n <= 115; n++) assert.ok(P.quotaOf(n) === 9 || P.quotaOf(n) === 10);
  // no drawing twice among a pack's added puzzles
  for (let k = 0; k < P.PACKS.length; k++) {
    const names = P.packIds(k).slice(10).map((n) => P.puzzle(n).name);
    assert.equal(new Set(names).size, names.length, P.PACKS[k].name);
  }
});

test('puzzles 1-70 never change (stars are saved by id; Absolu 71-80 became empty drawings on 2026-10-09)', async () => {
  const { createHash } = await import('node:crypto');
  const all = JSON.stringify(Array.from({ length: 70 }, (_, i) => P.puzzle(i + 1)));
  assert.equal(createHash('sha256').update(all).digest('hex').slice(0, 16), '5f23804bd9bd6174');
});

test('Absolu: an empty drawing, 11 or 12 pieces to place, solvable', () => {
  for (const n of P.packIds(7)) {
    const pz = P.puzzle(n);
    assert.ok(P.isEmpty(n));
    assert.equal(pz.fixed.length, 0, `puzzle ${n}`);
    assert.equal(pz.pieces.length, P.quotaOf(n), `puzzle ${n} quota`);
    assert.ok(pz.pieces.length === 11 || pz.pieces.length === 12);
    assert.ok(solve(start(n)).puzzle.won, `puzzle ${n} solvable`);
  }
});

test('packs 5-8: the first 60 keep their quotas', () => {
  assert.deepEqual([1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 40].map(P.quotaOf), [3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8]);
  for (let n = 41; n <= 70; n++) assert.ok(P.quotaOf(n) >= 8 && P.quotaOf(n) <= 10);
  assert.deepEqual([41, 50, 51, 60].map(P.quotaOf), [8, 9, 9, 10]);
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
  assert.equal(L.liftPuzzle(start(1), 0, 0), null); // nothing placed by the player there
});

test('puzzle surprise: hints solve it; reward and unlock', () => {
  let st = surprise(5);
  while (!st.over) st = L.puzzleHint(st).state;
  assert.ok(st.puzzle.won);
  const done = { puzzles: {} };
  for (let k = 0; k <= 3; k++) for (const n of P.packIds(k)) done.puzzles[n] = 3;
  assert.equal(M.surpriseOpen({ puzzles: { 1: 3 } }), false);
  assert.equal(M.surpriseOpen(done), true);
  const p = { coins: 0, lifetime: {}, ...done };
  const a = M.applySurprise(p, '2026-10-07');
  assert.equal(a.report.total, M.SURPRISE_COINS);
  assert.equal(M.surprisesSolved(a.profile), 1);
});

test('puzzle surprise: only the first ones of a day pay', () => {
  let p = { coins: 0, lifetime: {} };
  for (let k = 0; k < M.SURPRISE_DAILY; k++) p = M.applySurprise(p, '2026-10-07').profile;
  assert.equal(p.coins, M.SURPRISE_DAILY * M.SURPRISE_COINS);
  assert.equal(M.surprisesPaidLeft(p, '2026-10-07'), 0);
  const over = M.applySurprise(p, '2026-10-07');
  assert.equal(over.report.total, 0);
  assert.deepEqual(over.report.earned, []);
  assert.equal(M.surprisesSolved(over.profile), M.SURPRISE_DAILY + 1);
  assert.equal(M.surprisesPaidLeft(over.profile, '2026-10-08'), M.SURPRISE_DAILY);
  assert.equal(M.applySurprise(over.profile, '2026-10-08').report.total, M.SURPRISE_COINS);
});

test('a puzzle pays by the pieces it has to place', () => {
  assert.equal(M.puzzleFirst(1), 3 * M.PUZZLE_PER_PIECE);
  assert.equal(M.puzzleFirst(60), 10 * M.PUZZLE_PER_PIECE);
  assert.equal(M.puzzleFirst(80), 12 * M.PUZZLE_PER_PIECE);
});

test('hard puzzles (Mythique): 2 or 3 pieces already placed, the rest to place, solvable', () => {
  for (const n of P.packIds(6)) {
    assert.ok(P.isHard(n));
    const pz = P.puzzle(n);
    assert.ok(pz.fixed.length >= 2 && pz.fixed.length <= 3, `puzzle ${n}: ${pz.fixed.length} fixed`);
    assert.ok(pz.pieces.length >= 8 && pz.pieces.length <= 10, `puzzle ${n}: ${pz.pieces.length} pieces`);
    assert.equal(pz.pieces.length, P.quotaOf(n), `puzzle ${n} quota`);
    assert.ok(pz.free);
  }
  assert.deepEqual(P.puzzle(65), P.puzzle(65));
});

test('numbered puzzles keep their old pieces: the same quota, seeded the same way', () => {
  assert.equal(P.puzzle(3).pieces.length, 3);
  assert.equal(P.puzzle(3).seed, 3);
  assert.equal(P.puzzle(3).pack, 0);
});

test('hints taken stay in the profile until the puzzle is solved, and cap the next run', () => {
  let p = M.createProfile('2026-10-09');
  assert.equal(M.puzzleHintsOf(p, 4), 0);
  p = M.notePuzzleHints(p, 4, 1);
  p = M.notePuzzleHints(p, 4, 2);
  assert.equal(M.puzzleHintsOf(p, 4), 2);
  assert.equal(M.notePuzzleHints(p, 4, 1), p); // never goes down
  const st = L.createGame(1, { mode: 'puzzle', puzzle: { ...P.puzzle(4), hints: M.puzzleHintsOf(p, 4) } });
  assert.equal(st.puzzle.hints, 2);
  assert.equal(solve(st).puzzle.stars, 1);
  const done = M.applyPuzzle(p, 4, 1).profile;
  assert.equal(M.puzzleHintsOf(done, 4), 0);
  assert.equal(done.puzzleHints[4], undefined);
  // A puzzle solved before is replayed clean: new hints are not kept.
  assert.equal(M.notePuzzleHints(done, 4, 1), done);
});

test('a numbered puzzle saved in the old queue format still plays', () => {
  const pz = P.puzzle(12);
  const old = { ...pz, free: undefined };
  const st = L.createGame(1, { mode: 'puzzle', puzzle: old });
  assert.equal(st.tray.filter(Boolean).length, 3);
  assert.equal(st.puzzle.queue.length, pz.pieces.length - 3);
  assert.ok(solve(st).puzzle.won);
});
