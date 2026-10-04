// @ts-nocheck -- ported as is from legacy/tests (loose fixtures); run by tsx, not type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from './logic';
import './worlds';
import * as LV from './levels';
import * as M from './meta';

const SIZE = L.SIZE;
const one = L.SHAPES.find((s) => s.cells.length === 1);
const dot = (id) => ({ id, cells: one.cells, w: 1, h: 1, color: one.color, bonus: null });
const bossCells = (state) => state.special.map((sp, i) => (sp && sp.kind === 'boss' ? i : -1)).filter((i) => i >= 0);

// A boss level with the board cleared around the boss and 1x1 pieces in the tray.
function bossGame(world = 'plain', extra = {}) {
  const stage = { ...LV.level(world, 20), ...extra };
  const state = L.createGame(3, { mode: 'adventure', stage });
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (state.special[i] && state.special[i].kind === 'boss') continue;
    state.board[i] = 0; state.special[i] = null; state.bonus[i] = null;
  }
  state.tray = [dot(900), dot(901), dot(902)];
  state.next = dot(903);
  return state;
}

test('20 levels a world: a trial at 10, a boss fight at 20', () => {
  for (const w of LV.ORDER) {
    assert.equal(LV.level(w, 21), null);
    assert.equal(LV.level(w, 10).trial, true);
    const boss = LV.level(w, 20);
    assert.equal(boss.goal.type, 'boss');
    assert.ok(boss.goal.target > 0 && boss.boss.every > 0 && L.KINDS[boss.boss.kind]);
  }
});

test('the boss sits in the center and a line through it takes 2 hp without removing it', () => {
  let state = bossGame();
  const cells = bossCells(state);
  assert.equal(cells.length, 4);
  assert.deepEqual(cells, [27, 28, 35, 36]);
  // Row 3 minus one cell, then the last dot completes it.
  for (let c = 0; c < SIZE; c++) if (c !== 0 && c !== 3 && c !== 4) state.board[3 * SIZE + c] = 2;
  const res = L.place(state, 0, 3, 0);
  assert.equal(res.events.lines, 1);
  assert.equal(res.events.bossHits.length, 2);
  assert.equal(res.state.stage.progress, 2);
  assert.deepEqual(bossCells(res.state), cells);
  assert.equal(res.state.board.filter((v) => v).length, 4);
});

test('the boss strikes back every few moves with its world kind', () => {
  let state = bossGame('space');
  const every = state.stage.boss.every;
  let spawned = [];
  for (let k = 0; k < every; k++) {
    const free = state.board.findIndex((v, i) => !v && i < 16);
    const res = L.place(state, k % 3, Math.floor(free / SIZE), free % SIZE);
    state = res.state;
    spawned = spawned.concat(res.events.spawned.filter((s) => s.attack));
  }
  assert.equal(spawned.length, state.stage.boss.count);
  assert.equal(spawned[0].kind, 'asteroid');
});

test('gravity never moves the boss', () => {
  const state = bossGame('retro');
  state.board[0 * SIZE + 3] = 2; // above the boss
  state.board[1 * SIZE + 0] = 2;
  for (let c = 1; c < SIZE; c++) state.board[7 * SIZE + c] = 2; // bottom row missing (7, 0)
  const res = L.place(state, 0, 7, 0);
  assert.deepEqual(bossCells(res.state), [27, 28, 35, 36]);
  assert.equal(res.state.board[2 * SIZE + 3], 2, 'the block above lands on the boss');
});

test('coins and combo goals track the run', () => {
  const coins = L.createGame(1, { mode: 'adventure', stage: { world: 'plain', n: 3, goal: { type: 'coins', target: 2 }, maxMoves: 20 } });
  coins.board = new Array(64).fill(0);
  for (let c = 1; c < SIZE; c++) coins.board[c] = 2;
  coins.bonus[1] = 'coin'; coins.bonus[2] = 'coin';
  coins.tray = [dot(1), dot(2), dot(3)];
  const res = L.place(coins, 0, 0, 0);
  assert.equal(res.state.stage.progress, 2);
  assert.equal(res.state.stage.won, true);

  let combo = L.createGame(1, { mode: 'adventure', stage: { world: 'plain', n: 4, goal: { type: 'combo', target: 2 }, maxMoves: 20 } });
  combo.board = new Array(64).fill(0);
  for (let r = 0; r < 2; r++) for (let c = 1; c < SIZE; c++) combo.board[r * SIZE + c] = 2;
  combo.tray = [dot(1), dot(2), dot(3)];
  combo = L.place(combo, 0, 0, 0).state;
  assert.equal(combo.stage.progress, 1);
  combo = L.place(combo, 1, 1, 0).state;
  assert.equal(combo.stage.won, true);
});

