// Port check (until legacy/ is deleted at milestone 10): the TypeScript logic plays the same games
// as the legacy JavaScript, move for move, state for state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as L from './logic';
import type { RunState } from './types';

const legacy = createRequire(__filename)('../../legacy/www/src/core/logic.js');
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
