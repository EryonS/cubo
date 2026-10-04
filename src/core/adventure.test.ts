// @ts-nocheck -- ported as is from legacy/tests (loose fixtures); run by tsx, not type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from './logic';
import './worlds';
import * as LV from './levels';

const S = L.SIZE;
const dot = { id: 999, cells: [[0, 0]], w: 1, h: 1, color: 1, bonus: null };

// A level with a clean board and a 1x1 piece in slot 0.
function stage(world, goal, extra = {}) {
  const st = L.createGame(1, { mode: 'adventure', stage: { world, n: 1, goal, maxMoves: 20, ...extra } });
  st.board.fill(0); st.bonus.fill(null); st.special.fill(null);
  st.tray = [dot, dot, dot];
  return st;
}
// Fills row r except column `gap`.
function almostRow(st, r, gap) {
  for (let c = 0; c < S; c++) if (c !== gap) st.board[r * S + c] = 2;
}
function putSpecial(st, r, c, kind, hp) {
  st.board[r * S + c] = L.SPECIAL;
  st.special[r * S + c] = { kind, hp: hp ?? L.KINDS[kind].hp, age: 0 };
}

test('setup scatters the level special cells', () => {
  const st = L.createGame(3, { mode: 'adventure', stage: LV.level('ice', 1) });
  assert.equal(st.special.filter(Boolean).length, LV.level('ice', 1).setup.count);
  assert.ok(st.special.filter(Boolean).every((s) => s.kind === 'ice' && s.hp === 2));
});

test('ice takes two clears; the goal counts destroyed cells only', () => {
  let st = stage('ice', { type: 'clear', kind: 'ice', target: 1 });
  almostRow(st, 7, 0);
  putSpecial(st, 7, 3, 'ice');
  let res = L.place(st, 0, 7, 0);
  assert.equal(res.events.damaged.length, 1);
  assert.equal(res.state.special[7 * S + 3].hp, 1);
  assert.equal(res.state.stage.progress, 0);
  st = res.state;
  st.tray = [dot, dot, dot];
  almostRow(st, 7, 0);
  res = L.place(st, 0, 7, 0);
  assert.equal(res.state.special[7 * S + 3], null);
  assert.equal(res.state.stage.progress, 1);
  assert.equal(res.state.stage.won, true);
  assert.equal(res.state.over, true);
  assert.equal(res.state.stage.stars, 3);
});

test('gravity drops blocks and chains a second line', () => {
  const st = stage('retro', { type: 'lines', target: 99 });
  almostRow(st, 7, 0);                                  // row 7 completes when we drop at (7,0)
  for (let c = 1; c < S; c++) st.board[5 * S + c] = 3;  // row 5 full except col 0...
  st.board[6 * S + 0] = 4;                              // ...whose missing cell sits in row 6, col 0
  st.board[6 * S + 1] = 0;
  const res = L.place(st, 0, 7, 0);
  // Row 7 clears, everything falls one row, row 6 (old row 5 + the col-0 block) completes and chains.
  assert.equal(res.events.chain, 1);
  assert.equal(res.events.lines, 2);
  assert.equal(res.state.stage.progress, 2);
  // The renderer gets each wave: what it cleared and how blocks fell after it.
  assert.equal(res.events.waves.length, 2);
  assert.equal(res.events.waves[0].cleared.length, S);
  assert.ok(res.events.waves[0].moves.every(([from, to]) => to % S === from % S && to > from));
  assert.equal(res.events.waves[1].cleared.length, S);
});

test('an ember blast clears its row and column', () => {
  const st = stage('volcano', { type: 'clear', kind: 'ember', target: 5 });
  almostRow(st, 7, 0);
  putSpecial(st, 7, 4, 'ember');
  st.board[2 * S + 4] = 5; // same column, far away
  const res = L.place(st, 0, 7, 0);
  assert.equal(res.events.blasts.length, 1);
  assert.equal(res.state.board[2 * S + 4], 0);
  assert.equal(res.state.stage.progress, 1);
});

test('embers harden into rock when left too long', () => {
  let st = stage('volcano', { type: 'lines', target: 99 }, { maxMoves: 99 });
  putSpecial(st, 0, 0, 'ember');
  for (let k = 0; k < L.KINDS.ember.fuse; k++) {
    st.tray = [dot, dot, dot];
    st = L.place(st, 0, 4, k % S).state;
  }
  assert.equal(st.special[0].kind, 'rock');
  assert.equal(st.special[0].hp, 2);
});

test('running out of moves loses; bought moves revive but cap stars at 1', () => {
  let st = stage('plain', { type: 'lines', target: 1 }, { maxMoves: 1 });
  st = L.place(st, 0, 0, 0).state;
  assert.equal(st.over, true);
  assert.equal(st.stage.won, false);
  st = L.addMoves(st, 5);
  assert.equal(st.over, false);
  assert.equal(st.stage.movesLeft, 5);
  st.tray = [dot, dot, dot];
  almostRow(st, 7, 0);
  st = L.place(st, 0, 7, 0).state;
  assert.equal(st.stage.won, true);
  assert.equal(st.stage.stars, 1);
});

test('bonuses do not spend moves', () => {
  let st = stage('plain', { type: 'lines', target: 9 });
  st.inventory.nitro = 1;
  st = L.use(st, 'nitro').state;
  assert.equal(st.stage.movesLeft, 20);
});

test('classic games have no stage and ignore world rules', () => {
  const st = L.createGame(1);
  assert.equal(st.stage, null);
  assert.equal(st.mode, 'classic');
  assert.equal(L.createGame(1, { mode: 'adventure' }).mode, 'classic'); // no stage, no adventure
});

test('every level of the map builds a playable stage', () => {
  for (const world of LV.ORDER) {
    for (let n = 1; n <= LV.PER_WORLD; n++) {
      const s = LV.level(world, n);
      assert.ok(s.maxMoves >= 10 && s.goal.target > 0, `${world}-${n}`);
      if (s.goal.type === 'clear') assert.ok((s.setup && s.setup.kind === s.goal.kind) || (s.fill && s.goal.kind === 'crate'), `${world}-${n}`);
      L.createGame(n, { mode: 'adventure', stage: s });
    }
  }
});
