// Cubo Blocks — Daily level helpers (legacy screens/daily.js + defis.js, pause runLabel). Pure.
import { LV, M, WD } from '../core';
import { locale, tr } from '../core/i18n';
import type { Profile, RunState } from '../core/types';
import { levelName } from '../state/progress';
import { inProgress, modeLabel } from './modes';

export const dailyWord = (day: string, today: string) => (day === today ? tr('Niveau du jour') : tr('Jour rattrapé'));
export const triesText = (left: number) => tr`${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`;
export const frDate = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
export const frMonth = (m: string) => new Date(m + '-15T12:00:00').toLocaleDateString(locale(), { month: 'long', year: 'numeric' });

// A daily is going on (a stage with a day, at least one move).
export const dailyGoing = (st: Pick<RunState, 'over' | 'moves' | 'stage'>) => inProgress(st) && !!(st.stage && st.stage.daily);
export const dailyGoingOn = (st: Pick<RunState, 'over' | 'moves' | 'stage'>, day: string) => dailyGoing(st) && st.stage!.daily === day;

// Tries left on a daily once the run in progress counts (Infinity for a past day).
export const triesAfter = (profile: Profile, st: Pick<RunState, 'over' | 'moves' | 'stage'>, day: string, today: string) =>
  M.dailyAttemptsLeft(profile, day, today) - (dailyGoingOn(st, day) ? 1 : 0);

// Home tile subtitle.
export function tileSub(profile: Profile, st: Pick<RunState, 'over' | 'moves' | 'stage'>, today: string): string {
  const d = M.dailyOf(profile, today);
  const left = M.dailyAttemptsLeft(profile, today, today);
  const world = WD.WORLDS[LV.daily(today).world].name;
  return dailyGoing(st) ? (st.stage!.daily === today ? tr`${world} · en cours` : tr('Jour rattrapé en cours'))
    : d.stars !== undefined ? tr`${world} · réussi`
    : left ? tr`${world} · ${left} essai${left > 1 ? 's' : ''}` : tr('Reviens demain');
}

// Tab bar dot: today's level is neither cleared nor out of tries.
export const defisDot = (profile: Profile, today: string) => M.dailyOf(profile, today).stars === undefined && M.dailyAttemptsLeft(profile, today, today) > 0;

// ---------- calendar ----------
export const weekOf = (day: string) => M.addDays(day, -((new Date(day + 'T12:00:00').getDay() + 6) % 7));
export interface CalPick { day: string; month: string; week: string }
// The picked day is kept between DAILY_START and today.
export function pickDay(day: string, today: string): CalPick {
  const d = day > today ? today : day < LV.DAILY_START ? LV.DAILY_START : day;
  return { day: d, month: d.slice(0, 7), week: weekOf(d) };
}
export const calFirst = (open: boolean, month: string, week: string) => (open ? month <= LV.DAILY_START.slice(0, 7) : week <= weekOf(LV.DAILY_START));
export const calLast = (open: boolean, month: string, week: string, today: string) => (open ? month >= today.slice(0, 7) : week >= weekOf(today));
// Previous / next month (unfolded) or week (the same weekday, the week before / after).
export const stepMonth = (month: string, d: number) => M.addDays(month + '-15', d * 30).slice(0, 7);
// Cells of the month grid: Monday first, null padding before the 1st.
export function monthCells(month: string): (string | null)[] {
  const days = M.monthDays(month);
  const offset = (new Date(days[0] + 'T12:00:00').getDay() + 6) % 7;
  return [...Array<null>(offset).fill(null), ...days];
}
export const weekCells = (week: string) => Array.from({ length: 7 }, (_, i) => M.addDays(week, i));
// Narrow weekday names, Monday first (2024-01-01 is a Monday).
export const weekdayNames = () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));

// ---------- texts ----------
export const budgetText = (stage: { clock?: number; maxMoves?: number }) => (stage.clock ? `${Math.round(stage.clock / 1000)} s` : tr`${stage.maxMoves} coups`);

// Share text after a win: "Cubo Blocks #31 · Forêt · 3 étoiles · 12 coups en rab".
export function shareText(day: string, worldName: string, stars: number, movesLeft: number): string {
  return [
    `Cubo Blocks #${LV.dayNumber(day)}`, worldName, tr`${stars} étoile${stars > 1 ? 's' : ''}`,
    ...(movesLeft > 0 ? [tr`${movesLeft} coups en rab`] : []),
  ].join(' · ');
}

// Pause sheet subtitle: the level (or the mode) the run is in, as legacy runLabel.
const eventLevelName = (n: number) => (n === 10 ? tr('Boss') : tr('Niveau ') + n);
export function runLabel(st: RunState): string {
  const stage = st.stage;
  if (stage) {
    const where = stage.daily ? tr`Niveau du jour #${LV.dayNumber(stage.daily)}`
      : stage.event ? `${M.eventById(stage.event)?.name} · ${eventLevelName(stage.n)}`
      : `${WD.WORLDS[stage.world].name} · ${levelName(stage.n)}`;
    return `${where} · ${LV.goalText(stage.goal)}`;
  }
  return `${modeLabel(st)} · ${st.score.toLocaleString(locale())} pts`;
}
