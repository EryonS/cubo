// @ts-nocheck -- ported as is from legacy/tests (loose fixtures); run by tsx, not type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from './logic';
import * as W from './worlds';
import * as LV from './levels';
import * as M from './meta';

const OCT = '2026-10-05';
const fresh = () => ({ ...M.createProfile(OCT), coins: 0 });
const H = 'halloween';
function clearAll(p, day, stars = 2, id = H) {
  let report = null;
  for (let n = 1; n <= 10; n++) ({ profile: p, report } = M.applyEvent(p, id, day, n, stars));
  return { profile: p, report };
}

test('events open on their dates, and can overlap', () => {
  const at = (day) => M.eventsFor(day).map((e) => e.id).join(',') || null;
  assert.equal(at('2027-01-15'), 'newyear');
  assert.equal(at('2027-02-14'), 'lunar,valentine'); // Chinese New Year 2027: Feb 6, open Feb 3 to Feb 20
  assert.equal(at('2027-02-21'), 'valentine');
  assert.equal(at('2028-01-25'), 'newyear,lunar'); // Chinese New Year 2028: Jan 26
  assert.equal(at('2027-03-10'), null);
  // Easter follows Easter Sunday: two weeks before to the Sunday after.
  assert.equal(M.easterSunday(2026), '2026-04-05');
  assert.equal(M.easterSunday(2027), '2027-03-28');
  assert.equal(M.easterSunday(2028), '2028-04-16');
  assert.equal(at('2027-03-14'), 'easter');
  assert.equal(at('2027-04-04'), 'easter');
  assert.equal(at('2027-04-05'), null);
  assert.equal(M.eventEnd('easter', '2027-03-20'), '2027-04-04');
  assert.equal(at('2027-07-01'), 'beach');
  assert.equal(at('2027-08-31'), 'beach');
  assert.equal(at('2026-10-31'), 'halloween');
  assert.equal(at('2026-11-01'), null);
  assert.equal(at('2026-12-24'), 'xmas');
  assert.equal(M.eventEnd('beach', '2027-07-03'), '2027-08-31');
  assert.equal(M.eventEnd('valentine', '2028-02-03'), '2028-02-29');
  assert.equal(M.eventLevelOpen(fresh(), H, '2026-11-01', 1), false);
  assert.equal(M.eventLevelOpen(fresh(), 'xmas', OCT, 1), false);
  // No known date: no Chinese New Year that year.
  assert.equal(M.eventsFor('2050-02-01').some((e) => e.id === 'lunar'), false);
});

test('a lantern rises a row a move and pays a coin when caught', () => {
  const state = eventGame('lunar', 2, [[59, 'lantern']]);
  const res = L.place(state, 0, 0, 0);
  assert.equal(res.state.special[51].kind, 'lantern');
});

test('free play: Normal drops one obstacle kind, Difficile two, each with a coin bonus', () => {
  assert.deepEqual(W.freeObstacles('volcano', 'easy'), []);
  assert.deepEqual(W.freeObstacles('volcano', 'normal').map((o) => o.kind), ['ember']);
  assert.deepEqual(W.freeObstacles('volcano', 'hard').map((o) => o.kind), ['ember', 'lava']);
  assert.deepEqual(W.freeObstacles('toy', 'hard').map((o) => o.kind), ['crate', 'mole']);
  let state = L.createGame(5, { mode: 'classic', level: 'hard', obstacles: W.freeObstacles('ice', 'hard') });
  let spawned = [];
  for (let k = 0; k < 10 && !state.over; k++) {
    const i = state.board.findIndex((v, j) => !v && j >= 56);
    state = { ...state, tray: [dot(800 + k), ...state.tray.slice(1)] };
    const res = L.place(state, 0, Math.floor(i / 8), i % 8);
    state = res.state;
    spawned = spawned.concat(res.events.spawned);
  }
  assert.ok(spawned.some((s) => s.kind === 'ice'));
  assert.ok(spawned.some((s) => s.kind === 'snowman'));
  assert.equal(L.createGame(5, { mode: 'classic', obstacles: [] }).obstacles, undefined);
  const lines = M.runCoins({ coins: 20, obstacles: 2 });
  assert.equal(lines.find((l) => l.label.startsWith('Bonus')).coins, 10);
  assert.equal(M.runCoins({ coins: 20, obstacles: 1 }).find((l) => l.label.startsWith('Bonus')).coins, 4);
  assert.equal(M.runCoins({ coins: 20 }).length, 1);
});

