// Cubo Blocks — Drag & snap geometry (legacy game/drag.js dragGeometry). Pure.
import { L } from '../core';
import type { Piece } from '../core/types';
import { trayCell, type Layout } from '../render/layout';

export const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const easeBack = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

// Pick-up animation: the piece grows from tray size to board size while it rises above the finger.
export const LIFT_MS = 110;

export interface DragGeometry { size: number; cx: number; cy: number; row: number; col: number; valid: boolean }

// x, y: the finger. lift: how far above the finger the piece floats once lifted (0 with a mouse).
// k: 0..1 progress of the pick-up animation (eased).
export function dragGeometry(lay: Layout, board: number[], piece: Piece, x: number, y: number, lift: number, k: number, free = 0): DragGeometry {
  const mini = trayCell(lay, free, piece);
  const size = mini + (lay.cell - mini) * k;
  const cx = x;
  const cy = y - lift * k;
  const tlx = cx - (piece.w * lay.cell) / 2;
  const tly = cy - (piece.h * lay.cell) / 2;
  const col = Math.round((tlx - lay.bx) / lay.cell);
  const row = Math.round((tly - lay.by) / lay.cell);
  return { size, cx, cy, row, col, valid: L.canPlace(board, piece, row, col) };
}
