// Cubo Blocks — THEMES: the default Jouet theme and the eight world themes.
'use strict';

const THEMES = {
  toy: {
    base: '#ffeef4', board: '#ffffff', empty: '#f6e9f2', cellR: 0.24,
    font: FONT, weight: 800, palette: TOY_PALETTE,
    ink: '#4a3a66', accent: '#7c5cff', danger: '#ff5d7a', shadow: 'rgba(200,110,160,0.28)',
    frame: { r: 26, line: null },
    plate: { fill: '#ffffff', line: null, r: 40, ink: '#7c5cff', sub: '#b39bd6', shadow: 'rgba(200,110,160,0.28)' },
    tag: { fill: '#b7f0d8', line: null, ink: '#1e7a55' },
    css: lightCss({
      '--bg': '#ffeef4', '--panel': '#ffffff', '--panel-2': '#fbf1f6', '--slot': '#ffffff',
      '--text': '#4a3a66', '--muted': '#6e5f8c', '--accent': '#7c5cff', '--on-accent': '#ffffff',
      '--good': '#1f9e68', '--edge': '#f3dce8', '--radius': '22px',
    }),
    paint(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd6e5';
      for (let y = 0, row = 0; y < h + 20; y += 20, row++) {
        for (let x = row % 2 ? 10 : 0; x < w + 20; x += 20) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); }
      }
    },
  },
  plain: {
    base: '#8fdcff', board: '#8a5a3b', empty: '#6e4630', cellR: 0.2,
    font: FONT, weight: 800,
    ink: '#1d3557', accent: '#ffcf33', danger: '#e63946',
    frame: { r: 20, line: '#a8744e', lw: 4, inset: 3 },
    plate: { fill: '#ffffff', line: null, r: 22, ink: '#ff4d6d', sub: '#6b8bb0' },
    tag: { fill: '#ffd23f', line: null, ink: '#6b3a00' },
    css: lightCss({
      '--bg': '#8fdcff', '--panel': '#ffffff', '--panel-2': '#eef8ff', '--slot': '#ffffff',
      '--text': '#1d3557', '--muted': '#4a6282', '--accent': '#ff4d6d', '--on-accent': '#ffffff',
      '--good': '#2f9e44', '--edge': '#d6e9f7', '--radius': '18px',
      '--hairline': 'rgba(29,53,87,0.14)', '--sunken': 'rgba(29,53,87,0.1)', '--scrim': 'rgba(29,53,87,0.45)',
    }),
    paint(g, w, h) {
      g.fillStyle = vGradient(g, h, ['#5cc8ff', '#bfeaff']); g.fillRect(0, 0, w, h);
      hills(g, w, h, h * 0.8, h * 0.035, '#8be06a', 0.6);
      hills(g, w, h, h * 0.88, h * 0.03, '#5cc64a', 2.4, 1.1);
      const rnd = seeded(5);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = ['#ffffff', '#ffd23f', '#ff8fab'][i % 3];
        g.beginPath(); g.arc(rnd() * w, h * (0.9 + rnd() * 0.1), 2.5, 0, Math.PI * 2); g.fill();
      }
    },
    animate(g, w, h, t) {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      [[0.12, 0.018, 1], [0.3, 0.011, 0.75], [0.5, 0.014, 0.9]].forEach(([yf, sp, s], i) => {
        const x = loop(i * w * 0.45 + t * sp, w, 90);
        const y = h * yf;
        g.beginPath();
        g.arc(x, y, 18 * s, 0, Math.PI * 2); g.arc(x + 22 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
        g.arc(x + 46 * s, y, 17 * s, 0, Math.PI * 2); g.fill();
      });
    },
  },
  sea: {
    base: '#07284a', board: 'rgba(4,26,52,0.86)', empty: 'rgba(120,200,255,0.1)', cellR: 0.22,
    font: FONT, weight: 800,
    ink: '#e8f7ff', accent: '#ffd166', danger: '#ff7a8a',
    frame: { r: 22, line: 'rgba(140,220,255,0.45)', lw: 2, inset: 3 },
    plate: { fill: 'rgba(4,26,52,0.85)', line: '#5fd4ff', lw: 2, inset: 0, r: 24, ink: '#ffffff', sub: '#8fd8f5' },
    tag: { fill: '#ff8fab', line: null, ink: '#3a0a1c' },
    css: css({
      '--bg': '#07284a', '--panel': '#0b3a66', '--panel-2': '#0f4a80', '--slot': 'rgba(4,26,52,0.86)',
      '--text': '#e8f7ff', '--muted': '#9fcbe6', '--accent': '#ffd166', '--on-accent': '#07284a',
      '--edge': '#5fd4ff', '--radius': '20px',
    }),
    paint(g, w, h) {
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
    },
    animate(g, w, h, t) {
      const rnd = seeded(21);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5;
      for (let i = 0; i < 16; i++) {
        const r = 2 + rnd() * 5;
        const y = h - loop(rnd() * h + t * (0.02 + rnd() * 0.03), h, 20);
        const x = rnd() * w + Math.sin(t / 700 + i) * 6;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
      }
    },
  },
  space: {
    base: '#0a0a24', board: 'rgba(18,14,48,0.88)', empty: 'rgba(170,150,255,0.1)', cellR: 0.2,
    font: FONT, weight: 800,
    ink: '#f1ecff', accent: '#ffd23f', danger: '#ff6b8b',
    frame: { r: 20, line: '#8a6bff', lw: 2, inset: 3, glow: '#8a6bff' },
    plate: { fill: 'rgba(18,14,48,0.9)', line: '#b69cff', lw: 2, inset: 0, r: 24, ink: '#ffffff', sub: '#c9b8ff', glow: '#8a6bff' },
    tag: { fill: '#ffd23f', line: null, ink: '#2a1a00' },
    css: css({
      '--bg': '#0a0a24', '--panel': '#1a1440', '--panel-2': '#261d57', '--slot': 'rgba(18,14,48,0.88)',
      '--text': '#f1ecff', '--muted': '#b8aee0', '--accent': '#ffd23f', '--on-accent': '#1a1440',
      '--edge': '#8a6bff', '--radius': '20px',
      '--card-glow': '0 0 36px rgba(138,107,255,0.35)',
    }),
    paint(g, w, h) {
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
    },
    animate(g, w, h, t) {
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
    },
  },
  ice: {
    base: '#dff3fc', board: '#ffffff', empty: '#e3f2fa', cellR: 0.18,
    font: FONT, weight: 800,
    ink: '#1b3a5c', accent: '#2a9df4', danger: '#e5484d', shadow: 'rgba(60,140,200,0.25)',
    frame: { r: 20, line: '#bfe6fa', lw: 3, inset: 2 },
    plate: { fill: '#ffffff', line: '#bfe6fa', lw: 2, inset: 3, r: 22, ink: '#1f7fd1', sub: '#7fa6c4', shadow: 'rgba(60,140,200,0.25)' },
    tag: { fill: '#2a9df4', line: null, ink: '#ffffff' },
    css: lightCss({
      '--bg': '#dff3fc', '--panel': '#ffffff', '--panel-2': '#eef8fd', '--slot': '#ffffff',
      '--text': '#1b3a5c', '--muted': '#4a6884', '--accent': '#2a9df4', '--on-accent': '#ffffff',
      '--good': '#1f9e68', '--edge': '#cdeaf8', '--radius': '18px',
      '--hairline': 'rgba(27,58,92,0.14)', '--sunken': 'rgba(27,58,92,0.1)', '--scrim': 'rgba(27,58,92,0.45)',
    }),
    paint(g, w, h) {
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
    },
    animate(g, w, h, t) {
      const rnd = seeded(31);
      g.fillStyle = '#ffffff';
      g.strokeStyle = 'rgba(80,150,200,0.35)'; g.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const r = 1.5 + rnd() * 2.5;
        const y = loop(rnd() * h + t * (0.015 + rnd() * 0.02), h, 10);
        const x = rnd() * w + Math.sin(t / 900 + i) * 10;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    },
  },
  forest: {
    base: '#0f2419', board: 'rgba(14,34,22,0.9)', empty: 'rgba(190,255,200,0.08)', cellR: 0.2,
    font: FONT, weight: 800,
    ink: '#f2ffe8', accent: '#ffe066', danger: '#ff7a6a',
    frame: { r: 20, line: '#5a8a4a', lw: 2.5, inset: 3 },
    plate: { fill: '#e84a4a', line: '#ffffff', lw: 3, inset: 5, r: 24, ink: '#ffffff', sub: '#ffe0e0', dots: true },
    tag: { fill: '#ffe066', line: null, ink: '#2a2400' },
    css: css({
      '--bg': '#0f2419', '--panel': '#1a3a28', '--panel-2': '#234a33', '--slot': 'rgba(14,34,22,0.9)',
      '--text': '#f2ffe8', '--muted': '#b4d6b0', '--accent': '#ffe066', '--on-accent': '#1a3a28',
      '--edge': '#5a8a4a', '--radius': '18px',
    }),
    paint(g, w, h) {
      g.fillStyle = vGradient(g, h, ['#2c4a6b', '#35604a', '#0f2419']); g.fillRect(0, 0, w, h);
      const tree = (x, base, s, color) => {
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
    },
    animate(g, w, h, t) {
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
    },
  },
  retro: {
    base: '#9bbc0f', board: '#8bac0f', empty: '#9bbc0f', cellR: 0.04,
    font: PIXEL_FONT, weight: 400, scale: 0.62,
    ink: '#0f380f', accent: '#306230', danger: '#0f380f',
    frame: { r: 4, line: '#306230', lw: 4, inset: 2 },
    plate: { fill: '#0f380f', line: '#8bac0f', lw: 2, inset: 4, r: 4, ink: '#9bbc0f', sub: '#8bac0f' },
    tag: { fill: '#306230', line: null, ink: '#9bbc0f' },
    css: lightCss({
      '--bg': '#9bbc0f', '--panel': '#8bac0f', '--panel-2': '#9bbc0f', '--slot': '#8bac0f',
      '--text': '#0f380f', '--muted': '#306230', '--accent': '#0f380f', '--on-accent': '#9bbc0f',
      '--good': '#0f380f', '--edge': '#306230', '--radius': '6px',
      '--hairline': 'rgba(15,56,15,0.3)', '--sunken': 'rgba(15,56,15,0.18)', '--scrim': 'rgba(15,56,15,0.6)',
      '--card-bw': '4px', '--card-bb': '4px', '--plate-edge': 'inset 0 0 0 2px var(--edge)',
    }),
    paint(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      // LCD pixel matrix.
      g.fillStyle = 'rgba(15,56,15,0.06)';
      for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
      for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
    },
  },
  arcade: {
    base: '#1a0b3d', board: 'rgba(13,6,36,0.86)', empty: '#1d1147', cellR: 0.14,
    font: PIXEL_FONT, weight: 400, scale: 0.62,
    ink: '#ffffff', accent: '#36f9ff', danger: '#ff3fd0',
    frame: { r: 12, line: '#7a4dff', lw: 2, inset: 2, glow: '#7a4dff' },
    plate: { fill: 'rgba(13,6,36,0.9)', line: '#36f9ff', lw: 2, inset: 4, r: 10, ink: '#ffffff', sub: '#ff3fd0', glow: '#36f9ff', bulbs: '#ffe600' },
    tag: { fill: '#ff3fd0', line: null, ink: '#1a0b3d', glow: '#ff3fd0' },
    css: css({
      '--bg': '#1a0b3d', '--panel': '#221047', '--panel-2': '#2f1860', '--slot': 'rgba(13,6,36,0.86)',
      '--text': '#ffffff', '--muted': '#c9b3f0', '--accent': '#36f9ff', '--on-accent': '#1a0b3d',
      '--good': '#7cff4f', '--edge': '#36f9ff', '--radius': '12px',
      '--card-glow': '0 0 36px rgba(54,249,255,0.3)',
    }),
    paint(g, w, h) {
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
    },
  },
  volcano: {
    base: '#1a0a0a', board: 'rgba(30,12,8,0.9)', empty: 'rgba(255,140,80,0.08)', cellR: 0.16,
    font: FONT, weight: 800,
    ink: '#fff1e6', accent: '#ffb000', danger: '#ff3b30',
    frame: { r: 18, line: '#ff6a1a', lw: 2, inset: 3, glow: '#ff4a00' },
    plate: { fill: '#2a120c', line: '#ff6a1a', lw: 2.5, inset: 3, r: 20, ink: '#ffcf4d', sub: '#ff9a5a', glow: '#ff4a00' },
    tag: { fill: '#ff6a1a', line: null, ink: '#1a0a0a', glow: '#ff4a00' },
    css: css({
      '--bg': '#1a0a0a', '--panel': '#2a120c', '--panel-2': '#3a1a10', '--slot': 'rgba(30,12,8,0.9)',
      '--text': '#fff1e6', '--muted': '#e0b49a', '--accent': '#ffb000', '--on-accent': '#1a0a0a',
      '--good': '#9be36b', '--edge': '#ff6a1a', '--radius': '18px',
      '--card-glow': '0 0 36px rgba(255,74,0,0.3)',
    }),
    paint(g, w, h) {
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
    },
    animate(g, w, h, t) {
      const rnd = seeded(66);
      for (let i = 0; i < 18; i++) {
        const y = h - loop(rnd() * h + t * (0.03 + rnd() * 0.04), h, 10);
        const x = w * (0.3 + rnd() * 0.4) + Math.sin(t / 600 + i) * 18;
        const a = Math.min(1, y / h + 0.2) * (0.5 + 0.5 * Math.sin(t / 150 + i));
        g.fillStyle = `rgba(255,${120 + Math.round(rnd() * 80)},40,${a})`;
        g.fillRect(x, y, 3, 3);
      }
    },
  },
};
