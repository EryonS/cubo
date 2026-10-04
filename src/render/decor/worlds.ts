// Cubo Blocks — World backgrounds (legacy themes/). Static backgrounds (paint, recorded once) and per-frame decor (animate).
// Ported from the canvas code through the Ctx wrapper, call for call.
import type { Ctx } from '../ctx2d';
import { hills, loop, seeded, vGradient, type Animate, type Paint } from './util';

const BASE_RETRO = '#9bbc0f';

const plainPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#5cc8ff', '#bfeaff']); g.fillRect(0, 0, w, h);
    hills(g, w, h, h * 0.8, h * 0.035, '#8be06a', 0.6);
    hills(g, w, h, h * 0.88, h * 0.03, '#5cc64a', 2.4, 1.1);
    const rnd = seeded(5);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = ['#ffffff', '#ffd23f', '#ff8fab'][i % 3];
      g.beginPath(); g.arc(rnd() * w, h * (0.9 + rnd() * 0.1), 2.5, 0, Math.PI * 2); g.fill();
    }
};

const plainAnimate = (g: Ctx, w: number, h: number, t: number) => {
    g.fillStyle = 'rgba(255,255,255,0.92)';
    [[0.12, 0.018, 1], [0.3, 0.011, 0.75], [0.5, 0.014, 0.9]].forEach(([yf, sp, s], i) => {
      const x = loop(i * w * 0.45 + t * sp, w, 90);
      const y = h * yf;
      g.beginPath();
      g.arc(x, y, 18 * s, 0, Math.PI * 2); g.arc(x + 22 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
      g.arc(x + 46 * s, y, 17 * s, 0, Math.PI * 2); g.fill();
    });
};

const seaPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#1a6aa8', '#0b3d6b', '#04162e']); g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (const [x0, x1] of [[0.1, 0.25], [0.45, 0.55], [0.75, 0.95]]) {
      g.beginPath(); g.moveTo(w * x0, 0); g.lineTo(w * x1, 0); g.lineTo(w * (x1 + 0.1), h * 0.7); g.lineTo(w * (x0 - 0.05), h * 0.7); g.fill();
    }
    hills(g, w, h, h * 0.93, h * 0.015, '#c9a86a', 1.2, 2);
    const rnd = seeded(9);
    for (let i = 0; i < 9; i++) {
      const x = rnd() * w;
      const tall = h * (0.06 + rnd() * 0.08);
      g.strokeStyle = i % 3 ? '#1f8a5b' : '#ff7a8a'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, h * 0.95);
      g.quadraticCurveTo(x + 14, h * 0.95 - tall / 2, x - 4, h * 0.95 - tall); g.stroke();
    }
};

const seaAnimate = (g: Ctx, w: number, h: number, t: number) => {
    const rnd = seeded(21);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const r = 2 + rnd() * 5;
      const y = h - loop(rnd() * h + t * (0.02 + rnd() * 0.03), h, 20);
      const x = rnd() * w + Math.sin(t / 700 + i) * 6;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    }
};

const spacePaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#05051a', '#1b1045', '#2a1560']); g.fillRect(0, 0, w, h);
    const rnd = seeded(42);
    g.fillStyle = '#fff';
    for (let i = 0; i < 110; i++) {
      g.globalAlpha = 0.2 + rnd() * 0.7;
      g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
    }
    g.globalAlpha = 1;
    const r = Math.min(w, h) * 0.16;
    const px = w * 0.86;
    const py = h * 0.86;
    const planet = g.createLinearGradient(px - r, py - r, px + r, py + r);
    planet.addColorStop(0, '#ff8fab'); planet.addColorStop(1, '#6a3fd0');
    g.fillStyle = planet;
    g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,220,160,0.7)'; g.lineWidth = 5;
    g.beginPath(); g.ellipse(px, py, r * 1.6, r * 0.35, -0.35, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#d8d2f0';
    g.beginPath(); g.arc(w * 0.14, h * 0.12, r * 0.28, 0, Math.PI * 2); g.fill();
};

const spaceAnimate = (g: Ctx, w: number, h: number, t: number) => {
    const rnd = seeded(77);
    g.fillStyle = '#fff';
    for (let i = 0; i < 10; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const a = 0.5 + 0.5 * Math.sin(t / 400 + i * 1.7);
      g.globalAlpha = a;
      g.fillRect(x - 3, y - 0.75, 6, 1.5); g.fillRect(x - 0.75, y - 3, 1.5, 6);
    }
    g.globalAlpha = 1;
};

const icePaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#f2fbff', '#cdeefc', '#a9dcf3']); g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    const rnd = seeded(13);
    for (let i = 0; i < 5; i++) {
      const x = (i / 4) * w;
      const top = h * (0.72 + rnd() * 0.08);
      g.beginPath(); g.moveTo(x - w * 0.18, h); g.lineTo(x - w * 0.05, top); g.lineTo(x + w * 0.04, top + 10); g.lineTo(x + w * 0.2, h); g.fill();
    }
    g.fillStyle = '#ffffff';
    g.beginPath(); g.roundRect(-10, h * 0.93, w + 20, h * 0.1, 18); g.fill();
};

const iceAnimate = (g: Ctx, w: number, h: number, t: number) => {
    const rnd = seeded(31);
    g.fillStyle = '#ffffff';
    g.strokeStyle = 'rgba(80,150,200,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const r = 1.5 + rnd() * 2.5;
      const y = loop(rnd() * h + t * (0.015 + rnd() * 0.02), h, 10);
      const x = rnd() * w + Math.sin(t / 900 + i) * 10;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
    }
};

const forestPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#2c4a6b', '#35604a', '#0f2419']); g.fillRect(0, 0, w, h);
    const tree = (x: number, base: number, s: number, color: string) => {
      g.fillStyle = color;
      for (let k = 0; k < 3; k++) {
        const y = base - s * (0.35 + k * 0.3);
        const half = s * (0.32 - k * 0.07);
        g.beginPath(); g.moveTo(x, y - s * 0.38); g.lineTo(x + half, y); g.lineTo(x - half, y); g.fill();
      }
      g.fillRect(x - s * 0.04, base - s * 0.36, s * 0.08, s * 0.36);
    };
    const rnd = seeded(17);
    for (let i = 0; i < 9; i++) tree((i + rnd() * 0.5) * (w / 8), h * 0.86, h * (0.22 + rnd() * 0.08), '#1f4030');
    hills(g, w, h, h * 0.88, h * 0.012, '#0b1a12', 0.4, 2);
    for (let i = 0; i < 5; i++) tree((i + 0.3 + rnd() * 0.4) * (w / 4.5), h * 1.02, h * (0.3 + rnd() * 0.08), '#0b1a12');
    for (const [xf, s] of [[0.1, 1], [0.84, 0.8], [0.62, 0.6]]) {
      const x = w * xf;
      const y = h * 0.955;
      g.fillStyle = '#f2e6d0'; g.fillRect(x - 4 * s, y - 12 * s, 8 * s, 12 * s);
      g.fillStyle = '#e84a4a';
      g.beginPath(); g.ellipse(x, y - 12 * s, 14 * s, 9 * s, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x - 5 * s, y - 16 * s, 2 * s, 0, Math.PI * 2); g.arc(x + 5 * s, y - 15 * s, 2.4 * s, 0, Math.PI * 2); g.fill();
    }
};

const forestAnimate = (g: Ctx, w: number, h: number, t: number) => {
    const rnd = seeded(55);
    for (let i = 0; i < 12; i++) {
      const x = rnd() * w + Math.sin(t / (1300 + i * 90) + i) * 30;
      const y = h * (0.35 + rnd() * 0.55) + Math.cos(t / (1100 + i * 70) + i) * 20;
      const a = 0.3 + 0.7 * Math.max(0, Math.sin(t / 500 + i * 2.1));
      g.fillStyle = `rgba(230,255,120,${a * 0.25})`;
      g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(250,255,200,${a})`;
      g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
    }
};

const retroPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = BASE_RETRO; g.fillRect(0, 0, w, h);
    // LCD pixel matrix.
    g.fillStyle = 'rgba(15,56,15,0.06)';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
};

const arcadePaint = (g: Ctx, w: number, h: number) => {
    const bg = g.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, Math.max(w, h) * 0.8);
    bg.addColorStop(0, '#3a1a78'); bg.addColorStop(0.6, '#1a0b3d'); bg.addColorStop(1, '#0d0624');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // Perspective neon floor.
    const horizon = h * 0.8;
    g.strokeStyle = 'rgba(255,80,220,0.45)'; g.lineWidth = 1.5;
    for (let i = 1; i < 10; i++) {
      const y = horizon + Math.pow(i / 9, 2) * (h - horizon);
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    for (let i = -8; i <= 8; i++) {
      g.beginPath(); g.moveTo(w / 2 + i * 6, horizon); g.lineTo(w / 2 + i * w * 0.18, h); g.stroke();
    }
};

const volcanoPaint = (g: Ctx, w: number, h: number) => {
    g.fillStyle = vGradient(g, h, ['#120606', '#2a0c08', '#7a1e0a']); g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w / 2, h * 0.78, 0, w / 2, h * 0.78, w * 0.7);
    glow.addColorStop(0, 'rgba(255,120,30,0.45)'); glow.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a1410';
    g.beginPath();
    g.moveTo(-10, h); g.lineTo(w * 0.36, h * 0.78); g.lineTo(w * 0.44, h * 0.8); g.lineTo(w * 0.56, h * 0.8);
    g.lineTo(w * 0.64, h * 0.78); g.lineTo(w + 10, h); g.fill();
    g.strokeStyle = '#ff6a1a'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.5, h * 0.8); g.quadraticCurveTo(w * 0.46, h * 0.88, w * 0.52, h); g.stroke();
};

const volcanoAnimate = (g: Ctx, w: number, h: number, t: number) => {
    const rnd = seeded(66);
    for (let i = 0; i < 18; i++) {
      const y = h - loop(rnd() * h + t * (0.03 + rnd() * 0.04), h, 10);
      const x = w * (0.3 + rnd() * 0.4) + Math.sin(t / 600 + i) * 18;
      const a = Math.min(1, y / h + 0.2) * (0.5 + 0.5 * Math.sin(t / 150 + i));
      g.fillStyle = `rgba(255,${120 + Math.round(rnd() * 80)},40,${a})`;
      g.fillRect(x, y, 3, 3);
    }
};

export const WORLD_DECOR: Record<string, { paint?: Paint; animate?: Animate }> = {
  plain: { paint: plainPaint, animate: plainAnimate },
  sea: { paint: seaPaint, animate: seaAnimate },
  space: { paint: spacePaint, animate: spaceAnimate },
  ice: { paint: icePaint, animate: iceAnimate },
  forest: { paint: forestPaint, animate: forestAnimate },
  retro: { paint: retroPaint },
  arcade: { paint: arcadePaint },
  volcano: { paint: volcanoPaint, animate: volcanoAnimate },
};
