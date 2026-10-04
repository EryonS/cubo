// Cubo Blocks — Season event backgrounds (legacy themes/). Static backgrounds (paint, recorded once) and per-frame decor (animate).
// Ported from the canvas code through the Ctx wrapper, call for call.
import type { Ctx } from '../ctx2d';
import { hills, loop, seeded, vGradient, type Animate, type Paint } from './util';

const newyearPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#05071c', '#141a4a', '#3a2466']); g.fillRect(0, 0, w, h);
    const rnd = seeded(2027);
    g.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) { g.globalAlpha = 0.2 + rnd() * 0.6; g.fillRect(rnd() * w, rnd() * h * 0.6, 1.5, 1.5); }
    g.globalAlpha = 1;
    // Skyline: buildings with lit windows, a clock tower in the middle at five to midnight.
    const ground = h * 0.86;
    let x = -10;
    while (x < w) {
      const bw = 26 + rnd() * 44;
      const bh = h * (0.08 + rnd() * 0.16);
      g.fillStyle = rnd() < 0.5 ? '#0a0d26' : '#10143a';
      g.fillRect(x, ground - bh, bw, bh + h);
      g.fillStyle = 'rgba(255,214,120,0.85)';
      for (let wy = ground - bh + 6; wy < ground - 6; wy += 10) for (let wx = x + 5; wx < x + bw - 6; wx += 9) if (rnd() < 0.35) g.fillRect(wx, wy, 4, 5);
      x += bw + 2;
    }
    const tx = w * 0.5, tw = Math.min(46, w * 0.12), th2 = h * 0.3;
    g.fillStyle = '#0a0d26';
    g.fillRect(tx - tw / 2, ground - th2, tw, th2 + h);
    g.beginPath(); g.moveTo(tx - tw / 2 - 4, ground - th2); g.lineTo(tx, ground - th2 - tw * 0.9); g.lineTo(tx + tw / 2 + 4, ground - th2); g.fill();
    const cr = tw * 0.36, cy = ground - th2 + tw * 0.55;
    g.fillStyle = '#fff3c4';
    g.beginPath(); g.arc(tx, cy, cr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1440'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(tx, cy); g.lineTo(tx, cy - cr * 0.8); g.moveTo(tx, cy); g.lineTo(tx - cr * 0.25, cy - cr * 0.55); g.stroke();
    g.fillStyle = '#05071c'; g.fillRect(0, ground, w, h - ground);
};

const newyearAnimate = (g: Ctx, w: number, h: number, t: number) => {
    // Fireworks: each one rises, bursts into a ring of sparks, then fades; staggered loops.
    // They burst in the open sky above the board.
    const COLORS = ['#ffd23f', '#ff5d8f', '#5ce1ff', '#9be36b', '#c77dff', '#ff9f43'];
    for (let i = 0; i < 7; i++) {
      const period = 2200 + i * 330;
      const k = ((t + i * 761) % period) / period;
      const rnd = seeded(31 + i * 7 + Math.floor((t + i * 761) / period));
      const fx = w * (0.08 + rnd() * 0.84);
      const fy = h * (0.03 + rnd() * 0.18);
      const col = COLORS[Math.floor(rnd() * COLORS.length)];
      const col2 = COLORS[Math.floor(rnd() * COLORS.length)];
      const size = Math.min(w, h) * (0.1 + rnd() * 0.08);
      if (k < 0.2) {
        const p = k / 0.2;
        const y = h * 0.86 - (h * 0.86 - fy) * (1 - (1 - p) * (1 - p));
        g.fillStyle = 'rgba(255,240,200,0.9)';
        g.fillRect(fx - 1, y, 2, 8);
      } else {
        const p = (k - 0.2) / 0.8;
        const r = size * (1 - (1 - p) * (1 - p));
        const drop = p * p * 22;
        g.globalAlpha = Math.max(0, 1 - p * p);
        if (p < 0.12) {
          // Flash at the center.
          g.fillStyle = 'rgba(255,255,240,0.8)';
          g.beginPath(); g.arc(fx, fy, size * 0.3 * (1 - p / 0.12), 0, Math.PI * 2); g.fill();
        }
        for (const [ring, c, n] of [[1, col, 22], [0.55, col2, 12]] as [number, string, number][]) {
          g.fillStyle = c;
          g.strokeStyle = c; g.lineWidth = 1.2;
          for (let a = 0; a < n; a++) {
            const ang = (a / n) * Math.PI * 2 + ring;
            const px = fx + Math.cos(ang) * r * ring, py = fy + Math.sin(ang) * r * ring + drop;
            g.beginPath(); g.moveTo(fx + Math.cos(ang) * r * ring * 0.7, fy + Math.sin(ang) * r * ring * 0.7 + drop * 0.7); g.lineTo(px, py); g.stroke();
            g.beginPath(); g.arc(px, py, 2, 0, Math.PI * 2); g.fill();
          }
        }
        g.globalAlpha = 1;
      }
    }
};

const lunarPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#1e0408', '#4a0a12', '#7a1418']); g.fillRect(0, 0, w, h);
    const r = Math.min(w, h) * 0.12;
    const halo = g.createRadialGradient(w * 0.78, h * 0.16, r * 0.6, w * 0.78, h * 0.16, r * 2.4);
    halo.addColorStop(0, 'rgba(255,200,90,0.35)'); halo.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = halo; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd88a';
    g.beginPath(); g.arc(w * 0.78, h * 0.16, r, 0, Math.PI * 2); g.fill();
    // Golden cloud swirls.
    g.strokeStyle = 'rgba(255,201,74,0.35)'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (const [xf, yf, sc] of [[0.15, 0.3, 1], [0.6, 0.42, 0.8], [0.88, 0.62, 0.9], [0.1, 0.7, 0.7]]) {
      const cx = w * xf, cy = h * yf, R = 14 * sc;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + k * R * 1.4, cy, R, Math.PI, Math.PI * 2.4); g.stroke(); }
    }
    // Plum blossom branch from the left edge.
    g.strokeStyle = '#2a0a08'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-5, h * 0.9); g.quadraticCurveTo(w * 0.18, h * 0.84, w * 0.3, h * 0.88); g.moveTo(w * 0.14, h * 0.86); g.lineTo(w * 0.2, h * 0.8); g.stroke();
    g.fillStyle = '#ffb3c7';
    for (const [x, y] of [[0.08, 0.875], [0.2, 0.8], [0.26, 0.875], [0.16, 0.85], [0.3, 0.885]]) {
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(w * x + Math.cos(k * 1.26) * 3.5, h * y + Math.sin(k * 1.26) * 3.5, 2.8, 0, Math.PI * 2); g.fill(); }
    }
};

