// Cubo Blocks — Animation state shared by the game flow and the renderer (legacy game/anim-state.js).
// A plain mutable object: it changes every frame and never goes through React.
import type { ClearedCell } from '../core/logic';

// The piece being dragged: tray slot, finger position, how high it floats, pick-up time.
export interface DragState { idx: number; x: number; y: number; lift: number; t0: number }

export const anim = {
  displayScore: 0,
  bestAtStart: 0,
  pops: [] as { r: number; c: number; t0: number }[], // freshly placed cells
  fades: [] as (ClearedCell & { t0: number; delay: number })[], // cleared cells shrinking out
  floaters: [] as { text: string; x: number; y: number; t0: number; big?: boolean; scale?: number; tier?: number }[],
  returning: [] as { idx: number; x: number; y: number; size: number; t0: number }[], // pieces flying back to the tray
  slotIn: [0, 0, 0], // slide-in time of each slot's piece
  nextIn: 0, // slide-in time of the "next" preview
  overAt: 0, // when the run ended (the board fades)
};

export function resetAnim(t: number, score: number, best: number) {
  Object.assign(anim, {
    displayScore: score, bestAtStart: best, pops: [], fades: [], floaters: [], returning: [],
    slotIn: [t, t, t], nextIn: t, overAt: 0,
  });
}

// Something still moves: the frame loop keeps drawing.
export const animating = (t: number) => anim.pops.length > 0 || anim.fades.length > 0 || anim.floaters.length > 0
  || anim.returning.length > 0 || Math.round(anim.displayScore) !== anim.displayScore
  || t - Math.max(...anim.slotIn, anim.nextIn) < 400 || (anim.overAt > 0 && t - anim.overAt < 900);
