import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, slotBox, slotAt, slotCenter, boardCellAt, cellCenter, miniCell, trayCell } from './layout';

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

test('inventory: six buttons centered under the tray, hit tests, bin above the HUD row', async () => {
  const { invBoxes, invAt, invCenter, trashBox, overTrash, BONUS_ORDER } = await import('./layout');
  for (const p of phones) {
    const lay = computeLayout(p);
    const boxes = invBoxes(lay);
    assert.deepEqual(boxes.map((b) => b.id), [...BONUS_ORDER, 'legend']);
    const left = boxes[0].x;
    const right = boxes[5].x + boxes[5].w;
    assert.ok(Math.abs(left - (p.W - right)) < 1e-9, 'centered');
    assert.ok(left >= 8 && right <= p.W - 8, 'fits the width');
    assert.ok(boxes[0].y + boxes[0].h <= p.H, 'on screen');
    for (const b of boxes) assert.equal(invAt(lay, b.x + b.w / 2, b.y + b.h / 2), b.id);
    assert.equal(invAt(lay, p.W / 2, lay.by), null);
    assert.deepEqual(invCenter(lay, 'bomb'), [boxes[3].x + 26, boxes[3].y + 26]);
    const t = trashBox(lay);
    assert.equal(t.w, lay.board);
    assert.equal(overTrash(lay, t.x + 5, t.y + 5), true);
    assert.equal(overTrash(lay, t.x + 5, t.y + t.h + 20), true, '24 px of slack under the bin');
    assert.equal(overTrash(lay, t.x + 5, t.y - 5), false);
    assert.equal(overTrash(lay, t.x - 5, t.y + 5), false);
  }
});

test('puzzle surprise tray: two rows of pads over the board width', () => {
  for (const p of phones) {
    const lay = computeLayout(p);
    for (const n of [8, 9, 10]) {
      const cols = Math.ceil(n / 2);
      const first = slotBox(lay, 0, n);
      const last = slotBox(lay, cols - 1, n);
      assert.ok(Math.abs(last.x + last.w - (lay.bx + lay.board)) < 1e-9, 'a row spans the board');
      assert.equal(slotBox(lay, cols, n).y, first.y + first.h, 'the second row starts under the first');
      assert.equal(slotBox(lay, cols, n).x, first.x);
      assert.ok(slotBox(lay, n - 1, n).y + first.h <= lay.ty + lay.trayH + 1e-9, 'inside the tray');
      assert.ok(miniCell(lay, n) * 5 <= first.w && miniCell(lay, n) * 3 <= first.h, 'a 5-long piece stays inside its pad');
      assert.ok(trayCell(lay, n, { w: 1, h: 5 }) * 5 <= first.h - 6 && trayCell(lay, n, { w: 5, h: 1 }) * 5 <= first.w - 8, 'a 5-long piece fits either way');
      for (let i = 0; i < n; i++) {
        const [cx, cy] = slotCenter(lay, i, n);
        assert.equal(slotAt(lay, cx, cy, n), i);
      }
    }
    // up to 3 pieces: one row, the tray's full height, and a turned 5-long piece still fits
    for (const n of [2, 3]) {
      const b = slotBox(lay, 0, n);
      assert.equal(b.h, lay.trayH);
      assert.equal(slotBox(lay, n - 1, n).y, b.y);
      assert.equal(trayCell(lay, n, { w: 1, h: 5 }), miniCell(lay, n), 'no shrink on one row');
      assert.ok(miniCell(lay, n) * 5 <= b.h - 6 && miniCell(lay, n) * 5 <= b.w - 8);
    }
    // a normal tray has three slots only
    const [cx, cy] = slotCenter(lay, 1);
    assert.equal(slotAt(lay, cx, cy), 1);
  }
});
