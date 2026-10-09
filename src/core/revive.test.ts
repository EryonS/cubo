import test from 'node:test';
import assert from 'node:assert/strict';
import { L, LV } from './index';

test('Seconde chance: a free run lost is revived once, board cleared but the corners, score kept', () => {
  let st = L.createGame(5, { mode: 'classic' });
  st = { ...st, board: st.board.map(() => 1), score: 1234, combo: 3, over: true, stuck: false };
  assert.ok(L.canRevive(st));
  const s = L.revive(st)!.state;
  assert.equal(L.reviveArea().length, 60);
  assert.equal(s.over, false);
  assert.equal(s.revived, true);
  assert.equal(s.score, 1234);
  assert.equal(s.combo, 0);
  assert.equal(s.board.filter(Boolean).length, 4);
  assert.ok([0, 7, 56, 63].every((i) => s.board[i]));
  // The tray can be played, and a second game over is final.
  assert.ok(s.tray.some((p, i) => p && L.place(s, i, 2, 2)));
  assert.equal(L.canRevive({ ...s, over: true }), false);
  assert.equal(L.revive({ ...s, over: true }), null);
});

test('Seconde chance: not for levels, quits or runs still going; old saves have it; chrono gets its clock back', () => {
  const lost = (o: object, extra = {}) => ({ ...L.createGame(5, o), over: true, ...extra });
  assert.equal(L.canRevive({ ...L.createGame(5), over: false }), false);
  assert.equal(L.canRevive(lost({}, { quit: true })), false);
  assert.equal(L.canRevive(lost({ mode: 'adventure', stage: LV.level('plain', 1) })), false);
  const old = lost({});
  delete old.revived; // saves from before the field
  assert.ok(L.canRevive(old));
  const chrono = lost({ mode: 'chrono', level: 'normal' }, { clock: 0, timeUp: true });
  const back = L.revive(chrono)!.state;
  assert.equal(back.clock, 60000);
  assert.equal(back.timeUp, undefined);
  assert.equal(back.over, false);
});
