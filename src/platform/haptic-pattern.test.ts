import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HAPTICS, impactSchedule, impactStyle, linesPattern } from './haptic-pattern';

test('pulse length picks the strength', () => {
  assert.equal(impactStyle(5), 'light');
  assert.equal(impactStyle(8), 'light');
  assert.equal(impactStyle(9), 'medium');
  assert.equal(impactStyle(20), 'medium');
  assert.equal(impactStyle(21), 'heavy');
});

test('a pattern plays one impact per on pulse, at its offset', () => {
  assert.deepEqual(impactSchedule(9), [{ at: 0, style: 'medium' }]);
  assert.deepEqual(impactSchedule(HAPTICS.nope), [{ at: 0, style: 'light' }, { at: 53, style: 'light' }]);
  assert.deepEqual(impactSchedule(HAPTICS.lose), [{ at: 0, style: 'heavy' }, { at: 120, style: 'heavy' }]);
  assert.deepEqual(impactSchedule(HAPTICS.record).map((s) => s.at), [0, 45, 90]);
});

test('lines pattern grows with the lines and a big combo', () => {
  assert.equal(linesPattern(1, 1), 18);
  assert.deepEqual(linesPattern(2, 1), [20, 30, 30]);
  assert.deepEqual(linesPattern(3, 1), [25, 25, 25, 25, 40]);
  assert.equal((linesPattern(4, 1) as number[]).length, 7);
  assert.equal(linesPattern(1, 2), 18);
  assert.deepEqual(linesPattern(1, 4), [18, 40, 50]);
  assert.deepEqual(linesPattern(2, 4), [20, 30, 30, 40, 50]);
  assert.deepEqual(linesPattern(1, 6), [18, 40, 65]);
});
