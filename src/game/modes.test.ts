import assert from 'node:assert/strict';
import { test } from 'node:test';
import { L } from '../core';
import { FREE_LEVELS, FREE_MODES, guardFree, inProgress, levelInfo, modeLabel, modeNote, modeSub, richRuns } from './modes';

const run = (o: Record<string, unknown> = {}) => L.createGame(3, { mode: 'classic', level: 'normal', ...o });

test('modes and levels have names, notes and sub lines', () => {
  assert.deepEqual(FREE_MODES, ['classic', 'chrono', 'chill']);
  assert.deepEqual(FREE_LEVELS, ['easy', 'normal', 'hard']);
  for (const m of FREE_MODES) { assert.ok(modeNote(m).length > 20); assert.ok(modeSub(m)); }
  assert.equal(modeLabel(run()), 'Classique · Normal');
  assert.equal(modeLabel(run({ mode: 'chrono', level: 'hard' })), 'Chrono · Difficile');
});

test('level info: Jouet has Plaine obstacles (crate, mole) and the coin bonus', () => {
  assert.deepEqual(levelInfo('toy', 'easy').kinds, []);
  assert.match(levelInfo('toy', 'easy').text, /Pas d’obstacle/);
  const normal = levelInfo('toy', 'normal');
  assert.deepEqual(normal.kinds, ['crate']);
  assert.equal(normal.pct, 20);
  assert.match(normal.text, /Obstacles de ton thème : caisses\./);
  const hard = levelInfo('toy', 'hard');
  assert.deepEqual(hard.kinds, ['crate', 'mole']);
  assert.equal(hard.pct, 50);
  assert.deepEqual(richRuns(hard.text).filter((r) => r.bold).map((r) => r.text), ['+50 % de pièces']);
  assert.match(hard.text, /^Plus de grandes formes\. Obstacles de ton thème : caisses et taupes\./);
});

test('richRuns splits bold runs', () => {
  assert.deepEqual(richRuns('a <b>b</b> c'), [{ text: 'a ', bold: false }, { text: 'b', bold: true }, { text: ' c', bold: false }]);
  assert.deepEqual(richRuns('plain'), [{ text: 'plain', bold: false }]);
});

test('starting a free game asks only when a run is in progress or parked', () => {
  const fresh = run();
  assert.equal(guardFree(fresh, null).needed, false);
  const played = L.place(fresh, 0, 0, 0)!.state;
  assert.equal(inProgress(played), true);
  assert.equal(guardFree(played, null).needed, true);
  assert.equal(guardFree({ ...played, over: true }, null).needed, false);
  assert.equal(guardFree({ ...played, over: true }, fresh).needed, true, 'a parked run counts');
  assert.match(guardFree(played, null).text, /^Ta partie libre en cours s’arrête/);
});
