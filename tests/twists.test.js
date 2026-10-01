const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
const W = require('../src/worlds.js');
const LV = require('../src/levels.js');

const SIZE = L.SIZE;
const one = L.SHAPES.find((s) => s.cells.length === 1);
const dot = (id) => ({ id, cells: one.cells, w: 1, h: 1, color: one.color, bonus: null });
const kindCells = (state, kind) => state.special.map((sp, i) => (sp && sp.kind === kind ? i : -1)).filter((i) => i >= 0);

// An empty Plaine level 11 with the given twist cells and 1x1 pieces in the tray.
function game(cells, twist = null, extra = {}) {
  const stage = { ...LV.level('plain', 11), maxMoves: 99, goal: { type: 'lines', target: 50 }, ...extra };
  delete stage.setup;
  stage.twist = twist;
  const state = L.createGame(5, { mode: 'adventure', stage });
  state.board.fill(0); state.special.fill(null); state.bonus.fill(null);
  for (const [i, kind] of cells) { state.board[i] = L.SPECIAL; state.special[i] = { kind, hp: L.KINDS[kind].hp, age: 0 }; }
  state.tray = [dot(900), dot(901), dot(902)];
  state.next = dot(903);
  return state;
}
// Drops a dot on the first empty cell of the bottom row (never completes a line).
let ids = 1000;
function step(state) {
  const i = state.board.findIndex((v, k) => !v && k >= 56);
  state = { ...state, tray: [dot(ids++), ...state.tray.slice(1)] };
  const res = L.place(state, 0, Math.floor(i / SIZE), i % SIZE);
  assert.ok(res, 'move refused');
  return res;
}

test('levels 11-19 carry their world twist, levels 1-10 and the boss do not', () => {
  for (const w of LV.ORDER) {
    assert.ok(W.WORLDS[w].twist && W.WORLDS[w].twist.text, w + ' twist text');
    assert.ok(L.KINDS[LV.TWISTS[w].kind], w + ' twist kind');
    for (let n = 1; n <= 20; n++) {
      const st = LV.level(w, n);
      if (n > 10 && n < 20) assert.equal(st.twist.kind, LV.TWISTS[w].kind);
      else assert.equal(st.twist, undefined, `${w}-${n}`);
    }
  }
});

test('a twist level starts with its cells and drops one more every few moves', () => {
  const stage = LV.level('plain', 12);
  let state = L.createGame(9, { mode: 'adventure', stage });
  assert.equal(kindCells(state, 'mole').length, stage.twist.count);
  state = game([], { kind: 'mole', count: 0, every: 2 });
  state = step(state).state;
  assert.equal(kindCells(state, 'mole').length, 0);
  const res = step(state);
  assert.equal(kindCells(res.state, 'mole').length, 1);
  assert.ok(res.events.spawned.some((s) => s.kind === 'mole'));
});

test('the endless world runs never get twists', () => {
  const state = L.createGame(3, { mode: 'worlds', world: 'plain' });
  assert.equal(state.stage, null);
  for (const k of Object.values(LV.TWISTS)) assert.equal(kindCells(state, k.kind).length, 0);
});

test('a mole leaves by itself after 4 moves and drops a coin when caught', () => {
  let state = game([[0, 'mole']]);
  for (let k = 0; k < 3; k++) state = step(state).state;
  assert.equal(kindCells(state, 'mole').length, 1);
  const res = step(state);
  assert.equal(kindCells(res.state, 'mole').length, 0);
  assert.ok(res.events.spawned.some((s) => s.kind === 'mole' && s.gone));
  // Caught: row 0 full with the mole in it.
  state = game([[0, 'mole']]);
  for (let c = 1; c < SIZE - 1; c++) state.board[c] = 2;
  const caught = L.place(state, 0, 0, SIZE - 1);
  assert.equal(caught.events.lines, 1);
  assert.equal(caught.state.stats.coins, 1);
});

test('a jelly drifts to a neighbor every 2 moves', () => {
  let state = game([[27, 'jelly']]);
  state = step(state).state;
  assert.deepEqual(kindCells(state, 'jelly'), [27]);
  const res = step(state);
  const [to] = kindCells(res.state, 'jelly');
  assert.ok([19, 35, 26, 28].includes(to));
  assert.ok(res.events.spawned.some((s) => s.kind === 'jelly' && s.from));
});

test('no line completes through a hole, and it closes after 8 moves', () => {
  let state = game([[0, 'hole']]);
  for (let c = 1; c < SIZE - 1; c++) state.board[c] = 2;
  const res = L.place(state, 0, 0, SIZE - 1);
  assert.equal(res.events.lines, 0);
  assert.equal(L.previewClears(state.board, dot(1), 0, SIZE - 1, state.special).size, 0);
  state = game([[0, 'hole']]);
  for (let k = 0; k < 8; k++) state = step(state).state;
  assert.equal(kindCells(state, 'hole').length, 0);
});

test('a snowman takes 3 clears', () => {
  let state = game([[0, 'snowman']]);
  for (let hit = 1; hit <= 3; hit++) {
    for (let c = 1; c < SIZE - 1; c++) state.board[c] = 2;
    const res = L.place(state, 0, 0, SIZE - 1);
    assert.equal(res.events.lines, 1);
    state = res.state;
    state.tray = [dot(910 + hit), dot(920 + hit), dot(930 + hit)];
    assert.equal(kindCells(state, 'snowman').length, hit < 3 ? 1 : 0);
  }
});

test('vines grow onto a neighbor every 4 moves', () => {
  let state = game([[27, 'vine']]);
  for (let k = 0; k < 3; k++) state = step(state).state;
  assert.equal(kindCells(state, 'vine').length, 1);
  const res = step(state);
  assert.equal(kindCells(res.state, 'vine').length, 2);
  assert.ok(res.events.spawned.some((s) => s.kind === 'vine' && s.grow));
});

test('a glitch jumps every 3 moves', () => {
  let state = game([[27, 'glitch']]);
  for (let k = 0; k < 2; k++) state = step(state).state;
  assert.deepEqual(kindCells(state, 'glitch'), [27]);
  const res = step(state);
  assert.equal(kindCells(res.state, 'glitch').length, 1);
  assert.ok(res.events.spawned.some((s) => s.kind === 'glitch' && s.hop));
});

test('a token gives 4 seconds back when destroyed', () => {
  let state = game([[0, 'token']], null, { clock: 60000 });
  state.clock = 30000;
  state.special[0] = { kind: 'token', hp: 1, age: 0 };
  for (let c = 1; c < SIZE - 1; c++) state.board[c] = 2;
  const res = L.place(state, 0, 0, SIZE - 1);
  assert.equal(res.events.timeGain, 3000 + 4000);
});

test('lava flows down one row a move until it lands', () => {
  let state = game([[3, 'lava']]);
  state = step(state).state;
  assert.deepEqual(kindCells(state, 'lava'), [11]);
  for (let k = 0; k < 10; k++) state = step(state).state;
  const [i] = kindCells(state, 'lava');
  assert.ok(i + SIZE >= SIZE * SIZE || state.board[i + SIZE], 'resting on something');
});

test('lava twists land in the highest row with room', () => {
  // Row 0 is full but a hole keeps it from clearing.
  const state = game([[0, 'hole']], { kind: 'lava', count: 0, every: 1, top: true });
  for (let c = 1; c < SIZE; c++) state.board[c] = 2;
  const res = step(state);
  const lava = res.events.spawned.find((s) => s.kind === 'lava' && !s.from);
  assert.equal(lava.r, 1);
});
