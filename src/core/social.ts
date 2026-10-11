/*
 * Cubo Blocks — community rules: pseudo validation and filter, friend code, rename delay, friend labels,
 * block list. Pure, no Firebase (platform/social.ts) and no state (game/social.ts).
 */
import { tr } from './i18n';

export const NAME_MIN = 3;
export const NAME_MAX = 16;
export const MAX_FRIENDS = 50;
export const MAX_BLOCKED = 200;
export const MAX_RECORD = 2000000; // players.bestClassic ceiling (firestore.rules)
export const PUSH_STEP = 200000; // most points a week score may gain in one write (firestore.rules)
export const PUSH_GAP = 10000; // two writes of a week score need 10 s between them (firestore.rules)
export const RENAME_DELAY = 7 * 24 * 3600 * 1000;

// ---------- pseudo ----------

// Letters (Latin with accents), digits, space, - and _. firestore.rules checks the same set.
const NAME_CHARS = /^[A-Za-z0-9À-ÖØ-öø-ÿŒœ _-]+$/;
const HAS_LETTER = /[A-Za-zÀ-ÖØ-öø-ÿŒœ]/;

const clean = (raw: string) => raw.trim().replace(/\s+/g, ' ');

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
// Case, accents, leetspeak and repeated letters gone: "Püt41n" and "puuutain" both read "putain".
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[0134578@$]/g, (c) => LEET[c] || c).replace(/œ/g, 'oe');
const squash = (s: string) => s.replace(/(.)\1+/g, '$1');
const letters = (s: string) => squash(fold(s).replace(/[^a-z]/g, ''));
const tokens = (s: string) => fold(s).split(/[^a-z]+/).map(squash).filter(Boolean);

// Strong words are caught anywhere in the name (spaces and symbols removed: "f u c k"); weak ones are short or
// live inside innocent words (Essex, grape, peacock, habite), so they only count as a whole word.
const STRONG = [
  // FR
  'putain', 'pute', 'salope', 'salopard', 'connard', 'connasse', 'enculer', 'encule', 'enfoire', 'merde', 'nique', 'niquer', 'ntm', 'fdp',
  'pedophile', 'pedo', 'couille', 'branleur', 'branlette', 'foutre', 'chatte', 'sperme', 'tapette', 'negre', 'negresse', 'bougnoule', 'bamboula',
  'youpin', 'bicot', 'sodomie', 'gouine', 'trouduc', 'trou du cul', 'ducon', 'petasse', 'bordel',
  // EN
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'whore', 'slut', 'rapist', 'nazi', 'hitler', 'porn', 'penis', 'vagina', 'blowjob', 'handjob',
  'masturbat', 'jizz', 'dildo', 'asshole', 'bastard', 'wanker', 'nigger', 'nigga', 'faggot', 'tranny', 'retard', 'kike', 'chink', 'cocksuck',
  'motherfuck', 'dickhead', 'cumshot', 'pedophil', 'paedo', 'genocide',
].map(letters);
const WEAK = [
  'pd', 'bite', 'cul', 'con', 'sexe', 'sex', 'sexy', 'sexo', 'baise', 'baiser', 'bander', 'zob', 'zizi', 'cock', 'dick', 'arse', 'anal', 'cum',
  'rape', 'raped', 'fag', 'twat', 'tit', 'tits', 'nude', 'nudes', 'kys', 'nsfw',
].map(squash);

export function blocked(name: string): boolean {
  const flat = letters(name);
  if (STRONG.some((w) => flat.includes(w))) return true;
  return tokens(name).some((t) => WEAK.includes(t));
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function checkName(raw: string): NameCheck {
  const name = clean(raw);
  if (name.length < NAME_MIN) return { ok: false, error: tr`Au moins ${NAME_MIN} caractères.` };
  if (name.length > NAME_MAX) return { ok: false, error: tr`${NAME_MAX} caractères au maximum.` };
  if (!NAME_CHARS.test(name)) return { ok: false, error: tr('Lettres, chiffres, espace, - et _ seulement.') };
  if (!HAS_LETTER.test(name)) return { ok: false, error: tr('Mets au moins une lettre.') };
  if (blocked(name)) return { ok: false, error: tr('Ce pseudo n’est pas possible, choisis-en un autre.') };
  return { ok: true, name };
}

// Time before the pseudo can change again (0 = now). nameChangedAt 0 = never changed: the first pick is free.
export const renameWait = (nameChangedAt: number, now: number) => (nameChangedAt ? Math.max(0, nameChangedAt + RENAME_DELAY - now) : 0);

// "dans 3 jours" for a wait in ms.
export function waitText(ms: number): string {
  const days = Math.ceil(ms / 86400000);
  return days <= 1 ? tr('demain') : tr`dans ${days} jours`;
}

// ---------- friend code ----------

// 32 symbols, no 0 / O / 1 / I.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LEN = 6;

// rand: a function giving [0, 1) (Math.random in the app, a seeded one in tests).
export function makeCode(rand: () => number): string {
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[Math.min(CODE_ALPHABET.length - 1, Math.floor(rand() * CODE_ALPHABET.length))];
  return out;
}

export const showCode = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`;

// What a player types: any case, with or without the dash, spaces around. null when it cannot be a code.
export function parseCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]+/g, '');
  if (code.length !== CODE_LEN) return null;
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

// ---------- friends ----------

export interface Person { uid: string; name: string; code: string }

// The name to show: "Pseudo", or "Pseudo#K7Q" when another shown pseudo is the same (case ignored).
export function labels(people: Person[]): Record<string, string> {
  const count: Record<string, number> = {};
  for (const p of people) count[p.name.toLowerCase()] = (count[p.name.toLowerCase()] || 0) + 1;
  const out: Record<string, string> = {};
  for (const p of people) out[p.uid] = count[p.name.toLowerCase()] > 1 ? `${p.name}#${p.code.slice(0, 3)}` : p.name;
  return out;
}