const lunarAnimate = (g: Ctx, w: number, h: number, t: number) => {
    // A string of lanterns across the top, swaying.
    g.strokeStyle = 'rgba(255,201,74,0.6)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, h * 0.05); g.quadraticCurveTo(w / 2, h * 0.11, w, h * 0.05); g.stroke();
    for (let i = 0; i < 6; i++) {
      const x = w * (0.08 + i * 0.168);
      const top = h * 0.05 + Math.sin((x / w) * Math.PI) * h * 0.045;
      const sw = Math.sin(t / 700 + i) * 0.08;
      g.save(); g.translate(x, top); g.rotate(sw);
      g.fillStyle = '#e8364a';
      g.beginPath(); g.ellipse(0, 16, 11, 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffc94a'; g.fillRect(-6, 4, 12, 3); g.fillRect(-6, 25, 12, 3);
      g.strokeStyle = '#ffc94a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 4); g.moveTo(0, 28); g.lineTo(0, 34); g.stroke();
      g.restore();
    }
    // Sky lanterns drifting up.
    for (let i = 0; i < 5; i++) {
      const rnd = seeded(88 + i);
      const x = w * (0.1 + rnd() * 0.8) + Math.sin(t / 1200 + i) * 10;
      const y = h - loop(t * (0.012 + rnd() * 0.01) + rnd() * h, h + 40, 20);
      g.globalAlpha = 0.55 * Math.min(1, y / (h * 0.3));
      g.fillStyle = '#ffb347';
      g.beginPath(); g.moveTo(x - 5, y - 6); g.lineTo(x + 5, y - 6); g.lineTo(x + 4, y + 6); g.lineTo(x - 4, y + 6); g.fill();
      g.fillStyle = 'rgba(255,240,180,0.9)'; g.beginPath(); g.arc(x, y + 4, 1.6, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
};

const valentinePaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#ffd6e2', '#ffb0c8', '#e48ad0']); g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.5, h * 0.9, 0, w * 0.5, h * 0.9, w * 0.7);
    sun.addColorStop(0, 'rgba(255,240,200,0.7)'); sun.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = sun; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [xf, yf, sc] of [[0.15, 0.12, 1], [0.75, 0.2, 0.8], [0.4, 0.06, 0.6], [0.9, 0.6, 0.7], [0.05, 0.55, 0.8]]) {
      const cx = w * xf, cy = h * yf;
      g.beginPath(); g.arc(cx, cy, 20 * sc, 0, Math.PI * 2); g.arc(cx + 24 * sc, cy - 8 * sc, 24 * sc, 0, Math.PI * 2); g.arc(cx + 50 * sc, cy, 18 * sc, 0, Math.PI * 2); g.fill();
    }
};

const valentineAnimate = (g: Ctx, w: number, h: number, t: number) => {
    for (let i = 0; i < 9; i++) {
      const rnd = seeded(14 + i);
      const sz = 7 + rnd() * 9;
      const x = w * rnd() + Math.sin(t / 900 + i) * 14;
      const y = h - loop(t * (0.02 + rnd() * 0.02) + rnd() * h, h + 40, 20);
      g.globalAlpha = 0.35 + 0.3 * rnd();
      g.fillStyle = ['#ff4d6d', '#ffffff', '#ff8fab'][i % 3];
      g.beginPath();
      g.moveTo(x, y + sz * 0.7);
      g.bezierCurveTo(x - sz, y, x - sz * 0.6, y - sz * 0.8, x, y - sz * 0.3);
      g.bezierCurveTo(x + sz * 0.6, y - sz * 0.8, x + sz, y, x, y + sz * 0.7);
      g.fill();
    }
    g.globalAlpha = 1;
};

const easterPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#a8e0ff', '#e6f7ff']); g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3a8';
    g.beginPath(); g.arc(w * 0.85, h * 0.1, Math.min(w, h) * 0.07, 0, Math.PI * 2); g.fill();
    hills(g, w, h, h * 0.8, h * 0.035, '#a8e07a', 0.7);
    hills(g, w, h, h * 0.88, h * 0.03, '#7cc95a', 2.1, 1.3);
    const rnd = seeded(404);
    for (let i = 0; i < 30; i++) {
      const fx = rnd() * w, fy = h * (0.84 + rnd() * 0.15);
      g.fillStyle = ['#ffffff', '#ffd23f', '#ff8fb8', '#c7a6ff'][i % 4];
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(fx + Math.cos(k * 1.26) * 3, fy + Math.sin(k * 1.26) * 3, 2.4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffb000'; g.beginPath(); g.arc(fx, fy, 1.6, 0, Math.PI * 2); g.fill();
    }
    for (const [xf, col] of [[0.18, "#ff8fb8"], [0.62, "#6ea8ff"], [0.9, "#ffd23f"]] as [number, string][]) {
      const ex = w * xf, ey = h * 0.93;
      g.fillStyle = col;
      g.beginPath(); g.ellipse(ex, ey, 8, 11, 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(ex - 8, ey - 2, 16, 3);
    }
};

const easterAnimate = (g: Ctx, w: number, h: number, t: number) => {
    for (let i = 0; i < 3; i++) {
      const x = loop(t * (0.02 + i * 0.008) + i * 160, w, 30);
      const y = h * (0.25 + i * 0.15) + Math.sin(t / 400 + i * 2) * 20;
      const flap = Math.abs(Math.sin(t / 90 + i));
      g.fillStyle = ['#ff8fb8', '#ffd23f', '#c7a6ff'][i];
      for (const d of [-1, 1]) { g.beginPath(); g.ellipse(x + d * 5 * flap, y, 6 * flap + 1, 8, d * 0.4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#3a2a1a'; g.fillRect(x - 1, y - 6, 2, 12);
    }
};

const beachPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#4fc3f7', '#b8ecff']); g.fillRect(0, 0, w, h * 0.72);
    g.fillStyle = '#ffe066';
    g.beginPath(); g.arc(w * 0.18, h * 0.1, Math.min(w, h) * 0.08, 0, Math.PI * 2); g.fill();
    g.fillStyle = vGradient(g, h, ['#1fa2d6', '#1fa2d6', '#0d7fb0']);
    g.fillRect(0, h * 0.68, w, h * 0.12);
    g.fillStyle = '#f7dca0';
    g.beginPath(); g.moveTo(0, h * 0.8); g.quadraticCurveTo(w * 0.5, h * 0.76, w, h * 0.8); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    // Palm tree on the right.
    const px = w * 0.97, py = h * 0.92;
    g.strokeStyle = '#a0682f'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - 18, h * 0.75, px - 6, h * 0.6); g.stroke();
    g.fillStyle = '#2f9e44';
    for (const a of [-2.6, -2, -1.2, -0.6, 0]) {
      g.save(); g.translate(px - 6, h * 0.6); g.rotate(a);
      g.beginPath(); g.ellipse(26, 0, 30, 7, 0.25, 0, Math.PI * 2); g.fill(); g.restore();
    }
    g.fillStyle = '#ff8fab';
    g.beginPath(); g.arc(w * 0.12, h * 0.95, 6, Math.PI, 0); g.fill();
};

const beachAnimate = (g: Ctx, w: number, h: number, t: number) => {
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let row = 0; row < 3; row++) {
      const y = h * (0.7 + row * 0.035);
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin(x / 26 + t / 500 + row * 2) * 3;
        if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
      }
      g.stroke();
    }
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const x = loop(t * (0.03 + i * 0.01) + i * 200, w, 30);
      const y = h * (0.2 + i * 0.12) + Math.sin(t / 600 + i) * 10;
      const f = Math.sin(t / 120 + i) * 4;
      g.beginPath(); g.moveTo(x - 10, y - f); g.quadraticCurveTo(x - 5, y - 6, x, y); g.quadraticCurveTo(x + 5, y - 6, x + 10, y - f); g.stroke();
    }
};

const xmasPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#07152a', '#13314f', '#2a4f73']); g.fillRect(0, 0, w, h);
    const rnd = seeded(1225);
    g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2 + rnd() * 0.5; g.fillRect(rnd() * w, rnd() * h * 0.5, 1.5, 1.5); }
    g.globalAlpha = 1;
    g.fillStyle = '#f2f8ff';
    g.beginPath(); g.arc(w * 0.82, h * 0.1, Math.min(w, h) * 0.06, 0, Math.PI * 2); g.fill();
    hills(g, w, h, h * 0.82, h * 0.03, '#9fbad3', 0.8);
    // Fir trees.
    const fir = (fx: number, fy: number, sz: number, col: string) => {
      g.fillStyle = col;
      for (let k = 0; k < 3; k++) {
        const yy = fy - k * sz * 0.45;
        g.beginPath(); g.moveTo(fx - sz * (0.55 - k * 0.12), yy); g.lineTo(fx, yy - sz * 0.6); g.lineTo(fx + sz * (0.55 - k * 0.12), yy); g.fill();
      }
    };
    fir(w * 0.08, h * 0.86, 40, '#1f5a44'); fir(w * 0.22, h * 0.84, 28, '#2a6e54'); fir(w * 0.95, h * 0.85, 34, '#1f5a44');
    hills(g, w, h, h * 0.9, h * 0.02, '#c6d9ea', 1.9, 0.6);
    // The big tree, star on top.
    fir(w * 0.7, h * 0.92, 60, '#2f7a4a');
    g.fillStyle = '#ffd23f';
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const r = k % 2 ? 4 : 10; g.lineTo(w * 0.7 + Math.cos(a) * r, h * 0.92 - 60 * 1.5 + Math.sin(a) * r); }
    g.fill();
};

