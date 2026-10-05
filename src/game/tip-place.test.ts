import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anchorRect, placeTip, rectOf } from './tip-place';
import { computeLayout } from '../render/layout';

const lay = computeLayout({ W: 402, H: 874, safeTop: 62 });

test('a tip over a lower anchor sits above it, the arrow under its center', () => {
  const p = placeTip(rectOf(100, 700, 50, 50), 402, 874, 300);
  assert.equal(p.side, 'above');
  assert.equal(p.bottom, 874 - 700 + 12);
  assert.equal(p.width, 300);
  assert.equal(p.left, 100 + 25 - 150 < 16 ? 16 : 100 + 25 - 150);
  assert.equal(p.arrow, 125 - p.left);
});

test('a tip over an upper anchor sits below it, kept inside the screen', () => {
  const p = placeTip(rectOf(340, 74, 42, 42), 402, 874, 300);
  assert.equal(p.side, 'below');
  assert.equal(p.top, 116 + 12);
  assert.equal(p.left, 402 - 16 - 300);
  assert.ok(p.arrow >= 18 && p.arrow <= 282);
});

test('no anchor: free, centered', () => {
  const p = placeTip(null, 402, 874, 330);
  assert.deepEqual([p.side, p.left, p.top], ['free', 51, 330]);
});

test('anchors resolve to rects', () => {
  assert.equal(anchorRect(null, lay, 62), null);
  assert.equal(anchorRect('undo', lay, 62)!.left, 402 - 66 - 42);
  const inv = anchorRect({ inv: 'bomb' }, lay, 62)!;
  assert.equal(inv.width, 52);
  assert.equal(anchorRect('tray', lay, 62)!.top, lay.ty);
});
