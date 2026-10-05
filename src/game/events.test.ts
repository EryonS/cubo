import assert from 'node:assert/strict';
import { test } from 'node:test';
import { M } from '../core';
import { eventDate, eventRows, settleEvent } from './events';
import { freshFlags } from './levelend';
import type { RunState } from '../core/types';

const day = '2026-10-15';
const idle = { over: false, moves: 0, clock: 0, stage: undefined } as unknown as RunState;

test('October shows Halloween, with the date and an empty progress', () => {
  const rows = eventRows(M.createProfile(day), idle, day);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'halloween');
  assert.equal(rows[0].playing, false);
  assert.match(rows[0].sub, /0 \/ 10/);
  assert.ok(eventDate(day).length > 4);
});

test('a level in progress is named on its row, and stays listed after the event closes', () => {
  const going = { over: false, moves: 3, clock: 0, stage: { event: 'xmas', n: 4 } } as unknown as RunState;
  const rows = eventRows(M.createProfile(day), going, day);
  assert.equal(rows[0].id, 'xmas');
  assert.equal(rows[0].playing, true);
  assert.match(rows[0].sub, /en cours/);
});

test('settleEvent pays a first clear once per start', () => {
  const stage = { event: 'halloween', eventDay: day, n: 1, stars: 2, won: true };
  const a = settleEvent(M.createProfile(day), stage, 'k', freshFlags(), day);
  assert.ok(a.pay && a.pay.earned.reduce((s, l) => s + l.coins, 0) > 0);
  assert.equal(M.eventStars(a.profile, 'halloween', day, 1), 2);
  const b = settleEvent(a.profile, stage, 'k', a.flags, day);
  assert.equal(b.pay, null);
  assert.equal(b.profile, a.profile);
});