const xmasAnimate = (g: Ctx, w: number, h: number, t: number) => {
    // Lights on the big tree.
    const rnd = seeded(77);
    for (let i = 0; i < 12; i++) {
      const k = rnd();
      const yy = h * 0.92 - 8 - k * 80;
      const span = (1 - k) * 30;
      const xx = w * 0.7 + (rnd() * 2 - 1) * span;
      const on = Math.sin(t / 300 + i * 1.7) > -0.2;
      g.fillStyle = on ? ['#ff5d6a', '#ffd23f', '#5ce1ff', '#9be36b'][i % 4] : 'rgba(255,255,255,0.2)';
      g.beginPath(); g.arc(xx, yy, 2.6, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 40; i++) {
      const r2 = seeded(500 + i);
      const sp = 0.02 + r2() * 0.03;
      const x = loop(r2() * w + Math.sin(t / 1000 + i) * 20, w, 5);
      const y = loop(r2() * h + t * sp, h, 5);
      g.beginPath(); g.arc(x, y, 1 + r2() * 2, 0, Math.PI * 2); g.fill();
    }
};

const halloweenPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#0d0618', '#2a1240', '#4a1f4a']); g.fillRect(0, 0, w, h);
    const rnd = seeded(31);
    g.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) { g.globalAlpha = 0.15 + rnd() * 0.5; g.fillRect(rnd() * w, rnd() * h * 0.6, 1.5, 1.5); }
    g.globalAlpha = 1;
    const r = Math.min(w, h) * 0.13;
    const mx = w * 0.8, my = h * 0.14;
    const halo = g.createRadialGradient(mx, my, r * 0.8, mx, my, r * 2.6);
    halo.addColorStop(0, 'rgba(255,220,150,0.35)'); halo.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = halo; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe6a8';
    g.beginPath(); g.arc(mx, my, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(200,160,90,0.35)';
    for (const [fx, fy, fr] of [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.15], [-0.1, 0.35, 0.1]]) { g.beginPath(); g.arc(mx + fx * r, my + fy * r, fr * r, 0, Math.PI * 2); g.fill(); }
    // Hill, crooked tree, pumpkins.
    g.fillStyle = '#0d0618';
    g.beginPath(); g.moveTo(-10, h); g.quadraticCurveTo(w * 0.3, h * 0.8, w * 0.62, h * 0.88); g.quadraticCurveTo(w * 0.85, h * 0.93, w + 10, h * 0.86); g.lineTo(w + 10, h); g.fill();
    g.strokeStyle = '#0d0618'; g.lineCap = 'round';
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(w * 0.14, h * 0.86); g.quadraticCurveTo(w * 0.12, h * 0.76, w * 0.17, h * 0.68); g.stroke();
    g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(w * 0.165, h * 0.72); g.quadraticCurveTo(w * 0.24, h * 0.69, w * 0.27, h * 0.64);
    g.moveTo(w * 0.155, h * 0.75); g.quadraticCurveTo(w * 0.09, h * 0.72, w * 0.06, h * 0.67);
    g.moveTo(w * 0.17, h * 0.68); g.lineTo(w * 0.2, h * 0.63); g.stroke();
    for (const [px, py, pr] of [[w * 0.5, h * 0.86, 13], [w * 0.57, h * 0.875, 9], [w * 0.88, h * 0.885, 11]]) {
      g.fillStyle = '#ff8a1a';
      g.beginPath(); g.ellipse(px, py, pr * 1.2, pr, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a8a2a'; g.fillRect(px - 1.5, py - pr - 4, 3, 5);
      g.fillStyle = '#ffe066';
      g.beginPath(); g.moveTo(px - pr * 0.5, py - pr * 0.2); g.lineTo(px - pr * 0.25, py - pr * 0.45); g.lineTo(px - pr * 0.05, py - pr * 0.2); g.fill();
      g.beginPath(); g.moveTo(px + pr * 0.05, py - pr * 0.2); g.lineTo(px + pr * 0.25, py - pr * 0.45); g.lineTo(px + pr * 0.5, py - pr * 0.2); g.fill();
      g.beginPath(); g.moveTo(px - pr * 0.5, py + pr * 0.15); g.quadraticCurveTo(px, py + pr * 0.6, px + pr * 0.5, py + pr * 0.15); g.quadraticCurveTo(px, py + pr * 0.35, px - pr * 0.5, py + pr * 0.15); g.fill();
    }
};

const halloweenAnimate = (g: Ctx, w: number, h: number, t: number) => {
    // Bats flapping across the sky.
    g.fillStyle = '#0d0618';
    for (let i = 0; i < 4; i++) {
      const span = w + 80;
      const x = ((t * (0.025 + i * 0.006) + i * 211) % span) - 40;
      const y = h * (0.12 + i * 0.09) + Math.sin(t / 500 + i * 2) * 14;
      const flap = Math.sin(t / 70 + i) * 0.8;
      const sz = 9 + i * 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x - sz * 0.6, y - sz * flap, x - sz * 1.4, y - sz * 0.2 * flap);
      g.quadraticCurveTo(x - sz * 0.8, y + sz * 0.2, x, y + sz * 0.25);
      g.quadraticCurveTo(x + sz * 0.8, y + sz * 0.2, x + sz * 1.4, y - sz * 0.2 * flap);
      g.quadraticCurveTo(x + sz * 0.6, y - sz * flap, x, y);
      g.fill();
    }
};

export const EVENT_DECOR: Record<string, { paint?: Paint; animate?: Animate }> = {
  newyear: { paint: newyearPaint, animate: newyearAnimate },
  lunar: { paint: lunarPaint, animate: lunarAnimate },
  valentine: { paint: valentinePaint, animate: valentineAnimate },
  easter: { paint: easterPaint, animate: easterAnimate },
  beach: { paint: beachPaint, animate: beachAnimate },
  xmas: { paint: xmasPaint, animate: xmasAnimate },
  halloween: { paint: halloweenPaint, animate: halloweenAnimate },
};
