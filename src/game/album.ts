// Cubo Blocks — Profil data (legacy screens/profile.js + stats.js): pure helpers for the stats tiles, the
// score chart, the lifetime rows, the trophy shelves and the sticker album. No React here.
import { LV, M } from '../core';
import { tr } from '../core/i18n';
import type { Profile } from '../core/types';

export const CHART_RUNS = 20;
export const STAT_MODES = (): [string, string][] => [['classic', tr('Classique')], ['chrono', tr('Chrono')], ['chill', tr('Chill')], ['worlds', tr('Mondes')]];

export interface Tile { label: string; value: string }
type Fmt = (n: number) => string;

// The four tiles of one mode: games, record (also reads the older free-play bests), average, best combo.
export function modeTiles(profile: Profile, mode: string, bests: Record<string, number>, fmt: Fmt): Tile[] {
  const ms = M.modeStats(profile, mode);
  const record = Math.max(ms.best, bests[mode] || 0);
  return [
    { label: tr('Parties'), value: fmt(ms.games) },
    { label: tr('Record'), value: fmt(record) },
    { label: tr('Moyenne'), value: ms.games ? fmt(Math.round(ms.total / ms.games)) : '–' },
    { label: tr('Meilleur combo'), value: ms.bestCombo ? '×' + ms.bestCombo : '–' },
  ];
}

// "Depuis le début": lifetime counters, Aventure stars, dailies cleared, longest streak.
export function lifetimeRows(profile: Profile, fmt: Fmt): [string, string][] {
  const lt = (profile.lifetime || {}) as Record<string, number>;
  const dailies = Object.values(profile.daily || {}).filter((d) => d.stars !== undefined).length;
  return [
    [tr('Parties jouées'), fmt(lt.games || 0)],
    [tr('Meilleur score (tous modes)'), fmt(lt.score || 0)],
    [tr('Meilleur combo'), lt.bestCombo ? '×' + lt.bestCombo : '–'],
    [tr('Lignes effacées'), fmt(lt.lines || 0)],
    [tr('Formes posées'), fmt(lt.pieces || 0)],
    [tr('Grilles vidées'), fmt(lt.perfects || 0)],
    [tr('Bonus utilisés'), fmt(lt.bonusUsed || 0)],
    [tr('Pièces gagnées'), fmt(lt.coinsEarned || 0)],
    [tr('Étoiles en Aventure'), `${M.totalStars(profile)} / ${M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3}`],
    [tr('Niveaux du jour réussis'), fmt(dailies)],
    [tr('Plus longue série'), tr`${M.streakOf(profile).best} jours`],
  ];
}

// Bars of the last scores (legacy scoreChart, viewBox 300 x 96, 16 reserved on top for the best label).
export const CHART_W = 300;
export const CHART_H = 96;
export interface Bar { x: number; y: number; w: number; h: number; r: number; v: number; slotX: number; slotW: number }
export function chartBars(scores: number[]): { bars: Bar[]; peak: number } {
  const top = 16;
  const max = Math.max(...scores, 1);
  const slot = CHART_W / CHART_RUNS;
  const bw = slot - 2;
  const bars = scores.map((v, i) => {
    const h = Math.max(3, ((CHART_H - top) * v) / max);
    return { x: i * slot + 1, y: CHART_H - h, w: bw, h, r: Math.min(4, h, bw / 2), v, slotX: i * slot, slotW: slot };
  });
  return { bars, peak: scores.length ? scores.indexOf(Math.max(...scores)) : -1 };
}
// Rounded data end, square on the baseline.
export const barPath = (b: Bar) => `M${b.x},${CHART_H}V${b.y + b.r}Q${b.x},${b.y} ${b.x + b.r},${b.y}H${b.x + b.w - b.r}Q${b.x + b.w},${b.y} ${b.x + b.w},${b.y + b.r}V${CHART_H}Z`;

// 'YYYY-MM' of every month from the first daily level to `day`.
export function monthsSinceStart(day: string): string[] {
  const out: string[] = [];
  let m = LV.DAILY_START.slice(0, 7);
  const end = day.slice(0, 7);
  while (m <= end) { out.push(m); m = M.addDays(m + '-28', 5).slice(0, 7); }
  return out;
}