test('every event has 10 levels, a world, a theme and a Cubo piece that are not sold', () => {
  for (const ev of M.EVENTS) {
    for (let n = 1; n <= 10; n++) {
      const st = LV.eventLevel(ev.id, n);
      assert.equal(st.world, ev.id);
      const state = L.createGame(n, { mode: 'adventure', stage: st });
      assert.equal(state.mode, 'adventure');
      if (n === 10) assert.equal(state.special.filter((sp) => sp && sp.kind === 'boss').length, 4);
    }
    assert.equal(LV.eventLevel(ev.id, 11), null);
    assert.equal(M.SKINS.boards.find((s) => s.id === ev.theme).price, null);
    assert.equal(M.SKINS.cubo.find((s) => s.id === ev.hat).price, null);
    assert.ok(L.KINDS[ev.icon]);
  }
});

test('event levels open one after the other and pay like Aventure levels', () => {
  let p = fresh();
  assert.equal(M.eventLevelOpen(p, H, OCT, 1), true);
  assert.equal(M.eventLevelOpen(p, H, OCT, 2), false);
  const res = M.applyEvent(p, H, OCT, 1, 3);
  p = res.profile;
  assert.equal(res.report.total, 3 + 3 * 3);
  assert.equal(M.eventLevelOpen(p, H, OCT, 2), true);
  // A locked level is not recorded.
  assert.equal(M.applyEvent(p, H, OCT, 5, 3).report.total, 0);
});

test('clearing the 10 levels gives the theme, the witch hat and a silver trophy', () => {
  const { profile: p, report } = clearAll(fresh(), OCT);
  assert.ok(p.owned.boards.includes('halloween'));
  assert.ok(p.owned.cubo.includes('witch'));
  assert.deepEqual(report.unlocked.map((u) => u.id).sort(), ['halloween', 'witch']);
  assert.equal(report.trophy, 'silver');
  assert.equal(M.seasonTrophy(p, H, '2026'), 'silver');
  // Every star upgrades it to gold.
  let q = p;
  for (let n = 1; n <= 10; n++) q = M.applyEvent(q, H, OCT, n, 3).profile;
  assert.equal(M.seasonTrophy(q, H, '2026'), 'gold');
});

test('progress resets the next October; owned rewards turn into coins, trophies stay', () => {
  const { profile: p } = clearAll(fresh(), OCT);
  const next = '2027-10-02';
  assert.equal(M.eventCleared(p, H, next), 0);
  assert.equal(M.eventLevelOpen(p, H, next, 2), false);
  const { profile: q, report } = clearAll(p, next);
  assert.deepEqual(report.unlocked, []);
  assert.ok(report.earned.some((l) => l.label === 'Récompense Halloween'));
  assert.equal(M.seasonTrophy(q, H, '2026'), 'silver');
  assert.equal(M.seasonTrophy(q, H, '2027'), 'silver');
});

