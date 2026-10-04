import test from 'node:test';
import assert from 'node:assert/strict';
import { M } from '../core';
import { cuboLookFor, CUBO } from './looks';
import { cuboLine, sayLines, dayHash } from './say';
import { cubo, cuboBaseMood, cuboBusy, cuboHit, cuboMoodAt, cuboReact, cuboRoom, cuboSpot, cuboTap, resetCubo } from './state';
import { L } from '../core';

const lay = { bx: 17, by: 242, board: 368, cell: 46 };

test('cuboLookFor: the theme look, unknown themes fall back to Jouet, a wardrobe piece replaces the theme hat', () => {
  assert.equal(cuboLookFor('toy').hat, 'sprout');
  assert.equal(cuboLookFor('toy').base, CUBO.base);
  assert.equal(cuboLookFor('sea').base, '#5cc8ef');
  assert.equal(cuboLookFor('nope').hat, 'sprout');
  assert.equal(cuboLookFor('sea', 'auto').hat, 'starfish');
  assert.equal(cuboLookFor('sea', 'crown').hat, 'crown');
  assert.equal(cuboLookFor('sea', 'crown').burst, 'bubble');
});

test('cuboLine: first visit, streak lines, otherwise one line for the whole day', () => {
  const fresh = M.createProfile('2026-10-04');
  assert.equal(cuboLine(fresh, '2026-10-04').mood, 'happy');
  const played = { ...fresh, lifetime: { ...(fresh.lifetime as object), games: 3 } } as typeof fresh;
  const a = cuboLine(played, '2026-10-05');
  assert.deepEqual(a, cuboLine(played, '2026-10-05'));
  assert.ok(sayLines().some((l) => l.text === a.text) || a.mood === 'wow');
  assert.equal(dayHash('2026-10-04'), dayHash('2026-10-04'));
});

test('reactions last their time, a dizzy Cubo ignores them, five quick taps make him dizzy', () => {
  resetCubo();
  cuboReact(1000, 'happy', 900, 0.5);
  assert.equal(cuboMoodAt(1500, 'idle'), 'happy');
  assert.equal(cuboMoodAt(1900, 'idle'), 'idle');
  assert.ok(cuboBusy(1500));
  assert.ok(!cuboBusy(5000));
  resetCubo();
  cuboReact(1000, 'happy', 900, 0.5, true);
  assert.equal(cubo.jumpAt, -1e9); // reduced motion: no hop
  resetCubo();
  const m = cuboSpot(lay, { puzzle: undefined, special: [] });
  const look = cuboLookFor('toy');
  for (let k = 0; k < 4; k++) assert.equal(cuboTap(100 + k * 200, m, look), 'pop');
  assert.equal(cubo.mood, look.taps[3]);
  assert.equal(cuboTap(1000, m, look), 'dizzy');
  assert.equal(cubo.mood, 'dizzy');
  cuboReact(1500, 'happy', 900); // ignored while dizzy
  assert.equal(cubo.mood, 'dizzy');
  assert.equal(cubo.hearts.length, 15);
  resetCubo();
});

test('spot: top-right corner of the board, the band leaves room for him, hit box', () => {
  const m = cuboSpot(lay, { puzzle: undefined, special: [] });
  assert.equal(m.s, 52.9);
  assert.equal(m.x, 17 + 368 - 52.9 / 2 + 2);
  assert.equal(m.y, 232);
  assert.equal(cuboRoom(true, lay, { puzzle: undefined, special: [] }), 68.9);
  assert.equal(cuboRoom(false, lay, { puzzle: undefined, special: [] }), 0);
  assert.ok(cuboHit(m.x, m.y - 20, m));
  assert.ok(!cuboHit(m.x - 100, m.y - 20, m));
  assert.ok(!cuboHit(m.x, m.y + 30, m));
});

test('base mood: idle, watching, worried when crowded or stuck, asleep behind a sheet, sad at the end', () => {
  const st = L.createGame(42, { mode: 'classic', level: 'normal' });
  assert.equal(cuboBaseMood(st, false, false), 'idle');
  assert.equal(cuboBaseMood(st, false, true), 'watch');
  assert.equal(cuboBaseMood(st, true, false), 'sleep');
  assert.equal(cuboBaseMood({ ...st, stuck: true }, false, false), 'worried');
  assert.equal(cuboBaseMood({ ...st, board: st.board.map(() => 1) }, false, false), 'worried');
  assert.equal(cuboBaseMood({ ...st, over: true }, true, false), 'sad');
});
