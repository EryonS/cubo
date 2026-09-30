const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
const T = require('../src/tutorial.js');
const M = require('../src/meta.js');

// Plays every scripted piece of a step on its suggested spot, as the hand shows.
function playStep(i) {
  let state = T.lesson(i);
  const events = [];
  for (const { slot, cells } of T.targets(i, state)) {
    const [row, col] = cells.reduce(([r, c], [r2, c2]) => [Math.min(r, r2), Math.min(c, c2)], [99, 99]);
    const res = L.place(state, slot, row, col);
    assert.ok(res, `step ${i}: slot ${slot} fits at ${row},${col}`);
    assert.ok(T.accepts(i, res.events), `step ${i}: slot ${slot} does what the step asks`);
    events.push(res.events);
    state = T.afterMove(res.state, slot);
  }
  assert.ok(T.done(state));
  assert.equal(state.over, false);
  return events;
}

test('every step can be played on its suggested spots', () => {
  T.STEPS.forEach((_, i) => playStep(i));
});

test('the column step clears a line and the combo step reaches combo x2', () => {
  assert.equal(playStep(1)[0].lines, 1);
  const combo = playStep(2);
  assert.deepEqual(combo.map((e) => e.lines), [1, 1]);
  assert.equal(combo[1].combo, 2);
});

test('combo step works in either order', () => {
  let state = T.lesson(2);
  const [a, b] = T.targets(2, state);
  for (const t of [b, a]) {
    const [row, col] = t.cells[0];
    const res = L.place(state, t.slot, row, col);
    assert.ok(res && T.accepts(2, res.events));
    state = T.afterMove(res.state, t.slot);
  }
});

test('a move that clears nothing is refused where the step asks for a line', () => {
  const state = T.lesson(1);
  const res = L.place(state, 1, 0, 5);
  assert.ok(res);
  assert.equal(T.accepts(1, res.events), false);
  assert.equal(T.accepts(0, res.events), true);
});

test('lessons only hold scripted pieces', () => {
  const state = T.afterMove(L.place(T.lesson(0), 1, 3, 3).state, 1);
  assert.deepEqual(state.tray, [null, null, null]);
  assert.equal(state.next, null);
});

test('tutorial runs for new players only, tips are shown once', () => {
  const fresh = M.createProfile('2026-09-30');
  assert.equal(M.needsTutorial(fresh), true);
  assert.equal(M.needsTutorial({ ...fresh, games: 4 }), false);
  const seen = M.markTip(fresh, 'tutorial');
  assert.equal(M.needsTutorial(seen), false);
  assert.equal(M.tipSeen(seen, 'bonus'), false);
  assert.equal(M.markTip(seen, 'tutorial'), seen);
});