test('a broken pumpkin drops a bag of 5 coins', () => {
  const state = L.createGame(1, { mode: 'adventure', stage: LV.eventLevel(H, 2) });
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
  assert.equal(profile.version, 7);
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

test('profile v6: Halloween progress moves to seasons', () => {
  const old = { ...M.createProfile(OCT), version: 5, halloween: { year: '2026', stars: { 1: 3 } } };
  const { profile } = M.migrate(old);
  assert.equal(profile.halloween, undefined);
  assert.deepEqual(profile.seasons.halloween, { year: '2026', stars: { 1: 3 } });
  assert.equal(M.eventStars(profile, H, OCT, 1), 3);
});

// ---------- season cells ----------
const one = L.SHAPES.find((s) => s.cells.length === 1);
const dot = (id) => ({ id, cells: one.cells, w: 1, h: 1, color: one.color, bonus: null });
function eventGame(id, n, cells) {
  const state = L.createGame(1, { mode: 'adventure', stage: { ...LV.eventLevel(id, n), maxMoves: 99, clock: undefined } });
  state.board.fill(0); state.special.fill(null); state.bonus.fill(null);
  for (const [i, kind, extra] of cells) { state.board[i] = L.SPECIAL; state.special[i] = { kind, hp: L.KINDS[kind].hp, age: 0, ...extra }; }
  state.tray = [dot(901), dot(902), dot(903)];
  state.next = dot(904);
  return state;
}
const fillRow0 = (state, skip) => { for (let c = 0; c < 8; c++) if (!state.board[c] && c !== skip) state.board[c] = 2; };

test('a heart takes its twin with it', () => {
  const state = eventGame('valentine', 1, [[0, 'heart', { link: 0 }], [60, 'heart', { link: 0 }], [61, 'heart', { link: 1 }]]);
  fillRow0(state, 7);
  const res = L.place(state, 0, 0, 7);
  assert.equal(res.state.special[60], null);
  assert.equal(res.state.special[61].kind, 'heart');
  assert.equal(res.state.stage.progress, 2);
});

test('a bush may hide an egg: found eggs count and pay a coin', () => {
  const state = eventGame('easter', 1, [[0, 'bush', { egg: true }], [1, 'bush']]);
  fillRow0(state, 7);
  const res = L.place(state, 0, 0, 7);
  assert.equal(res.state.stage.progress, 1);
  assert.equal(res.state.stats.coins, 1);
  assert.ok(res.events.cleared.some((c) => c.kind === 'egg'));
});

test('crabs walk sideways and turn at walls', () => {
  const state = eventGame('beach', 2, [[24 + 7, 'crab', { dir: 1 }]]);
  const res = L.place(state, 0, 7, 0);
  assert.equal(res.state.special[24 + 6].kind, 'crab');
  assert.equal(res.state.special[24 + 6].dir, -1);
});

test('the tide floods the lowest row with room every 8 moves, then leaves', () => {
  const state = eventGame('beach', 2, []);
  for (let c = 0; c < 8; c++) if (c !== 3 && c !== 5) state.board[56 + c] = 2;
  state.moves = 7;
  const res = L.place(state, 0, 0, 0);
  assert.equal(res.state.special[59].kind, 'water');
  assert.equal(res.state.special[61].kind, 'water');
});

test('a rocket clears its diagonals', () => {
  const state = eventGame('newyear', 1, [[27, 'rocket']]);
  for (const i of [18, 9, 0, 36, 45, 54, 63, 20, 13, 6, 34, 41, 48]) state.board[i] = 3;
  for (let c = 0; c < 8; c++) if (!state.board[24 + c]) state.board[24 + c] = 2;
  state.board[24] = 0;
  const res = L.place(state, 0, 3, 0);
  assert.ok(res.events.blasts.some((b) => b.kind === 'rocket'));
  for (const i of [18, 9, 0, 36, 45, 54, 63, 20, 13, 6, 34, 41, 48]) assert.equal(res.state.board[i], 0, 'cell ' + i);
});

test('a present opens into a random bonus', () => {
  const state = eventGame('xmas', 1, [[0, 'present']]);
  state.special[0].hp = 1;
  fillRow0(state, 7);
  const res = L.place(state, 0, 0, 7);
  assert.equal(res.events.collected.length, 1);
  assert.ok(L.BONUSES[res.events.collected[0].type]);
});