test('crate levels scatter crates at the bottom: no row half full, none side by side, two hits each', () => {
  for (const n of [5, 11, 16]) {
    const stage = LV.level('plain', n);
    assert.equal(stage.goal.kind, 'crate');
    for (let seed = 1; seed <= 20; seed++) {
      const state = L.createGame(seed, { mode: 'adventure', stage });
      const isCrate = (i) => !!(state.special[i] && state.special[i].kind === 'crate');
      const crates = state.special.map((_, i) => i).filter(isCrate);
      assert.equal(crates.length, stage.goal.target + stage.fill);
      for (const i of crates) {
        assert.ok(Math.floor(i / SIZE) >= SIZE - stage.fill * 2, `crate ${i} too high`);
        if (i % SIZE < SIZE - 1) assert.ok(!isCrate(i + 1), `crates ${i} and ${i + 1} side by side`);
      }
      for (let r = 0; r < SIZE; r++) assert.ok(crates.filter((i) => Math.floor(i / SIZE) === r).length <= SIZE / 2);
    }
  }
  assert.equal(L.KINDS.crate.hp, 2);
});

test('migrate keeps worlds opened under the v1 rules', () => {
  const v2 = {
    version: 2, coins: 0, games: 9, missions: [], missionsDone: 0, day: null,
    owned: { blocks: ['classic'], boards: ['toy', 'plain', 'sea'] }, equipped: { blocks: 'classic', boards: 'toy' },
    adventure: { stars: Object.fromEntries([...Array(10)].map((_, i) => [`plain-${i + 1}`, 2]).concat([...Array(10)].map((_, i) => [`sea-${i + 1}`, 1]))) },
  };
  const { profile } = M.migrate(v2);
  assert.equal(profile.version, 6);
  assert.deepEqual(profile.adventure.opened, ['sea']); // space needed 36 stars in v1: 30 here
  assert.equal(M.worldOpen(profile, 'sea'), true);
  assert.equal(M.worldOpen(profile, 'space'), false);
  assert.equal(M.levelOpen(profile, 'plain', 11), true);
  assert.equal(M.migrate(profile).profile, profile);
});

test('v2 gates: next world after the level-20 boss and 36 stars a world', () => {
  const stars = Object.fromEntries([...Array(20)].map((_, i) => [`plain-${i + 1}`, 2]));
  const p = { ...M.createProfile('2026-10-01'), adventure: { stars } };
  assert.equal(M.worldOpen(p, 'sea'), true);
  const short = { ...p, adventure: { stars: { ...stars, 'plain-20': undefined } } };
  delete short.adventure.stars['plain-20'];
  assert.equal(M.worldOpen(short, 'sea'), false);
  const boss = M.applyLevel(M.createProfile('2026-10-01'), 'plain', 20, 3);
  assert.equal(boss.report.earned[0].label, 'Boss vaincu');
  assert.equal(boss.report.themeUnlocked, 'plain');
  assert.equal(M.applyLevel(M.createProfile('2026-10-01'), 'plain', 10, 1).report.earned[0].label, 'Épreuve réussie');
});

test('star chests open once, when the world has enough stars', () => {
  let p = { ...M.createProfile('2026-10-01'), coins: 0 };
  assert.equal(M.chestState(p, 'plain', 0), 'locked');
  assert.equal(M.openChest(p, 'plain', 0), null);
  const stars = Object.fromEntries([...Array(12)].map((_, i) => [`plain-${i + 1}`, 3]));
  p = { ...p, adventure: { stars } }; // 36 stars
  assert.equal(M.chestState(p, 'plain', 1), 'ready');
  assert.equal(M.chestState(p, 'plain', 2), 'locked');
  const a = M.openChest(p, 'plain', 0);
  assert.equal(a.profile.coins, 40);
  assert.equal(M.chestState(a.profile, 'plain', 0), 'open');
  assert.equal(M.openChest(a.profile, 'plain', 0), null);
  const b = M.openChest(a.profile, 'plain', 1);
  assert.equal(M.freeBombs(b.profile), 2);
  assert.equal(M.freeBombs(M.useFreeBomb(b.profile)), 1);
  assert.equal(M.useFreeBomb(p), null);
});
