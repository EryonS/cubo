// Cubo Blocks — Tutorial drawing: glowing target cells and the hand that shows the drag
// (legacy screens/tutorial.js drawTutorialCells / drawTutorialHand, #hand SVG).
import { Skia, type SkPath } from '@shopify/react-native-skia';
import { T } from '../core';
import type { RunState } from '../core/types';
import { anim, type DragState } from '../game/anim';
import { HAND_DELAY, handPose, tutorialTarget } from '../game/tutorial-geom';
import type { Tut } from '../game/tut-state';
import { drawPiece } from './draw';
import { G, withAlpha } from './g';
import { miniCell, slotCenter, type Layout } from './layout';
import type { Theme } from './theme';

const SIZE = 8;

// Free placement (first step): a softer glow, it is only a suggestion.
export function drawTutorialCells(g: G, th: Theme, lay: Layout, state: RunState, tut: Tut, t: number) {
  if (tut.doneAt) return;
  const strength = T.STEPS[tut.step].lines ? 1 : 0.6;
  const color = withAlpha(th.accent, (0.3 + 0.2 * Math.sin(t / 220)) * strength);
  for (const target of T.targets(tut.step, state)) {
    for (const [r, c] of target.cells) {
      if (state.board[r * SIZE + c]) continue;
      g.path().roundRect(lay.bx + c * lay.cell + 3, lay.by + r * lay.cell + 3, lay.cell - 6, lay.cell - 6, lay.cell * 0.2).fill(color);
    }
  }
}

let hand: SkPath | null = null;
const handPath = () => hand ?? (hand = Skia.Path.MakeFromSVGString('M17 3a5 5 0 0 1 5 5v15.5l3.2-.6a5 5 0 0 1 3 .3l6.6 2.8a6 6 0 0 1 3.5 6.7l-2 10.3A8 8 0 0 1 28.4 50H21a8 8 0 0 1-6.4-3.2L6.4 36a4.5 4.5 0 0 1 6.9-5.8L12 29V8a5 5 0 0 1 5-5z')!);

// Loop: the hand picks the piece in the tray and drags it (ghost included) to the glowing cells.
// True while it is on screen (the frame loop draws every frame then).
export function tutorialHandOn(tut: Tut, state: RunState, drag: DragState | null, t: number): boolean {
  return !drag && !tut.doneAt && !anim.returning.length && !tut.ending && t - tut.t0 - HAND_DELAY >= 0 && T.targets(tut.step, state).length > 0;
}

export function drawTutorialHand(g: G, th: Theme, lay: Layout, state: RunState, tut: Tut, drag: DragState | null, t: number) {
  if (!tutorialHandOn(tut, state, drag, t)) return;
  const target = tutorialTarget(lay, tut.step, state);
  if (!target) return;
  const [sx, sy] = slotCenter(lay, target.slot);
  const pose = handPose(t - tut.t0 - HAND_DELAY, sx, sy, target.x, target.y, lay.cell);
  // The piece rides above the finger, like a real drag.
  if (pose.pressed && pose.move > 0) {
    const size = miniCell(lay) + (lay.cell - miniCell(lay)) * Math.min(1, pose.move * 3);
    drawPiece(g, th, state.tray[target.slot]!, pose.px, pose.py, size, 0.55 * pose.alpha);
  }
  g.save();
  g.translate(pose.fx - 17, pose.fy - 3);
  g.scale(pose.pressed ? 0.9 : 1);
  const a = g.alpha;
  g.alpha = a * pose.alpha;
  const shadow = { color: 'rgba(0,0,0,0.3)', blur: 6, dy: 4 };
  g.c.drawPath(handPath(), g.paint('#ffffff', { shadow }));
  g.c.drawPath(handPath(), g.paint('#4a3a66', { stroke: { width: 3, join: 'round' } }));
  g.alpha = a;
  g.restore();
}
