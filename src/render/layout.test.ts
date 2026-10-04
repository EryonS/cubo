import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, slotBox, slotAt, boardCellAt, cellCenter, miniCell } from './layout';

const phones = [
  { W: 402, H: 874, safeTop: 62 }, // iPhone 17 Pro
  { W: 375, H: 667, safeTop: 20 }, // iPhone SE
  { W: 440, H: 956, safeTop: 62 }, // iPhone 17 Pro Max
];

test('the board is 8 whole cells, centered, and everything fits on screen', () => {
  for (const p of phones) {
    const lay = computeLayout(p);
    assert.equal(lay.board, lay.cell * 8);
    assert.ok(lay.board <= Math.min(p.W - 32, 440));
    assert.ok(Math.abs(lay.bx - (p.W - lay.board) / 2) <= 0.5);
    assert.ok(lay.band.y + lay.band.h <= lay.by - 10, 'score band above the frame');
    assert.ok(lay.band.y >= p.safeTop, 'band below the status bar');
    assert.ok(lay.ty >= lay.by + lay.board, 'tray below the board');
    assert.ok(lay.ty + lay.trayH + 64 <= p.H, 'tray and inventory on screen');
  }
});

test('three slots and the next column share the board width', () => {
  const lay = computeLayout(phones[0]);
  const last = slotBox(lay, 2);
  assert.ok(Math.abs(last.x + last.w - lay.nextX) < 1e-9);
  assert.ok(Math.abs(lay.nextX + lay.nextW - (lay.bx + lay.board)) < 1e-9);
  assert.ok(miniCell(lay) * 5 < lay.slotW, 'a 5-long piece stays inside its pad');
});

test('hit tests: a cell center maps back to its cell, a pad center to its slot, gaps to nothing', () => {
  const lay = computeLayout(phones[0]);
  for (const [r, c] of [[0, 0], [3, 5], [7, 7]]) {
    const [x, y] = cellCenter(lay, r, c);
    assert.deepEqual(boardCellAt(lay, x, y), [r, c]);
  }
  assert.equal(boardCellAt(lay, lay.bx - 2, lay.by + 5), null);
  for (const i of [0, 1, 2]) {
    const b = slotBox(lay, i);
    assert.equal(slotAt(lay, b.x + b.w / 2, b.y + b.h / 2), i);
  }
  assert.equal(slotAt(lay, lay.nextX + lay.nextW / 2, lay.ty + lay.trayH / 2), -1, 'the next column is not a slot');
  assert.equal(slotAt(lay, lay.bx + 10, lay.ty - 20), -1, 'the gap above the tray is not a slot');
});