export const isBlocked = (list: string[] | undefined, uid: string) => !!list && list.includes(uid);
// The list with uid added once; the oldest entries go past the cap.
export const withBlocked = (list: string[] | undefined, uid: string) => {
  const next = [...(list || []).filter((u) => u !== uid), uid];
  return next.slice(-MAX_BLOCKED);
};
export const withoutBlocked = (list: string[] | undefined, uid: string) => (list || []).filter((u) => u !== uid);

// ---------- weeks and weekly scores ----------

const DAY = 86400000;
const HOUR = 3600000;

// Last Sunday of a month (0-based) at 01:00 UTC: the EU clock change, the same instant everywhere.
function lastSunday1h(year: number, month: number): number {
  const last = Date.UTC(year, month + 1, 0);
  return last - new Date(last).getUTCDay() * DAY + HOUR;
}
// Paris is UTC+2 between the last Sundays of March and October (01:00 UTC), UTC+1 otherwise. No Intl (Hermes).
export function parisOffset(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  return ms >= lastSunday1h(y, 2) && ms < lastSunday1h(y, 9) ? 2 * HOUR : HOUR;
}

// Days since 1970-01-01 in Paris local time, and the weekday of such a day (0 = Monday).
const parisDay = (ms: number) => Math.floor((ms + parisOffset(ms)) / DAY);
const weekdayOf = (day: number) => (((day + 3) % 7) + 7) % 7; // 1970-01-01 was a Thursday

// ISO week id in Paris time, "2026-W41": Monday 00:00 to Sunday 23:59 for everyone, whatever the device zone.
export function weekId(ms: number): string {
  const day = parisDay(ms);
  const thursday = day - weekdayOf(day) + 3; // the year of a week is the year of its Thursday
  const year = new Date(thursday * DAY).getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1) / DAY) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// The instant the week of `ms` ends (next Monday 00:00 Paris), in epoch ms.
export function weekEnd(ms: number): number {
  const day = parisDay(ms);
  const local = (day - weekdayOf(day) + 7) * DAY; // Monday 00:00 as if it were UTC
  return local - parisOffset(local - 2 * HOUR); // clocks change on Sundays: Monday's offset is stable
}

// "Fin dans 3 j 4 h".
export function weekLeftText(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (d > 0) return tr`Fin dans ${d} j ${h} h`;
  if (h > 0) return tr`Fin dans ${h} h ${min % 60} min`;
  return tr`Fin dans ${min} min`;
}

// profile.week: this week's tally, kept in the profile so a Seconde chance (profile restored) undoes it and the
// cloud save carries it across devices. Absent = nothing this week. A new week id starts again from zero.
export interface WeekTally { id: string; points: number; best: number; runs: number }
// Modes whose finished runs add to the weekly points; the best single run is Classique only.
export const WEEK_MODES = ['classic', 'chrono', 'worlds'];
export const counts = (mode: string, score: number) => WEEK_MODES.includes(mode) && score > 0;

export const weekOf = (week: WeekTally | undefined, now: number): WeekTally => {
  const id = weekId(now);
  return week && week.id === id ? week : { id, points: 0, best: 0, runs: 0 };
};

// The tally after a finished run; the same object when the run does not count.
export function addWeekRun(week: WeekTally | undefined, mode: string, score: number, now: number): WeekTally | undefined {
  if (!counts(mode, score)) return week;
  const w = weekOf(week, now);
  return { id: w.id, points: w.points + score, best: mode === 'classic' ? Math.max(w.best, score) : w.best, runs: w.runs + 1 };
}

// ---------- ranking ----------

export interface Ranked<T> { row: T; value: number; rank: number }
// Highest first; equal values share a rank (1, 1, 3) and are ordered by `tie`.
export function rankRows<T>(rows: T[], value: (r: T) => number, tie: (a: T, b: T) => number = () => 0): Ranked<T>[] {
  const sorted = rows.map((row) => ({ row, value: value(row) })).sort((a, b) => b.value - a.value || tie(a.row, b.row));
  const out: Ranked<T>[] = [];
  sorted.forEach((r, i) => out.push({ ...r, rank: i > 0 && out[i - 1].value === r.value ? out[i - 1].rank : i + 1 }));
  return out;
}
