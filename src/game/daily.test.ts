import test from 'node:test';
import assert from 'node:assert/strict';
import { LV, M } from '../core';
import { calFirst, calLast, dailyGoing, defisDot, monthCells, pickDay, shareText, stepMonth, tileSub, triesAfter, weekCells, weekOf } from './daily';

const day = '2026-10-04'; // a Sunday
const p0 = M.createProfile(day);
const idle = { over: false, moves: 0, stage: null };
const going = (d: string) => ({ over: false, moves: 3, stage: { daily: d } as never });

test('pickDay keeps the day between DAILY_START and today', () => {
  assert.equal(pickDay('2027-01-01', day).day, day);
  assert.equal(pickDay('2020-01-01', day).day, LV.DAILY_START);
  assert.equal(pickDay('2026-09-20', day).month, '2026-09');
});

test('weeks start on Monday', () => {
  assert.equal(weekOf(day), '2026-09-28');
  assert.deepEqual(weekCells(weekOf(day)).slice(0, 2), ['2026-09-28', '2026-09-29']);
  assert.equal(weekCells(weekOf(day))[6], day);
});

test('month grid pads to Monday', () => {
  const cells = monthCells('2026-10'); // Oct 1st 2026 is a Thursday
  assert.equal(cells.indexOf('2026-10-01'), 3);
  assert.equal(cells.length, 3 + 31);
  assert.equal(stepMonth('2026-10', -1), '2026-09');
  assert.equal(stepMonth('2026-10', 1), '2026-11');
});

test('calendar bounds', () => {
  assert.equal(calFirst(true, '2026-09', ''), true);
  assert.equal(calFirst(true, '2026-10', ''), false);
  assert.equal(calLast(true, '2026-10', '', day), true);
  assert.equal(calLast(false, '', weekOf(day), day), true);
  assert.equal(calLast(false, '', M.addDays(weekOf(day), -7), day), false);
});

test('tries: the daily going counts as one, the dot follows today', () => {
  assert.equal(triesAfter(p0, idle, day, day), M.DAILY_ATTEMPTS);
  assert.equal(triesAfter(p0, going(day), day, day), M.DAILY_ATTEMPTS - 1);
  assert.equal(triesAfter(p0, going(day), '2026-09-20', day), Infinity);
  assert.equal(dailyGoing(going(day)), true);
  assert.equal(defisDot(p0, day), true);
  assert.equal(defisDot(M.applyDaily(p0, day, day, 1).profile, day), false);
  assert.match(tileSub(p0, going(day), day), /en cours/);
});

test('share text', () => {
  assert.match(shareText(day, 'Forêt', 3, 12), /^Cubo Blocks #\d+ · Forêt · 3 étoiles · 12 coups en rab$/);
  assert.match(shareText(day, 'Forêt', 1, 0), /1 étoile$/);
});
