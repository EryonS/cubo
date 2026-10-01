const test = require('node:test');
const assert = require('node:assert');
const L = require('../www/src/core/logic.js');
require('../www/src/core/worlds.js');
const M = require('../www/src/core/meta.js');

const withBonus = (state, type, n = 1) => ({ ...state, inventory: { ...state.inventory, [type]: n } });

test('upgrade levels default to 1 and old saves without upgrades still play', () => {
  const st = L.createGame(1);
  assert.deepEqual(st.upgrades, {});
  assert.equal(L.upLevel(st, 'bomb'), 1);
  const old = { ...st };
  delete old.upgrades;
  assert.equal(L.upLevel(old, 'rotate'), 1);
  const r = L.use(withBonus(old, 'rotate'), 'rotate');
  assert.equal(r.state.effects.rotate, 30000);
});

test('timed bonuses last longer when upgraded and stack to two uses', () => {
  const st = withBonus(L.createGame(1, { upgrades: { rotate: 3, shield: 2 } }), 'rotate', 2);
  const once = L.use(st, 'rotate').state;
  assert.equal(once.effects.rotate, 60000);
  assert.equal(L.use(once, 'rotate').state.effects.rotate, 120000);
  const sh = L.use(withBonus(st, 'shield'), 'shield').state;
  assert.equal(sh.effects.shield, 45000);
});

test('Étoile multiplier grows with its level', () => {
  const st = L.createGame(1, { upgrades: { nitro: 3 } });
  assert.equal(L.nitroMul(st), 1);
  assert.equal(L.nitroMul({ ...st, effects: { ...st.effects, nitro: 1000 } }), 3);
  assert.equal(L.nitroMul({ ...L.createGame(1), effects: { rotate: 0, nitro: 1000, shield: 0 } }), 2);
});

test('bomb area: 21, then 25, then 5x5 plus the full cross', () => {
  assert.equal(L.bombArea(4, 4).length, 21);
  assert.equal(L.bombArea(4, 4, 2).length, 25);
  // 25 + 3 cells left on the row + 3 on the column (8x8 board, center at 4,4: rows 2..6 already in).
  assert.equal(L.bombArea(4, 4, 3).length, 25 + 3 + 3);
  assert.ok(L.bombArea(4, 4, 3).some(([r, c]) => r === 4 && c === 0));
});

test('upgraded bomb clears more of a full board', () => {
  const base = L.createGame(1);
  const full = (st) => ({ ...st, board: st.board.map(() => 1) });
  const lv1 = L.use(withBonus(full(base), 'bomb'), 'bomb', { r: 4, c: 4 });
  const lv3 = L.use(withBonus(full(L.createGame(1, { upgrades: { bomb: 3 } })), 'bomb'), 'bomb', { r: 4, c: 4 });
  assert.equal(lv1.events.cleared.length, 21);
  assert.equal(lv3.events.cleared.length, 31);
});

test('Tornade level 3 deals small pieces that fit', () => {
  const st = withBonus(L.createGame(5, { upgrades: { reroll: 3 } }), 'reroll');
  const out = L.use(st, 'reroll').state;
  for (const p of out.tray) {
    assert.ok(p.cells.length <= 3);
    assert.ok(L.pieceFits(out, p));
  }
});

test('createGame caps upgrade levels and ignores unknown bonuses', () => {
  const st = L.createGame(1, { upgrades: { bomb: 9, nope: 2, rotate: 1 } });
  assert.deepEqual(st.upgrades, { bomb: 3 });
});

test('buying upgrades: prices, levels, top level and short wallet', () => {
  let p = { ...M.createProfile('2026-10-01'), coins: 1000 };
  assert.equal(M.upgradeLevel(p, 'bomb'), 1);
  assert.equal(M.upgradePrice(p, 'bomb'), 300);
  p = M.buyUpgrade(p, 'bomb');
  assert.equal(p.coins, 700);
  assert.equal(M.upgradeLevel(p, 'bomb'), 2);
  p = M.buyUpgrade(p, 'bomb');
  assert.equal(p.coins, 0);
  assert.equal(M.upgradeLevel(p, 'bomb'), 3);
  assert.equal(M.upgradePrice(p, 'bomb'), null);
  assert.equal(M.buyUpgrade({ ...p, coins: 9999 }, 'bomb'), null);
  assert.equal(M.buyUpgrade({ ...p, coins: 10 }, 'rotate'), null);
});
