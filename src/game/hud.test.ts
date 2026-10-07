import assert from 'node:assert/strict';
import { test } from 'node:test';
import { L, M } from '../core';
import { alreadyDone, celebrate, hasClock, hasInventory, hintText, invView, ringEnding, ringFill, trashFill, trashLabel, trashView, undoView } from './hud';

const fresh = (o: Record<string, unknown> = {}) => L.createGame(7, { mode: 'classic', level: 'normal', budget: 100, ...o });

test('hint: aiming wins over stuck, then the best way out of being stuck', () => {
  const st = { ...fresh(), stuck: true };
  assert.equal(hintText(fresh(), null), null);
  assert.equal(hintText(st, { drag: true })!.danger, true);
  assert.match(hintText(st, { drag: false })!.text, /Touche la grille/);
  const bare = { ...st, inventory: { rotate: 0, nitro: 0, shield: 1, bomb: 0, reroll: 0 }, undo: null };
  assert.match(hintText(bare, null)!.text, /jeter/);
  assert.match(hintText({ ...bare, inventory: { ...bare.inventory, bomb: 1 } }, null)!.text, /bonus/);
});

test('undo badge: nothing to undo is disabled; the price shows once undos are paid', () => {
  assert.equal(undoView(fresh()).disabled, true);
  const placed = L.place(fresh(), 0, 0, 0)!.state;
  const v = undoView(placed);
  assert.equal(v.disabled, false);
  assert.equal(v.cost, L.undoCost(placed));
  assert.equal(v.badge, v.cost ? String(v.cost) : 'Gratuit');
  assert.equal(undoView({ ...placed, over: true }).disabled, true);
});

test('bin: broke below the price, label and fill', () => {
  const st = fresh();
  const cost = L.discardCost(st);
  assert.equal(trashView(st, cost).broke, false);
  assert.equal(trashView(st, cost - 1).broke, true);
  assert.equal(trashLabel({ broke: true }, true), 'Pas assez de pièces');
  assert.equal(trashLabel({ broke: false }, false), 'Maintenir pour jeter');
  assert.equal(trashLabel({ broke: false }, true), 'Lâcher pour jeter');
  assert.equal(trashFill(300, 600), 0.5);
  assert.equal(trashFill(900, 600), 1);
  assert.equal(trashFill(-5, 600), 0);
});

test('timer ring: fraction of the effect left, "ending" in the last 5 s', () => {
  const st = fresh();
  assert.equal(ringFill(st, 'nitro'), 0);
  const on = { ...st, effects: { ...st.effects, nitro: L.effectMs(st, 'nitro') / 2 } };
  assert.ok(Math.abs(ringFill(on, 'nitro') - 0.5) < 1e-9);
  assert.equal(ringEnding(on, 'nitro'), false);
  assert.equal(ringEnding({ ...on, effects: { ...on.effects, nitro: 4000 } }, 'nitro'), true);
});

test('inventory buttons: the reserve shows once the run has none, and helps when stuck', () => {
  const st = { ...fresh(), inventory: { rotate: 1, nitro: 0, shield: 0, bomb: 0, reroll: 0 }, stuck: true };
  const stock = { bomb: 3, rotate: 4 };
  assert.deepEqual([invView(st, 'bomb', false, stock).count, invView(st, 'bomb', false, stock).reserve], [0, 3]);
  assert.equal(invView(st, 'bomb', false, stock).empty, false);
  assert.equal(invView(st, 'bomb', false, stock).help, true);
  assert.equal(invView(st, 'rotate', false, stock).reserve, 0); // the run's own go first
  assert.equal(invView(st, 'nitro', false, stock).empty, true);
  const bare = { ...st, inventory: { rotate: 0, nitro: 0, shield: 0, bomb: 0, reroll: 0 } };
  assert.match(hintText(bare, null, stock)!.text, /bonus/);
});

test('inventory buttons: empty, active, aiming, and the help pulse when stuck', () => {
  const st = { ...fresh(), inventory: { rotate: 1, nitro: 0, shield: 0, bomb: 2, reroll: 0 }, stuck: true };
  assert.equal(invView(st, 'nitro', false).empty, true);
  assert.equal(invView(st, 'bomb', false).help, true);
  assert.equal(invView(st, 'bomb', true).help, false);
  assert.equal(invView(st, 'bomb', true).aiming, true);
  assert.equal(invView(st, 'rotate', true).aiming, false);
  assert.equal(invView({ ...st, over: true }, 'bomb', false).empty, true);
  assert.equal(hasInventory(fresh({ mode: 'chill' })), false);
  assert.equal(hasInventory(fresh()), true);
  assert.equal(hasClock(fresh({ mode: 'chrono' })), true);
  assert.equal(hasClock(fresh()), false);
});

test('missions: each finished mission is celebrated once', () => {
  const profile = M.ensureDay(M.createProfile('2026-10-04'), '2026-10-04');
  const none = M.missionStatus(profile, {});
  const announced = alreadyDone(none);
  assert.equal(celebrate(none, announced).length, 0);
  const big = { lines: 999, pieces: 999, coins: 999, score: 99999, bestCombo: 99, bestMulti: 4, perfects: 9, bombCells: 99, bestBomb: 99, bonusUsed: 99, discards: 99, undos: 99 };
  const done = M.missionStatus(profile, big);
  const first = celebrate(done, announced);
  assert.ok(first.length > 0);
  assert.equal(celebrate(done, announced).length, 0, 'not twice');
});
