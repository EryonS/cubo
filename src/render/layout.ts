// Cubo Blocks — Game screen geometry: board, tray, next column and score band for a screen size.
// Pure (legacy render/layout.js resize() and the slot helpers of render/helpers.js / game/drag.js).
import { SIZE } from '../core/logic';

export interface Box { x: number; y: number; w: number; h: number }
export interface Layout {
  W: number;
  H: number;
  safeTop: number;
  cell: number;
  board: number;
  bx: number;
  by: number;
  ty: number; // tray top
  trayH: number;
  slotW: number;
  nextX: number;
  nextW: number;
  band: Box; // score band above the board frame
}

export function computeLayout({ W, H, safeTop }: { W: number; H: number; safeTop: number }): Layout {
  // HUD buttons, then the score band right above the board frame.
  const bandH = H < 760 ? 50 : 60;
  const bandGap = 14; // room under the band for the combo tag hung from it
  const topH = safeTop + 66 + bandH + bandGap + 10;
  const invH = 64;
  const maxBoard = Math.min(W - 32, 440);
  // board + gap (1 cell: hints, chrono) + tray (2.7 cells) + inventory must fit below the HUD
  const cell = Math.floor(Math.min(maxBoard / SIZE, (H - topH - invH - 24) / (SIZE + 3.7)));
  const board = cell * SIZE;
  const bx = Math.round((W - board) / 2);
  const used = board + cell * 3.7 + invH;
  const by = Math.round(topH + Math.max(0, (H - topH - used) * 0.5));
  const ty = by + board + cell;
  // Three tray slots, then a narrow column announcing the next piece.
  const slotW = board / 3.6;
  return {
    W, H, safeTop, cell, board, bx, by, ty, trayH: cell * 2.7, slotW, nextX: bx + slotW * 3, nextW: board - slotW * 3,
    band: { x: bx - 10, y: by - 10 - bandGap - bandH, w: board + 20, h: bandH },
  };
}

export const cellCenter = (lay: Layout, r: number, c: number): [number, number] =>
  [lay.bx + (c + 0.5) * lay.cell, lay.by + (r + 0.5) * lay.cell];

export const slotBox = (lay: Layout, i: number): Box => ({ x: lay.bx + lay.slotW * i, y: lay.ty, w: lay.slotW, h: lay.trayH });
export function slotCenter(lay: Layout, i: number): [number, number] {
  const b = slotBox(lay, i);
  return [b.x + b.w / 2, b.y + b.h / 2];
}
// Tray cell size: a 5-long piece stays inside its pad.
export const miniCell = (lay: Layout) => Math.min(lay.cell * 0.46, lay.slotW / 5.8);

// A piece is picked up only from its pad as drawn (plus a few px of slack), never from the gap
// above the tray or the screen margins.
export function slotAt(lay: Layout, x: number, y: number): number {
  const gap = 6;
  const slack = 4;
  for (let i = 0; i < 3; i++) {
    const b = slotBox(lay, i);
    if (x >= b.x + 4 - slack && x <= b.x + b.w - 4 + slack && y >= b.y + gap - slack && y <= b.y + b.h - gap + slack) return i;
  }
  return -1;
}

export function boardCellAt(lay: Layout, x: number, y: number): [number, number] | null {
  const c = Math.floor((x - lay.bx) / lay.cell);
  const r = Math.floor((y - lay.by) / lay.cell);
  return r >= 0 && c >= 0 && r < SIZE && c < SIZE ? [r, c] : null;
}