export interface Trophy { key: string; kind: string | null; label: string }
export function monthShelf(profile: Profile, day: string, short: (m: string) => string): Trophy[] {
  return monthsSinceStart(day).map((m) => ({ key: m, kind: M.monthTrophy(profile, m) || null, label: short(m) }));
}
// Season trophies: every one won, plus the event open now (still to win), in calendar order.
export function seasonShelf(profile: Profile, day: string): Trophy[] {
  const now = M.eventsFor(day).map((e) => e.id);
  const out: Trophy[] = [];
  for (let y = 2026; y <= +day.slice(0, 4); y++) {
    for (const ev of M.EVENTS) {
      const won = M.seasonTrophy(profile, ev.id, String(y));
      if (won || (now.includes(ev.id) && String(y) === M.eventYear(day))) out.push({ key: ev.id + y, kind: won || null, label: `${ev.name} ${y}` });
    }
  }
  return out;
}

// ----- sticker album -----
export const PAGE_COLORS: Record<string, string> = { combo: '#ff8fab', explorer: '#6fd6a0', faithful: '#ff9f43', collector: '#8b7cf6', master: '#f5b700', secret: '#3fc1b0' };
export const WORLD_COLORS: Record<string, string> = { plain: '#5cc64a', sea: '#1a6aa8', space: '#6a3fd0', ice: '#5ccfe6', forest: '#2f7a4a', retro: '#306230', arcade: '#ff3fd0', volcano: '#e8501a' };
export const stickerColor = (sk: { world?: string; page: string }) => (sk.world ? WORLD_COLORS[sk.world] : PAGE_COLORS[sk.page]);

// Glyph primitives (white on the badge), one per album page; unearned secrets show a question mark.
export type Prim = { t: 'path'; d: string; fill?: boolean; sw?: number } | { t: 'circle'; cx: number; cy: number; r: number };
export const STICKER_GLYPHS: Record<string, Prim[]> = {
  master: [{ t: 'path', d: 'M3.5 18.5 2.5 7l5.2 4.3L12 4l4.3 7.3L21.5 7l-1 11.5z', fill: true }, { t: 'path', d: 'M3.5 19.3h17v2.2h-17z', fill: true }],
  combo: [{ t: 'path', d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', fill: true }],
  explorer: [{ t: 'path', d: 'M6 21V4M6 4h11l-2.5 4L17 12H6', sw: 2.4 }],
  faithful: [{ t: 'path', d: 'M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.3.2 1.7 1 2.8 2.1 3.3-.4-3.3.3-6.3 1-9z', fill: true }],
  collector: [{ t: 'path', d: 'M7 4h10l4 5-9 11L3 9z M3 9h18 M9.5 4 8 9l4 11 4-11-1.5-5', sw: 1.8 }],
  secret: [{ t: 'path', d: 'M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z', fill: true }, { t: 'circle', cx: 19, cy: 19, r: 1.8 }, { t: 'circle', cx: 5, cy: 4.5, r: 1.3 }],
};
export const SECRET_GLYPH: Prim[] = [{ t: 'path', d: 'M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.8v.8', sw: 2.6 }, { t: 'circle', cx: 12, cy: 18.3, r: 1.5 }];

export interface StickerRow { id: string; name: string; hint: string; page: string; world?: string; secret: boolean; on: boolean; hidden: boolean; day: string | true | undefined; color: string }
export interface AlbumPage { id: string; name: string; stickers: StickerRow[] }
export function albumPages(profile: Profile): { pages: AlbumPage[]; count: number; total: number } {
  const got = (profile.stickers || {}) as Record<string, string | true>;
  const pages = M.STICKER_PAGES.map((p) => ({
    id: p.id, name: p.name,
    stickers: M.STICKERS.filter((x) => x.page === p.id).map((sk) => {
      const on = !!got[sk.id];
      return { id: sk.id, name: sk.name, hint: sk.hint, page: p.id, world: sk.world, secret: !!sk.secret, on, hidden: !!sk.secret && !on, day: got[sk.id], color: stickerColor(sk) };
    }),
  }));
  return { pages, count: M.STICKERS.filter((s) => got[s.id]).length, total: M.STICKERS.length };
}
