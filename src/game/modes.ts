// Cubo Blocks — Free-game modes and levels: names, notes, what a level adds, and which runs are
// "free" (Classique, Chrono, Chill) or in progress. Pure. (Legacy screens/home.js, screens/gameover.js.)
import { M, WD, LV } from '../core';
import { tr } from '../core/i18n';
import type { Level, Mode, RunState } from '../core/types';

export const FREE_MODES: Mode[] = ['classic', 'chrono', 'chill'];
export const FREE_LEVELS: Level[] = ['easy', 'normal', 'hard'];

// Getters: read in the current language.
export const MODE_NAMES: Record<string, string> = {
  get classic() { return tr('Classique'); }, get chrono() { return tr('Chrono'); }, get chill() { return tr('Chill'); },
};
export const LEVEL_NAMES: Record<string, string> = {
  get easy() { return tr('Facile'); }, get normal() { return tr('Normal'); }, get hard() { return tr('Difficile'); },
};
export const modeNote = (mode: string) => ({
  classic: tr('Pose des formes sans limite de temps, jusqu’à ce que plus rien ne rentre.'),
  chrono: tr('La partie tourne contre la montre : chaque ligne effacée rajoute du temps.'),
  chill: tr('Touche une forme pour la tourner. Pas de bonus, pas de pression.'),
} as Record<string, string>)[mode] || '';
// The line under the mode on the home row and in the picker.
export const modeSub = (mode: string) => ({
  classic: tr('Sans limite'), chrono: tr('Contre la montre'), chill: tr('Rotation libre'),
} as Record<string, string>)[mode] || '';

// "Classique · Normal", or "Mondes · Glace".
export const modeLabel = (st: Pick<RunState, 'mode' | 'level' | 'world'>) =>
  st.mode === 'worlds' && st.world ? tr('Mondes · ') + WD.WORLDS[st.world].name : `${MODE_NAMES[st.mode] || st.mode} · ${LEVEL_NAMES[st.level] || st.level}`;

// What the difficulty adds in free play: the equipped theme's obstacles and the coin bonus.
export interface LevelInfo { kinds: string[]; pct: number; text: string }
export function levelInfo(boardTheme: string, level: Level): LevelInfo {
  const obs = WD.freeObstacles(boardTheme, level);
  const pct = Math.round(M.DIFFICULTY_BONUS[obs.length] * 100);
  if (!obs.length) return { kinds: [], pct, text: tr('<span>Aucun obstacle sur la grille. Normal en ajoute un (+20 % de pièces), Difficile deux (+50 %).</span>').replace(/<\/?span>/g, '') };
  const names = obs.map((o) => LV.KIND_NAMES[o.kind]).join(tr(' et ')).replace(/^./, (c) => c.toUpperCase());
  // The <b>…</b> part is shown bold (richText).
  return { kinds: obs.map((o) => o.kind), pct, text: tr`${names} sur la grille (selon ton thème). <b>+${pct} % de pièces</b> en fin de partie.` };
}

// Splits "plain <b>bold</b> plain" into runs, for nested Text.
export function richRuns(text: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  for (const [i, part] of text.split(/<\/?b>/).entries()) if (part) out.push({ text: part, bold: i % 2 === 1 });
  return out;
}

// A free run is neither a level nor a puzzle (it keeps a record, and can be parked).
export const isFree = (st: { stage?: unknown; puzzle?: unknown }) => !st.stage && !st.puzzle;
// A run in progress worth resuming from the menu.
export const inProgress = (st: Pick<RunState, 'over' | 'moves'>) => !st.over && st.moves > 0;
export const freeInProgress = (st: RunState) => isFree(st) && inProgress(st);

// Starting a free game while another run is in progress or parked asks first (guardRun).
export function guardFree(state: RunState, parked: RunState | null): { needed: boolean; text: string } {
  const which = freeInProgress(state) || parked ? tr('Ta partie libre en cours') : tr('La partie en cours');
  return { needed: inProgress(state) || !!parked, text: which + tr(' s’arrête. Les pièces gagnées sont gardées.') };
}

// Only free runs and Mondes keep a record: Aventure levels and puzzles have none.
export const keepsBest = (st: Pick<RunState, 'mode'>) => st.mode !== 'adventure' && st.mode !== 'puzzle';
