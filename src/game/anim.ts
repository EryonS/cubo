// Cubo Blocks — Animation state shared by the game flow and the renderer (legacy game/anim-state.js).
// A plain mutable object: it changes every frame and never goes through React.
import type { ClearedCell } from '../core/logic';
import type { RunState } from '../core/types';
import type { Banner } from './juice';

// The piece being dragged: tray slot, finger position, how high it floats, pick-up time.
export interface DragState { idx: number; x: number; y: number; lift: number; t0: number }

export interface Particle {
  x: number; y: number; vx: number; vy: number; t0: number; life: number; size: number; color: string;
  g?: number; star?: boolean; rot?: number; vr?: number;
}

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
  // Combo feel: light sweeping cleared lines, board punch, combo tag pop / break, particles, banners.
  sweeps: [] as ({ row: number; col?: undefined; t0: number } | { col: number; row?: undefined; t0: number })[],
  punch: null as { t0: number; amp: number } | null,
  shake: 0, // pixels, decays every frame
  comboAt: 0, // last time the combo grew
  comboBreak: null as { t0: number; n: number } | null, // the combo that just broke
  particles: [] as Particle[],
  banners: [] as Banner[], // queue of big center texts, shown one after another
  recordAnnounced: false,
  flagDownAt: 0, // when the record pennant started to topple
  lastT: 0, // previous frame (particle physics)
  calm: false, // reduced motion: no shake, punch, sweeps, confetti, wobble
};

export function resetAnim(t: number, score: number, best: number) {
  Object.assign(anim, {
    displayScore: score, bestAtStart: best, pops: [], fades: [], floaters: [], returning: [],
    slotIn: [t, t, t], nextIn: t, overAt: 0,
    sweeps: [], punch: null, shake: 0, comboAt: 0, comboBreak: null, particles: [], banners: [],
    recordAnnounced: false, flagDownAt: 0, lastT: t,
  });
}

// Something moves for sure: the frame loop draws every frame.
export const animating = (t: number) => anim.pops.length > 0 || anim.fades.length > 0 || anim.floaters.length > 0
  || anim.returning.length > 0 || Math.round(anim.displayScore) !== anim.displayScore
  || t - Math.max(...anim.slotIn, anim.nextIn) < 400 || (anim.overAt > 0 && t - anim.overAt < 900)
  || anim.sweeps.length > 0 || anim.punch !== null || anim.shake > 0.05 || anim.particles.length > 0
  || anim.banners.length > 0 || anim.comboBreak !== null || (anim.comboAt > 0 && t - anim.comboAt < 420)
  || (anim.flagDownAt > 0 && t - anim.flagDownAt < 700);

// Only decoration waves: a running combo (glow and tag pulse) or the record pennant flying.
// The loop redraws these at half rate and goes idle once they are gone.
export const ambient = (state: RunState) => !anim.calm && !state.over
  && (state.combo >= 1 || (anim.bestAtStart > 0 && state.score <= anim.bestAtStart));
