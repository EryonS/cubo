// Cubo Blocks — The tutorial hand and glowing cells, as numbers (legacy screens/tutorial.js drawTutorialHand,
// tutorialTarget, drawTutorialCells). Pure.
import { T } from '../core';
import type { RunState } from '../core/types';
import type { Layout } from '../render/layout';

export const HAND_LOOP = 2200;
export const HAND_DELAY = 700;
export const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

// Where the next scripted piece should go: its center on the board, in points.
export function tutorialTarget(lay: Layout, step: number, state: RunState) {
  const [target] = T.targets(step, state);
  if (!target) return null;
  const rows = target.cells.map((p) => p[0]);
  const cols = target.cells.map((p) => p[1]);
  const r = (Math.min(...rows) + Math.max(...rows)) / 2;
  const c = (Math.min(...cols) + Math.max(...cols)) / 2;
  return { slot: target.slot, x: lay.bx + (c + 0.5) * lay.cell, y: lay.by + (r + 0.5) * lay.cell };
}

export interface HandPose { fx: number; fy: number; px: number; py: number; alpha: number; pressed: boolean; move: number }

// since: ms since the loop began. (sx, sy): the tray slot's center; (tx, ty): the target. The hand ends
// 2.2 cells below the target, matching the drag lift, so copying the gesture lands the piece right.
export function handPose(since: number, sx: number, sy: number, tx: number, ty: number, cell: number): HandPose {
  const p = (since % HAND_LOOP) / HAND_LOOP;
  const lift = cell * 2.2;
  const move = easeInOut(Math.min(1, Math.max(0, (p - 0.18) / 0.47)));
  const alpha = p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1;
  const pressed = p > 0.12 && p < 0.72;
  const px = sx + (tx - sx) * move;
  const py = sy + (ty - sy) * move;
  return { fx: px, fy: py + lift * move, px, py, alpha, pressed, move };
}
