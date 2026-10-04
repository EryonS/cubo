// Port check (until legacy/ is deleted at milestone 10): the TypeScript logic plays the same games
// as the legacy JavaScript, move for move, state for state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { L, LV, PZ } from './index';
import type { RunState } from './types';

const req = createRequire(__filename);
const legacy = req('../../legacy/www/src/core/logic.js');
req('../../legacy/www/src/core/worlds.js');
const legacyLV = req('../../legacy/www/src/core/levels.js');
const legacyPZ = req('../../legacy/www/src/core/puzzles.js');
const strip = (s: RunState | null) => (s ? JSON.parse(JSON.stringify({ ...s, undo: null })) : s);

// Plays the first legal move each turn (all slots, all cells), firing a stored bonus now and then.
function play(api: typeof L, seed: number, opts: L.GameOpts, moves: number) {
  let s = api.createGame(seed, opts);
  const trail: unknown[] = [strip(s)];
  for (let m = 0; m < moves && !s.over; m++) {
    let res: L.MoveResult | null = null;
    if (m % 7 === 3 && s.inventory.bomb > 0) res = api.use(s, 'bomb', { r: 4, c: 4 });
    else if (m % 5 === 2 && s.inventory.reroll > 0) res = api.use(s, 'reroll');
    else if (m % 6 === 1 && s.inventory.nitro > 0) res = api.use(s, 'nitro');
    for (let i = 0; !res && i < s.tray.length; i++) {
      for (let cell = 0; !res && cell < 64; cell++) res = api.place(s, i, cell >> 3, cell & 7);
    }
    if (!res) break;
    s = api.tick(res.state, 250);
    trail.push(strip(s), JSON.parse(JSON.stringify(res.events)));
  }
  return trail;
}

for (const [label, opts] of [
  ['classic', { mode: 'classic' }],
  ['chrono hard', { mode: 'chrono', level: 'hard' }],
  ['chill easy', { mode: 'chill', level: 'easy', budget: 40 }],
  ['classic with obstacles', { mode: 'classic', obstacles: [{ kind: 'rock', every: 5 }, { kind: 'lava', every: 7, top: true }] }],
  ['upgrades', { mode: 'classic', upgrades: { bomb: 3, reroll: 2, nitro: 3 } }],
] as [string, L.GameOpts][]) {
  test(`same games as the legacy logic: ${label}`, () => {
    for (const seed of [1, 42, 2026, 99991]) {
      assert.deepEqual(play(L, seed, opts, 120), play(legacy, seed, opts, 120), `seed ${seed}`);
    }
  });
}

test('same Aventure levels, events and daily levels as the legacy', () => {
  for (const w of LV.ORDER) for (let n = 1; n <= LV.PER_WORLD; n++) assert.deepEqual(LV.level(w, n), legacyLV.level(w, n), w + n);
  for (const id of Object.keys(LV.EVENT_LEVELS)) for (let n = 1; n <= 10; n++) assert.deepEqual(LV.eventLevel(id, n), legacyLV.eventLevel(id, n), id + n);
  for (const day of ['2026-09-01', '2026-10-04', '2027-02-14']) assert.deepEqual(LV.daily(day), legacyLV.daily(day), day);
});

test('same Aventure games as the legacy (every world: levels 1, 10, 15, 20)', () => {
  for (const w of LV.ORDER) for (const n of [1, 10, 15, 20]) {
    const opts = { mode: 'adventure', stage: LV.level(w, n) };
    assert.deepEqual(play(L, n, opts, 80), play(legacy, n, { mode: 'adventure', stage: legacyLV.level(w, n) }, 80), w + n);
  }
});

test('same season event games as the legacy', () => {
  for (const id of Object.keys(LV.EVENT_LEVELS)) for (const n of [1, 4, 10]) {
    assert.deepEqual(play(L, n, { mode: 'adventure', stage: LV.eventLevel(id, n) }, 60),
      play(legacy, n, { mode: 'adventure', stage: legacyLV.eventLevel(id, n) }, 60), id + n);
  }
});

test('same Mondes runs as the legacy', () => {
  for (const w of LV.ORDER) assert.deepEqual(play(L, 3, { mode: 'worlds', world: w }, 80), play(legacy, 3, { mode: 'worlds', world: w }, 80), w);
});

test('same puzzles and puzzle games as the legacy', () => {
  for (let n = 1; n <= PZ.COUNT; n++) assert.deepEqual(PZ.puzzle(n), legacyPZ.puzzle(n), 'puzzle ' + n);
  for (const seed of [1, 77, 4242]) assert.deepEqual(PZ.surprise(seed), legacyPZ.surprise(seed), 'surprise ' + seed);
  for (const n of [1, 25, 60]) {
    assert.deepEqual(play(L, 0, { mode: 'puzzle', puzzle: PZ.puzzle(n) }, 20), play(legacy, 0, { mode: 'puzzle', puzzle: legacyPZ.puzzle(n) }, 20), 'game ' + n);
  }
});
