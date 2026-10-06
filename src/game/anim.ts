// Cubo Blocks — Animation state shared by the game flow and the renderer (legacy game/anim-state.js).
// A plain mutable object: it changes every frame and never goes through React.
import type { ClearedCell } from '../core/logic';
import type { RunState } from '../core/types';
import { cuboBusy } from '../mascot/state';
import type { Banner } from './juice';

// The piece being dragged: tray slot, finger position, how high it floats, pick-up time.
// ox, oy: where the piece sits from the finger (a surprise piece picked up from the board keeps its grabbed cell under it).
export interface DragState { idx: number; x: number; y: number; lift: number; t0: number; sx: number; sy: number; ox?: number; oy?: number; fromBoard?: boolean }

// One fall of a block, in rows: it starts at t0, takes dur ms, then bounces a little (legacy planFalls).
export interface FallSeg { t0: number; dur: number; from: number; to: number }
export const WAVE_MS = 430; // gravity chain: time between two clear waves
export const FALL_AFTER = 240; // falls start once the wave's cells have faded
export const fallMs = (rows: number) => 110 + 55 * rows;

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
  fades: [] as (ClearedCell & { t0: number; delay: number; segs?: FallSeg[] })[], // cleared cells shrinking out
  floaters: [] as { text: string; x: number; y: number; t0: number; big?: boolean; scale?: number; tier?: number }[],
  returning: [] as { idx: number; x: number; y: number; size: number; t0: number }[], // pieces flying back to the tray
  slotIn: new Array(12).fill(0) as number[], // slide-in time of each slot's piece
  slotSpin: new Array(12).fill(0) as number[], // when each slot's piece was last turned (Toupie, Chill)
  flyers: [] as Flyer[],
  drops: new Map<number, Drop>(), // cell index -> arrival of a special cell
  tracks: new Map<number, FallSeg[]>(), // final cell index -> fall segments (gravity worlds)
  shifts: [] as { row: number; t0: number }[], // rows sliding with the sea current
  bossHitAt: 0, // boss: last hit / last strike back
  bossAttackAt: 0,
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
  mascot: true, // Paramètres > Mascotte: Cubo stands on the board (set by the game screen every frame)
};

export function resetAnim(t: number, score: number, best: number) {
  Object.assign(anim, {
    displayScore: score, bestAtStart: best, pops: [], fades: [], floaters: [], returning: [],
    slotIn: new Array(12).fill(t) as number[], slotSpin: new Array(12).fill(0) as number[], nextIn: t, overAt: 0,
    flyers: [], drops: new Map(), tracks: new Map(), shifts: [], bossHitAt: 0, bossAttackAt: 0, aiming: null, trash: null, lastTickSec: -1,
    sweeps: [], punch: null, shake: 0, comboAt: 0, comboBreak: null, particles: [], banners: [],
    recordAnnounced: false, flagDownAt: 0, lastT: t,
  });
}

// Something moves for sure: the frame loop draws every frame.
export const animating = (t: number) => anim.pops.length > 0 || anim.fades.length > 0 || anim.floaters.length > 0
  || anim.returning.length > 0 || anim.flyers.length > 0 || anim.drops.size > 0 || anim.tracks.size > 0 || anim.shifts.length > 0 || anim.aiming !== null
  || t - Math.max(anim.bossHitAt, anim.bossAttackAt) < 450
  || anim.slotSpin.some((s) => s > 0 && t - s < 300) || Math.round(anim.displayScore) !== anim.displayScore
  || t - Math.max(...anim.slotIn, anim.nextIn) < 400 || (anim.overAt > 0 && t - anim.overAt < 900)
  || anim.sweeps.length > 0 || anim.punch !== null || anim.shake > 0.05 || anim.particles.length > 0
  || anim.banners.length > 0 || anim.comboBreak !== null || (anim.comboAt > 0 && t - anim.comboAt < 420)
  || (anim.flagDownAt > 0 && t - anim.flagDownAt < 700) || (anim.mascot && cuboBusy(t));

// Only decoration waves: a running combo (glow and tag pulse) or the record pennant flying.
// The loop redraws these at half rate and goes idle once they are gone.
// Also the running clock (Chrono), draining bonus rings, the stuck hint and the turn-able tray pulse.
// Obstacles that move by themselves (flicker, bob, sway, spin).
const LIVELY = new Set(['ember', 'ghost', 'heart', 'water', 'crab', 'lantern', 'firecracker', 'rocket', 'jelly', 'hole', 'lava', 'glitch']);
export const ambient = (state: RunState) => {
  if (state.over) return false;
  const stage = state.stage;
  if (stage && (stage.clock || stage.goal.type === 'boss' || (!stage.clock && stage.movesLeft <= 3))) return true;
  if (state.special && Object.values(state.special).some((sp) => sp && LIVELY.has(sp.kind))) return true;
  if (state.mode === 'chrono' || state.stuck || Object.values(state.effects || {}).some((ms) => ms > 0)) return true;
  return !anim.calm && (state.combo >= 1 || (anim.bestAtStart > 0 && state.score <= anim.bestAtStart));
};

// Minimum ms between two redraws when only decoration moves: 33 for the waves above, 66 for Cubo alone
// (breathing, sway, blink), 0 when nothing needs redrawing. Reduced motion: Cubo holds still.
export const ambientGap = (state: RunState) => (ambient(state) ? 33 : anim.mascot && !anim.calm ? 66 : 0);
