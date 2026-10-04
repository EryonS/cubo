// Cubo Blocks — Special cells (obstacles) drawn on the canvas: every kind of KINDS in core/logic.ts
// (legacy game/cells.js drawSpecial), written against the Ctx canvas-2D wrapper, call for call.
import { L } from '../core';
import type { Special } from '../core/types';
import { Ctx } from './ctx2d';
import type { G } from './g';

export const SPECIAL_COLORS: Record<string, string> = { ice: '#9fdcf7', asteroid: '#8a8fa3', rock: '#6b5a52', mushroom: '#e84a4a', ember: '#ff6a1a', bubble: '#7fd8ff', crate: '#c98b4a', boss: '#ffffff',
  pumpkin: '#ff8a1a', ghost: '#f4f0ff', present: '#e8364a', snowpile: '#ffffff', heart: '#ff4d6d', rose: '#d6204a',
  bush: '#4fae4a', egg: '#ffd23f', water: '#4fc3f7', crab: '#ff6a4a', rocket: '#ffd23f',
  lantern: '#e8364a', firecracker: '#ff4d3d', mole: '#9a6a48', jelly: '#ff8fd0', hole: '#8a5cff', snowman: '#ffffff', vine: '#4fb33f', glitch: '#ff3fd0', token: '#ffd23f', lava: '#ff5a1a' };

// Moves left before a cell with a ttl leaves (mole, hole, water): small dots around it.
function ttlDots(ctx: Ctx, sp: Special, cx: number, cy: number, s: number, color: string) {
  const ttl = L.KINDS[sp.kind].ttl || 0;
  const left = Math.max(0, ttl - (sp.age || 0));
  ctx.fillStyle = color;
  for (let k = 0; k < left; k++) {
    const a = Math.PI * 0.75 - (k / (ttl - 1 || 1)) * Math.PI * 0.5;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * s * 0.46, cy + Math.sin(a) * s * 0.46, s * 0.045, 0, Math.PI * 2); ctx.fill();
  }
}
const eyes = (ctx: Ctx, cx: number, cy: number, s: number, gap: number, r: number, color = '#2a1a12') => {
  ctx.fillStyle = color;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + d * gap * s, cy, r * s, 0, Math.PI * 2); ctx.fill(); }
};

function crack(ctx: Ctx, x: number, y: number, s: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.2, s * 0.05); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.28); ctx.lineTo(x - s * 0.05, y - s * 0.02); ctx.lineTo(x - s * 0.15, y + s * 0.2);
  ctx.moveTo(x - s * 0.05, y - s * 0.02); ctx.lineTo(x + s * 0.28, y + s * 0.05);
  ctx.stroke();
}

