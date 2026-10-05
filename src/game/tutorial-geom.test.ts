import assert from 'node:assert/strict';
import { test } from 'node:test';
import { T } from '../core';
import { computeLayout } from '../render/layout';
import { handPose, HAND_LOOP, tutorialTarget } from './tutorial-geom';

const lay = computeLayout({ W: 402, H: 874, safeTop: 62 });

test('the target is the center of the scripted spot', () => {
  const t = tutorialTarget(lay, 0, T.lesson(0))!;
  assert.equal(t.slot, 1);
  // 2x2 piece at [3,3]: center between cells 3 and 4.
  assert.equal(t.x, lay.bx + 4 * lay.cell);
  assert.equal(t.y, lay.by + 4 * lay.cell);
  assert.equal(tutorialTarget(lay, 1, { ...T.lesson(1), tray: [null, null, null] }), null);
});

test('the hand picks up, travels, lands 2.2 cells under the target, fades', () => {
  const at = (p: number) => handPose(p * HAND_LOOP, 100, 700, 200, 300, 46);
  assert.equal(at(0).alpha, 0);
  assert.equal(at(0.05).pressed, false);
  assert.equal(at(0.3).pressed, true);
  assert.ok(at(0.3).move > 0 && at(0.3).move < 1);
  const end = at(0.66);
  assert.equal(end.move, 1);
  assert.equal(end.fx, 200);
  assert.ok(Math.abs(end.fy - (300 + 46 * 2.2)) < 1e-9);
  assert.equal(at(0.9).pressed, false);
  assert.ok(at(0.9).alpha < 1);
});
