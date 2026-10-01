const test = require('node:test');
const assert = require('node:assert');
const L = require('../www/src/core/logic.js');
require('../www/src/core/worlds.js');
const M = require('../www/src/core/meta.js');

// Plays the first legal spot of the first piece that fits, until the run ends or n moves.
function play(state, n) {
  for (let k = 0; k < n && !state.over; k++) {
    let done = false;
    for (let i = 0; i < 3 && !done; i++) {
      const p = state.tray[i];
      if (!p) continue;
      for (let r = 0; r < 8 && !done; r++) for (let c = 0; c < 8 && !done; c++) {
        const res = L.place(state, i, r, c);
        if (res) { state = res.state; done = true; }
      }
    }
    if (!done) break;
  }
  return state;
}

test('worlds mode needs a known world, else plain Classique', () => {
  const st = L.createGame(1, { mode: 'worlds', world: 'ice' });
  assert.equal(st.mode, 'worlds');
  assert.equal(st.world, 'ice');
  assert.equal(st.stage, null);
  assert.equal(st.special.filter(Boolean).length, 6); // free setup: 6 ice cells
  assert.equal(L.createGame(1, { mode: 'worlds', world: 'nope' }).mode, 'classic');
  assert.equal(L.createGame(1, { mode: 'worlds' }).mode, 'classic');
  assert.equal(L.createGame(1, { mode: 'classic', world: 'ice' }).world, null);
});

test('worlds mode applies the world: spawns, aging and run stats', () => {
  let st = L.createGame(2, { mode: 'worlds', world: 'volcano' });
  st = play(st, 12);
  assert.ok(st.moves >= 6);
  const kinds = st.special.filter(Boolean).map((s) => s.kind);
  assert.ok(kinds.includes('ember') || kinds.includes('rock'));
  assert.equal(L.runStats(st).world, 'volcano');
  assert.equal(L.runStats(L.createGame(1)).world, undefined);
});

test('Arcade in worlds mode runs a clock that lines refill', () => {
  const st = L.createGame(1, { mode: 'worlds', world: 'arcade' });
  assert.equal(st.clock, 60000);
  const t = L.tick(st, 60000);
  assert.ok(t.over && t.timeUp);
  assert.equal(L.createGame(1, { mode: 'worlds', world: 'plain' }).clock, 0);
});

test('worlds open with their trial and pay a prime on the score', () => {
  const p = M.createProfile('2026-10-01');
  assert.equal(M.worldFreeOpen(p, 'plain'), false);
  const q = { ...p, adventure: { stars: { 'plain-10': 2 } } };
  assert.equal(M.worldFreeOpen(q, 'plain'), true);
  assert.equal(M.worldFreeOpen(q, 'sea'), false);
  assert.equal(M.worldPrime('plain', 3000), 15);
  assert.equal(M.worldPrime('volcano', 3000), 41);
  assert.equal(M.worldPrime(undefined, 3000), 0);
  const lines = M.runCoins({ world: 'sea', score: 2000, coins: 3 });
  assert.deepEqual(lines.map((l) => l.label), ['Pièces ramassées', 'Prime Sous-marin']);
  assert.equal(lines[1].coins, 12);
});
