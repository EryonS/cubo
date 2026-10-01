const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
require('../src/worlds.js');
const LV = require('../src/levels.js');
const M = require('../src/meta.js');

const OCT = '2026-10-05';
const fresh = () => ({ ...M.createProfile(OCT), coins: 0 });
function clearAll(p, day, stars = 2) {
  let report = null;
  for (let n = 1; n <= M.EVENT.levels; n++) ({ profile: p, report } = M.applyEvent(p, day, n, stars));
  return { profile: p, report };
}

test('the event is open in October only', () => {
  assert.equal(M.eventActive('2026-10-01'), true);
  assert.equal(M.eventActive('2026-10-31'), true);
  assert.equal(M.eventActive('2026-11-01'), false);
  assert.equal(M.eventActive('2027-09-30'), false);
  assert.equal(M.eventLevelOpen(fresh(), '2026-11-01', 1), false);
});

test('event levels open one after the other and pay like Aventure levels', () => {
  let p = fresh();
  assert.equal(M.eventLevelOpen(p, OCT, 1), true);
  assert.equal(M.eventLevelOpen(p, OCT, 2), false);
  const res = M.applyEvent(p, OCT, 1, 3);
  p = res.profile;
  assert.equal(res.report.total, 15 + 3 * 5);
  assert.equal(M.eventLevelOpen(p, OCT, 2), true);
  // A locked level is not recorded.
  assert.equal(M.applyEvent(p, OCT, 5, 3).report.total, 0);
});

test('clearing the 10 levels gives the theme, the witch hat and a silver trophy', () => {
  const { profile: p, report } = clearAll(fresh(), OCT);
  assert.ok(p.owned.boards.includes('halloween'));
  assert.ok(p.owned.cubo.includes('witch'));
  assert.deepEqual(report.unlocked.map((u) => u.id).sort(), ['halloween', 'witch']);
  assert.equal(report.trophy, 'silver');
  assert.equal(M.seasonTrophy(p, '2026'), 'silver');
  // Every star upgrades it to gold.
  let q = p;
  for (let n = 1; n <= 10; n++) q = M.applyEvent(q, OCT, n, 3).profile;
  assert.equal(M.seasonTrophy(q, '2026'), 'gold');
});

test('progress resets the next October; owned rewards turn into coins, trophies stay', () => {
  const { profile: p } = clearAll(fresh(), OCT);
  const next = '2027-10-02';
  assert.equal(M.eventCleared(p, next), 0);
  assert.equal(M.eventLevelOpen(p, next, 2), false);
  const { profile: q, report } = clearAll(p, next);
  assert.deepEqual(report.unlocked, []);
  assert.ok(report.earned.some((l) => l.label === 'Récompense Halloween'));
  assert.equal(M.seasonTrophy(q, '2026'), 'silver');
  assert.equal(M.seasonTrophy(q, '2027'), 'silver');
});

test('event levels build and the boss sits in the center', () => {
  for (let n = 1; n <= 10; n++) {
    const st = LV.eventLevel(n);
    assert.equal(st.world, 'halloween');
    const state = L.createGame(n, { mode: 'adventure', stage: st });
    assert.equal(state.mode, 'adventure');
    if (n === 10) assert.equal(state.special.filter((sp) => sp && sp.kind === 'boss').length, 4);
    else assert.ok(state.special.some((sp) => sp && sp.kind === 'pumpkin'));
  }
  assert.equal(LV.eventLevel(11), null);
});

test('a broken pumpkin drops a bag of 5 coins', () => {
  const state = L.createGame(1, { mode: 'adventure', stage: LV.eventLevel(2) });
  state.board.fill(0); state.special.fill(null); state.bonus.fill(null);
  state.board[0] = L.SPECIAL; state.special[0] = { kind: 'pumpkin', hp: 1, age: 0 };
  for (let c = 1; c < 7; c++) state.board[c] = 2;
  const one = L.SHAPES.find((s) => s.cells.length === 1);
  state.tray = [{ id: 99, cells: one.cells, w: 1, h: 1, color: one.color, bonus: null }, null, null];
  const res = L.place(state, 0, 0, 7);
  assert.equal(res.state.stats.coins, 5);
});

test('profile v5: old saves get a wardrobe with the theme look', () => {
  const old = { ...M.createProfile(OCT), version: 4 };
  delete old.owned.cubo; delete old.equipped.cubo;
  const { profile } = M.migrate(old);
  assert.equal(profile.version, 5);
  assert.deepEqual(profile.owned.cubo, ['auto']);
  assert.equal(profile.equipped.cubo, 'auto');
  // Daily attempts are not refunded again for v4 saves.
  const daily = { ...old, daily: { '2026-09-30': { attempts: 2 } } };
  assert.equal(M.migrate(daily).profile.daily['2026-09-30'].attempts, 2);
});

test('wardrobe pieces are bought and equipped like other skins; the witch hat is not sold', () => {
  let p = { ...M.createProfile(OCT), coins: 1000 };
  p = M.buy(p, 'cubo', 'crown');
  assert.equal(p.equipped.cubo, 'crown');
  assert.equal(p.coins, 500);
  assert.equal(M.buy(p, 'cubo', 'witch'), null);
  assert.equal(M.equip(p, 'cubo', 'auto').equipped.cubo, 'auto');
});
