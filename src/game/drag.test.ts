import test from 'node:test';
import assert from 'node:assert/strict';
import { L } from '../core';
import { computeLayout, cellCenter } from '../render/layout';
import { dragGeometry, easeOut } from './drag';
import type { Piece } from '../core/types';

const lay = computeLayout({ W: 402, H: 874, safeTop: 62 });
const square: Piece = { id: 1, cells: [[0, 0], [0, 1], [1, 0], [1, 1]], w: 2, h: 2, color: 6, bonus: null };

test('a lifted piece snaps to the cell under its top-left block, above the finger', () => {
  const board = new Array(64).fill(0);
  const lift = lay.cell * 2.2;
  // Finger held so the piece's center sits on the corner between cells (3,3)-(4,4).
  const [x, y] = cellCenter(lay, 3.5, 3.5);
  const g = dragGeometry(lay, board, square, x, y + lift, lift, 1);
  assert.deepEqual([g.row, g.col, g.valid], [3, 3, true]);
  assert.equal(g.size, lay.cell);
});

test('a drop over a filled cell or off the board is not valid', () => {
  const board = new Array(64).fill(0);
  board[3 * 8 + 3] = 2;
  const [x, y] = cellCenter(lay, 3.5, 3.5);
  assert.equal(dragGeometry(lay, board, square, x, y, 0, 1).valid, false);
  assert.equal(dragGeometry(lay, board, square, lay.bx - lay.cell * 3, y, 0, 1).valid, false);
  assert.equal(L.canPlace(board, square, 0, 0), true);
});

test('just picked up (k = 0) the piece still has its tray size', () => {
  const g = dragGeometry(lay, new Array(64).fill(0), square, 100, 600, 50, 0);
  assert.ok(g.size < lay.cell);
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(2), 1);
});
