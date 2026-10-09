import assert from 'node:assert/strict';
import { test } from 'node:test';
import { M } from '../core';
import type { RunState } from '../core/types';
import { eventNext, resumeOf } from './home';

const day = '2026-10-15';
const run = (o: object) => ({ over: false, moves: 3, score: 1200, clock: 0, mode: 'classic', level: 'normal', world: null, stage: null, ...o }) as unknown as RunState;
const goal = { type: 'lines', target: 5 };

test('nothing to continue on a fresh or finished run', () => {
  assert.equal(resumeOf(run({ moves: 0 })), null);
  assert.equal(resumeOf(run({ over: true })), null);
});

test('a free run shows its mode and score', () => {
  const r = resumeOf(run({}))!;
  assert.equal(r.kind, 'free');
  assert.match(r.title, /Classique/);
  assert.match(r.sub, /pts/);
});

test('levels name where they are: adventure, daily, event', () => {
  const stage = (o: object) => ({ world: 'forest', n: 4, goal, movesLeft: 9, ...o });
  const a = resumeOf(run({ stage: stage({}) }))!;
  assert.equal(a.kind, 'adventure');
  assert.match(a.title, /Niveau 4/);
  assert.match(a.sub, /9 coups/);
  assert.equal(resumeOf(run({ stage: stage({ daily: day }) }))!.kind, 'daily');
  const e = resumeOf(run({ stage: stage({ event: 'halloween', n: 10 }) }))!;
  assert.equal(e.kind, 'event');
  assert.match(e.title, /Boss/);
});

test('a timed level shows no move count', () => {
  const r = resumeOf(run({ stage: { world: 'forest', n: 2, goal, movesLeft: 0, clock: 30000 } }))!;
  assert.doesNotMatch(r.sub, /coups/);
});

test('eventNext is the first level without stars, null when all are cleared', () => {
  let p = M.createProfile(day);
  assert.equal(eventNext(p, 'halloween', day), 1);
  for (let n = 1; n <= 10; n++) {
    p = M.applyEvent(p, 'halloween', day, n, 1).profile;
    assert.equal(eventNext(p, 'halloween', day), n < 10 ? n + 1 : null);
  }
});