// Draws a special cell centered at (cx, cy). sp = { kind, hp, age }. t: animation clock (ms).
export function drawSpecial(gg: G, sp: Special, cx: number, cy: number, size: number, alpha = 1, scale = 1, t = 0) {
  const s = size * scale * 0.9;
  if (s <= 0.5) return;
  const x = cx - s / 2;
  const y = cy - s / 2;
  const kind = sp.kind;
  const cracked = sp.hp < (L.KINDS[kind] ? L.KINDS[kind].hp : 1);
  const ctx = new Ctx(gg);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (kind === 'ice') {
    const g = ctx.createLinearGradient(x, y, x + s, y + s);
    g.addColorStop(0, '#e9f8ff'); g.addColorStop(1, '#8fd3f5');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.18); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.roundRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.62); ctx.lineTo(x + s * 0.62, y + s * 0.2); ctx.lineTo(x + s * 0.72, y + s * 0.2); ctx.lineTo(x + s * 0.3, y + s * 0.62); ctx.fill();
    if (cracked) crack(ctx, cx, cy, s);
  } else if (kind === 'asteroid' || kind === 'rock') {
    const base = kind === 'rock' ? '#6b5a52' : '#8a8fa3';
    ctx.fillStyle = base;
    ctx.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const r = s * (0.44 + 0.05 * Math.sin(k * 2.7));
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (const [fx, fy, fr] of [[-0.14, -0.1, 0.1], [0.16, 0.08, 0.13], [-0.05, 0.22, 0.07]]) {
      ctx.beginPath(); ctx.arc(cx + fx * s, cy + fy * s, fr * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.arc(cx - s * 0.16, cy - s * 0.2, s * 0.08, 0, Math.PI * 2); ctx.fill();
    if (cracked) crack(ctx, cx, cy, s);
  } else if (kind === 'mushroom') {
    ctx.fillStyle = '#f2e6d0';
    ctx.beginPath(); ctx.roundRect(cx - s * 0.13, cy - s * 0.02, s * 0.26, s * 0.42, s * 0.08); ctx.fill();
    ctx.fillStyle = '#e84a4a';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.02, s * 0.44, s * 0.38, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const [fx, fy, fr] of [[-0.2, -0.12, 0.07], [0.12, -0.2, 0.09], [0.26, -0.04, 0.05]]) {
      ctx.beginPath(); ctx.arc(cx + fx * s, cy + fy * s, fr * s, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'ember') {
    const fuse = L.KINDS.ember.fuse || 1;
    const left = Math.max(0, fuse - (sp.age || 0));
    const flick = 0.8 + 0.2 * Math.sin(t / 90 + cx);
    ctx.shadowColor = '#ff4a00'; ctx.shadowBlur = s * 0.4 * flick;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.55);
    g.addColorStop(0, '#ffe066'); g.addColorStop(0.5, '#ff8a1a'); g.addColorStop(1, '#c2280a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.3); ctx.fill();
    ctx.shadowBlur = 0;
    // Fuse: dots for the moves left before it hardens.
    ctx.fillStyle = left <= 2 ? '#ffffff' : 'rgba(60,10,0,0.55)';
    for (let k = 0; k < Math.min(left, fuse); k++) {
      const a = -Math.PI / 2 + (k / fuse) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3, s * 0.045, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'crate') {
    ctx.fillStyle = '#c98b4a';
    ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.12); ctx.fill();
    ctx.strokeStyle = '#8a5526'; ctx.lineWidth = s * 0.08; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84, s * 0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.14, y + s * 0.86); ctx.lineTo(x + s * 0.86, y + s * 0.14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + s * 0.14, y + s * 0.12, s * 0.72, s * 0.08);
    if (cracked) crack(ctx, cx, cy, s);
  } else if (kind === 'bubble') {
    ctx.fillStyle = 'rgba(127,216,255,0.28)';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.28, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx + s * 0.16, cy - s * 0.18, s * 0.05, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'pumpkin') {
    ctx.fillStyle = '#e8701a';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.06, s * 0.44, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8a1a';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.06, s * 0.2, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4f9e33';
    ctx.beginPath(); ctx.roundRect(cx - s * 0.04, cy - s * 0.4, s * 0.08, s * 0.14, s * 0.03); ctx.fill();
    // Carved face, lit from inside.
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffb000'; ctx.shadowBlur = s * 0.15;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * s * 0.22, cy); ctx.lineTo(cx + d * s * 0.12, cy - s * 0.12); ctx.lineTo(cx + d * s * 0.04, cy); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(cx - s * 0.24, cy + s * 0.12); ctx.lineTo(cx - s * 0.12, cy + s * 0.2); ctx.lineTo(cx - s * 0.04, cy + s * 0.13); ctx.lineTo(cx + s * 0.04, cy + s * 0.2);
    ctx.lineTo(cx + s * 0.12, cy + s * 0.13); ctx.lineTo(cx + s * 0.24, cy + s * 0.12); ctx.quadraticCurveTo(cx, cy + s * 0.34, cx - s * 0.24, cy + s * 0.12); ctx.fill();
    ctx.shadowBlur = 0;
    if (cracked) crack(ctx, cx, cy, s);
  } else if (kind === 'ghost') {
    const bob = Math.sin(t / 300 + cx * 0.07) * s * 0.04;
    ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(244,240,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.34, cy + s * 0.36);
    ctx.lineTo(cx - s * 0.34, cy - s * 0.04);
    ctx.arc(cx, cy - s * 0.04, s * 0.34, Math.PI, 0);
    ctx.lineTo(cx + s * 0.34, cy + s * 0.36);
    for (let k = 1; k <= 4; k++) ctx.lineTo(cx + s * 0.34 - k * s * 0.17, cy + s * (k % 2 ? 0.26 : 0.36));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1a40';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + d * s * 0.12, cy - s * 0.06, s * 0.05, s * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.1, s * 0.05, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'present') {
    ctx.fillStyle = '#e8364a';
    ctx.beginPath(); ctx.roundRect(x + s * 0.06, y + s * 0.2, s * 0.88, s * 0.74, s * 0.1); ctx.fill();
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath(); ctx.roundRect(x + s * 0.02, y + s * 0.14, s * 0.96, s * 0.22, s * 0.08); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(cx - s * 0.07, y + s * 0.14, s * 0.14, s * 0.8);
    ctx.fillRect(x + s * 0.02, y + s * 0.2, s * 0.96, s * 0.1);
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + d * s * 0.14, y + s * 0.1, s * 0.15, s * 0.08, d * -0.5, 0, Math.PI * 2); ctx.fill(); }
    if (cracked) crack(ctx, cx, cy + s * 0.1, s);
  } else if (kind === 'snowpile') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.04, y + s * 0.92);
    ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.42, x + s * 0.36, y + s * 0.42);
    ctx.quadraticCurveTo(cx, y + s * 0.14, x + s * 0.66, y + s * 0.38);
    ctx.quadraticCurveTo(x + s * 0.94, y + s * 0.4, x + s * 0.96, y + s * 0.92);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d6ecfa';
    ctx.beginPath(); ctx.ellipse(cx, y + s * 0.86, s * 0.42, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x + s * 0.3, y + s * 0.56, s * 0.05, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'heart') {
    // Twins share a color (sp.link), so the pairs read at a glance.
    const col = ['#ff4d6d', '#c77dff', '#ff9f43', '#3fc1b0', '#5c8dff', '#ff7ad9', '#9be36b', '#ffd23f', '#a0522d'][(sp.link || 0) % 9];
    const beat = 1 + 0.05 * Math.sin(t / 220 + (sp.link || 0));
    ctx.translate(cx, cy); ctx.scale(beat, beat);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.38);
    ctx.bezierCurveTo(-s * 0.55, s * 0.02, -s * 0.36, -s * 0.42, 0, -s * 0.18);
    ctx.bezierCurveTo(s * 0.36, -s * 0.42, s * 0.55, s * 0.02, 0, s * 0.38);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-s * 0.17, -s * 0.12, s * 0.08, s * 0.05, -0.6, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'rose') {
    ctx.strokeStyle = '#3f8a3a'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.44); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.fillStyle = '#3f8a3a';
    ctx.beginPath(); ctx.ellipse(cx + s * 0.14, cy + s * 0.24, s * 0.12, s * 0.06, -0.5, 0, Math.PI * 2); ctx.fill();
    for (const [tx, ty, d] of [[0, 0.12, -1], [0, 0.32, 1]]) { ctx.beginPath(); ctx.moveTo(cx + tx * s, cy + ty * s); ctx.lineTo(cx + d * s * 0.1, cy + (ty - 0.04) * s); ctx.lineTo(cx, cy + (ty + 0.04) * s); ctx.fill(); }
    ctx.fillStyle = '#d6204a';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a0f2a'; ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.15, 0.4, Math.PI * 1.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + s * 0.02, cy - s * 0.12, s * 0.06, Math.PI, Math.PI * 2.6); ctx.stroke();
    if (cracked) crack(ctx, cx, cy - s * 0.1, s * 0.8);
  } else if (kind === 'bush') {
    ctx.fillStyle = '#3f9a3a';
    for (const [fx, fy, fr] of [[-0.2, 0.12, 0.24], [0.2, 0.12, 0.24], [0, -0.06, 0.28], [0, 0.2, 0.26]]) { ctx.beginPath(); ctx.arc(cx + fx * s, cy + fy * s, fr * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#5fc14a';
    for (const [fx, fy, fr] of [[-0.14, -0.04, 0.12], [0.12, -0.12, 0.1], [0.18, 0.12, 0.09]]) { ctx.beginPath(); ctx.arc(cx + fx * s, cy + fy * s, fr * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ff8fb8';
    for (const [fx, fy] of [[-0.22, 0.2], [0.08, 0.04], [0.26, -0.06]]) { ctx.beginPath(); ctx.arc(cx + fx * s, cy + fy * s, s * 0.035, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'egg') {
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.04, s * 0.3, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#ff8fb8'; ctx.fillRect(cx - s * 0.4, cy - s * 0.08, s * 0.8, s * 0.1);
    ctx.fillStyle = '#6ea8ff'; ctx.fillRect(cx - s * 0.4, cy + s * 0.12, s * 0.8, s * 0.08);
    ctx.fillStyle = '#6fd6a0';
    for (const fx of [-0.16, 0, 0.16]) { ctx.beginPath(); ctx.arc(cx + fx * s, cy - s * 0.2, s * 0.04, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.12, cy - s * 0.16, s * 0.05, s * 0.09, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'water') {
    const g = ctx.createLinearGradient(cx, y, cx, y + s);
    g.addColorStop(0, 'rgba(120,220,255,0.9)'); g.addColorStop(1, 'rgba(30,140,220,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    const ph = t / 300 + cx * 0.05;
    for (const fy of [0.32, 0.62]) {
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) { const px = x + s * (0.12 + k * 0.095); const py = y + s * fy + Math.sin(ph + k * 1.2) * s * 0.04; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
    }
    // Moves left before the sea goes back out.
    ttlDots(ctx, sp, cx, cy, s, '#ffffff');
  } else if (kind === 'crab') {
    const step = Math.sin(t / 160 + cx) * s * 0.02;
    ctx.strokeStyle = '#d9472a'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    for (const d of [-1, 1]) for (const k of [0, 1, 2]) {
      ctx.beginPath(); ctx.moveTo(cx + d * s * 0.2, cy + s * (0.08 + k * 0.08)); ctx.lineTo(cx + d * s * 0.4, cy + s * (0.16 + k * 0.1) + (k % 2 ? step : -step)); ctx.stroke();
    }
    ctx.fillStyle = '#ff6a4a';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.1, s * 0.3, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.arc(cx + d * s * 0.34, cy - s * 0.14, s * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe6dc';
      ctx.beginPath(); ctx.moveTo(cx + d * s * 0.34, cy - s * 0.14); ctx.lineTo(cx + d * s * 0.46, cy - s * 0.24); ctx.lineTo(cx + d * s * 0.42, cy - s * 0.08); ctx.fill();
      ctx.fillStyle = '#ff6a4a';
    }
    ctx.strokeStyle = '#d9472a'; ctx.lineWidth = s * 0.04;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * s * 0.08, cy - s * 0.04); ctx.lineTo(cx + d * s * 0.1, cy - s * 0.16); ctx.stroke(); }
    ctx.fillStyle = '#ffffff';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + d * s * 0.1, cy - s * 0.18, s * 0.055, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#1a1a2a';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + d * s * 0.1, cy - s * 0.18, s * 0.028, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'lantern') {
    const glow = 0.8 + 0.2 * Math.sin(t / 260 + cx);
    ctx.shadowColor = '#ffb000'; ctx.shadowBlur = s * 0.35 * glow;
    ctx.fillStyle = '#e8364a';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.02, s * 0.38, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(120,10,20,0.45)'; ctx.lineWidth = s * 0.03;
    for (const k of [-0.18, 0, 0.18]) { ctx.beginPath(); ctx.ellipse(cx + k * s * 0.3, cy + s * 0.02, s * Math.max(0.04, 0.3 - Math.abs(k) * 0.8), s * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(cx - s * 0.18, cy - s * 0.34, s * 0.36, s * 0.08);
    ctx.fillRect(cx - s * 0.18, cy + s * 0.3, s * 0.36, s * 0.08);
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = s * 0.03;
    for (const k of [-0.08, 0, 0.08]) { ctx.beginPath(); ctx.moveTo(cx + k * s, cy + s * 0.38); ctx.lineTo(cx + k * s * 1.3, cy + s * 0.48); ctx.stroke(); }
    ctx.fillStyle = `rgba(255,220,120,${0.35 * glow})`;
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.02, s * 0.16, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'firecracker') {
    const fuse = L.KINDS.firecracker.fuse || 1;
    const left = Math.max(0, fuse - (sp.age || 0));
    ctx.translate(cx, cy); ctx.rotate(-0.35);
    ctx.fillStyle = '#ff4d3d';
    ctx.beginPath(); ctx.roundRect(-s * 0.15, -s * 0.3, s * 0.3, s * 0.62, s * 0.06); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-s * 0.15, -s * 0.22, s * 0.3, s * 0.06); ctx.fillRect(-s * 0.15, s * 0.18, s * 0.3, s * 0.06);
    ctx.strokeStyle = '#6b3a1a'; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.quadraticCurveTo(s * 0.08, -s * 0.4, s * 0.02, -s * 0.46); ctx.stroke();
    if (left <= 2) {
      // About to harden: the fuse sparks.
      ctx.fillStyle = Math.floor(t / 120) % 2 ? '#ffe066' : '#ffffff';
      ctx.beginPath(); ctx.arc(s * 0.02, -s * 0.47, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    ctx.rotate(0.35);
    ctx.fillStyle = left <= 2 ? '#ffffff' : 'rgba(255,255,255,0.75)';
    for (let k = 0; k < left; k++) { ctx.beginPath(); ctx.arc(-s * 0.3 + k * s * 0.11, s * 0.42, s * 0.035, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'rocket') {
    const wob = Math.sin(t / 140 + cx) * 0.06;
    ctx.translate(cx, cy); ctx.rotate(wob);
    // Sparks under the nozzle.
    ctx.fillStyle = '#ffd23f';
    for (let k = 0; k < 3; k++) { const a = (t / 90 + k * 2.1) % 1; ctx.globalAlpha = alpha * (1 - a); ctx.beginPath(); ctx.arc((k - 1) * s * 0.07, s * (0.36 + a * 0.12), s * 0.04, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#5c8dff';
    ctx.beginPath(); ctx.roundRect(-s * 0.13, -s * 0.18, s * 0.26, s * 0.5, s * 0.06); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-s * 0.13, s * 0.02, s * 0.26, s * 0.07);
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * 0.18); ctx.lineTo(0, -s * 0.44); ctx.lineTo(s * 0.15, -s * 0.18); ctx.fill();
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * s * 0.13, s * 0.14); ctx.lineTo(d * s * 0.26, s * 0.34); ctx.lineTo(d * s * 0.13, s * 0.32); ctx.fill(); }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(0, -s * 0.06, s * 0.06, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'mole') {
    // Dirt mound with the mole peeking out.
    ctx.fillStyle = '#7a4e2c';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.3, s * 0.46, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a6a48';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.04, s * 0.3, s * 0.32, 0, Math.PI, 0); ctx.lineTo(cx + s * 0.3, cy + s * 0.3); ctx.lineTo(cx - s * 0.3, cy + s * 0.3); ctx.fill();
    ctx.fillStyle = '#c99a78';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.12, s * 0.16, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8fa8';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.06, s * 0.065, 0, Math.PI * 2); ctx.fill();
    eyes(ctx, cx, cy - s * 0.1, s, 0.12, 0.045);
    ctx.fillStyle = '#5a3a20';
    for (const [fx, fy] of [[-0.3, 0.32], [0.08, 0.38], [0.34, 0.28]]) { ctx.beginPath(); ctx.arc(cx + fx * s, cy + fy * s, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
    ttlDots(ctx, sp, cx, cy, s, '#ffffff');
  } else if (kind === 'jelly') {
    const sway = Math.sin(t / 260 + cx * 0.05);
    ctx.strokeStyle = 'rgba(255,143,208,0.85)'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    for (const fx of [-0.2, -0.07, 0.07, 0.2]) {
      ctx.beginPath(); ctx.moveTo(cx + fx * s, cy);
      ctx.quadraticCurveTo(cx + fx * s + sway * s * 0.1, cy + s * 0.22, cx + fx * s - sway * s * 0.06, cy + s * 0.42); ctx.stroke();
    }
    const g = ctx.createLinearGradient(cx, cy - s * 0.4, cx, cy + s * 0.05);
    g.addColorStop(0, '#ffc2e6'); g.addColorStop(1, '#ff7cc4');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.04, s * 0.4, s * 0.42, 0, Math.PI, 0);
    for (let k = 0; k <= 4; k++) ctx.lineTo(cx + s * 0.4 - (k * s * 0.8) / 4, cy + s * (k % 2 ? 0.1 : 0.04));
    ctx.fill();
    eyes(ctx, cx, cy - s * 0.1, s, 0.12, 0.045, '#7a1a50');
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.18, cy - s * 0.24, s * 0.08, s * 0.05, -0.6, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'hole') {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
    g.addColorStop(0, '#000000'); g.addColorStop(0.55, '#1a0a3a'); g.addColorStop(1, '#8a5cff');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2); ctx.fill();
    // Swirl arms turning in.
    ctx.strokeStyle = 'rgba(200,170,255,0.75)'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    const spin = t / 500;
    for (let k = 0; k < 3; k++) {
      const a = spin + (k * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, a, a + 1.3); ctx.stroke();
    }
    ttlDots(ctx, sp, cx, cy, s, '#e0d0ff');
  } else if (kind === 'snowman') {
    // One snowball per hp left: 3 stacked, melting down.
    const balls = [[0.26, 0.2], [0.04, 0.15], [-0.18, 0.12]].slice(0, Math.max(1, sp.hp));
    const top = balls[balls.length - 1];
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#b8dcf0'; ctx.lineWidth = s * 0.04;
    for (const [fy, fr] of balls) { ctx.beginPath(); ctx.arc(cx, cy + fy * s, fr * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    eyes(ctx, cx, cy + top[0] * s - s * 0.03, s, 0.05, 0.025, '#1a1a2a');
    ctx.fillStyle = '#ff8a1a';
    ctx.beginPath(); ctx.moveTo(cx, cy + top[0] * s + s * 0.01); ctx.lineTo(cx + s * 0.14, cy + top[0] * s + s * 0.035); ctx.lineTo(cx, cy + top[0] * s + s * 0.06); ctx.fill();
    if (sp.hp >= 2) {
      ctx.fillStyle = '#1a1a2a';
      for (const fy of [0.0, 0.08]) { ctx.beginPath(); ctx.arc(cx, cy + (balls[1][0] + fy - 0.04) * s, s * 0.02, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (kind === 'vine') {
    ctx.fillStyle = '#2f7a2a';
    ctx.beginPath(); ctx.roundRect(x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92, s * 0.3); ctx.fill();
    ctx.strokeStyle = '#8fd65a'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.32, cy + s * 0.3); ctx.bezierCurveTo(cx - s * 0.1, cy - s * 0.1, cx + s * 0.25, cy + s * 0.15, cx + s * 0.28, cy - s * 0.3); ctx.stroke();
    ctx.fillStyle = '#6fc14a';
    for (const [fx, fy, a] of [[-0.18, 0.02, -0.8], [0.12, 0.06, 0.6], [0.2, -0.18, -0.4]]) {
      ctx.save(); ctx.translate(cx + fx * s, cy + fy * s); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.12, s * 0.06, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  } else if (kind === 'glitch') {
    // Offset color channels that jitter now and then.
    const jit = Math.floor(t / 90 + cx) % 7 === 0 ? s * 0.06 : s * 0.025;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,240,255,0.85)';
    ctx.fillRect(x + s * 0.1 - jit, y + s * 0.1, s * 0.8, s * 0.8);
    ctx.fillStyle = 'rgba(255,40,200,0.85)';
    ctx.fillRect(x + s * 0.1 + jit, y + s * 0.1, s * 0.8, s * 0.8);
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72);
    ctx.fillStyle = '#ffffff';
    const px = s * 0.12;
    for (const [gx, gy] of [[1, 1], [4, 1], [2, 3], [3, 3], [1, 4], [4, 4]]) ctx.fillRect(x + s * 0.14 + gx * px - px * 0.5, y + s * 0.14 + gy * px - px * 0.3, px, px * 0.6);
  } else if (kind === 'token') {
    const g = ctx.createRadialGradient(cx - s * 0.12, cy - s * 0.12, 0, cx, cy, s * 0.5);
    g.addColorStop(0, '#fff3a0'); g.addColorStop(0.6, '#ffd23f'); g.addColorStop(1, '#d99a10');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b07a08'; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2); ctx.stroke();
    // Clock hands: a token buys time.
    ctx.lineCap = 'round'; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.18); ctx.lineTo(cx, cy); ctx.lineTo(cx + s * 0.13, cy + s * 0.07); ctx.stroke();
    if (cracked) crack(ctx, cx, cy, s);
  } else if (kind === 'lava') {
    const pulse = 0.85 + 0.15 * Math.sin(t / 200 + cy);
    ctx.shadowColor = '#ff4a00'; ctx.shadowBlur = s * 0.35 * pulse;
    const g = ctx.createLinearGradient(cx, y, cx, y + s);
    g.addColorStop(0, '#ffd24a'); g.addColorStop(0.5, '#ff6a1a'); g.addColorStop(1, '#c2280a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y + s * 0.2);
    ctx.quadraticCurveTo(cx, y - s * 0.04, x + s * 0.9, y + s * 0.2);
    ctx.lineTo(x + s * 0.92, y + s * 0.78);
    ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.98, x + s * 0.68, y + s * 0.8);
    ctx.quadraticCurveTo(x + s * 0.55, y + s * 1.04, x + s * 0.4, y + s * 0.82);
    ctx.quadraticCurveTo(x + s * 0.24, y + s * 0.96, x + s * 0.08, y + s * 0.78);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,240,180,0.7)';
    ctx.beginPath(); ctx.arc(cx - s * 0.16, cy - s * 0.12, s * 0.07, 0, Math.PI * 2); ctx.arc(cx + s * 0.14, cy + s * 0.06, s * 0.05, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
