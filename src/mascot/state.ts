// Cubo Blocks — Cubo on the board: reaction state, where he stands, taps, base mood (legacy mascot/cubo.js).
// Pure (no React / native module): the callers pass the clock, the settings and the run.
import { SIZE } from '../core/logic';
import type { RunState } from '../core/types';
import type { CuboLook } from './looks';

export interface Heart { x: number; y: number; t0: number; dx: number; spin: number }
export const cubo = {
  mood: null as string | null, until: 0, jumpAt: -1e9, jumpH: 0, taps: [] as number[], hearts: [] as Heart[], blinkAt: 0, dizzyUntil: 0,
};

export const resetCubo = () => Object.assign(cubo, { mood: null, until: 0, jumpAt: -1e9, jumpH: 0, taps: [], hearts: [], blinkAt: 0, dizzyUntil: 0 });

// An event mood over the base one for `ms`, with a hop of height `jump` (no hop in reduced motion).
export function cuboReact(t: number, mood: string, ms: number, jump = 0, calm = false) {
  if (t < cubo.dizzyUntil) return;
  cubo.mood = mood;
  cubo.until = t + ms;
  if (jump && !calm) { cubo.jumpAt = t; cubo.jumpH = jump; }
}

export interface Spot { x: number; y: number; s: number }
interface Board { bx: number; by: number; board: number; cell: number }

// Where Cubo stands: the board frame's top-right corner, and his size. In a puzzle he stands on the
// top cell of the drawing's rightmost column, clear of the score sign.
export function cuboSpot(lay: Board, state: Pick<RunState, 'puzzle' | 'special'>): Spot {
  const s = Math.max(34, Math.min(58, lay.cell * 1.15));
  if (state.puzzle) {
    for (let c = SIZE - 1; c >= 0; c--) {
      for (let r = 0; r < SIZE; r++) {
        const sp = state.special && state.special[r * SIZE + c];
        if (sp && sp.kind === 'void') continue;
        return { x: lay.bx + (c + 1) * lay.cell - s * 0.5 + 2, y: lay.by + r * lay.cell - 10, s };
      }
    }
  }
  return { x: lay.bx + lay.board - s * 0.5 + 2, y: lay.by - 10, s };
}

// Room taken from the score band's right end so Cubo stands next to it, not over it.
export const cuboRoom = (mascot: boolean, lay: Board, state: Pick<RunState, 'puzzle' | 'special'>) =>
  mascot && !state.puzzle ? cuboSpot(lay, state).s + 16 : 0;

export function cuboHit(x: number, y: number, m: Spot) {
  return Math.abs(x - m.x) < m.s * 0.7 && y > m.y - m.s * 1.2 && y < m.y + 6;
}

// A tap: a face (the look's own, in turn), a hop and hearts; the fifth quick tap makes him dizzy.
// Returns which, so the caller plays the sound.
export function cuboTap(t: number, m: Spot, look: Pick<CuboLook, 'taps'>, calm = false): 'dizzy' | 'pop' {
  cubo.taps = cubo.taps.filter((x) => t - x < 1600).concat(t);
  let kind: 'dizzy' | 'pop' = 'pop';
  if (cubo.taps.length >= 5) {
    cubo.taps = [];
    cuboReact(t, 'dizzy', 2200, 0.5, calm);
    cubo.dizzyUntil = t + 2200;
    kind = 'dizzy';
  } else {
    cuboReact(t, (look.taps || ['happy', 'wow', 'happy', 'star'])[cubo.taps.length - 1] || 'happy', 900, 0.6, calm);
  }
  for (let k = 0; k < 3; k++) cubo.hearts.push({ x: m.x + (k - 1) * m.s * 0.3, y: m.y - m.s, t0: t + k * 90, dx: (k - 1) * 18, spin: (k - 1) * 0.6 });
  return kind;
}

// Base mood when no event mood is playing. asleep: a sheet or dialog is open over the game.
export function cuboBaseMood(state: RunState, asleep: boolean, dragging: boolean) {
  if (asleep && !state.over) return 'sleep';
  if (state.over) {
    const won = (state.puzzle && state.puzzle.won) || (state.stage && state.stage.won);
    return won ? 'party' : 'sad';
  }
  if (state.stuck) return 'worried';
  let cells = 0;
  let full = 0;
  for (let i = 0; i < state.board.length; i++) {
    if (state.special && state.special[i] && state.special[i]!.kind === 'void') continue;
    cells += 1;
    if (state.board[i]) full += 1;
  }
  if (state.mode !== 'puzzle' && full / cells >= 0.7) return 'worried';
  return dragging ? 'watch' : 'idle';
}

// Something of Cubo's moves for sure (a reaction, a hop, hearts): the frame loop draws every frame.
export const cuboBusy = (t: number) => cubo.hearts.length > 0 || t < cubo.until + 60 || t - cubo.jumpAt < 520 * 1.35 + 40;

// The mood now: the event one while it lasts, else the base one.
export const cuboMoodAt = (t: number, base: string) => (t < cubo.until && cubo.mood ? cubo.mood : base);
