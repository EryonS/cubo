// Cubo Blocks — Helpers of the theme backgrounds (legacy themes/setup.js, app/base.js seeded).
import type { Ctx, Grad } from '../ctx2d';

export type Paint = (g: Ctx, w: number, h: number) => void;
export type Animate = (g: Ctx, w: number, h: number, t: number) => void;

// Tiny seeded RNG so decorative stars and peaks don't jump on resize.
export function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function vGradient(g: Ctx, h: number, stops: string[]): Grad {
  const grad = g.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
}

// A rolling hill line from y0, filled down to the bottom.
export function hills(g: Ctx, w: number, h: number, y0: number, amp: number, color: string, phase: number, waves = 1.5) {
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 2 * waves + phase) * amp);
  g.lineTo(w, h); g.fill();
}

// Position along a looping track: offset + t * speed, wrapped into [-pad, span + pad].
export const loop = (v: number, span: number, pad: number) => ((((v + pad) % (span + pad * 2)) + span + pad * 2) % (span + pad * 2)) - pad;
