import test from 'node:test';
import assert from 'node:assert/strict';
import { L, M, PZ } from '../core';
import { allStars, freeTray, hintDisabled, isVoid, liftOrigin, nextPuzzle, packRows, puzzleLabel, puzzleTileSub, settlePuzzle, spotAt, isSurprise } from './puzzle';

const p0 = M.createProfile('2026-10-04');
const start = (setup: ReturnType<typeof PZ.puzzle>) => L.createGame(7, { mode: 'puzzle', puzzle: setup! });

test('every puzzle has a free tray, with one pad per piece; a numbered one saved in the old queue format keeps three slots', () => {
  const one = start(PZ.puzzle(1));
  assert.equal(freeTray(one), PZ.quotaOf(1));
  assert.equal(isSurprise(one.puzzle!), false);
  assert.equal(freeTray({ ...one, puzzle: { ...one.puzzle!, free: undefined } }), 0);
  const s = start(PZ.surprise(42));
  assert.equal(freeTray(s), s.puzzle!.total);
  assert.ok(freeTray(s) >= PZ.SURPRISE_MIN && freeTray(s) <= PZ.SURPRISE_MAX);
});

test('cells outside the drawing are void', () => {
  const st = start(PZ.puzzle(1));
  const voids = st.board.map((_, i) => isVoid(st.special, i)).filter(Boolean).length;
  assert.equal(voids, PZ.puzzle(1)!.mask.filter((m) => !m).length);
  assert.ok(voids > 0);
});

test('titles and the tile line', () => {
  const st = start(PZ.puzzle(3));
  assert.equal(puzzleLabel(st.puzzle!), `Puzzle 3 · ${st.puzzle!.name}`);
  assert.equal(puzzleTileSub(p0, st), '0 / 120 résolus');
  assert.equal(puzzleTileSub(p0, { ...st, moves: 2 }), 'Puzzle 3 en cours');
  assert.equal(puzzleTileSub(p0, { ...start(PZ.surprise(1)), moves: 1 }), 'Puzzle surprise en cours');
});

test('hints need a wallet and a live puzzle', () => {
  const st = start(PZ.puzzle(1));
  assert.equal(hintDisabled(st, M.PUZZLE_HINT), false);
  assert.equal(hintDisabled(st, M.PUZZLE_HINT - 1), true);
  assert.equal(hintDisabled({ ...st, over: true }, 999), true);
  assert.equal(hintDisabled(L.createGame(1, { mode: 'classic', level: 'normal' }), 999), true);
});

test('packs open one after the other', () => {
  const rows = packRows(p0);
  assert.equal(rows.length, PZ.PACKS.length);
  assert.equal(rows[0].open, true);
  assert.equal(rows[1].open, false);
  assert.ok(rows[1].gate && rows[1].gate.includes(PZ.PACKS[0].name));
  const done = { ...p0, puzzles: Object.fromEntries(PZ.packIds(0).map((n) => [n, 3])) };
  assert.equal(packRows(done)[0].solved, 15);
  assert.deepEqual(packRows(done)[0].ids, PZ.packIds(0));
  assert.equal(packRows(done)[1].open, true);
  assert.equal(allStars(done), 45);
});

test('next puzzle: none after the last or for a surprise', () => {
  assert.equal(nextPuzzle({ n: 5 }), 6);
  assert.equal(nextPuzzle({ n: 10 }), 81);
  assert.equal(nextPuzzle({ n: 85 }), 11);
  assert.equal(nextPuzzle({ n: PZ.COUNT }), null);
  assert.equal(nextPuzzle({ n: 0 }), null);
});

test('lifting a placed surprise piece: its spot and origin', () => {
  let st = start(PZ.surprise(5));
  // Place the first piece anywhere legal.
  outer: for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const res = L.place(st, 0, r, c);
    if (res) { st = res.state; break outer; }
  }
  assert.equal(st.puzzle!.placed, 1);
  const spot = Object.values(st.puzzle!.at!)[0];
  const [r, c] = [Math.floor(spot.cells[0] / 8), spot.cells[0] % 8];
  assert.equal(spotAt(st, r, c), spot);
  assert.equal(spotAt(st, (r + 4) % 8, (c + 4) % 8), undefined);
  const o = liftOrigin(spot.cells, spot.piece.w, spot.piece.h);
  assert.ok(o.cx > o.col && o.cy > o.row);
});

test('settling a puzzle pays the first solve, a surprise pays its own coins', () => {
  const one = settlePuzzle(p0, { n: 1, hints: 0, stars: 3 }, '2026-10-04');
  assert.equal(one.profile.puzzles![1], 3);
  assert.ok(one.lines.some((l) => l.coins === M.puzzleFirst(1)));
  assert.ok(one.profile.coins > p0.coins);
  const sur = settlePuzzle(p0, { n: 0, hints: 0, stars: 0 }, '2026-10-04');
  assert.equal(sur.profile.surprises, 1);
  assert.equal(sur.lines[0].coins, M.SURPRISE_COINS);
});
