// Cubo Blocks — Puzzles and Puzzle surprise: pure helpers of the run and the list.
// (Legacy render/helpers.js freeTray, screens/puzzles.js puzzleTitle / openPuzzles / showPuzzleEnd,
// screens/home.js puzzleInProgress, game/drag.js liftFromBoard.)
import { L, M, PZ } from '../core';
import { tr } from '../core/i18n';
import type { Earned } from '../core/meta';
import type { Profile, RunState } from '../core/types';
import { inProgress } from './modes';

const SIZE = L.SIZE;

// Pads of a free puzzle tray (the whole quota, on two rows), 0 for every other run (and a numbered puzzle saved before).
export const freeTray = (st: Pick<RunState, 'puzzle' | 'tray'>) => (st.puzzle && st.puzzle.free ? st.tray.length : 0);
export const isVoid = (special: RunState['special'], i: number) => !!(special && special[i] && special[i]!.kind === 'void');

// Free tray / movable pieces (`free`) is not the same as a surprise: numbered puzzles are free too (n > 0, with stars and packs).
export const isSurprise = (pz: { n: number }) => pz.n === 0;
// A numbered puzzle reads as its place in the play order (PZ.rankOf), not its id.
export const puzzleTitle = (pz: { n: number }) => (isSurprise(pz) ? tr('Puzzle surprise') : tr('Puzzle ') + PZ.rankOf(pz.n));
// "Puzzle 12 · Maison" under the pause title and on the home hero.
export const puzzleLabel = (pz: { n: number; name: string }) => `${puzzleTitle(pz)} · ${pz.name}`;
export const puzzleInProgress = (st: RunState) => !!st.puzzle && inProgress(st);

// Home tile line: the puzzle going on, else the solved count.
export const puzzleTileSub = (profile: Profile, st: RunState) =>
  puzzleInProgress(st) ? tr`${puzzleTitle(st.puzzle!)} en cours` : tr`${M.puzzlesSolved(profile)} / ${PZ.COUNT} résolus`;

// The hint button: off when the run is over or the wallet is short (a tap then explains).
export const hintDisabled = (st: RunState, coins: number) => st.mode !== 'puzzle' || st.over || coins < M.PUZZLE_HINT;

export interface PackRow { index: number; name: string; solved: number; ids: number[]; open: boolean; quotas: [number, number]; empty: boolean; gate: string | null }
// The packs of the list: how many are solved, the quota range, and what opens a pack not reached yet.
export function packRows(profile: Profile): PackRow[] {
  return PZ.PACKS.map((pack, k) => {
    const ids = PZ.packIds(k);
    const solved = ids.filter((n) => M.puzzleStarsOf(profile, n) !== undefined).length;
    const open = M.puzzleOpen(profile, ids[0]);
    const quotas = ids.map(PZ.quotaOf);
    return { index: k, name: pack.name, solved, ids, open, quotas: [Math.min(...quotas), Math.max(...quotas)], empty: PZ.isEmpty(ids[0]), gate: open ? null : tr`Finis le pack ${PZ.PACKS[k - 1].name} pour ouvrir ces ${PZ.PER_PACK} puzzles.` };
  });
}
export const allStars = (profile: Profile) => Object.values(profile.puzzles || {}).reduce((a, b) => a + b, 0);

// The puzzle after n in the play order, none after the last.
export const nextPuzzle = (pz: { n: number }) => (isSurprise(pz) ? null : PZ.nextOf(pz.n));

// Surprise: grabbing a placed piece keeps the grabbed cell under the finger. Returns the offset from the
// finger to the piece's center when it sits at its board spot, and the spot's top-left cell.
export function liftOrigin(cells: number[], pieceW: number, pieceH: number) {
  const row = Math.min(...cells.map((j) => Math.floor(j / SIZE)));
  const col = Math.min(...cells.map((j) => j % SIZE));
  return { row, col, cx: col + pieceW / 2, cy: row + pieceH / 2 };
}
// The spot of the player's piece covering cell (r, c), if any.
export const spotAt = (st: RunState, r: number, c: number) => {
  const i = r * SIZE + c;
  return st.puzzle && st.puzzle.at ? Object.values(st.puzzle.at).find((a) => a.cells.includes(i)) : undefined;
};

// Cells of a drawing to paint in the list's small thumbnails.
export const maskOf = (n: number) => PZ.puzzle(n)!.mask;

// A solved puzzle's result: first solve / new stars / pack bonus (puzzle) or the surprise coins, then stickers
// the profile just earned. Pure; the caller keeps the profile and shows the lines.
export function settlePuzzle(profile: Profile, pz: { n: number; hints: number; stars: number }, day: string): { profile: Profile; lines: Earned[] } {
  const res = isSurprise(pz) ? M.applySurprise(profile, day) : M.applyPuzzle(profile, pz.n, pz.stars);
  const lines = [...res.report.earned];
  const st = M.checkStickers(res.profile, day);
  for (const s of st.fresh) lines.push({ label: tr('Autocollant : ') + s.name, coins: s.reward || M.STICKER_REWARD });
  return { profile: st.profile, lines };
}
