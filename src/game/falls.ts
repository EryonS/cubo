// Cubo Blocks — Gravity falls (Rétro, Arcade...): the logic's clear waves become per-block fall paths.
// Pure. (Legacy game/flow.js planFalls / segRow / tracksBusy.)
import { SIZE } from '../core/logic';
import { FALL_AFTER, fallMs, WAVE_MS, type FallSeg } from './anim';

export interface Wave { cleared: number[]; moves: [number, number][] }
export interface FallPlan {
  tracks: Map<number, FallSeg[]>; // final board index -> its fall segments
  fadeSegs: Map<string, FallSeg[]>; // 'wave:index' -> path of a block a later wave clears
  landings: number[]; // ms after the move at which a wave's blocks land (one soft landing each)
  chimes: number[]; // ms after the move at which a later wave's clear sounds
}

// Every block present after a wave's clear follows its moves; blocks cleared by a later wave hand
// their path to their fade.
export function planFalls(waves: Wave[], t: number): FallPlan {
  const live = new Map<number, FallSeg[]>();
  const fadeSegs = new Map<string, FallSeg[]>();
  waves.forEach((wave, w) => {
    if (w > 0) {
      for (const i of wave.cleared) {
        const segs = live.get(i);
        if (segs) fadeSegs.set(w + ':' + i, segs);
        live.delete(i);
      }
    }
    const start = t + w * WAVE_MS + FALL_AFTER;
    const moved = new Map<number, FallSeg[]>();
    for (const [from, to] of wave.moves) {
      const rows = Math.floor(to / SIZE) - Math.floor(from / SIZE);
      moved.set(to, [...(live.get(from) || []), { t0: start, dur: fallMs(rows), from: Math.floor(from / SIZE), to: Math.floor(to / SIZE) }]);
    }
    for (const [from] of wave.moves) live.delete(from);
    for (const [to, segs] of moved) live.set(to, segs);
  });
  const landings: number[] = [];
  const chimes: number[] = [];
  waves.forEach((wave, w) => {
    if (!wave.moves.length) return;
    const longest = Math.max(...wave.moves.map(([a, b]) => Math.floor(b / SIZE) - Math.floor(a / SIZE)));
    landings.push(w * WAVE_MS + FALL_AFTER + fallMs(longest));
    if (w > 0) chimes.push(w * WAVE_MS);
  });
  return { tracks: live, fadeSegs, landings, chimes };
}

// Row a falling block is drawn at: accelerating fall, then a small bounce on landing.
export function segRow(segs: FallSeg[], t: number, row: number): number {
  for (const seg of segs) {
    if (t < seg.t0) return seg.from;
    const p = (t - seg.t0) / seg.dur;
    if (p < 1) return seg.from + (seg.to - seg.from) * p * p;
    const q = (t - seg.t0 - seg.dur) / 160;
    if (q < 1 && seg === segs[segs.length - 1]) return seg.to - 0.1 * Math.sin(q * Math.PI);
  }
  return row;
}
export const tracksBusy = (segs: FallSeg[], t: number) => { const last = segs[segs.length - 1]; return t < last.t0 + last.dur + 160; };
