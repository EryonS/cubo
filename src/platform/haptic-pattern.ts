// Cubo Blocks — Vibration patterns, pure (legacy platform/haptics.js). A pattern is [on, off, on...]
// in ms; on a phone it plays as one impact per "on" pulse at its offset, the pulse length picking
// the strength.
import { comboTier } from '../game/juice';

export type Impact = 'light' | 'medium' | 'heavy';
export type Pattern = number | number[];

// One vibration per kind of moment, from a light tick (pick, coin) to long rolls (win, game over).
export const HAPTICS: Record<string, Pattern> = {
  pick: 5, lift: 7, turn: 6, place: 9, nope: [8, 45, 8], arm: 8, toss: 12, undo: 10, tap: 8,
  bonus: 15, hint: 12, bomb: [30, 20, 60], boss: [25, 15, 25], coin: 4, star: 14,
  mission: [12, 30, 12], record: [15, 30, 15, 30, 30], buy: [20, 40, 20],
  win: [20, 40, 20, 40, 50], lose: [50, 70, 90],
};

export const impactStyle = (ms: number): Impact => (ms <= 8 ? 'light' : ms <= 20 ? 'medium' : 'heavy');

export function impactSchedule(p: Pattern): { at: number; style: Impact }[] {
  const steps = typeof p === 'number' ? [p] : p;
  const out: { at: number; style: Impact }[] = [];
  let at = 0;
  steps.forEach((ms, i) => {
    if (i % 2 === 0) out.push({ at, style: impactStyle(ms) });
    at += ms;
  });
  return out;
}

// Longer for more lines at once, one more pulse for a big combo.
export function linesPattern(lines: number, combo: number): Pattern {
  const p = lines >= 4 ? [25, 20, 25, 20, 25, 20, 60] : lines === 3 ? [25, 25, 25, 25, 40] : lines === 2 ? [20, 30, 30] : [18];
  const tier = comboTier(combo);
  return tier >= 2 ? [...p, 40, 20 + tier * 15] : p.length === 1 ? p[0] : p;
}
