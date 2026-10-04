// Cubo Blocks — Combo feel, pure parts: tiers, banner words and look, record pennant state,
// shake and punch amounts. (Legacy render/helpers.js comboTier / tierColor, game/flow.js commit,
// render/effects.js drawBanner, render/hud.js recordFlag.) No React, no native module.
import { tr } from '../core/i18n';
import { easeBack, easeOut } from './drag';

// 0 none, 1 small combo or a double, 2 big (4+ combo or a triple), 3 huge (6+ combo).
export const comboTier = (combo: number, lines = 0) => (combo >= 6 ? 3 : combo >= 4 || lines >= 3 ? 2 : combo >= 2 || lines >= 2 ? 1 : 0);

// Tier 3 cycles through the rainbow; tier 2 is orange; tier 1 the theme accent.
export const tierColor = (tier: number, t: number, accent: string) =>
  tier >= 3 ? `hsl(${Math.round(t / 4) % 360} 92% 58%)` : tier === 2 ? '#ff8a1f' : accent;

// "hsl(h s% l%)" to a hex color Skia parses everywhere.
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
export const tierHex = (tier: number, t: number, accent: string) =>
  tier >= 3 ? hslToHex(Math.round(t / 4) % 360, 92, 58) : tierColor(tier, t, accent);

export const lineWords = () => ['', '', tr('Double !'), tr('Triple !'), tr('Quadruple !'), tr('Énorme !'), tr('Délirant !')];

export interface Banner { text: string; sub: string; tier: number; gold?: boolean; t0?: number }

// The big center text a clear earns: the line word, else "Combo ×n"; a cleared grid wins over both.
export function bannerFor(ev: { lines: number; combo: number; perfect?: boolean }, tier: number): Banner | null {
  const words = lineWords();
  let text = words[Math.min(ev.lines, words.length - 1)];
  let sub = ev.combo >= 2 ? tr('COMBO ×') + ev.combo : '';
  if (!text && ev.combo >= 2) { text = tr('Combo ×') + ev.combo; sub = ''; }
  if (ev.perfect) { text = tr('Grille vide !'); sub = '+300'; }
  return text ? { text, sub, tier: ev.perfect ? 3 : tier } : null;
}

export const BANNER_MS = 1300;

// Banners play one after another: the head of the queue gets its start time when it first shows,
// and leaves after BANNER_MS. Returns the banner to draw (or null) and mutates the queue.
export function bannerHead(queue: Banner[], t: number): { banner: Banner; k: number } | null {
  const banner = queue[0];
  if (!banner) return null;
  banner.t0 ??= t;
  const k = (t - banner.t0) / BANNER_MS;
  if (k >= 1) { queue.shift(); return null; }
  return { banner, k };
}

// Scale, opacity and wobble of a banner at progress k (0..1).
export function bannerLook(k: number, tier: number, calm: boolean) {
  const pop = calm ? 1 : easeBack(k * 4);
  const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : calm ? Math.min(1, k * 8) : 1;
  const grow = 1 + 0.08 * Math.max(0, tier - 1);
  const wobble = tier && !calm ? Math.sin(k * 20) * 0.035 * tier * (1 - Math.min(1, k * 2.5)) : 0;
  return { scale: pop * grow, alpha, wobble, sunburst: tier >= 2 && !calm, burstR: easeOut(k * 3) };
}

// How hard a clear shakes the screen (pixels, decays by 0.86 per frame) and punches the board.
export const shakeFor = (lines: number, combo: number) => Math.min(16, 3 + lines * 3 + combo * 1.5);
export const punchAmp = (tier: number) => 0.012 + tier * 0.01;
export const PUNCH_MS = 240;
export const confettiCount = (tier: number, lines: number) => 10 + tier * 14 + lines * 6;

// Combo tag pulse (last move of grace) and pop scale.
export function comboTagLook(t: number, grace: number, movesSinceClear: number, comboAt: number, calm: boolean) {
  const left = grace - movesSinceClear;
  const pulse = left === 1 ? 0.55 + 0.45 * Math.abs(Math.sin(t / 180)) : 1;
  const pop = calm || !comboAt ? 0 : 1 - easeOut((t - comboAt) / 420);
  return { left, pulse, scale: 1 + 0.45 * pop };
}
export const COMBO_BREAK_MS = 700;

// The record pennant: standing while the run's start record is not beaten, toppling over 700 ms
// after it is. `flagDownAt` is when the announcement happened (0: beaten before we saw it).
export const FLAG_FALL_MS = 700;
export function flagFall(beaten: boolean, flagDownAt: number, t: number) {
  return beaten ? (flagDownAt ? Math.min(1, (t - flagDownAt) / FLAG_FALL_MS) : 1) : 0;
}
// Wave of the pennant: amplitude and speed, harder in the last 10 % before the record.
export function flagWave(s: number, score: number, bestAtStart: number, beaten: boolean, calm: boolean) {
  const close = !beaten && score >= bestAtStart * 0.9;
  return { amp: calm ? 0 : s * (close ? 0.06 : 0.03), speed: close ? 110 : 260 };
}
