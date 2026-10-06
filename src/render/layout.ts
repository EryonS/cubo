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
  const bandGap = 14; // air between the band and the board frame
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

// free: the number of pads of a Puzzle surprise tray (the whole quota on two rows over the board width), 0 for
// the usual three slots (legacy render/helpers.js freeTray / slotBox / miniCell, game/drag.js slotAt).
export const slotBox = (lay: Layout, i: number, free = 0): Box => {
  if (!free) return { x: lay.bx + lay.slotW * i, y: lay.ty, w: lay.slotW, h: lay.trayH };
  const cols = Math.max(3, Math.ceil(free / 2));
  const w = lay.board / cols;
  const h = lay.trayH / 2;
  return { x: lay.bx + w * (i % cols), y: lay.ty + h * Math.floor(i / cols), w, h };
};
export function slotCenter(lay: Layout, i: number, free = 0): [number, number] {
  const b = slotBox(lay, i, free);
  return [b.x + b.w / 2, b.y + b.h / 2];
}
// Tray cell size: a 5-long piece stays inside its pad.
export function miniCell(lay: Layout, free = 0) {
  if (!free) return Math.min(lay.cell * 0.46, lay.slotW / 5.8);
  const b = slotBox(lay, 0, free);
  return Math.min(lay.cell * 0.4, b.w / 5.6, (b.h - 8) / 3.4);
}

// A piece is picked up only from its pad as drawn (plus a few px of slack), never from the gap
// above the tray or the screen margins.
export function slotAt(lay: Layout, x: number, y: number, free = 0): number {
  const gap = free ? 3 : 6;
  const slack = 4;
  const n = free || 3;
  for (let i = 0; i < n; i++) {
    const b = slotBox(lay, i, free);
    if (x >= b.x + 4 - slack && x <= b.x + b.w - 4 + slack && y >= b.y + gap - slack && y <= b.y + b.h - gap + slack) return i;
  }
  return -1;
}

export function boardCellAt(lay: Layout, x: number, y: number): [number, number] | null {
  const c = Math.floor((x - lay.bx) / lay.cell);
  const r = Math.floor((y - lay.by) / lay.cell);
  return r >= 0 && c >= 0 && r < SIZE && c < SIZE ? [r, c] : null;
}

// ---------- inventory bar, bin, wallet target (legacy ui/inventory.js, css/hud.css) ----------
export const BONUS_ORDER = ['rotate', 'nitro', 'shield', 'bomb', 'reroll'] as const;
export type InvId = (typeof BONUS_ORDER)[number] | 'legend';
export const INV_SIZE = 52;
export const INV_GAP = 8;
export const LEGEND_W = 42;
export interface InvBox extends Box { id: InvId }

// The bonus buttons then the legend button, centered in a row under the tray.
export function invBoxes(lay: Layout): InvBox[] {
  const ids: InvId[] = [...BONUS_ORDER, 'legend'];
  const widths = ids.map((id) => (id === 'legend' ? LEGEND_W : INV_SIZE));
  const total = widths.reduce((a, b) => a + b, 0) + INV_GAP * (ids.length - 1);
  let x = (lay.W - total) / 2;
  const y = lay.ty + lay.trayH;
  return ids.map((id, i) => {
    const box = { id, x, y, w: widths[i], h: INV_SIZE };
    x += widths[i] + INV_GAP;
    return box;
  });
}
export function invAt(lay: Layout, x: number, y: number): InvId | null {
  const slack = 4;
  for (const b of invBoxes(lay)) {
    if (x >= b.x - slack && x <= b.x + b.w + slack && y >= b.y - slack && y <= b.y + b.h + slack) return b.id;
  }
  return null;
}
export const invCenter = (lay: Layout, id: InvId): [number, number] => {
  const b = invBoxes(lay).find((v) => v.id === id)!;
  return [b.x + b.w / 2, b.y + b.h / 2];
};

// The bin appears where the inventory is: the board's width, 56 high.
export const TRASH_H = 56;
export const trashBox = (lay: Layout): Box => ({ x: lay.bx, y: lay.ty + lay.trayH, w: lay.board, h: TRASH_H });
// A finger counts as over the bin from its top to 24 px under it.
export function overTrash(lay: Layout, x: number, y: number): boolean {
  const b = trashBox(lay);
  return y > b.y && y < b.y + b.h + 24 && x > b.x && x < b.x + b.w;
}

// HUD buttons (top row, 42 high): wallet left, then pause, undo and missions from the right.
export const HUD_BTN = 42;
export const hudTop = (lay: Layout) => lay.safeTop + 12;
// Where coins fly to: the wallet, approximately its middle.
export const walletTarget = (lay: Layout): [number, number] => [16 + 46, hudTop(lay) + HUD_BTN / 2];
// Text line between the board and the tray (hints), and the chrono bar in the same gap.
export const hintY = (lay: Layout, chrono: boolean) => {
  const gapTop = lay.by + lay.board + 10;
  return chrono ? gapTop + 2 : gapTop + (lay.ty - gapTop) / 2;
};
export const chronoBar = (lay: Layout): [number, number] => [lay.bx, lay.by + lay.board + 10 + (lay.ty - lay.by - lay.board - 10) * 0.62];
