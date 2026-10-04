// Cubo Blocks — Special cells (obstacles) drawn on the canvas (legacy game/cells.js drawSpecial).
// Free play on the Jouet theme only drops Plaine's crate and mole; the other kinds come with the
// world themes (milestone 6) and, until then, a plain tinted cell stands in for them.
import { L } from '../core';
import type { Special } from '../core/types';
import { G } from './g';

export const SPECIAL_COLORS: Record<string, string> = {
  ice: '#9fdcf7', asteroid: '#8a8fa3', rock: '#6b5a52', mushroom: '#e84a4a', ember: '#ff6a1a', bubble: '#7fd8ff', crate: '#c98b4a', boss: '#ffffff',
  pumpkin: '#ff8a1a', ghost: '#f4f0ff', present: '#e8364a', snowpile: '#ffffff', heart: '#ff4d6d', rose: '#d6204a',
  bush: '#4fae4a', egg: '#ffd23f', water: '#4fc3f7', crab: '#ff6a4a', rocket: '#ffd23f',
  lantern: '#e8364a', firecracker: '#ff4d3d', mole: '#9a6a48', jelly: '#ff8fd0', hole: '#8a5cff', snowman: '#ffffff', vine: '#4fb33f', glitch: '#ff3fd0', token: '#ffd23f', lava: '#ff5a1a',
};

function crack(g: G, x: number, y: number, s: number) {
  g.path().moveTo(x - s * 0.3, y - s * 0.28).lineTo(x - s * 0.05, y - s * 0.02).lineTo(x - s * 0.15, y + s * 0.2)
    .moveTo(x - s * 0.05, y - s * 0.02).lineTo(x + s * 0.28, y + s * 0.05)
    .stroke('rgba(255,255,255,0.85)', Math.max(1.2, s * 0.05), { cap: 'round' });
}

// Moves left before a cell with a ttl leaves (mole): small dots around it.
function ttlDots(g: G, sp: Special, cx: number, cy: number, s: number, color: string) {
  const ttl = L.KINDS[sp.kind].ttl || 0;
  const left = Math.max(0, ttl - (sp.age || 0));
  for (let k = 0; k < left; k++) {
    const a = Math.PI * 0.75 - (k / (ttl - 1 || 1)) * Math.PI * 0.5;
    g.circle(cx + Math.cos(a) * s * 0.46, cy + Math.sin(a) * s * 0.46, s * 0.045, color);
  }
}

// Draws a special cell centered at (cx, cy). sp = { kind, hp, age }.
export function drawSpecial(g: G, sp: Special, cx: number, cy: number, size: number, alpha = 1, scale = 1) {
  const s = size * scale * 0.9;
  if (s <= 0.5) return;
  const x = cx - s / 2;
  const y = cy - s / 2;
  const kind = sp.kind;
  const cracked = sp.hp < (L.KINDS[kind] ? L.KINDS[kind].hp : 1);
  const a0 = g.alpha;
  g.alpha = a0 * alpha;
  if (kind === 'crate') {
    g.rrect(x, y, s, s, s * 0.12, '#c98b4a');
    g.path().roundRect(x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84, s * 0.08).stroke('#8a5526', s * 0.08, { join: 'round' });
    g.path().moveTo(x + s * 0.14, y + s * 0.86).lineTo(x + s * 0.86, y + s * 0.14).stroke('#8a5526', s * 0.08, { join: 'round' });
    g.rect(x + s * 0.14, y + s * 0.12, s * 0.72, s * 0.08, 'rgba(255,255,255,0.22)');
    if (cracked) crack(g, cx, cy, s);
  } else if (kind === 'mole') {
    // Dirt mound with the mole peeking out.
    g.ellipse(cx, cy + s * 0.3, s * 0.46, s * 0.18, '#7a4e2c');
    g.path().ellipse(cx, cy + s * 0.04, s * 0.3, s * 0.32, 0, Math.PI, 0).lineTo(cx + s * 0.3, cy + s * 0.3).lineTo(cx - s * 0.3, cy + s * 0.3).fill('#9a6a48');
    g.ellipse(cx, cy + s * 0.12, s * 0.16, s * 0.12, '#c99a78');
    g.circle(cx, cy + s * 0.06, s * 0.065, '#ff8fa8');
    for (const d of [-1, 1]) g.circle(cx + d * 0.12 * s, cy - s * 0.1, 0.045 * s, '#2a1a12');
    for (const [fx, fy] of [[-0.3, 0.32], [0.08, 0.38], [0.34, 0.28]]) g.circle(cx + fx * s, cy + fy * s, s * 0.05, '#5a3a20');
    ttlDots(g, sp, cx, cy, s, '#ffffff');
  } else {
    // Stand-in for the world obstacles that come with their themes.
    g.rrect(x, y, s, s, s * 0.18, SPECIAL_COLORS[kind] || '#a3b1c9');
    g.rrect(x + s * 0.12, y + s * 0.09, s * 0.76, s * 0.2, s * 0.1, 'rgba(255,255,255,0.3)');
    if (cracked) crack(g, cx, cy, s);
  }
  g.alpha = a0;
}
