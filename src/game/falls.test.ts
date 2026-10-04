import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planFalls, segRow, tracksBusy } from './falls';

// One block drops from row 2 to row 5 in column 0.
const plan = planFalls([{ cleared: [], moves: [[16, 40]] }], 1000);

test('the path of a moved block is kept under its final cell', () => {
  const segs = plan.tracks.get(40)!;
  assert.equal(segs.length, 1);
  assert.equal(segs[0].from, 2);
  assert.equal(segs[0].to, 5);
});

test('a falling block accelerates, then lands', () => {
  const segs = plan.tracks.get(40)!;
  assert.equal(segRow(segs, 0, 5), 2);
  const mid = segRow(segs, segs[0].t0 + segs[0].dur / 2, 5);
  assert.ok(mid > 2 && mid < 5);
  assert.equal(segRow(segs, segs[0].t0 + segs[0].dur + 400, 5), 5);
  assert.equal(tracksBusy(segs, segs[0].t0 + segs[0].dur + 400), false);
});

test('a block cleared by a later wave hands its path to its fade', () => {
  const p = planFalls([{ cleared: [], moves: [[16, 40]] }, { cleared: [40], moves: [] }], 0);
  assert.ok(p.fadeSegs.get('1:40'));
  assert.equal(p.tracks.has(40), false);
});
