// Cubo Blocks — Animation state shared by the game flow and the renderer (legacy game/anim-state.js).
// A plain mutable object: it changes every frame and never goes through React.
import type { ClearedCell } from '../core/logic';
import type { RunState } from '../core/types';
import type { Banner } from './juice';

// The piece being dragged: tray slot, finger position, how high it floats, pick-up time.
export interface DragState { idx: number; x: number; y: number; lift: number; t0: number; sx: number; sy: number }

export interface Particle {
  x: number; y: number; vx: number; vy: number; t0: number; life: number; size: number; color: string;
  g?: number; star?: boolean; rot?: number; vr?: number;
}

// A bonus or coin icon flying from its cleared cell to the wallet or its inventory button.
export interface Flyer { type: string; r: number; c: number; coins?: number; overflow?: boolean; x: number; y: number; t0: number; landed?: boolean }
// A special cell arriving on the board (dropped, grown or glided from another cell).
export interface Drop { t0: number; kind: string; dur: number; from?: [number, number]; hop?: boolean; grow?: boolean }
// Bomb aiming: dragging from the inventory button (drag), or tap mode. cell: the board cell targeted.
export interface Aim { drag: boolean; cell: [number, number] | null; x: number; y: number; lift: number; sx: number; sy: number }
// The bin shown under the tray while a piece is dragged: hovered since when, armed after a hold.
export interface Trash { over: boolean; since: number; armed: boolean }

export const TRASH_ARM_MS = 600;

export const anim = {
  displayScore: 0,
  bestAtStart: 0,
  pops: [] as { r: number; c: number; t0: number }[], // freshly placed cells
  fades: [] as (ClearedCell & { t0: number; delay: number })[], // cleared cells shrinking out
  floaters: [] as { text: string; x: number; y: number; t0: number; big?: boolean; scale?: number; tier?: number }[],
  returning: [] as { idx: number; x: number; y: number; size: number; t0: number }[], // pieces flying back to the tray
  slotIn: [0, 0, 0], // slide-in time of each slot's piece
  slotSpin: [0, 0, 0], // when each slot's piece was last turned (Toupie, Chill)
  flyers: [] as Flyer[],
  drops: new Map<number, Drop>(), // cell index -> arrival of a special cell
  aiming: null as Aim | null,
  trash: null as Trash | null,
  lastTickSec: -1, // chrono: last second a tick sound played
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
    slotIn: [t, t, t], slotSpin: [0, 0, 0], nextIn: t, overAt: 0,
    flyers: [], drops: new Map(), aiming: null, trash: null, lastTickSec: -1,
    sweeps: [], punch: null, shake: 0, comboAt: 0, comboBreak: null, particles: [], banners: [],
    recordAnnounced: false, flagDownAt: 0, lastT: t,
  });
}

// Something moves for sure: the frame loop draws every frame.
export const animating = (t: number) => anim.pops.length > 0 || anim.fades.length > 0 || anim.floaters.length > 0
  || anim.returning.length > 0 || anim.flyers.length > 0 || anim.drops.size > 0 || anim.aiming !== null
  || anim.slotSpin.some((s) => s > 0 && t - s < 300) || Math.round(anim.displayScore) !== anim.displayScore
  || t - Math.max(...anim.slotIn, anim.nextIn) < 400 || (anim.overAt > 0 && t - anim.overAt < 900)
  || anim.sweeps.length > 0 || anim.punch !== null || anim.shake > 0.05 || anim.particles.length > 0
  || anim.banners.length > 0 || anim.comboBreak !== null || (anim.comboAt > 0 && t - anim.comboAt < 420)
  || (anim.flagDownAt > 0 && t - anim.flagDownAt < 700);

// Only decoration waves: a running combo (glow and tag pulse) or the record pennant flying.
// The loop redraws these at half rate and goes idle once they are gone.
// Also the running clock (Chrono), draining bonus rings, the stuck hint and the turn-able tray pulse.
export const ambient = (state: RunState) => {
  if (state.over) return false;
  if (state.mode === 'chrono' || state.stuck || Object.values(state.effects || {}).some((ms) => ms > 0)) return true;
  return !anim.calm && (state.combo >= 1 || (anim.bestAtStart > 0 && state.score <= anim.bestAtStart));
};
