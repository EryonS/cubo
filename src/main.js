/*
 * Gridlock — web renderer + input. Rules live in logic.js, progression in meta.js;
 * this file only draws, animates, plays sounds and persists.
 */
(() => {
  'use strict';

  const L = window.GridlockLogic;
  const M = window.GridlockMeta;
  const LV = window.GridlockLevels;
  const WD = window.GridlockWorlds;
  const SIZE = L.SIZE;
  const STORE_KEY = 'gridlock.v2';
  const LEGACY_KEY = 'gridlock.v1';
  const PROFILE_KEY = 'gridlock.profile.v1';

  // One color per shape family (index = family + 1, see FAMILIES in logic.js).
  const PALETTE = [
    null,
    '#e2e8f0', // 1x1
    '#ff9f43', // 2 line
    '#ffd93d', // 3 line
    '#4ade80', // 4 line
    '#22d3ee', // 5 line
    '#3b82f6', // 2x2
    '#6366f1', // 3x3
    '#c084fc', // small L
    '#f472b6', // L (both mirrors)
    '#a3e635', // T
    '#ff5d73', // S / Z
    '#14b8a6', // big L
    '#94a3b8', // 2x3
    '#d6a86b', // diagonal
  ];
  // hint: shown when fired. desc: legend + hover tooltip.
  const BONUS_UI = {
    rotate: { name: 'Toupie', hint: 'Touche une pièce pour la tourner', desc: '30 s : touche une pièce du bac pour la faire pivoter.' },
    nitro: { name: 'Étoile', hint: 'Points ×2', desc: '30 s : tous les points comptent double.' },
    shield: { name: 'Bulle', hint: 'Le combo ne casse plus', desc: '30 s : ton combo ne peut pas retomber.' },
    bomb: { name: 'Bombe', hint: 'Glisse-la sur la grille', desc: 'Glisse-la sur la grille : elle fait sauter une zone de 21 cases.' },
    reroll: { name: 'Tornade', hint: 'Nouvelles pièces', desc: 'Remplace les 3 pièces du bac.' },
  };
  const COIN_UI = {
    coin: { name: 'Pièce', desc: '+1 pièce quand le bloc est effacé.' },
    bag: { name: 'Sac de pièces', desc: '+5 pièces quand le bloc est effacé.' },
  };
  const FONT = '"Baloo 2", ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';
  const PIXEL_FONT = '"Press Start 2P", ui-monospace, monospace';

  const canvas = document.getElementById('game');
  let ctx = canvas.getContext('2d'); // swapped temporarily to draw shop previews
  const now = () => performance.now();

  // Tiny seeded RNG so decorative stars and peaks don't jump on resize.
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function withAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- icons ----------
  // Vector icons drawn in a 100-unit box centered on (0, 0). Bonuses sit on a white badge
  // ringed with their color; coins are drawn as gold objects.
  const ICON_COLORS = { rotate: '#ff5d8f', nitro: '#f5a300', shield: '#1fa9e0', bomb: '#ef4444', reroll: '#8b5cf6' };

  function arrowHead(g, x, y, dx, dy, size) {
    const nx = -dy;
    const ny = dx;
    g.beginPath();
    g.moveTo(x + dx * size, y + dy * size);
    g.lineTo(x + nx * size * 0.8, y + ny * size * 0.8);
    g.lineTo(x - nx * size * 0.8, y - ny * size * 0.8);
    g.closePath();
    g.fill();
  }

  // Internal ids stay (rotate, nitro, shield, reroll) so old saves keep their inventory;
  // what the player sees is Toupie, Étoile, Bulle, Tornade.
  const GLYPHS = {
    // Toupie: a spinning top with a handle and two motion arcs.
    rotate(g, c) {
      g.fillStyle = c;
      g.beginPath(); g.roundRect(-5, -38, 10, 16, 4); g.fill();
      g.beginPath();
      g.moveTo(0, 36);
      g.bezierCurveTo(-12, 22, -34, 4, -34, -8);
      g.quadraticCurveTo(-34, -24, 0, -24);
      g.quadraticCurveTo(34, -24, 34, -8);
      g.bezierCurveTo(34, 4, 12, 22, 0, 36);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.ellipse(0, -8, 30, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = c;
      g.beginPath(); g.ellipse(0, -8, 30, 2.5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.arc(0, -8, 44, Math.PI * 0.85, Math.PI * 1.1); g.stroke();
      g.beginPath(); g.arc(0, -8, 44, -Math.PI * 0.1, Math.PI * 0.15); g.stroke();
    },
    // Étoile: a chubby five-point star with a shine.
    nitro(g, c) {
      g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 9; g.lineJoin = 'round';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 17 : 36;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 3);
      }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.ellipse(-9, -6, 6, 3.5, -0.7, 0, Math.PI * 2); g.fill();
    },
    // Bulle: a soap bubble, translucent with a bright rim and highlights.
    shield(g, c) {
      g.fillStyle = withAlpha(c, 0.22);
      g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c; g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 0, 22, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(14, -16, 4, 0, Math.PI * 2); g.fill();
    },
    bomb(g) {
      g.strokeStyle = '#374151'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(10, -12); g.quadraticCurveTo(16, -26, 26, -26); g.stroke();
      g.fillStyle = '#1f2937';
      g.beginPath(); g.arc(-4, 6, 25, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.beginPath(); g.arc(-13, -3, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f97316';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = i % 2 ? 5 : 12;
        g.lineTo(28 + Math.cos(a) * r, -28 + Math.sin(a) * r);
      }
      g.closePath(); g.fill();
      g.fillStyle = '#fde047';
      g.beginPath(); g.arc(28, -28, 4, 0, Math.PI * 2); g.fill();
    },
    // Tornade: stacked swirls narrowing toward the ground.
    reroll(g, c) {
      g.strokeStyle = c; g.lineWidth = 8; g.lineCap = 'round';
      const rows = [[-26, 36], [-12, 28], [2, 20], [16, 12], [28, 6]];
      rows.forEach(([y, rx], i) => {
        const x = Math.sin(i * 1.1) * 5;
        g.beginPath(); g.moveTo(x - rx, y); g.lineTo(x + rx, y); g.stroke();
      });
      g.fillStyle = c;
      g.beginPath(); g.arc(Math.sin(5.5) * 5, 36, 4, 0, Math.PI * 2); g.fill();
    },
    coin(g) {
      const grad = g.createLinearGradient(0, -46, 0, 46);
      grad.addColorStop(0, '#fde68a'); grad.addColorStop(0.5, '#facc15'); grad.addColorStop(1, '#ca8a04');
      g.fillStyle = '#a16207';
      g.beginPath(); g.arc(0, 4, 46, 0, Math.PI * 2); g.fill();
      g.fillStyle = grad;
      g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(161,98,7,0.55)'; g.lineWidth = 5;
      g.beginPath(); g.arc(0, 0, 31, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#b45309';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 8 : 19;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.ellipse(-18, -22, 10, 5, -0.6, 0, Math.PI * 2); g.fill();
    },
    bag(g) {
      const grad = g.createLinearGradient(0, -40, 0, 46);
      grad.addColorStop(0, '#fcd34d'); grad.addColorStop(1, '#b45309');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(-14, -16);
      g.bezierCurveTo(-48, 2, -42, 46, 0, 46);
      g.bezierCurveTo(42, 46, 48, 2, 14, -16);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(-15, -20); g.lineTo(-24, -40); g.lineTo(0, -30); g.lineTo(24, -40); g.lineTo(15, -20);
      g.closePath(); g.fill();
      g.fillStyle = '#78350f';
      g.beginPath(); g.roundRect(-17, -24, 34, 9, 4); g.fill();
      g.font = `900 40px ${FONT}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('$', 0, 16);
      g.textBaseline = 'alphabetic';
    },
  };

  // Draws icon `type` centered at (cx, cy), `size` px wide, on context g (defaults to the game canvas).
  function drawIcon(type, cx, cy, size, g = ctx) {
    g.save();
    g.translate(cx, cy);
    g.scale(size / 100, size / 100);
    if (ICON_COLORS[type]) {
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(0, 0, 48, 0, Math.PI * 2); g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = ICON_COLORS[type]; g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, 45, 0, Math.PI * 2); g.stroke();
      g.scale(0.78, 0.78);
    }
    GLYPHS[type](g, ICON_COLORS[type]);
    g.restore();
  }

  // ---------- themes ----------
  // A theme is a whole visual world: background, board, score plate, fonts and the menu colors (css).
  // paint() draws the static background once per resize; animate() runs every frame.
  // plate: the score pill. tag: the combo pill under it. frame: the board slab.
  // Optional: palette (block colors, same indexes as PALETTE), scale (display font size factor),
  // shadow (drop shadow color of plate and frame).
  // The worlds match the Aventure map; in Classique / Chrono / Chill they are purely cosmetic.
  const TOY_PALETTE = [
    null, '#b8a4f0', '#ffab76', '#ffcf4d', '#6fd6a0', '#5ccfe6', '#6ea8ff', '#8b7cf6',
    '#d49cff', '#ff8fb8', '#b6e36b', '#ff7a8a', '#3fc1b0', '#a3b1c9', '#e0b07a',
  ];
  // Menu tokens: dark worlds share these defaults, light worlds override the translucent ones.
  const css = (o) => ({
    '--good': '#5ee08a', '--hairline': 'rgba(255,255,255,0.12)', '--sunken': 'rgba(0,0,0,0.3)',
    '--scrim': 'rgba(6,7,10,0.72)', '--card-edge': 'inset 0 0 0 2px var(--edge)', '--plate-edge': 'inset 0 0 0 1.5px var(--edge)',
    ...o,
  });
  const lightCss = (o) => css({
    '--hairline': 'rgba(74,58,102,0.14)', '--sunken': 'rgba(74,58,102,0.1)', '--scrim': 'rgba(74,58,102,0.45)',
    '--card-edge': 'inset 0 -6px 0 var(--edge)', '--plate-edge': 'inset 0 -3px 0 var(--edge)',
    ...o,
  });

  function vGradient(g, h, stops) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
    return grad;
  }
  // A rolling hill line from y0, filled down to the bottom.
  function hills(g, w, h, y0, amp, color, phase, waves = 1.5) {
    g.fillStyle = color;
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 2 * waves + phase) * amp);
    g.lineTo(w, h); g.fill();
  }
  // Position along a looping track: offset + t * speed, wrapped into [-pad, span + pad].
  const loop = (v, span, pad) => ((((v + pad) % (span + pad * 2)) + span + pad * 2) % (span + pad * 2)) - pad;

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
        '--text': '#4a3a66', '--muted': '#8a7aa3', '--accent': '#7c5cff', '--on-accent': '#ffffff',
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
        '--text': '#1d3557', '--muted': '#5b7494', '--accent': '#ff4d6d', '--on-accent': '#ffffff',
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
        '--card-edge': 'inset 0 0 0 2px var(--edge), 0 0 36px rgba(138,107,255,0.35)',
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
        '--text': '#1b3a5c', '--muted': '#5f7f9c', '--accent': '#2a9df4', '--on-accent': '#ffffff',
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
        '--card-edge': 'inset 0 0 0 4px var(--edge)', '--plate-edge': 'inset 0 0 0 2px var(--edge)',
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
        '--card-edge': 'inset 0 0 0 2px var(--edge), 0 0 36px rgba(54,249,255,0.3)',
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
        '--card-edge': 'inset 0 0 0 2px var(--edge), 0 0 36px rgba(255,74,0,0.3)',
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
  const themeFont = (th, size, weight = th.weight) =>
    `${th.italic ? 'italic ' : ''}${weight} ${Math.round(size * (th.scale || 1))}px ${th.font}`;
  const paletteOf = (th) => th.palette || PALETTE;

  // The score plate: fill, drop shadow, inner border, optional glow, marquee bulbs or cap dots.
  function drawPlate(g, p, x, y, w, h, t = 0) {
    g.save();
    g.shadowColor = p.shadow || 'rgba(0,0,0,0.4)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
    g.fillStyle = p.fill;
    g.beginPath(); g.roundRect(x, y, w, h, p.r); g.fill();
    g.restore();
    if (p.line) {
      g.save();
      if (p.glow) { g.shadowColor = p.glow; g.shadowBlur = 14; }
      g.strokeStyle = p.line;
      g.lineWidth = p.lw;
      const i = p.inset + p.lw / 2;
      g.beginPath(); g.roundRect(x + i, y + i, w - i * 2, h - i * 2, Math.max(2, p.r - i)); g.stroke();
      g.restore();
    }
    if (p.dots) {
      // Mushroom cap: a few white spots peeking from the corners.
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (const [fx, fy, fr] of [[0.07, 0.3, 0.09], [0.93, 0.28, 0.07], [0.12, 0.78, 0.05], [0.9, 0.76, 0.06]]) {
        g.beginPath(); g.arc(x + w * fx, y + h * fy, h * fr, 0, Math.PI * 2); g.fill();
      }
    }
    if (p.bulbs) {
      // Arcade marquee: bulbs chase around the edge.
      const n = Math.max(8, Math.round((w + h) / 11));
      const per = (w + h) * 2;
      for (let k = 0; k < n * 2; k++) {
        let d = (k / (n * 2)) * per;
        let bx, by;
        const m = 2.5;
        if (d < w) { bx = x + d; by = y + m; } else if ((d -= w) < h) { bx = x + w - m; by = y + d; }
        else if ((d -= h) < w) { bx = x + w - d; by = y + h - m; } else { d -= w; bx = x + m; by = y + h - d; }
        const on = (k + Math.floor(t / 180)) % 3 !== 0;
        g.fillStyle = on ? p.bulbs : 'rgba(255,212,107,0.25)';
        g.beginPath(); g.arc(bx, by, 1.6, 0, Math.PI * 2); g.fill();
      }
    }
  }

  // The board slab under the cells.
  function drawFrame(g, th, x, y, w, h) {
    const f = th.frame;
    g.save();
    g.shadowColor = th.shadow || 'rgba(0,0,0,0.35)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    g.fillStyle = th.board;
    g.beginPath(); g.roundRect(x, y, w, h, f.r); g.fill();
    g.restore();
    if (!f.line) return;
    g.save();
    if (f.glow) { g.shadowColor = f.glow; g.shadowBlur = 16; }
    g.strokeStyle = f.line;
    g.lineWidth = f.lw;
    const i = f.inset;
    g.beginPath(); g.roundRect(x + i, y + i, w - i * 2, h - i * 2, Math.max(2, f.r - i)); g.stroke();
    g.restore();
  }

  function drawEmpty(g, th, x, y, cell) {
    g.fillStyle = th.empty;
    g.beginPath();
    g.roundRect(x - cell * 0.44, y - cell * 0.44, cell * 0.88, cell * 0.88, cell * th.cellR);
    g.fill();
  }

  // ---------- block skins ----------
  // Each draws one block in the square (x, y, s) on the current ctx.
  const BLOCK_SKINS = {
    classic(x, y, s, color) {
      const r = s * 0.2;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x, y, s, s, r); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.roundRect(x, y + s * 0.74, s, s * 0.26, [0, 0, r, r]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.roundRect(x + s * 0.12, y + s * 0.09, s * 0.76, s * 0.2, r * 0.6); ctx.fill();
    },
    neon(x, y, s, color) {
      const r = s * 0.18;
      const lw = Math.max(1.5, s * 0.09);
      ctx.fillStyle = withAlpha(color, 0.16);
      ctx.beginPath(); ctx.roundRect(x + lw / 2, y + lw / 2, s - lw, s - lw, r); ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = s * 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.roundRect(x + lw / 2, y + lw / 2, s - lw, s - lw, r); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.roundRect(x + s * 0.28, y + s * 0.26, s * 0.44, s * 0.08, s * 0.04); ctx.fill();
    },
    pixel(x, y, s, color) {
      const b = Math.max(2, Math.round(s * 0.14));
      x = Math.round(x); y = Math.round(y); s = Math.round(s);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillRect(x, y, s, b);
      ctx.fillRect(x, y, b, s);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(x, y + s - b, s, b);
      ctx.fillRect(x + s - b, y, b, s);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x + b, y + b, b, b);
    },
  };

  // ---------- persistence ----------
  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  }
  function save() {
    if (state.mode !== 'adventure') bests[state.mode] = best;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ state, bests, settings, prefs })); } catch { /* private mode */ }
  }
  function saveProfile() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* private mode */ }
  }

  const saved = loadJSON(STORE_KEY);
  let state = saved.state && saved.state.effects && !saved.state.over ? saved.state : L.createGame(Date.now());
  if (!state.inventory) state = { ...state, inventory: L.createGame(0).inventory, stuck: false };
  if (!state.mode) state = { ...state, mode: 'classic', level: 'normal', clock: 0 };
  // Records are kept per mode; old saves only had the classic one.
  const bests = saved.bests || { classic: saved.best || loadJSON(LEGACY_KEY).best || 0 };
  let best = bests[state.mode] || 0;
  const settings = { sfx: !saved.muted, music: true, vibrate: true, ...saved.settings };
  const prefs = { mode: 'classic', level: 'normal', ...saved.prefs }; // last menu choice
  const storedProfile = loadJSON(PROFILE_KEY);
  // Local calendar day; daily missions roll over at local midnight.
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  // Old saves: retired road themes and the 'candy' blocks are refunded (announced once the game shows).
  const migrated = M.migrate(storedProfile.owned ? storedProfile : M.createProfile(today()));
  let profile = M.ensureDay(migrated.profile, today());
  saveProfile();
  let bestAtStart = best;
  let recordAnnounced = false;
  let runSettled = false;
  let levelSettled = false; // Aventure: level result recorded (stars, coins)
  let announced = new Set(); // missions already celebrated this run

  // ---------- animation state ----------
  let displayScore = state.score;
  let drag = null;        // { idx, x, y, lift, t0 }
  let returning = [];     // pieces flying back to the tray
  let pops = [];          // freshly placed cells
  let fades = [];         // cleared cells shrinking out
  let particles = [];
  let floaters = [];      // "+120" texts
  let banners = [];       // queue of big center texts, shown one after another
  let shake = 0;
  let slotIn = [now(), now(), now()]; // per-slot slide-in timestamps
  let slotSpin = [0, 0, 0];           // per-slot rotate animation timestamps
  let nextIn = now();                 // "next" preview slide-in timestamp
  let overAt = 0;
  let aiming = null;      // bomb targeting: { cell: [r, c] | null, pid }
  let flyers = [];        // bonus icons flying from the board to the inventory

  // An Aventure level wears its world's theme; otherwise the equipped one.
  const themeId = () => (state && state.stage ? state.stage.world : profile.equipped.boards);
  const theme = () => THEMES[themeId()] || THEMES.toy;
  // Rétro levels squash every shape family into three LCD greens (the world's drawback).
  const RETRO4 = [null, ...Array.from({ length: 14 }, (_, i) => ['#0f380f', '#306230', '#4d7a1e'][i % 3])];
  const pal = () => (state && state.stage && state.stage.world === 'retro' ? RETRO4 : paletteOf(theme()));
  const blockSkin = () => BLOCK_SKINS[profile.equipped.blocks] || BLOCK_SKINS.classic;
  const fmt = (n) => n.toLocaleString('fr-FR');
  const COIN = '<i class="coin"></i>';

  // ---------- layout ----------
  const invEl = document.getElementById('inventory');
  const trashEl = document.getElementById('trash');
  const bgCanvas = document.createElement('canvas');
  let W, H, dpr, lay;

  function paintBackground() {
    bgCanvas.width = Math.round(W * dpr);
    bgCanvas.height = Math.round(H * dpr);
    const g = bgCanvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    theme().paint(g, W, H);
    applyThemeCss();
  }

  // Menus, HUD buttons and inventory are DOM: they follow the theme through CSS variables.
  function applyThemeCss() {
    const th = theme();
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(th.css)) root.setProperty(k, v);
    root.setProperty('--font-display', th.font);
    root.setProperty('--display-style', th.italic ? 'italic' : 'normal');
    document.body.dataset.theme = themeId();
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th.base);
  }

  // env(safe-area-inset-top) is only readable through CSS.
  const safeProbe = document.createElement('div');
  safeProbe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none';
  document.body.appendChild(safeProbe);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const safeTop = safeProbe.offsetHeight;
    // Tall screens: HUD buttons, then the score sign + combo tag right above the board.
    // Short screens: the sign moves up between the HUD buttons to give the board its room.
    const compact = H < 760;
    const topH = compact ? safeTop + 118 : safeTop + 62 + 116;
    const invH = 64;
    const maxBoard = Math.min(W - 32, 440);
    // board + gap (1 cell: hints, chrono) + tray (3.4 cells) + inventory must fit below the HUD
    const cell = Math.floor(Math.min(maxBoard / SIZE, (H - topH - invH - 24) / (SIZE + 4.4)));
    const board = cell * SIZE;
    const bx = Math.round((W - board) / 2);
    const used = board + cell * 4.4 + invH;
    const by = Math.round(topH + Math.max(0, (H - topH - used) * 0.5));
    const ty = by + board + cell;
    // Three tray slots, then a narrow column announcing the next piece.
    const slotW = board / 3.6;
    lay = { cell, board, bx, by, ty, trayH: cell * 3.4, slotW, nextX: bx + slotW * 3, nextW: board - slotW * 3, compact,
      plateY: compact ? safeTop + 10 : by - 116, plateH: compact ? 64 : 72 };
    invEl.style.top = Math.round(ty + lay.trayH) + 'px';
    trashEl.style.top = Math.round(ty + lay.trayH) + 'px';
    trashEl.style.width = board + 'px';
    paintBackground();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- audio ----------
  let ac = null;
  function unlockAudio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    music.sync();
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
    if (!settings.sfx || !ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const semis = (base, n) => base * Math.pow(2, n / 12);
  const sfx = {
    pick: () => tone(620, 0.05, 'triangle', 0.06),
    toss: () => [0, -5, -10].forEach((s, i) => tone(semis(520, s), 0.09, 'triangle', 0.07, i * 0.05)),
    undo: () => [7, 0].forEach((s, i) => tone(semis(660, s), 0.08, 'sine', 0.08, i * 0.06)),
    tick: (hi) => tone(hi ? 1320 : 990, 0.03, 'square', 0.025),
    time: () => [0, 7].forEach((s, i) => tone(semis(784, s), 0.1, 'sine', 0.07, i * 0.05)),
    place: () => { tone(170, 0.09, 'triangle', 0.22); tone(340, 0.05, 'sine', 0.06); },
    nope: () => tone(130, 0.14, 'sawtooth', 0.04),
    clear: (lines, combo) => {
      const base = semis(392, Math.min(combo - 1, 12) * 2);
      const steps = [0, 4, 7, 12, 16, 19].slice(0, 2 + Math.min(lines, 4));
      steps.forEach((s, i) => tone(semis(base, s), 0.18, 'triangle', 0.1, i * 0.055));
    },
    over: () => [0, -3, -7, -12].forEach((s, i) => tone(semis(330, s), 0.3, 'triangle', 0.1, i * 0.13)),
    turn: () => { tone(740, 0.04, 'square', 0.03); tone(990, 0.05, 'triangle', 0.05, 0.03); },
    bonus: () => [0, 7, 12, 19].forEach((s, i) => tone(semis(660, s), 0.14, 'square', 0.04, i * 0.07)),
    collect: () => [0, 12].forEach((s, i) => tone(semis(880, s), 0.1, 'sine', 0.07, 0.35 + i * 0.08)),
    mission: () => [0, 4, 7, 12, 7, 12].forEach((s, i) => tone(semis(523, s), 0.16, 'triangle', 0.08, 0.3 + i * 0.08)),
    coin: (i) => tone(semis(988, (i % 5) * 2), 0.07, 'square', 0.035),
    buy: () => [0, 4, 7, 12, 16].forEach((s, i) => tone(semis(523, s), 0.2, 'triangle', 0.09, i * 0.06)),
    bomb: () => {
      if (!settings.sfx || !ac) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.5);
    },
  };
  // Soft generative loop: pad chords, bass on 1 and 3, a sparse arpeggio. Scheduled ahead
  // with a small lookahead timer so it keeps time while the main thread is busy.
  const music = (() => {
    const BPM = 92;
    const STEP = 60 / BPM / 2; // eighth notes
    // I - vi - IV - V in D, one chord per bar (8 steps); MIDI roots + chord tones.
    const CHORDS = [[50, [62, 66, 69, 73]], [47, [59, 62, 66, 69]], [43, [59, 62, 67, 71]], [45, [61, 64, 69, 73]]];
    const ARP = [0, 2, 1, 3, 2, 1, -1, 3];
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    let bus = null;
    let timer = null;
    let step = 0;
    let nextAt = 0;

    function voice(freq, at, dur, type, vol, cutoff) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.4, dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(f).connect(g).connect(bus);
      o.start(at);
      o.stop(at + dur + 0.05);
    }

    function schedule() {
      while (nextAt < ac.currentTime + 0.25) {
        const bar = Math.floor(step / 8) % CHORDS.length;
        const [root, tones] = CHORDS[bar];
        const i = step % 8;
        if (i === 0) {
          for (const n of tones.slice(0, 3)) voice(hz(n), nextAt, STEP * 8.4, 'triangle', 0.05, 900);
        }
        if (i === 0 || i === 4) voice(hz(root), nextAt, STEP * 3, 'sine', 0.16, 400);
        const a = ARP[i];
        if (a >= 0 && (step % 32 < 24 || i % 2 === 0)) voice(hz(tones[a] + 12), nextAt, STEP * 1.6, 'triangle', 0.035, 2400);
        nextAt += STEP;
        step += 1;
      }
    }

    function start() {
      if (timer || !ac) return;
      if (!bus) {
        bus = ac.createGain();
        bus.gain.value = 0;
        bus.connect(ac.destination);
      }
      bus.gain.cancelScheduledValues(ac.currentTime);
      bus.gain.setTargetAtTime(0.5, ac.currentTime, 0.4);
      nextAt = ac.currentTime + 0.1;
      timer = setInterval(schedule, 90);
      schedule();
    }

    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      bus.gain.setTargetAtTime(0, ac.currentTime, 0.15);
    }

    return { sync: () => (settings.music && ac && !document.hidden ? start() : stop()) };
  })();
  document.addEventListener('visibilitychange', () => music.sync());

  const buzz = (p) => { if (settings.vibrate && navigator.vibrate) navigator.vibrate(p); };

  // ---------- drawing helpers ----------
  function drawBlock(cx, cy, size, color, alpha = 1, scale = 1, bonus = null, skin = blockSkin()) {
    const s = size * scale * 0.9;
    if (s <= 0.5) return;
    ctx.globalAlpha = alpha;
    skin(cx - s / 2, cy - s / 2, s, color);
    if (bonus) drawIcon(bonus, cx, cy, s * (ICON_COLORS[bonus] ? 0.7 : 0.66));
    ctx.globalAlpha = 1;
  }

  const cellCenter = (r, c) => [lay.bx + (c + 0.5) * lay.cell, lay.by + (r + 0.5) * lay.cell];
  const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeBack = (t) => { t = Math.min(1, Math.max(0, t)); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function slotCenter(i) {
    return [lay.bx + lay.slotW * (i + 0.5), lay.ty + lay.trayH / 2];
  }
  const miniCell = () => Math.min(lay.cell * 0.5, lay.slotW / 5.4);

  function drawPiece(piece, cx, cy, cellSize, alpha = 1) {
    const ox = cx - (piece.w * cellSize) / 2;
    const oy = cy - (piece.h * cellSize) / 2;
    const b = piece.bonus;
    for (const [r, c] of piece.cells) {
      const bonus = b && b.r === r && b.c === c ? b.type : null;
      drawBlock(ox + (c + 0.5) * cellSize, oy + (r + 0.5) * cellSize, cellSize, pal()[piece.color], alpha, 1, bonus);
    }
  }

  // ---------- special cells (Aventure) ----------
  const SPECIAL_COLORS = { ice: '#9fdcf7', asteroid: '#8a8fa3', rock: '#6b5a52', mushroom: '#e84a4a', ember: '#ff6a1a', bubble: '#7fd8ff' };

  function crack(x, y, s) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.2, s * 0.05); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.28); ctx.lineTo(x - s * 0.05, y - s * 0.02); ctx.lineTo(x - s * 0.15, y + s * 0.2);
    ctx.moveTo(x - s * 0.05, y - s * 0.02); ctx.lineTo(x + s * 0.28, y + s * 0.05);
    ctx.stroke();
  }

  // Draws a special cell centered at (cx, cy). sp = { kind, hp, age }.
  function drawSpecial(sp, cx, cy, size, t, alpha = 1, scale = 1) {
    const s = size * scale * 0.9;
    if (s <= 0.5) return;
    const x = cx - s / 2;
    const y = cy - s / 2;
    const kind = sp.kind;
    const cracked = sp.hp < (L.KINDS[kind] ? L.KINDS[kind].hp : 1);
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
      if (cracked) crack(cx, cy, s);
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
      if (cracked) crack(cx, cy, s);
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
      const fuse = L.KINDS.ember.fuse;
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
    } else if (kind === 'bubble') {
      ctx.fillStyle = 'rgba(127,216,255,0.28)';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.46, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = s * 0.07;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.28, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx + s * 0.16, cy - s * 0.18, s * 0.05, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- drag & snap ----------
  function dragGeometry(d, t) {
    const piece = state.tray[d.idx];
    const k = easeOut((t - d.t0) / 110);
    const size = miniCell() + (lay.cell - miniCell()) * k;
    const cx = d.x;
    const cy = d.y - d.lift * k;
    const tlx = cx - (piece.w * lay.cell) / 2;
    const tly = cy - (piece.h * lay.cell) / 2;
    const col = Math.round((tlx - lay.bx) / lay.cell);
    const row = Math.round((tly - lay.by) / lay.cell);
    const valid = L.canPlace(state.board, piece, row, col);
    return { piece, size, cx, cy, row, col, valid };
  }

  function slotAt(x, y) {
    if (y < lay.ty - lay.cell * 0.4 || y > lay.ty + lay.trayH + lay.cell * 0.2) return -1;
    if (x > lay.nextX) return -1;
    return Math.max(0, Math.floor((x - lay.bx) / lay.slotW));
  }

  function boardCellAt(x, y) {
    const c = Math.floor((x - lay.bx) / lay.cell);
    const r = Math.floor((y - lay.by) / lay.cell);
    return r >= 0 && c >= 0 && r < SIZE && c < SIZE ? [r, c] : null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio();
    if (aiming) {
      const cell = boardCellAt(e.clientX, e.clientY);
      if (!cell) { setAiming(false); return; }
      canvas.setPointerCapture(e.pointerId);
      aiming.cell = cell;
      aiming.pid = e.pointerId;
      return;
    }
    if (state.over || drag) return;
    const idx = slotAt(e.clientX, e.clientY);
    if (idx < 0 || !state.tray[idx] || returning.some((p) => p.idx === idx)) return;
    canvas.setPointerCapture(e.pointerId);
    const lift = e.pointerType === 'mouse' ? 0 : lay.cell * 2.2;
    drag = { idx, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, lift, t0: now(), pid: e.pointerId };
    showTrash(true);
    if (!L.canTurn(state)) sfx.pick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (aiming && (aiming.pid === e.pointerId || e.pointerType === 'mouse')) {
      aiming.cell = boardCellAt(e.clientX, e.clientY);
      return;
    }
    if (!drag || e.pointerId !== drag.pid) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const r = trashEl.getBoundingClientRect();
    // Generous zone: anything below the tray counts.
    drag.overTrash = e.clientY > r.top - 12 && e.clientX > r.left - 16 && e.clientX < r.right + 16;
    trashEl.classList.toggle('hot', drag.overTrash);
  });
  const endDrag = (e) => {
    if (aiming && aiming.pid === e.pointerId) {
      const cell = aiming.cell;
      aiming.pid = null;
      if (e.type === 'pointerup' && cell) {
        if (useBonus('bomb', { r: cell[0], c: cell[1] })) setAiming(false);
        else sfx.nope();
      }
      return;
    }
    if (!drag || e.pointerId !== drag.pid) return;
    const t = now();
    const g = dragGeometry(drag, t);
    const idx = drag.idx;
    const isTap = t - drag.t0 < 280 && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 12;
    const toss = drag.overTrash && e.type === 'pointerup';
    drag = null;
    showTrash(false);
    if (toss) {
      if (!discardPiece(idx, e.clientX, e.clientY)) {
        returning.push({ idx, x: g.cx, y: g.cy, size: g.size, t0: t });
        sfx.nope();
      }
      return;
    }
    if (isTap && e.type === 'pointerup' && L.canTurn(state)) {
      const next = L.rotate(state, idx);
      if (next) {
        state = next;
        slotSpin[idx] = t;
        sfx.turn();
        buzz(6);
        save();
      }
      return;
    }
    if (g.valid && e.type === 'pointerup') {
      commit(idx, g.row, g.col);
    } else {
      returning.push({ idx, x: g.cx, y: g.cy, size: g.size, t0: t });
      if (e.type === 'pointerup') sfx.nope();
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function showTrash(on) {
    document.body.classList.toggle('dragging', on);
    trashEl.classList.toggle('show', on);
    trashEl.classList.remove('hot');
    if (!on) return;
    const cost = L.discardCost(state);
    const broke = profile.coins < cost;
    trashEl.classList.toggle('broke', broke);
    trashEl.querySelector('.label').textContent = broke ? 'Pas assez de pièces' : 'Jeter';
    trashEl.querySelector('.cost').innerHTML = fmt(cost) + COIN;
  }

  // ---------- game flow ----------
  const LINE_WORDS = ['', '', 'Double !', 'Triple !', 'Quadruple !', 'Énorme !', 'Délirant !'];

  function commit(idx, row, col) {
    const res = L.place(state, idx, row, col);
    if (!res) return;
    const ev = res.events;
    state = res.state;
    const t = now();

    ev.placed.forEach(([r, c]) => pops.push({ r, c, t0: t }));

    if (ev.lines) {
      const pr = ev.placed.reduce((s, p) => s + p[0], 0) / ev.placed.length;
      const pc = ev.placed.reduce((s, p) => s + p[1], 0) / ev.placed.length;
      for (const cell of ev.cleared) {
        const delay = Math.hypot(cell.r - pr, cell.c - pc) * 28;
        fades.push({ ...cell, t0: t, delay });
        burst(cell, t + delay, 4, 60 + ev.combo * 20);
      }
      const [fx, fy] = cellCenter(pr, pc);
      const margin = lay.cell * 1.6;
      floaters.push({ text: '+' + ev.points + (ev.nitro ? ' ×2' : ''), x: Math.max(margin, Math.min(W - margin, fx)), y: fy, t0: t, big: true });

      let text = LINE_WORDS[Math.min(ev.lines, LINE_WORDS.length - 1)];
      let sub = ev.combo >= 2 ? 'COMBO ×' + ev.combo : '';
      if (!text && ev.combo >= 2) { text = 'Combo ×' + ev.combo; sub = ''; }
      if (ev.perfect) { text = 'Grille vide !'; sub = '+300'; }
      if (text) banners.push({ text, sub });

      launchFlyers(ev.collected, t, (b) => Math.hypot(b.r - pr, b.c - pc) * 28);

      shake = Math.min(16, 3 + ev.lines * 3 + ev.combo * 1.5);
      sfx.clear(ev.lines, ev.combo);
      buzz(ev.lines >= 2 ? [20, 30, 30] : 18);
    } else {
      sfx.place();
      buzz(8);
    }

    if (ev.timeGain > 0) {
      const [bx, by] = chronoBar();
      floaters.push({ text: '+' + Math.round(ev.timeGain / 1000) + ' s', x: bx + lay.board - 30, y: by - 10, t0: t });
      sfx.time();
    }
    if (state.stage) stageEffects(ev, t);
    refilled(ev.refilled, t);
    afterChange(t, ev.over);
  }

  // Aventure feedback: cracked cells, blasts, gravity chains, and what the world dropped this turn.
  function stageEffects(ev, t) {
    for (const d of ev.damaged || []) burst({ r: d.r, c: d.c, kind: d.kind }, t, 5, 80, '#ffffff');
    if (ev.blasts && ev.blasts.length) {
      banners.push({ text: 'Boum !', sub: 'Explosion en croix' });
      shake = 18;
      sfx.bomb();
    }
    if (ev.chain) banners.push({ text: 'Réaction ×' + (ev.chain + 1), sub: 'La gravité enchaîne', gold: true });
    for (const sp of ev.spawned || []) {
      if (sp.row !== undefined) { banners.push({ text: 'Courant !', sub: 'Une ligne a glissé' }); continue; }
      pops.push({ r: sp.r, c: sp.c, t0: t + 150 });
      burst({ r: sp.r, c: sp.c, kind: sp.kind === 'firefly' ? 'ember' : sp.kind }, t + 150, 6, 60);
    }
  }

  // New tray pieces slide in from the "next" column, which gets a fresh piece itself.
  function refilled(slots, t) {
    for (const i of slots) { slotIn[i] = t; slotSpin[i] = 0; }
    if (slots.length) nextIn = t;
  }

  function payCoins(cost) {
    if (!cost) return;
    profile = M.spend(profile, cost) || { ...profile, coins: Math.max(0, profile.coins - cost) };
    saveProfile();
    renderWallet();
    const r = walletEl.getBoundingClientRect();
    floaters.push({ text: '-' + cost, x: r.left + r.width / 2, y: r.bottom + 34, t0: now() });
  }

  function discardPiece(idx, x, y) {
    const res = L.discard(state, idx);
    if (!res) return false;
    const t = now();
    state = res.state;
    payCoins(res.events.cost);
    const color = pal()[res.events.piece.color];
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, t0: t, life: 450 + Math.random() * 300,
        size: lay.cell * (0.12 + Math.random() * 0.12), color });
    }
    refilled(res.events.refilled, t);
    sfx.toss();
    buzz(12);
    afterChange(t, res.events.over);
    return true;
  }

  function undoMove() {
    const res = L.undo(state);
    if (!res) { sfx.nope(); return; }
    const t = now();
    state = res.state;
    best = Math.max(bestAtStart, state.score); // an undone move doesn't keep its record
    payCoins(res.events.cost);
    refilled([0, 1, 2], t);
    pops = []; fades = []; flyers = [];
    sfx.undo();
    buzz(10);
    afterChange(t, res.events.over);
  }

  function burst(cell, t0, count, speed, extraColor) {
    const [x, y] = cellCenter(cell.r, cell.c);
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed + Math.random() * 180;
      particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120,
        t0, life: 500 + Math.random() * 400,
        size: lay.cell * (0.12 + Math.random() * 0.14),
        color: extraColor && k % 3 === 0 ? extraColor : cell.kind ? SPECIAL_COLORS[cell.kind] : pal()[cell.color],
      });
    }
  }

  // Shared bookkeeping after any move: record, missions, game over, persistence.
  function afterChange(t, over) {
    if (state.mode !== 'adventure' && state.score > best) {
      best = state.score;
      if (!recordAnnounced && bestAtStart > 0) {
        recordAnnounced = true;
        banners.push({ text: 'Nouveau record !', sub: '', gold: true });
      }
    }
    checkMissions();
    if (over) endGame(t);
    renderInventory();
    save();
  }

  function checkMissions() {
    for (const m of M.missionStatus(profile, L.runStats(state))) {
      if (!m.done || announced.has(m.id)) continue;
      announced.add(m.id);
      banners.push({ text: 'Mission réussie', sub: m.text + ' · +' + m.reward, subIcon: 'coin', gold: true });
      sfx.mission();
    }
  }

  function resetAnnounced() {
    announced = new Set(M.missionStatus(profile, L.runStats(state)).filter((m) => m.done).map((m) => m.id));
  }
  resetAnnounced();

  // Bonus icons fly from their cell to the inventory button.
  function launchFlyers(collected, t, delayOf) {
    for (const b of collected) {
      const [x, y] = cellCenter(b.r, b.c);
      flyers.push({ ...b, x, y, t0: t + delayOf(b) });
    }
    if (collected.some((b) => !b.coins)) sfx.collect();
  }

  function useBonus(type, target) {
    const res = L.use(state, type, target);
    if (!res) return false;
    const ev = res.events;
    state = res.state;
    const t = now();

    if (type === 'bomb') {
      for (const cell of ev.cleared) {
        const delay = Math.hypot(cell.r - target.r, cell.c - target.c) * 45;
        fades.push({ ...cell, t0: t, delay });
        burst(cell, t + delay, 6, 120, '#ffb347');
      }
      const [fx, fy] = cellCenter(target.r, target.c);
      floaters.push({ text: '+' + ev.points, x: fx, y: fy, t0: t, big: true });
      launchFlyers(ev.collected, t, (b) => Math.hypot(b.r - target.r, b.c - target.c) * 45);
      if (ev.perfect) banners.push({ text: 'Grille vide !', sub: '+300' });
      shake = 18;
      sfx.bomb();
      buzz([30, 20, 50]);
    } else {
      const ui = BONUS_UI[type];
      banners.length = 0;
      banners.push({ icon: type, text: ui.name, sub: ui.hint, gold: true });
      refilled(ev.refilled, t);
      sfx.bonus();
      buzz(15);
    }

    afterChange(t, ev.over);
    return true;
  }

  // Pays out coins and advances missions for the current run, once.
  function settleRun() {
    if (runSettled) return null;
    runSettled = true;
    const res = M.applyRun(M.ensureDay(profile, today()), L.runStats(state));
    profile = res.profile;
    saveProfile();
    renderWallet();
    return res.report;
  }

  function endGame(t) {
    drag = null;
    showTrash(false);
    aiming = null;
    overAt = t;
    if (state.stage) { endLevel(); return; }
    best = Math.max(best, state.score);
    const report = settleRun();
    setTimeout(() => { sfx.over(); buzz([40, 60, 80]); }, 350);
    setTimeout(() => showGameOver(report), 1300);
    save();
  }

  // ---------- game over screen ----------
  const overEl = document.getElementById('over');
  const overCard = document.getElementById('over-card');

  function showGameOver(report) {
    document.getElementById('over-title').textContent = state.timeUp ? 'Temps écoulé !' : 'Plus de place !';
    document.getElementById('over-score').textContent = fmt(state.score);
    document.getElementById('over-best').textContent = 'Record : ' + fmt(best);
    overCard.classList.toggle('is-record', state.score >= best && state.score > bestAtStart && bestAtStart > 0);

    const earnEl = document.getElementById('over-earn');
    const coinsEl = document.getElementById('over-coins');
    earnEl.innerHTML = '';
    const lines = report ? report.earned : [];
    let shown = report ? report.coinsBefore : profile.coins;
    coinsEl.textContent = fmt(shown);
    lines.forEach((line, i) => {
      const row = document.createElement('div');
      row.className = 'earn-line';
      row.innerHTML = '<span></span><b></b>';
      row.firstChild.textContent = line.label;
      row.lastChild.innerHTML = '+' + line.coins + COIN;
      earnEl.appendChild(row);
      setTimeout(() => {
        row.classList.add('in');
        countCoins(coinsEl, shown, shown + line.coins);
        shown += line.coins;
      }, 350 + i * 420);
    });

    const linesDone = 350 + lines.length * 420;
    renderGoal(linesDone);
    lastReport = report;
    adBtn.classList.remove('show');
    adBtn.disabled = false;
    if (report && report.total > 0) {
      adBtn.innerHTML = `Regarder une pub · +${report.total}${COIN}`;
      setTimeout(() => adBtn.classList.add('show'), linesDone);
    }
    renderMissionList(document.getElementById('over-missions'), report ? report.completed : [], null);
    overEl.classList.add('show');
  }

  const adBtn = document.getElementById('over-ad');
  let lastReport = null;
  adBtn.addEventListener('click', async () => {
    if (!lastReport || adBtn.disabled) return;
    adBtn.disabled = true;
    const ok = await window.GridlockAds.showRewarded();
    if (!ok) { adBtn.disabled = false; return; }
    const report = lastReport;
    lastReport = null;
    const before = profile.coins;
    profile = M.doubleRun(profile, report);
    saveProfile();
    renderWallet();
    adBtn.classList.remove('show');
    const row = document.createElement('div');
    row.className = 'earn-line in';
    row.innerHTML = '<span>Bonus pub</span><b></b>';
    row.lastChild.innerHTML = '+' + report.total + COIN;
    document.getElementById('over-earn').appendChild(row);
    countCoins(document.getElementById('over-coins'), before, profile.coins);
    renderGoal(400);
    sfx.buy();
  });

  function countCoins(el, from, to) {
    const steps = Math.min(12, to - from);
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        el.textContent = fmt(Math.round(from + ((to - from) * i) / steps));
        sfx.coin(i);
      }, i * 28);
    }
  }

  function renderGoal(delay) {
    const el = document.getElementById('over-goal');
    const goal = M.nextGoal(profile);
    el.classList.remove('ready');
    if (!goal) { el.textContent = 'Toute la boutique est débloquée'; return; }
    const ready = profile.coins >= goal.price;
    const kind = goal.kind === 'blocks' ? 'les blocs' : 'le thème';
    el.innerHTML = '<span></span><div class="bar"><i></i></div>';
    el.firstChild.textContent = ready
      ? `« ${goal.name} » est disponible en boutique`
      : `Plus que ${fmt(goal.price - profile.coins)} pièces pour ${kind} « ${goal.name} »`;
    const bar = el.querySelector('.bar > i');
    setTimeout(() => {
      bar.style.width = Math.min(100, (profile.coins / goal.price) * 100) + '%';
      el.classList.toggle('ready', ready);
    }, delay);
  }

  // Today's missions. live: current run stats (in-game view). completed: finished by the run just ended.
  function renderMissionList(el, completed, live) {
    const status = M.missionStatus(profile, live || {});
    const allDone = status.every((m) => m.done);
    el.innerHTML = '<h3></h3>';
    el.firstChild.textContent = allDone ? 'Missions du jour · nouvelles demain' : 'Missions du jour';
    const fresh = new Set(completed.map((m) => m.id));
    for (const m of status) {
      const div = document.createElement('div');
      div.className = 'mission' + (m.done ? ' done' : '') + (fresh.has(m.id) ? ' new' : '');
      div.innerHTML = '<div class="top"><span></span><span class="reward"></span></div><div class="bar"><i></i></div><div class="num"></div>';
      div.querySelector('.top span').textContent = m.text;
      div.querySelector('.reward').innerHTML = '+' + m.reward + COIN;
      div.querySelector('.num').textContent = m.done ? 'Terminée' : `${fmt(m.current)} / ${fmt(m.target)}`;
      el.appendChild(div);
      const bar = div.querySelector('.bar > i');
      if (m.done) bar.parentElement.style.display = 'none';
      requestAnimationFrame(() => { bar.style.width = (m.current / m.target) * 100 + '%'; });
    }
  }

  // opts: { mode, level }; defaults to the current game's.
  function newGame(opts = {}) {
    profile = M.ensureDay(profile, today());
    saveProfile();
    if (state.mode !== 'adventure') bests[state.mode] = best;
    const mode = opts.mode || (state.mode === 'adventure' ? prefs.mode : state.mode);
    state = L.createGame(Date.now(), { mode, level: opts.level || state.level, budget: profile.coins, stage: opts.stage });
    levelSettled = false;
    paintBackground();
    best = bests[state.mode] || 0;
    bestAtStart = best;
    recordAnnounced = false;
    runSettled = false;
    runCoinsShown = 0;
    renderWallet();
    displayScore = 0;
    drag = null;
    returning = []; pops = []; fades = []; particles = []; floaters = [];
    banners = []; overAt = 0; slotIn = [now(), now(), now()]; slotSpin = [0, 0, 0]; nextIn = now();
    aiming = null; flyers = [];
    showTrash(false);
    syncMode();
    overEl.classList.remove('show');
    resetAnnounced();
    renderInventory();
    save();
  }

  document.getElementById('again').addEventListener('click', () => { unlockAudio(); newGame(); });

  // Ends the current run (coins and missions count) and starts a new one.
  function restartRun(opts) {
    const report = state.over ? null : settleRun();
    newGame(opts);
    if (report && report.total) banners.push({ icon: 'coin', text: '+' + report.total, sub: 'Pièces de la partie', gold: true });
  }

  const inProgress = () => !state.over && state.moves > 0;
  // ---------- home menu ----------
  const menuEl = document.getElementById('menu');
  const MODE_NAMES = { classic: 'Classique', chrono: 'Chrono', chill: 'Chill' };
  const LEVEL_NAMES = { easy: 'Facile', normal: 'Normal', hard: 'Difficile' };

  function renderMenu() {
    const cont = document.getElementById('menu-continue');
    cont.style.display = inProgress() ? '' : 'none';
    document.getElementById('menu-continue-sub').textContent = state.stage
      ? `Aventure · ${WD.WORLDS[state.stage.world].name} ${state.stage.n} · ${LV.goalText(state.stage.goal)}`
      : `${MODE_NAMES[state.mode]} · ${LEVEL_NAMES[state.level]} · ${fmt(state.score)} pts`;
    document.getElementById('menu-adventure-sub').textContent = `${M.totalStars(profile)} / ${M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3} étoiles`;
    document.getElementById('menu-adventure').className = 'btn wide ' + (inProgress() ? 'ghost' : 'primary');
    document.getElementById('menu-play').className = 'btn wide ' + (inProgress() ? 'ghost' : 'primary');
    for (const b of document.querySelectorAll('#menu-mode button')) b.classList.toggle('on', b.dataset.mode === prefs.mode);
    for (const b of document.querySelectorAll('#menu-level button')) b.classList.toggle('on', b.dataset.level === prefs.level);
  }

  function openMenu() {
    unlockAudio();
    drag = null;
    showTrash(false);
    setAiming(false);
    renderMenu();
    overEl.classList.remove('show');
    menuEl.classList.add('show');
  }
  const closeMenu = () => menuEl.classList.remove('show');

  document.getElementById('menu-open').addEventListener('click', openMenu);
  document.getElementById('over-menu').addEventListener('click', openMenu);
  document.getElementById('menu-continue').addEventListener('click', () => { unlockAudio(); closeMenu(); });
  menuEl.addEventListener('click', (e) => { if (e.target === menuEl && inProgress()) closeMenu(); });
  for (const b of document.querySelectorAll('#menu-mode button, #menu-level button')) {
    b.addEventListener('click', () => {
      unlockAudio();
      if (b.dataset.mode) prefs.mode = b.dataset.mode;
      if (b.dataset.level) prefs.level = b.dataset.level;
      sfx.turn();
      renderMenu();
      save();
    });
  }
  document.getElementById('menu-play').addEventListener('click', () => {
    unlockAudio();
    if (inProgress() && !confirm('Abandonner la partie en cours ? Les pièces gagnées sont gardées.')) return;
    closeMenu();
    restartRun({ mode: prefs.mode, level: prefs.level });
  });
  document.getElementById('menu-shop').addEventListener('click', openShop);

  // ---------- aventure ----------
  const adventureEl = document.getElementById('adventure');
  const worldEl = document.getElementById('world');
  const stageEl = document.getElementById('stage');
  const levelEndEl = document.getElementById('level-end');
  const STAR_PATH = 'M12 2.6l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1l-5.7 3 1.1-6.3L2.8 9.3l6.4-.9z';
  const starSvg = (on, size = 16) => `<svg class="star${on ? ' on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
  const starsRow = (n, size) => [0, 1, 2].map((k) => starSvg(k < n, size)).join('');
  const LOCK_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const worldName = (w) => WD.WORLDS[w].name;
  let stageBomb = false; // "start with a Bombe" option on the level sheet
  let openWorldId = null;

  function hideAdventure() {
    for (const el of [adventureEl, worldEl, stageEl, levelEndEl]) el.classList.remove('show');
  }

  function openAdventure() {
    unlockAudio();
    hideAdventure();
    menuEl.classList.remove('show');
    overEl.classList.remove('show');
    document.getElementById('adventure-stars').innerHTML = starSvg(true, 18) + fmt(M.totalStars(profile));
    const list = document.getElementById('worlds');
    list.innerHTML = '';
    for (const w of M.WORLD_ORDER) {
      const open = M.worldOpen(profile, w);
      const tile = document.createElement('button');
      tile.className = 'world-tile' + (open ? '' : ' locked');
      const cv = document.createElement('canvas');
      cv.width = 240; cv.height = 180;
      tile.appendChild(cv);
      drawPreview(cv, profile.equipped.blocks, w);
      tile.insertAdjacentHTML('beforeend', `<div class="name">${worldName(w)}</div>`);
      const meta = document.createElement('div');
      meta.className = 'meta';
      if (open) meta.innerHTML = starSvg(true, 13) + `${M.worldStars(profile, w)} / 30`;
      else {
        const prev = M.WORLD_ORDER[M.WORLD_ORDER.indexOf(w) - 1];
        const needStars = M.worldGate(w);
        meta.innerHTML = !M.levelCleared(profile, prev, M.LEVELS_PER_WORLD)
          ? `Bats le boss ${worldName(prev)}`
          : starSvg(true, 13) + `${needStars} requises`;
        tile.insertAdjacentHTML('beforeend', `<span class="lock">${LOCK_SVG}</span>`);
      }
      tile.appendChild(meta);
      tile.addEventListener('click', () => { if (open) { sfx.turn(); openWorld(w); } else sfx.nope(); });
      list.appendChild(tile);
    }
    adventureEl.classList.add('show');
  }

  function openWorld(w) {
    openWorldId = w;
    hideAdventure();
    document.getElementById('world-name').textContent = worldName(w);
    document.getElementById('world-stars').innerHTML = starSvg(true, 18) + `${M.worldStars(profile, w)} / 30`;
    const rules = WD.WORLDS[w];
    document.getElementById('world-rules').innerHTML =
      `<div class="plus"><b>+</b><span>${rules.plus}</span></div><div class="minus"><b>−</b><span>${rules.minus}</span></div>`;
    const grid = document.getElementById('levels');
    grid.innerHTML = '';
    for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) {
      const open = M.levelOpen(profile, w, n);
      const stars = M.levelStars(profile, w, n);
      const boss = n === M.LEVELS_PER_WORLD;
      const b = document.createElement('button');
      b.className = 'lvl' + (open ? '' : ' locked') + (stars !== undefined ? ' done' : '') + (boss ? ' boss' : '');
      b.innerHTML = `<span class="num">${open ? n : LOCK_SVG}</span>` +
        (boss ? '<small>Boss</small>' : `<span class="stars">${starsRow(stars || 0, 12)}</span>`);
      b.setAttribute('aria-label', `Niveau ${n}` + (open ? '' : ', verrouillé'));
      b.addEventListener('click', () => { if (open) { sfx.turn(); openStage(w, n); } else sfx.nope(); });
      grid.appendChild(b);
    }
    worldEl.classList.add('show');
  }

  // Level sheet: goal, budget, best stars, then play / skip / starting bonus.
  function openStage(w, n) {
    const stage = LV.level(w, n);
    const best = M.levelStars(profile, w, n);
    const card = document.getElementById('stage-card');
    const budget = stage.clock ? `${Math.round(stage.clock / 1000)} secondes (les lignes rajoutent du temps)` : `${stage.maxMoves} coups`;
    const canSkip = n < M.LEVELS_PER_WORLD && best === undefined;
    card.innerHTML = `
      <div class="shop-head">
        <button class="close" data-act="back" aria-label="Retour au monde"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <h2>${n === M.LEVELS_PER_WORLD ? 'Boss' : 'Niveau ' + n}</h2>
      </div>
      <div class="stage-sub">${worldName(w)}</div>
      <div class="stage-goal">${LV.goalText(stage.goal)}</div>
      <div class="stage-sub">${budget}</div>
      <div class="stage-stars">${starsRow(best || 0, 34)}</div>
      <button class="opt${stageBomb ? ' on' : ''}" data-act="bomb"><span>Partir avec une Bombe</span><span class="price">${M.START_BONUS_COST}${COIN}</span></button>
      ${canSkip ? `<button class="opt" data-act="skip"><span>Passer le niveau (sans étoile)</span><span class="price">${M.SKIP_COST}${COIN}</span></button>` : ''}
      <div class="actions"><button class="btn primary" data-act="play">Jouer</button></div>`;
    const bombBtn = card.querySelector('[data-act="bomb"]');
    bombBtn.disabled = profile.coins < M.START_BONUS_COST;
    if (bombBtn.disabled) stageBomb = false;
    card.querySelector('[data-act="back"]').addEventListener('click', () => openWorld(w));
    bombBtn.addEventListener('click', () => { stageBomb = !stageBomb; bombBtn.classList.toggle('on', stageBomb); sfx.turn(); });
    const skipBtn = card.querySelector('[data-act="skip"]');
    if (skipBtn) {
      skipBtn.disabled = profile.coins < M.SKIP_COST;
      skipBtn.addEventListener('click', () => {
        if (!confirm(`Passer ce niveau pour ${M.SKIP_COST} pièces ? Il ne rapporte aucune étoile.`)) return;
        const next = M.skipLevel(profile, w, n);
        if (!next) { sfx.nope(); return; }
        profile = next;
        saveProfile();
        renderWallet();
        sfx.buy();
        openWorld(w);
      });
    }
    card.querySelector('[data-act="play"]').addEventListener('click', () => startLevel(w, n));
    hideAdventure();
    stageEl.classList.add('show');
  }

  function startLevel(w, n) {
    unlockAudio();
    if (inProgress() && !state.stage && !confirm('Abandonner la partie en cours ? Les pièces gagnées sont gardées.')) return;
    const bomb = stageBomb && profile.coins >= M.START_BONUS_COST;
    stageBomb = false;
    hideAdventure();
    menuEl.classList.remove('show');
    restartRun({ mode: 'adventure', stage: LV.level(w, n) });
    if (bomb) {
      payCoins(M.START_BONUS_COST);
      state = { ...state, inventory: { ...state.inventory, bomb: state.inventory.bomb + 1 } };
      renderInventory();
      save();
    }
    banners.push({ text: n === M.LEVELS_PER_WORLD ? 'Boss !' : 'Niveau ' + n, sub: LV.goalText(state.stage.goal), gold: true });
  }

  // Level over: pay the run (grid coins, missions), record stars, then show the result.
  function endLevel() {
    const runReport = settleRun();
    let levelReport = null;
    const stage = state.stage;
    if (stage.won && !levelSettled) {
      levelSettled = true;
      const res = M.applyLevel(profile, stage.world, stage.n, stage.stars);
      profile = res.profile;
      saveProfile();
      renderWallet();
      levelReport = res.report;
    }
    setTimeout(() => { if (stage.won) { sfx.mission(); buzz([20, 40, 20]); } else { sfx.over(); buzz([40, 60, 80]); } }, 350);
    setTimeout(() => showLevelEnd(runReport, levelReport), stage.won ? 900 : 1300);
    save();
  }

  function nextLevelOf(w, n) {
    if (n < M.LEVELS_PER_WORLD) return [w, n + 1];
    const next = M.WORLD_ORDER[M.WORLD_ORDER.indexOf(w) + 1];
    return next && M.worldOpen(profile, next) ? [next, 1] : null;
  }

  function showLevelEnd(runReport, levelReport) {
    const stage = state.stage;
    const { world: w, n } = stage;
    const card = document.getElementById('level-end-card');
    const outOfMoves = !stage.won && !state.timeUp && stage.movesLeft <= 0;
    const title = stage.won
      ? (n === M.LEVELS_PER_WORLD ? 'Boss vaincu !' : 'Niveau réussi !')
      : state.timeUp ? 'Temps écoulé !' : outOfMoves ? 'Plus de coups !' : 'Plus de place !';
    const lines = [...(runReport ? runReport.earned : []), ...(levelReport ? levelReport.earned : [])];
    const total = lines.reduce((a, l) => a + l.coins, 0);
    const next = stage.won ? nextLevelOf(w, n) : null;
    const moreCost = M.extraMovesCost(stage.extra);
    card.innerHTML = `
      <h2>${title}</h2>
      <div class="stage-sub">${worldName(w)} · ${n === M.LEVELS_PER_WORLD ? 'Boss' : 'Niveau ' + n}</div>
      <div class="stage-stars">${starsRow(stage.stars, 44)}</div>
      <div class="stage-sub">${LV.goalText(stage.goal)} · ${fmt(Math.min(stage.goal.type === 'score' ? state.score : stage.progress, stage.goal.target))} / ${fmt(stage.goal.target)}</div>
      ${levelReport && levelReport.themeUnlocked ? `<div class="unlock">Thème « ${worldName(levelReport.themeUnlocked)} » débloqué ! Équipe-le dans la Boutique.</div>` : ''}
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>Pièces</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      ${outOfMoves ? `<button class="opt" data-act="more"><span>+${M.EXTRA_MOVES} coups pour finir (1 étoile max)</span><span class="price">${moreCost}${COIN}</span></button>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="map">Carte</button>
        <button class="btn ${next ? 'ghost' : 'primary'}" data-act="again">Rejouer</button>
        ${next ? '<button class="btn primary" data-act="next">Suivant</button>' : ''}
      </div>`;
    card.querySelector('[data-act="map"]').addEventListener('click', () => openWorld(w));
    card.querySelector('[data-act="again"]').addEventListener('click', () => startLevel(w, n));
    if (next) card.querySelector('[data-act="next"]').addEventListener('click', () => (next[1] === 1 && next[0] !== w ? openWorld(next[0]) : openStage(next[0], next[1])));
    const more = card.querySelector('[data-act="more"]');
    if (more) {
      more.disabled = profile.coins < moreCost;
      more.addEventListener('click', () => {
        const revived = L.addMoves(state, M.EXTRA_MOVES);
        if (!revived || profile.coins < moreCost) { sfx.nope(); return; }
        payCoins(moreCost);
        state = revived;
        overAt = 0;
        levelEndEl.classList.remove('show');
        banners.push({ text: `+${M.EXTRA_MOVES} coups`, sub: 'Dernière chance !', gold: true });
        sfx.buy();
        renderInventory();
        save();
      });
    }
    levelEndEl.classList.add('show');
  }

  document.getElementById('menu-adventure').addEventListener('click', openAdventure);
  document.getElementById('adventure-close').addEventListener('click', () => { hideAdventure(); openMenu(); });
  document.getElementById('world-back').addEventListener('click', openAdventure);
  for (const el of [adventureEl, worldEl, stageEl]) {
    el.addEventListener('click', (e) => { if (e.target === el) { hideAdventure(); openMenu(); } });
  }

  // ---------- settings ----------
  const settingsEl = document.getElementById('settings');
  if (!navigator.vibrate) document.getElementById('setting-vibrate').style.display = 'none';
  function renderSettings() {
    for (const t of document.querySelectorAll('.toggle')) t.setAttribute('aria-checked', String(!!settings[t.dataset.setting]));
  }
  for (const t of document.querySelectorAll('.toggle')) {
    t.addEventListener('click', () => {
      const key = t.dataset.setting;
      settings[key] = !settings[key];
      unlockAudio();
      renderSettings();
      if (key === 'sfx' && settings.sfx) sfx.turn();
      if (key === 'vibrate') buzz(20);
      save();
    });
  }
  document.getElementById('menu-settings').addEventListener('click', () => { renderSettings(); settingsEl.classList.add('show'); });
  document.getElementById('settings-close').addEventListener('click', () => settingsEl.classList.remove('show'));
  settingsEl.addEventListener('click', (e) => { if (e.target === settingsEl) settingsEl.classList.remove('show'); });

  // ---------- undo ----------
  const undoEl = document.getElementById('undo');
  undoEl.addEventListener('click', () => { unlockAudio(); setAiming(false); undoMove(); });
  function renderUndo() {
    const cost = L.undoCost(state);
    undoEl.disabled = !L.canUndo(state) || state.over;
    undoEl.querySelector('.badge').innerHTML = cost ? cost + COIN : 'Gratuit';
  }

  // Mode-specific chrome.
  function syncMode() {
    document.body.classList.toggle('chill', state.mode === 'chill');
    renderUndo();
  }
  document.addEventListener('visibilitychange', save);

  // ---------- wallet & shop ----------
  const walletEl = document.getElementById('wallet');
  let runCoinsShown = 0; // coins picked up this run, landed in the wallet animation

  function renderWallet() {
    // The logic mirrors the wallet to know if a paid discard / undo can still save a stuck game.
    const synced = L.withBudget(state, profile.coins);
    if (synced !== state) {
      const wasOver = state.over;
      state = synced;
      if (state.over && !wasOver) endGame(now());
      renderUndo();
    }
    document.getElementById('wallet-coins').textContent = fmt(profile.coins);
    const pending = document.getElementById('wallet-pending');
    pending.textContent = runCoinsShown && !runSettled ? '+' + runCoinsShown : '';
    document.getElementById('shop-coins').textContent = fmt(profile.coins);
  }
  walletEl.addEventListener('animationend', () => walletEl.classList.remove('bump'));
  renderWallet();

  const shopEl = document.getElementById('shop');
  const shopBody = document.getElementById('shop-body');
  let shopTab = 'boards';

  function openShop() {
    unlockAudio();
    const rolled = M.ensureDay(profile, today());
    if (rolled !== profile) { profile = rolled; saveProfile(); resetAnnounced(); }
    setAiming(false);
    renderShop();
    shopEl.classList.add('show');
  }
  document.getElementById('wallet').addEventListener('click', openShop);
  document.getElementById('shop-close').addEventListener('click', () => shopEl.classList.remove('show'));
  shopEl.addEventListener('click', (e) => { if (e.target === shopEl) shopEl.classList.remove('show'); });
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => { shopTab = tab.dataset.tab; renderShop(); });
  }

  function renderShop(justBought) {
    renderWallet();
    for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('on', tab.dataset.tab === shopTab);
    shopBody.innerHTML = '';
    if (shopTab === 'missions') {
      const list = document.createElement('div');
      list.className = 'missions';
      shopBody.appendChild(list);
      renderMissionList(list, [], state.over ? {} : L.runStats(state));
      return;
    }
    const kind = shopTab;
    const grid = document.createElement('div');
    grid.className = 'skins';
    for (const skin of M.SKINS[kind]) {
      const owned = profile.owned[kind].includes(skin.id);
      const equipped = profile.equipped[kind] === skin.id;
      const card = document.createElement('div');
      card.className = 'skin' + (justBought === skin.id ? ' just-bought' : '');
      const cv = document.createElement('canvas');
      cv.width = 240; cv.height = 180;
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = skin.name;
      const btn = document.createElement('button');
      if (equipped) { btn.className = 'equipped'; btn.textContent = 'Équipé'; }
      else if (owned) { btn.className = 'equip'; btn.textContent = 'Équiper'; }
      else {
        btn.className = 'buy';
        btn.innerHTML = COIN + ' ' + fmt(skin.price);
        btn.disabled = profile.coins < skin.price;
      }
      btn.addEventListener('click', () => {
        if (equipped) return;
        const next = owned ? M.equip(profile, kind, skin.id) : M.buy(profile, kind, skin.id);
        if (!next) { sfx.nope(); return; }
        profile = next;
        saveProfile();
        if (kind === 'boards') paintBackground();
        if (owned) sfx.turn(); else { sfx.buy(); buzz([20, 40, 20]); }
        renderShop(owned ? null : skin.id);
      });
      card.append(cv, name, btn);
      grid.appendChild(card);
      drawPreview(cv, kind === 'blocks' ? skin.id : profile.equipped.blocks, kind === 'boards' ? skin.id : profile.equipped.boards);
    }
    shopBody.appendChild(grid);
  }

  // Mini scene rendered with the real theme and skin code: score sign over a patch of board.
  function drawPreview(cv, blocksId, boardsId) {
    const g = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    const th = THEMES[boardsId];
    th.paint(g, w, h);
    const cell = 30;
    const cols = 5;
    const rows = 3;
    const ox = (w - cols * cell) / 2;
    const oy = 64;
    const pw = 132;
    drawPlate(g, th.plate, (w - pw) / 2, 12, pw, 40);
    g.textAlign = 'center';
    g.fillStyle = th.plate.ink;
    g.font = themeFont(th, 26);
    if (th.plate.glow) { g.shadowColor = th.plate.glow; g.shadowBlur = 10; }
    g.fillText('12 480', w / 2, 42);
    g.shadowColor = 'transparent';
    drawFrame(g, th, ox - 7, oy - 7, cols * cell + 14, rows * cell + 14);
    const pattern = [
      [6, 6, 0, 11, 0],
      [6, 6, 11, 11, 3],
      [9, 0, 11, 4, 3],
    ];
    const prev = ctx;
    ctx = g;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + (c + 0.5) * cell;
        const y = oy + (r + 0.5) * cell;
        drawEmpty(g, th, x, y, cell);
        const v = pattern[r][c];
        if (v) drawBlock(x, y, cell, paletteOf(th)[v], 1, 1, null, BLOCK_SKINS[blocksId]);
      }
    }
    ctx = prev;
  }

  // ---------- inventory bar ----------
  const invButtons = {};
  for (const type of Object.keys(BONUS_UI)) {
    const btn = document.createElement('button');
    btn.className = 'inv-btn';
    btn.setAttribute('aria-label', BONUS_UI[type].name);
    btn.dataset.tip = BONUS_UI[type].name + ' — ' + BONUS_UI[type].desc;
    btn.innerHTML = '<canvas class="icon"></canvas><span class="count"></span>';
    const cv = btn.querySelector('canvas');
    const px = Math.round(32 * Math.min(window.devicePixelRatio || 1, 3));
    cv.width = px; cv.height = px;
    drawIcon(type, px / 2, px / 2, px * 0.94, cv.getContext('2d'));
    if (type === 'bomb') bindBombDrag(btn);
    else {
      btn.addEventListener('click', () => {
        unlockAudio();
        if (state.over || !(state.inventory[type] > 0)) return;
        setAiming(false);
        useBonus(type);
      });
    }
    btn.addEventListener('animationend', () => btn.classList.remove('bump'));
    invEl.appendChild(btn);
    invButtons[type] = btn;
  }

  // The bomb is dragged from its button onto the grid like a piece. A plain tap falls back
  // to aim mode (tap a cell on the grid), tapping the button again cancels.
  function bindBombDrag(btn) {
    btn.addEventListener('pointerdown', (e) => {
      unlockAudio();
      if (state.over || !(state.inventory.bomb > 0)) return;
      if (aiming && !aiming.drag) { setAiming(false); return; }
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      const lift = e.pointerType === 'mouse' ? 0 : lay.cell * 1.8;
      aiming = { drag: true, pid: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, lift, cell: null };
      renderInventory();
      sfx.pick();
    });
    btn.addEventListener('pointermove', (e) => {
      if (!aiming || !aiming.drag || aiming.pid !== e.pointerId) return;
      aiming.x = e.clientX;
      aiming.y = e.clientY;
      aiming.cell = boardCellAt(e.clientX, e.clientY - aiming.lift);
    });
    const release = (e) => {
      if (!aiming || !aiming.drag || aiming.pid !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - aiming.sx, e.clientY - aiming.sy) > 12;
      if (!moved && e.type === 'pointerup') {
        aiming = { cell: null, pid: null };
        renderInventory();
        return;
      }
      const cell = aiming.cell;
      setAiming(false);
      if (e.type !== 'pointerup' || !cell) return;
      if (!useBonus('bomb', { r: cell[0], c: cell[1] })) sfx.nope();
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  }

  // Legend: what every icon does (mobile has no hover).
  const legendEl = document.getElementById('legend');
  const legendBtn = document.createElement('button');
  legendBtn.className = 'inv-btn legend-btn';
  legendBtn.textContent = '?';
  legendBtn.setAttribute('aria-label', 'Légende des bonus');
  invEl.appendChild(legendBtn);
  const legendList = document.getElementById('legend-list');
  for (const [type, ui] of [...Object.entries(BONUS_UI), ...Object.entries(COIN_UI)]) {
    const row = document.createElement('div');
    row.className = 'legend-row';
    const cv = document.createElement('canvas');
    const px = Math.round(40 * Math.min(window.devicePixelRatio || 1, 3));
    cv.width = px; cv.height = px;
    drawIcon(type, px / 2, px / 2, px * 0.94, cv.getContext('2d'));
    const text = document.createElement('div');
    text.innerHTML = '<b></b><span></span>';
    text.firstChild.textContent = ui.name;
    text.lastChild.textContent = ui.desc;
    row.append(cv, text);
    legendList.appendChild(row);
  }
  legendBtn.addEventListener('click', () => { setAiming(false); legendEl.classList.add('show'); });
  document.getElementById('legend-close').addEventListener('click', () => legendEl.classList.remove('show'));
  legendEl.addEventListener('click', (e) => { if (e.target === legendEl) legendEl.classList.remove('show'); });

  function setAiming(on) {
    aiming = on ? { cell: null, pid: null } : null;
    renderInventory();
  }

  const giveUpBtn = document.getElementById('give-up');
  giveUpBtn.addEventListener('click', () => {
    const next = L.giveUp(state);
    if (!next) return;
    state = next;
    endGame(now());
    renderInventory();
  });

  let invKey = '';
  function renderInventory() {
    renderUndo();
    giveUpBtn.classList.toggle('show', !!state.stuck && !state.over && !aiming);
    giveUpBtn.style.top = Math.round(lay.ty + lay.trayH / 2) + 'px';
    const key = JSON.stringify([state.inventory, !!aiming, state.stuck, state.over,
      Object.keys(state.effects).filter((k) => state.effects[k] > 0)]);
    if (key === invKey) return;
    invKey = key;
    for (const [type, btn] of Object.entries(invButtons)) {
      const n = state.inventory[type] || 0;
      btn.querySelector('.count').textContent = n;
      btn.classList.toggle('empty', n === 0 || state.over);
      btn.classList.toggle('active', state.effects[type] > 0);
      btn.classList.toggle('aiming', type === 'bomb' && !!aiming);
      const helps = type === 'bomb' || type === 'reroll' || type === 'rotate';
      btn.classList.toggle('help', state.stuck && n > 0 && helps && !aiming);
    }
  }
  renderInventory();

  // ---------- render ----------
  let last = now();
  // Timed bonuses drain as a ring around their inventory button.
  function syncTimers() {
    for (const [type, btn] of Object.entries(invButtons)) {
      const ms = state.effects[type] || 0;
      if (!ms && !btn.style.getPropertyValue('--left')) continue;
      btn.style.setProperty('--left', ms ? Math.min(1, ms / L.EFFECT_MS).toFixed(3) : '');
      btn.classList.toggle('ending', ms > 0 && ms < 5000);
    }
  }

  // Timers (bonuses, chrono) only run while actually playing.
  const pausedByUi = () => document.querySelector('.overlay.show') !== null;

  function frame() {
    const t = now();
    syncTimers();
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    // Bonus timers only run while actually playing.
    if (!pausedByUi()) {
      const ticked = L.tick(state, dt * 1000);
      if (ticked !== state) {
        const wasOver = state.over;
        state = ticked;
        if (state.over && !wasOver) endGame(t);
        renderInventory();
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(bgCanvas, 0, 0, W, H);
    if (theme().animate) theme().animate(ctx, W, H, t);

    shake *= 0.86;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    drawHUD(t);
    ctx.save();
    ctx.translate(sx, sy);
    drawBoard(t);
    drawFades(t);
    if (aiming) drawAim(t);
    ctx.restore();
    drawTray(t);
    drawChrono(t);
    drawHint(t);
    drawReturning(t);
    drawParticles(t, dt);
    drawFloaters(t);
    drawFlyers(t);
    drawBanner(t);
    if (drag) {
      const g = dragGeometry(drag, t);
      drawPiece(g.piece, g.cx, g.cy, g.size, 1);
    }
    if (aiming && aiming.drag) drawIcon('bomb', aiming.x, aiming.y - aiming.lift, lay.cell * 1.1);
    requestAnimationFrame(frame);
  }

  function drawHUD(t) {
    displayScore += (state.score - displayScore) * 0.18;
    if (Math.abs(state.score - displayScore) < 0.5) displayScore = state.score;
    const th = theme();
    const p = th.plate;
    let pw = Math.min(lay.board * 0.62, 244);
    if (lay.compact) {
      // Fit between the wallet and the undo button.
      const room = Math.min(W / 2 - walletEl.getBoundingClientRect().right, undoEl.getBoundingClientRect().left - W / 2);
      pw = Math.min(pw, room * 2 - 16);
    }
    const ph = lay.plateH;
    const px = W / 2 - pw / 2;
    const py = lay.plateY;
    const bump = state.score !== Math.round(displayScore) ? 1.05 : 1;

    drawPlate(ctx, p, px, py, pw, ph, t);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // Aventure: the plate shows the goal progress and the moves left instead of score / record.
    const stage = state.stage;
    let sub = 'RECORD ' + fmt(best);
    let main = fmt(Math.round(displayScore));
    let lowMoves = false;
    if (stage) {
      const progress = stage.goal.type === 'score' ? Math.round(displayScore) : stage.progress;
      main = fmt(Math.min(progress, stage.goal.target)) + ' / ' + fmt(stage.goal.target);
      sub = LV.goalLabel(stage.goal) + (stage.clock ? '' : ' · ' + stage.movesLeft + (stage.movesLeft > 1 ? ' COUPS' : ' COUP'));
      lowMoves = !stage.clock && stage.movesLeft <= 3 && !state.over;
    }
    ctx.fillStyle = lowMoves ? th.danger : p.sub;
    ctx.globalAlpha = lowMoves ? 0.7 + 0.3 * Math.sin(t / 120) : 1;
    ctx.font = themeFont(th, 12);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
    ctx.fillText(sub, W / 2, py + ph * 0.32);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
    ctx.save();
    if (p.glow) { ctx.shadowColor = p.glow; ctx.shadowBlur = 12; }
    ctx.fillStyle = p.ink;
    ctx.font = themeFont(th, Math.round(ph * (stage ? 0.52 : 0.64) * bump));
    ctx.fillText(main, W / 2, py + ph - ph * 0.13);
    ctx.restore();

    // Combo: small pill hung under the score.
    if (state.combo > 0) {
      const left = L.COMBO_GRACE - state.movesSinceClear;
      const pulse = left === 1 ? 0.55 + 0.45 * Math.abs(Math.sin(t / 180)) : 1;
      const tag = th.tag;
      const label = 'COMBO ×' + state.combo;
      ctx.font = themeFont(th, 17);
      const tw = ctx.measureText(label).width + 20 + L.COMBO_GRACE * 11 + 8;
      const tx = W / 2 - tw / 2;
      const ty = py + ph + 4;
      ctx.globalAlpha = pulse;
      ctx.save();
      if (tag.glow) { ctx.shadowColor = tag.glow; ctx.shadowBlur = 10; }
      ctx.fillStyle = tag.fill;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, 25, 12.5); ctx.fill();
      ctx.restore();
      if (tag.line) {
        ctx.strokeStyle = tag.line; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(tx + 2.5, ty + 2.5, tw - 5, 20, 4); ctx.stroke();
      }
      ctx.fillStyle = tag.ink;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tx + 11, ty + 14);
      for (let i = 0; i < L.COMBO_GRACE; i++) {
        ctx.globalAlpha = pulse * (i < left ? 1 : 0.25);
        ctx.beginPath();
        ctx.arc(tx + tw - 12 - (L.COMBO_GRACE - 1 - i) * 11, ty + 12.5, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  }

  function drawBoard(t) {
    const { bx, by, board, cell } = lay;
    const th = theme();
    drawFrame(ctx, th, bx - 10, by - 10, board + 20, board + 20);

    // Preview: ghost of the dragged piece + lines it would clear.
    let ghost = null;
    let preview = null;
    if (drag) {
      const g = dragGeometry(drag, t);
      if (g.valid) {
        ghost = g;
        preview = L.previewClears(state.board, g.piece, g.row, g.col);
      }
    }

    const overK = overAt ? easeOut((t - overAt) / 900) : 0;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const [x, y] = cellCenter(r, c);
        const i = r * SIZE + c;
        const v = state.board[i];
        drawEmpty(ctx, th, x, y, cell);
        if (!v) continue;

        let scale = 1;
        const pop = pops.find((p) => p.r === r && p.c === c);
        if (pop) {
          const k = (t - pop.t0) / 220;
          scale = k < 1 ? 1 + 0.16 * Math.sin(k * Math.PI) : 1;
        }
        const alpha = 1 - overK * 0.65;
        if (v === L.SPECIAL && state.special && state.special[i]) {
          drawSpecial(state.special[i], x, y, cell, t, alpha, scale);
          continue;
        }
        const color = preview && preview.has(i) ? pal()[ghost.piece.color] : pal()[v];
        drawBlock(x, y, cell, color, alpha, scale, state.bonus[i]);
      }
    }
    pops = pops.filter((p) => t - p.t0 < 240);

    if (ghost) {
      const b = ghost.piece.bonus;
      for (const [r, c] of ghost.piece.cells) {
        const [x, y] = cellCenter(ghost.row + r, ghost.col + c);
        drawBlock(x, y, cell, pal()[ghost.piece.color], 0.35, 1, b && b.r === r && b.c === c ? b.type : null);
      }
      if (preview && preview.size) {
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t / 90);
        ctx.fillStyle = '#fff';
        for (const i of preview) {
          const [x, y] = cellCenter(Math.floor(i / SIZE), i % SIZE);
          ctx.beginPath();
          ctx.roundRect(x - cell * 0.45, y - cell * 0.45, cell * 0.9, cell * 0.9, cell * 0.18);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // Small instruction line between the board and the tray.
  function drawHint(t) {
    let text = null;
    if (aiming && aiming.drag) text = 'Lâche la bombe sur la grille';
    else if (aiming) text = 'Touche la grille pour viser · ailleurs pour annuler';
    else if (state.stuck) {
      const inv = state.inventory;
      if (inv.bomb > 0 || inv.reroll > 0 || inv.rotate > 0) text = 'Bloqué ! Utilise un bonus ou termine la partie';
      else if (L.canUndo(state)) text = 'Bloqué ! Annule ton coup ou jette une pièce';
      else text = 'Bloqué ! Glisse une pièce en bas pour la jeter';
    }
    if (!text) return;
    const chrono = state.mode === 'chrono' || !!(state.stage && state.stage.clock);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t / 200);
    const th = theme();
    ctx.fillStyle = aiming ? th.danger : th.accent;
    ctx.font = themeFont(th, chrono ? 13 : 15);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const gapTop = lay.by + lay.board + 10;
    ctx.fillText(text, W / 2, chrono ? gapTop + 2 : gapTop + (lay.ty - gapTop) / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  function drawAim(t) {
    const { cell } = lay;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.roundRect(lay.bx - 10, lay.by - 10, lay.board + 20, lay.board + 20, theme().frame.r); ctx.fill();
    if (!aiming.cell) return;
    const [r0, c0] = aiming.cell;
    const pulse = 0.35 + 0.15 * Math.sin(t / 80);
    for (const [r, c] of L.bombArea(r0, c0)) {
      const [x, y] = cellCenter(r, c);
      ctx.fillStyle = `rgba(255,93,115,${pulse})`;
      ctx.beginPath();
      ctx.roundRect(x - cell * 0.46, y - cell * 0.46, cell * 0.92, cell * 0.92, cell * 0.18);
      ctx.fill();
    }
    if (aiming.drag) return;
    const [x, y] = cellCenter(r0, c0);
    drawIcon('bomb', x, y, cell * 0.8);
  }

  function drawFlyers(t) {
    flyers = flyers.filter((f) => t - f.t0 < 650);
    for (const f of flyers) {
      const k = (t - f.t0) / 650;
      if (k < 0) continue;
      const target = f.coins ? walletEl : invButtons[f.type];
      const rect = target.getBoundingClientRect();
      const tx = rect.left + rect.width / 2;
      const ty = rect.top + rect.height / 2;
      const e = easeOut(k);
      const x = f.x + (tx - f.x) * e;
      const y = f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * lay.cell * 1.5;
      drawIcon(f.type, x, y, lay.cell * (0.8 - 0.3 * k));
      if (k > 0.95 && !f.landed) {
        f.landed = true;
        target.classList.add('bump');
        if (f.coins) { runCoinsShown += f.coins; renderWallet(); sfx.coin(2); }
        if (f.overflow) floaters.push({ text: '+50', x: tx, y: ty - 30, t0: t });
      }
    }
  }

  function drawFades(t) {
    fades = fades.filter((f) => t - f.t0 - f.delay < 320);
    for (const f of fades) {
      const k = (t - f.t0 - f.delay) / 320;
      const [x, y] = cellCenter(f.r, f.c);
      if (f.kind) { drawSpecial({ kind: f.kind, hp: 1 }, x, y, lay.cell, t, k < 0 ? 1 : 1 - k, k < 0 ? 1 : 1.1 - easeOut(k)); continue; }
      if (k < 0) { drawBlock(x, y, lay.cell, pal()[f.color]); continue; }
      const flash = k < 0.25 ? '#ffffff' : pal()[f.color];
      drawBlock(x, y, lay.cell, flash, 1 - k, 1.1 - easeOut(k));
    }
  }

  function drawTray(t) {
    const m = miniCell();
    // Chill turns pieces all the time: no need to flag the slots.
    const canTurn = state.effects.rotate > 0 && !state.over;
    drawNext(t);
    for (let i = 0; i < 3; i++) {
      const piece = state.tray[i];
      if (!piece || returning.some((p) => p.idx === i)) continue;
      const [cx, cy] = slotCenter(i);
      if (canTurn) {
        ctx.fillStyle = withAlpha(theme().accent, 0.06 + 0.04 * Math.sin(t / 250 + i));
        ctx.beginPath();
        ctx.roundRect(cx - lay.slotW / 2 + 6, lay.ty + 4, lay.slotW - 12, lay.trayH - 8, 16);
        ctx.fill();
      }
      if (drag && drag.idx === i) continue;
      const k = easeBack((t - slotIn[i]) / 380);
      const offset = (1 - k) * (lay.nextX + lay.nextW / 2 - cx);
      const fits = L.pieceFits(state, piece);
      const spin = slotSpin[i] ? 1 - easeBack((t - slotSpin[i]) / 260) : 0;
      ctx.save();
      ctx.translate(cx + offset, cy);
      ctx.rotate(-spin * Math.PI / 2);
      drawPiece(piece, 0, 0, m, fits ? 1 : 0.28);
      ctx.restore();
    }
  }

  // Narrow column right of the tray: the piece that fills the next emptied slot.
  function drawNext(t) {
    const { nextX, nextW, ty, trayH } = lay;
    const th = theme();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.roundRect(nextX + 4, ty + 6, nextW - 6, trayH - 12, 12); ctx.fill();
    ctx.fillStyle = withAlpha(th.ink, 0.6);
    ctx.font = themeFont(th, 10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    ctx.fillText('ENSUITE', nextX + nextW / 2 + 1, ty + 20);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';
    const piece = state.next;
    if (!piece) return;
    const size = Math.min(miniCell() * 0.62, (nextW - 16) / Math.max(piece.w, piece.h, 3));
    const k = easeOut((t - nextIn) / 320);
    drawPiece(piece, nextX + nextW / 2 + 2, ty + trayH / 2 + 6 + (1 - k) * 20, size, 0.75 * k);
  }

  // Chrono mode: time bar in the gap between the board and the tray.
  function chronoBar() {
    return [lay.bx, lay.by + lay.board + 10 + (lay.ty - lay.by - lay.board - 10) * 0.62];
  }

  function drawChrono(t) {
    const timed = state.stage && state.stage.clock;
    if (state.mode !== 'chrono' && !timed) return;
    const th = theme();
    const lv = timed ? { clockMax: state.stage.clock } : L.LEVELS[state.level] || L.LEVELS.normal;
    const [x, y] = chronoBar();
    const secs = Math.ceil(state.clock / 1000);
    const low = state.clock < 10000 && !state.over;
    const labelW = 44;
    ctx.font = themeFont(th, 16);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = low ? th.danger : th.ink;
    ctx.globalAlpha = low ? 0.65 + 0.35 * Math.sin(t / 90) : 1;
    ctx.fillText(Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'), x, y + 1);
    ctx.globalAlpha = 1;
    const bw = lay.board - labelW;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.roundRect(x + labelW, y - 4, bw, 8, 4); ctx.fill();
    ctx.fillStyle = low ? th.danger : th.accent;
    ctx.beginPath(); ctx.roundRect(x + labelW, y - 4, Math.max(8, bw * Math.min(1, state.clock / lv.clockMax)), 8, 4); ctx.fill();
    ctx.textBaseline = 'alphabetic';
    // Last seconds tick.
    if (low && secs !== lastTickSec && !pausedByUi()) { lastTickSec = secs; sfx.tick(secs <= 3); }
  }
  let lastTickSec = 0;

  function drawReturning(t) {
    returning = returning.filter((p) => t - p.t0 < 200 && state.tray[p.idx]);
    for (const p of returning) {
      const k = easeOut((t - p.t0) / 200);
      const [tx, ty] = slotCenter(p.idx);
      const piece = state.tray[p.idx];
      drawPiece(piece, p.x + (tx - p.x) * k, p.y + (ty - p.y) * k, p.size + (miniCell() - p.size) * k);
    }
  }

  function drawParticles(t, dt) {
    particles = particles.filter((p) => t - p.t0 < p.life);
    for (const p of particles) {
      if (t < p.t0) continue;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = (t - p.t0) / p.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.color;
      const s = p.size * (1 - k * 0.5);
      ctx.beginPath(); ctx.roundRect(p.x - s / 2, p.y - s / 2, s, s, s * 0.25); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(t) {
    floaters = floaters.filter((f) => t - f.t0 < 900);
    ctx.textAlign = 'center';
    const th = theme();
    for (const f of floaters) {
      const k = (t - f.t0) / 900;
      ctx.globalAlpha = 1 - easeOut(Math.max(0, (k - 0.5) * 2));
      ctx.fillStyle = th.ink;
      ctx.font = themeFont(th, f.big ? 32 : 20);
      ctx.strokeStyle = withAlpha(th.base, 0.92);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      const y = f.y - easeOut(k) * lay.cell * 1.4;
      ctx.strokeText(f.text, f.x, y);
      ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawBanner(t) {
    const banner = banners[0];
    if (!banner) return;
    banner.t0 ??= t;
    const k = (t - banner.t0) / 1300;
    if (k >= 1) { banners.shift(); return; }
    const scale = easeBack(k * 4);
    const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.save();
    ctx.translate(W / 2, lay.by + lay.board * 0.42);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    const th = theme();
    ctx.strokeStyle = withAlpha(th.base, 0.95);
    const fit = (text, weight, size) => {
      ctx.font = themeFont(th, size, weight);
      const w = ctx.measureText(text).width;
      const maxW = lay.board - 24;
      if (w > maxW) ctx.font = themeFont(th, Math.floor((size * maxW) / w), weight);
    };
    const iconSize = lay.cell * 0.9;
    fit(banner.text, th.weight, Math.round(lay.cell * 1.05));
    const textW = ctx.measureText(banner.text).width;
    const shift = banner.icon ? (iconSize + 10) / 2 : 0;
    ctx.lineWidth = 10;
    ctx.strokeText(banner.text, shift, 0);
    ctx.fillStyle = banner.gold ? th.accent : th.ink;
    ctx.fillText(banner.text, shift, 0);
    if (banner.icon) drawIcon(banner.icon, shift - textW / 2 - 10 - iconSize / 2, -lay.cell * 0.32, iconSize);
    if (banner.sub) {
      fit(banner.sub, th.weight, Math.round(lay.cell * 0.5));
      const subW = ctx.measureText(banner.sub).width;
      const subShift = banner.subIcon ? -lay.cell * 0.25 : 0;
      ctx.lineWidth = 6;
      ctx.strokeText(banner.sub, subShift, lay.cell * 0.7);
      ctx.fillStyle = th.accent;
      ctx.fillText(banner.sub, subShift, lay.cell * 0.7);
      if (banner.subIcon) drawIcon(banner.subIcon, subShift + subW / 2 + lay.cell * 0.3, lay.cell * 0.55, lay.cell * 0.45);
    }
    ctx.restore();
  }

  // One-time note after the redesign refunded retired skins.
  if (migrated.refund) {
    const note = document.createElement('div');
    note.className = 'menu-note';
    note.innerHTML = `Nouveau look ! Tes anciens skins ont été remboursés : <b>+${fmt(migrated.refund)} ${COIN}</b>`;
    menuEl.querySelector('.brand').after(note);
  }

  // Canvas text does not wait for web fonts: repaint once they are in.
  if (document.fonts) document.fonts.load(`800 20px "Baloo 2"`).then(() => document.fonts.ready).then(paintBackground, () => {});

  // Start on the home menu; timers stay paused until the player picks something.
  syncMode();
  renderMenu();
  menuEl.classList.add('show');
  requestAnimationFrame(frame);
})();
