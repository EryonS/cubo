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
  const T = window.GridlockTutorial;
  const PZ = window.GridlockPuzzles;
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
  // hint(lv): shown when fired. desc(lv): legend + hover tooltip. lv: upgrade level 1..3 (Boutique).
  // levels: what each upgrade level gives, shown in the Boutique.
  const secs = (type, lv) => L.EFFECT_BY_LEVEL[type][lv - 1] / 1000;
  const times = (n) => '×' + String(n).replace('.', ',');
  const BONUS_UI = {
    rotate: { name: 'Toupie', hint: () => 'Touche une forme pour la tourner',
      desc: (lv) => `${secs('rotate', lv)} s : touche une forme du bac pour la faire pivoter.`, levels: ['30 s', '45 s', '60 s'] },
    nitro: { name: 'Étoile', hint: (lv) => 'Points ' + times(L.NITRO_BY_LEVEL[lv - 1]),
      desc: (lv) => `30 s : tous les points comptent ${lv === 1 ? 'double' : times(L.NITRO_BY_LEVEL[lv - 1])}.`, levels: ['Points ×2', 'Points ×2,5', 'Points ×3'] },
    shield: { name: 'Bulle', hint: () => 'Le combo ne casse plus',
      desc: (lv) => `${secs('shield', lv)} s : ton combo ne peut pas retomber.`, levels: ['30 s', '45 s', '60 s'] },
    bomb: { name: 'Bombe', hint: () => 'Glisse-la sur la grille',
      desc: (lv) => 'Glisse-la sur la grille : ' + ['elle fait sauter une zone de 21 cases.', 'elle fait sauter un carré de 25 cases.', 'carré de 25 cases, plus toute la ligne et la colonne.'][lv - 1],
      levels: ['21 cases', 'Carré de 25', 'Carré + grande croix'] },
    reroll: { name: 'Tornade', hint: () => 'Nouvelles formes',
      desc: (lv) => ['Remplace les 3 formes du bac.', 'Remplace les 3 formes du bac par des formes qui rentrent.', 'Remplace les 3 formes du bac par des petites formes qui rentrent.'][lv - 1],
      levels: ['Au hasard', 'Qui rentrent', 'Petites, qui rentrent'] },
  };
  // Upgrade level of a bonus in the current run (bought levels apply to the run in progress too).
  const bonusLv = (type) => L.upLevel(state, type);
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
  // --scheme: light themes get the dark menu palette when "Menus sombres" is on (dark ones keep theirs).
  const css = (o) => ({
    '--scheme': 'dark', '--good': '#5ee08a', '--hairline': 'rgba(255,255,255,0.12)', '--sunken': 'rgba(0,0,0,0.3)',
    '--scrim': 'rgba(6,7,10,0.72)', '--card-edge': 'inset 0 0 0 2px var(--edge)', '--plate-edge': 'inset 0 0 0 1.5px var(--edge)',
    ...o,
  });
  const lightCss = (o) => css({
    '--scheme': 'light', '--hairline': 'rgba(74,58,102,0.14)', '--sunken': 'rgba(74,58,102,0.1)', '--scrim': 'rgba(74,58,102,0.45)',
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
        '--card-edge': 'inset 0 0 0 4px var(--edge)', '--plate-edge': 'inset 0 0 0 2px var(--edge)',
        '--accent-dark': '#9bbc0f', '--on-accent-dark': '#0f380f',
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

  // Puzzle frame: follows the drawing instead of the square (one padded rounded tile per cell of the
  // drawing, filled as a single path so the shadow stays one piece). No frame line: it would cut
  // through the joins.
  function drawShapedFrame(g, th, inside) {
    const { bx, by, cell } = lay;
    const pad = 10;
    const path = new Path2D();
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (!inside(i)) continue;
      const x = bx + (i % SIZE) * cell;
      const y = by + Math.floor(i / SIZE) * cell;
      path.roundRect(x - pad, y - pad, cell + pad * 2, cell + pad * 2, Math.min(th.frame.r, pad + cell * 0.2));
    }
    g.save();
    g.shadowColor = th.shadow || 'rgba(0,0,0,0.35)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    g.fillStyle = th.board;
    g.fill(path, 'nonzero');
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
    // "Or": the 30-day streak reward. Keeps the family color under a gold rim and sheen.
    gold(x, y, s, color) {
      const r = s * 0.22;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x, y, s, s, r); ctx.fill();
      const rim = ctx.createLinearGradient(x, y, x + s, y + s);
      rim.addColorStop(0, '#fff3b0'); rim.addColorStop(0.45, '#f5c542'); rim.addColorStop(1, '#b07a12');
      ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1.5, s * 0.12);
      ctx.beginPath(); ctx.roundRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, r * 0.8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.moveTo(x + s * 0.18, y + s * 0.62); ctx.lineTo(x + s * 0.6, y + s * 0.2); ctx.lineTo(x + s * 0.74, y + s * 0.2); ctx.lineTo(x + s * 0.32, y + s * 0.62); ctx.fill();
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
  // Free-play records live in `bests` (Mondes: one per world, 'worlds-<id>'); Aventure has none.
  const keepsBest = () => state.mode !== 'adventure' && state.mode !== 'puzzle';
  const recordKey = (st = state) => (st.mode === 'worlds' ? 'worlds-' + st.world : st.mode);
  function save() {
    if (tut) return; // the scripted tutorial board is never saved
    if (keepsBest()) bests[recordKey()] = best;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ state, bests, settings, prefs })); } catch { /* private mode */ }
  }
  function saveProfile() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* private mode */ }
  }

  const saved = loadJSON(STORE_KEY);
  let state = saved.state && saved.state.effects && !saved.state.over ? saved.state : L.createGame(Date.now());
  if (!state.inventory) state = { ...state, inventory: L.createGame(0).inventory, stuck: false };
  if (!state.mode) state = { ...state, mode: 'classic', level: 'normal', clock: 0 };
  // The weekend event was removed (2026-09-30): a saved event run goes on as plain Classique.
  if (state.event) { state = { ...state }; delete state.event; }
  // Records are kept per mode; old saves only had the classic one.
  const bests = saved.bests || { classic: saved.best || loadJSON(LEGACY_KEY).best || 0 };
  let best = bests[recordKey()] || 0;
  // patterns: a symbol per block color. darkMenus: dark menu screens, following the system at first.
  const settings = { sfx: !saved.muted, music: true, vibrate: true, patterns: false, mascot: true,
    darkMenus: matchMedia('(prefers-color-scheme: dark)').matches, ...saved.settings };
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
  let failCounted = false; // Aventure: this attempt already counted as a failure (paid skip offer)
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
  // Combo feel: light sweeping cleared lines, board punch, combo tag pop / break.
  let sweeps = [];        // { row | col, t0 }
  let punch = null;       // { t0, amp }
  let comboAt = 0;        // last time the combo grew
  let comboBreak = null;  // { t0, n } the combo that just broke
  // Aventure motion. tracks: final board index -> fall segments [{ t0, dur, from, to }] (rows).
  // shifts: rows sliding with the sea current. drops: special cells landing or growing.
  let tracks = new Map();
  let shifts = [];
  let drops = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => reducedMotion.matches;
  const WAVE_MS = 430;   // gravity chain: time between two clear waves
  const FALL_AFTER = 240; // falls start once the wave's cells have faded
  const fallMs = (rows) => 110 + 55 * rows;

  // An Aventure level or a Mondes run wears its world's theme; otherwise the equipped one.
  const worldOf = () => (state ? (state.stage ? state.stage.world : state.world) || null : null);
  const themeId = () => worldOf() || profile.equipped.boards;
  const theme = () => THEMES[themeId()] || THEMES.toy;
  // Rétro levels squash every shape family into three LCD greens (the world's drawback).
  const RETRO4 = [null, ...Array.from({ length: 14 }, (_, i) => ['#0f380f', '#306230', '#4d7a1e'][i % 3])];
  const pal = () => (worldOf() === 'retro' ? RETRO4 : paletteOf(theme()));
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
    root.setProperty('--menu-accent', th.css['--accent-dark'] || th.css['--accent']);
    root.setProperty('--menu-on-accent', th.css['--on-accent-dark'] || th.css['--on-accent']);
    document.body.classList.toggle('dark-menus', !!settings.darkMenus && th.css['--scheme'] === 'light');
    document.body.dataset.theme = themeId();
    document.body.classList.toggle('pixel-font', th.font === PIXEL_FONT); // wider glyphs: smaller button labels
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
    // Short screens: the sign moves up between the HUD buttons when it fits (wide screens),
    // otherwise it gets a slimmer row of its own right under them (phones).
    const short = H < 760;
    const compact = short && hudGap() >= 150;
    const slim = short && !compact;
    const topH = compact ? safeTop + 118 : slim ? safeTop + 62 + 88 : safeTop + 62 + 116;
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
      plateY: compact ? safeTop + 10 : slim ? safeTop + 60 : by - 116, plateH: compact || slim ? 58 : 72 };
    invEl.style.top = Math.round(ty + lay.trayH) + 'px';
    trashEl.style.top = Math.round(ty + lay.trayH) + 'px';
    trashEl.style.width = board + 'px';
    paintBackground();
  }
  // Width left for the score sign, centered between the wallet and the right HUD buttons.
  // The wallet is counted at least 110px wide so a growing coin count never overlaps the sign.
  function hudGap() {
    const wallet = document.getElementById('wallet').getBoundingClientRect();
    const missions = document.getElementById('missions-open');
    const right = (missions.offsetParent ? missions : document.getElementById('undo')).getBoundingClientRect();
    const walletRight = Math.max(wallet.right, wallet.left + 110);
    return 2 * Math.min(W / 2 - walletRight, right.left - W / 2) - 16;
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
  const semis = (base, n) => base * Math.pow(2, n / 12);
  const live = () => settings.sfx && ac;

  // Toy instruments. pluck: xylophone / music-box bar (fundamental + a bright partial that dies fast).
  function pluck(freq, dur = 0.25, vol = 0.1, delay = 0, bright = 3.9) {
    if (!live()) return;
    const t = ac.currentTime + delay;
    for (const [mul, v, d] of [[1, vol, dur], [bright, vol * 0.35, dur * 0.25]]) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * mul, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + d + 0.02);
    }
  }
  // Pitch slide: slide whistle, boing, pop.
  function glide(f0, f1, dur, type = 'sine', vol = 0.08, delay = 0) {
    if (!live()) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  // Filtered noise: clicks, cracks, whooshes, sizzles. f0 -> f1 sweeps the filter.
  let noiseBuf = null;
  function noise(dur, vol, f0, f1 = f0, type = 'bandpass', delay = 0, q = 1.2) {
    if (!live()) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    src.buffer = noiseBuf;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const sfx = {
    pick: () => pluck(1046, 0.06, 0.05),
    // Wooden toy block on a table.
    place: () => { pluck(262, 0.12, 0.2, 0, 2.76); noise(0.025, 0.05, 2500, 2500, 'highpass'); },
    toss: () => glide(700, 180, 0.2, 'triangle', 0.07),
    undo: () => glide(380, 760, 0.14, 'sine', 0.08),
    tick: (hi) => pluck(hi ? 1568 : 1175, 0.05, 0.05),
    time: () => [0, 7].forEach((st, i) => pluck(semis(1046, st), 0.18, 0.06, i * 0.05)),
    nope: () => glide(240, 150, 0.16, 'square', 0.035),
    // Xylophone run up the pentatonic scale; longer for more lines, higher with the combo.
    clear: (lines, combo) => {
      const base = semis(392, Math.min(combo - 1, 10) * 2);
      PENTA.slice(0, 2 + Math.min(lines, 4) * 2).forEach((st, i) => pluck(semis(base, st), 0.3, 0.09, i * 0.045));
    },
    // Slide whistle down, then a low bar.
    over: () => { glide(880, 196, 0.75, 'triangle', 0.07); pluck(131, 0.5, 0.12, 0.75, 2.76); },
    turn: () => pluck(1568, 0.06, 0.05),
    bonus: () => [0, 4, 7, 12, 16].forEach((st, i) => pluck(semis(1046, st), 0.4, 0.05, i * 0.06, 3)),
    collect: () => [0, 12].forEach((st, i) => pluck(semis(1319, st), 0.3, 0.05, 0.35 + i * 0.08, 2.4)),
    mission: () => [0, 4, 7, 12, 7, 12, 16].forEach((st, i) => pluck(semis(523, st), 0.35, 0.08, 0.3 + i * 0.07)),
    coin: (i) => pluck(semis(1976, (i % 5) * 2), 0.14, 0.04, 0, 2.4),
    buy: () => [0, 4, 7, 12, 16].forEach((st, i) => pluck(semis(523, st), 0.35, 0.09, i * 0.06)),
    bomb: () => { glide(170, 38, 0.45, 'sawtooth', 0.2); noise(0.5, 0.25, 1200, 150, 'lowpass'); },
    // Aventure.
    land: () => { pluck(147, 0.14, 0.14, 0, 2); noise(0.04, 0.04, 800, 800, 'lowpass'); },
    crack: () => { noise(0.09, 0.12, 5000, 2500, 'highpass'); pluck(2349, 0.06, 0.03); },
    pop: () => glide(420, 1400, 0.07, 'sine', 0.1),
    thunk: () => { glide(190, 55, 0.2, 'sine', 0.22); noise(0.12, 0.08, 600, 200, 'lowpass'); },
    sizzle: () => noise(0.35, 0.05, 4500, 3000, 'bandpass', 0, 0.8),
    grow: () => glide(300, 760, 0.16, 'triangle', 0.06),
    swoosh: () => noise(0.4, 0.09, 350, 2200, 'bandpass', 0, 2),
    star: (i) => pluck(semis(784, [0, 4, 7][i] || 12), 0.45, 0.1, 0, 3),
    // Combo tier reached: a sparkle run on top of the clear, longer for higher tiers.
    sparkle: (tier) => [0, 7, 12, 16, 19, 24].slice(0, 3 + tier).forEach((st, i) => pluck(semis(1568, st), 0.25, 0.04, 0.12 + i * 0.045, 2.4)),
    // Combo lost: a small deflating slide.
    fizzle: () => { glide(520, 170, 0.3, 'triangle', 0.05); noise(0.2, 0.025, 3000, 700, 'bandpass'); },
  };
  // Soft generative loop: pad chords, bass on 1 and 3, a sparse music-box arpeggio. Scheduled ahead
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

    function voice(freq, at, dur, type, vol, cutoff, attack = Math.min(0.4, dur * 0.3)) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + attack);
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
        // Music-box arpeggio: instant attack, bell-like decay, two octaves up.
        if (a >= 0 && (step % 32 < 24 || i % 2 === 0)) voice(hz(tones[a] + 24), nextAt, STEP * 2.4, 'sine', 0.03, 8000, 0.005);
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
  // fam: the shape family (palette index); with the "Motifs" setting on, it adds that family's mark.
  function drawBlock(cx, cy, size, color, alpha = 1, scale = 1, bonus = null, skin = blockSkin(), fam = 0) {
    const s = size * scale * 0.9;
    if (s <= 0.5) return;
    ctx.globalAlpha = alpha;
    skin(cx - s / 2, cy - s / 2, s, color);
    if (bonus) drawIcon(bonus, cx, cy, s * (ICON_COLORS[bonus] ? 0.7 : 0.66));
    else if (fam && settings.patterns) drawMark(fam, cx, cy, s, skin === BLOCK_SKINS.neon ? color : 'rgba(0,0,0,0.42)');
    ctx.globalAlpha = 1;
  }

  // Color-blind aid: one simple mark per shape family, so blocks never rely on color alone.
  // Drawn in a unit box (-1..1) scaled to a third of the block.
  const MARKS = [
    null,
    (g) => { g.beginPath(); g.arc(0, 0, 0.45, 0, Math.PI * 2); g.fill(); },                  // dot
    (g) => { g.fillRect(-0.9, -0.28, 1.8, 0.56); },                                            // dash
    (g) => { g.fillRect(-0.28, -0.9, 0.56, 1.8); },                                            // bar
    (g) => { g.fillRect(-0.9, -0.24, 1.8, 0.48); g.fillRect(-0.24, -0.9, 0.48, 1.8); },         // plus
    (g) => { g.rotate(Math.PI / 4); g.fillRect(-1, -0.22, 2, 0.44); g.fillRect(-0.22, -1, 0.44, 2); }, // cross
    (g) => { g.lineWidth = 0.36; g.beginPath(); g.arc(0, 0, 0.7, 0, Math.PI * 2); g.stroke(); }, // ring
    (g) => { g.fillRect(-0.7, -0.7, 1.4, 1.4); },                                              // square
    (g) => { g.beginPath(); g.moveTo(0, -0.9); g.lineTo(0.9, 0.75); g.lineTo(-0.9, 0.75); g.fill(); }, // triangle
    (g) => { g.beginPath(); g.moveTo(0, 0.9); g.lineTo(0.9, -0.75); g.lineTo(-0.9, -0.75); g.fill(); }, // down triangle
    (g) => { g.beginPath(); g.moveTo(0, -1); g.lineTo(0.8, 0); g.lineTo(0, 1); g.lineTo(-0.8, 0); g.fill(); }, // diamond
    (g) => { for (const x of [-0.55, 0.55]) { g.beginPath(); g.arc(x, 0, 0.36, 0, Math.PI * 2); g.fill(); } }, // two dots
    (g) => { for (const k of [-1, 0, 1]) { g.beginPath(); g.arc(k * 0.62, k * 0.62, 0.3, 0, Math.PI * 2); g.fill(); } }, // three dots
    (g) => { g.lineWidth = 0.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-0.8, 0.8); g.lineTo(0.8, -0.8); g.stroke(); }, // slash
    (g) => { g.lineWidth = 0.38; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-0.85, -0.4); g.lineTo(0, 0.45); g.lineTo(0.85, -0.4); g.stroke(); }, // chevron
  ];
  function drawMark(fam, cx, cy, s, color) {
    const mark = MARKS[fam];
    if (!mark) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s * 0.2, s * 0.2);
    ctx.fillStyle = color; ctx.strokeStyle = color;
    mark(ctx);
    ctx.restore();
  }

  const cellCenter = (r, c) => [lay.bx + (c + 0.5) * lay.cell, lay.by + (r + 0.5) * lay.cell];
  const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeBack = (t) => { t = Math.min(1, Math.max(0, t)); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  // Combo tiers drive colors, rays and confetti: 1 = combo 2-3 or a double, 2 = combo 4-5 or a
  // triple, 3 = combo 6+.
  const comboTier = (combo, lines = 0) => (combo >= 6 ? 3 : combo >= 4 || lines >= 3 ? 2 : combo >= 2 || lines >= 2 ? 1 : 0);
  const tierColor = (tier, t) => (tier >= 3 ? `hsl(${Math.round(t / 4) % 360} 92% 58%)` : tier === 2 ? '#ff8a1f' : theme().accent);

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
      drawBlock(ox + (c + 0.5) * cellSize, oy + (r + 0.5) * cellSize, cellSize, pal()[piece.color], alpha, 1, bonus, undefined, piece.color);
    }
  }

  // ---------- special cells (Aventure) ----------
  const SPECIAL_COLORS = { ice: '#9fdcf7', asteroid: '#8a8fa3', rock: '#6b5a52', mushroom: '#e84a4a', ember: '#ff6a1a', bubble: '#7fd8ff', crate: '#c98b4a', boss: '#ffffff' };

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
    } else if (kind === 'crate') {
      ctx.fillStyle = '#c98b4a';
      ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.12); ctx.fill();
      ctx.strokeStyle = '#8a5526'; ctx.lineWidth = s * 0.08; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.roundRect(x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84, s * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.14, y + s * 0.86); ctx.lineTo(x + s * 0.86, y + s * 0.14); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + s * 0.14, y + s * 0.12, s * 0.72, s * 0.08);
      if (cracked) crack(cx, cy, s);
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

  // ---------- boss (Aventure level 20) ----------
  // One 2x2 creature in the center: body in the world's tint, a face whose eyes follow the dragged
  // piece, a white flash when hit, a squash when it strikes back, sweat under 30% hp.
  const BOSS_LOOK = {
    plain: '#6cc94f', sea: '#9b6bff', space: '#62d6b4', ice: '#dff2ff',
    forest: '#a2703c', retro: '#306230', arcade: '#ff4fb8', volcano: '#ff5a2a',
  };
  let bossHitAt = 0;
  let bossAttackAt = 0;
  const bossCenter = () => [lay.bx + (L.BOSS_AT[1] + 1) * lay.cell, lay.by + (L.BOSS_AT[0] + 1) * lay.cell];
  const bossLeft = () => (state.stage ? Math.max(0, state.stage.goal.target - state.stage.progress) : 0);

  function drawBoss(t, alpha, ghost) {
    const stage = state.stage;
    const [cx, cy] = bossCenter();
    const size = lay.cell * 2 - lay.cell * 0.12;
    const hit = calm() ? 0 : Math.max(0, 1 - (t - bossHitAt) / 260);
    const atk = calm() ? 0 : Math.max(0, 1 - (t - bossAttackAt) / 420);
    const beaten = stage.won;
    const breathe = calm() || beaten ? 0 : Math.sin(t / 420) * 0.025;
    const sx = 1 + breathe + atk * 0.14 * Math.sin(atk * Math.PI);
    const sy = 1 - breathe - atk * 0.12 * Math.sin(atk * Math.PI);
    const wob = hit ? Math.sin(t / 22) * hit * lay.cell * 0.08 : 0;
    const base = BOSS_LOOK[stage.world] || '#9b6bff';
    ctx.save();
    ctx.globalAlpha = alpha * (beaten ? Math.max(0, 1 - (t - overAt) / 500) : 1);
    ctx.translate(cx + wob, cy + size / 2);
    ctx.scale(sx, sy);
    ctx.translate(0, -size / 2);
    const h = size / 2;
    // Body
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.roundRect(-h, -h + size * 0.06, size, size, size * 0.26); ctx.fill();
    const g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, withAlpha('#ffffff', 0.35)); g.addColorStop(0.35, withAlpha('#ffffff', 0)); g.addColorStop(1, withAlpha('#000000', 0.18));
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
    // Eyes follow the dragged piece (or look down at the tray).
    const target = ghost ? cellCenter(ghost.row, ghost.col) : [cx, lay.ty];
    const ang = Math.atan2(target[1] - cy, target[0] - cx);
    const blink = calm() ? 1 : (t % 3200) < 120 ? 0.15 : 1;
    for (const side of [-1, 1]) {
      const ex = side * size * 0.2;
      const ey = -size * 0.08;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.13, size * 0.15 * blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2140';
      ctx.beginPath(); ctx.arc(ex + Math.cos(ang) * size * 0.05, ey + Math.sin(ang) * size * 0.05 * blink, size * 0.065 * Math.max(0.3, blink), 0, Math.PI * 2); ctx.fill();
      // Angry brows
      ctx.strokeStyle = '#2b2140'; ctx.lineWidth = size * 0.05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - side * size * 0.13, ey - size * 0.22); ctx.lineTo(ex + side * size * 0.06, ey - size * 0.16); ctx.stroke();
    }
    // Mouth: grin, wide open when striking back, wobbly when hurt.
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    if (atk > 0.2) ctx.ellipse(0, size * 0.2, size * 0.14, size * 0.11 * atk + size * 0.03, 0, 0, Math.PI * 2);
    else if (hit > 0) ctx.ellipse(0, size * 0.22, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
    else { ctx.moveTo(-size * 0.16, size * 0.16); ctx.quadraticCurveTo(0, size * 0.3, size * 0.16, size * 0.16); ctx.closePath(); }
    ctx.fill();
    // Low hp: a sweat drop.
    if (bossLeft() / stage.goal.target < 0.3 && !beaten) {
      ctx.fillStyle = '#7fd8ff';
      const dy = calm() ? 0 : ((t / 900) % 1) * size * 0.1;
      ctx.beginPath(); ctx.ellipse(size * 0.36, -size * 0.2 + dy, size * 0.05, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (hit) {
      ctx.globalAlpha *= hit * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
    }
    ctx.restore();
  }

  // Boss hp bar in the score plate, red and shaking right after a hit.
  function drawBossBar(th, px, py, pw, ph, t) {
    const stage = state.stage;
    const max = stage.goal.target;
    const left = bossLeft();
    const hit = calm() ? 0 : Math.max(0, 1 - (t - bossHitAt) / 300);
    const bw = pw - 36;
    const bh = Math.round(ph * 0.26);
    const x = px + 18 + (hit ? Math.sin(t / 25) * 3 * hit : 0);
    const y = py + ph * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, bh / 2); ctx.fill();
    if (left > 0) {
      const g = ctx.createLinearGradient(x, 0, x + bw, 0);
      g.addColorStop(0, '#ff4d6d'); g.addColorStop(1, '#ff9f43');
      ctx.fillStyle = hit > 0.5 ? '#ffffff' : g;
      ctx.beginPath(); ctx.roundRect(x, y, Math.max(bh, bw * (left / max)), bh, bh / 2); ctx.fill();
    }
    ctx.font = themeFont(th, Math.round(bh * 0.8));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeText(`${left} / ${max} PV`, x + bw / 2, y + bh / 2 + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${left} / ${max} PV`, x + bw / 2, y + bh / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  // Hits and strikes: flash, "-N", sounds; the last hit blows the boss up.
  function bossEffects(ev, t) {
    const stage = state.stage;
    if (!stage || stage.goal.type !== 'boss') return;
    const hits = (ev.bossHits || []).length;
    const [cx, cy] = bossCenter();
    if (hits) {
      bossHitAt = t;
      floaters.push({ text: '-' + hits, x: cx, y: cy - lay.cell, t0: t, big: true, scale: 1.2, tier: 2 });
      for (const b of ev.bossHits) burst({ r: b.r, c: b.c, kind: 'boss' }, t, 5, 90, BOSS_LOOK[stage.world]);
      sfx.thunk();
      buzz(25);
      if (stage.won) {
        banners.length = 0;
        banners.push({ text: 'Boss vaincu !', sub: stage.goal.name, tier: 3 });
        if (!calm()) { confetti(t, 60); shake = 20; }
      }
    }
    if ((ev.spawned || []).some((s) => s.attack)) {
      bossAttackAt = t;
      banners.push({ text: 'Riposte !', sub: stage.goal.name + ' contre-attaque' });
      sfx.fizzle();
    }
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
    tipShown = null;
    if (aiming) {
      const cell = boardCellAt(e.clientX, e.clientY);
      if (!cell) { setAiming(false); return; }
      canvas.setPointerCapture(e.pointerId);
      aiming.cell = cell;
      aiming.pid = e.pointerId;
      return;
    }
    if (cuboHit(e.clientX, e.clientY) && !drag) { cuboTap(); return; }
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
    const over = !tut && e.clientY > r.top && e.clientY < r.bottom + 24 && e.clientX > r.left && e.clientX < r.right;
    if (over !== drag.overTrash) armTrash(over);
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
    // Only a piece held over the bin until it armed gets thrown: a quick slip below the tray doesn't count.
    const toss = drag.overTrash && drag.trashArmed && e.type === 'pointerup';
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
    if (g.valid && e.type === 'pointerup' && commit(idx, g.row, g.col) !== false) return;
    returning.push({ idx, x: g.cx, y: g.cy, size: g.size, t0: t });
    if (e.type === 'pointerup') sfx.nope();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Hovering the bin fills it for TRASH_ARM_MS; releasing before it is full puts the piece back.
  const TRASH_ARM_MS = 600;
  let trashTimer = 0;
  function armTrash(over) {
    clearTimeout(trashTimer);
    drag.overTrash = over;
    drag.trashArmed = false;
    trashEl.classList.toggle('hot', over);
    trashEl.classList.remove('armed');
    if (!trashEl.classList.contains('broke')) trashEl.querySelector('.label').textContent = 'Maintenir pour jeter';
    if (!over || trashEl.classList.contains('broke')) return;
    const d = drag;
    trashTimer = setTimeout(() => {
      if (drag !== d || !d.overTrash) return;
      d.trashArmed = true;
      trashEl.classList.add('armed');
      trashEl.querySelector('.label').textContent = 'Lâcher pour jeter';
      buzz(8);
    }, TRASH_ARM_MS);
  }

  function showTrash(on) {
    if (state.mode === 'puzzle') on = false;
    clearTimeout(trashTimer);
    document.body.classList.toggle('dragging', on);
    trashEl.classList.toggle('show', on);
    trashEl.classList.remove('hot', 'armed');
    if (!on) return;
    const cost = L.discardCost(state);
    const broke = profile.coins < cost;
    trashEl.classList.toggle('broke', broke);
    trashEl.querySelector('.label').textContent = broke ? 'Pas assez de pièces' : 'Maintenir pour jeter';
    trashEl.querySelector('.cost').innerHTML = fmt(cost) + COIN;
  }

  // ---------- game flow ----------
  const LINE_WORDS = ['', '', 'Double !', 'Triple !', 'Quadruple !', 'Énorme !', 'Délirant !'];

  // Returns false when the tutorial refuses the move (the piece flies back).
  function commit(idx, row, col) {
    const res = L.place(state, idx, row, col);
    if (!res) return;
    if (tut && !T.accepts(tut.step, res.events)) { tutorialNope(); return false; }
    const ev = res.events;
    const prevCombo = state.combo;
    state = res.state;
    const t = now();
    if (!ev.lines && prevCombo >= 2 && !state.combo) {
      comboBreak = { t0: t, n: prevCombo };
      cuboReact('oops', 900);
      sfx.fizzle();
    }

    ev.placed.forEach(([r, c]) => pops.push({ r, c, t0: t }));

    if (ev.lines) {
      const pr = ev.placed.reduce((s, p) => s + p[0], 0) / ev.placed.length;
      const pc = ev.placed.reduce((s, p) => s + p[1], 0) / ev.placed.length;
      const plan = ev.waves && ev.waves.length && !calm() ? planFalls(ev.waves, t) : null;
      for (const cell of ev.cleared) {
        const wave = cell.wave || 0;
        const delay = wave ? wave * WAVE_MS + cell.c * 12 : Math.hypot(cell.r - pr, cell.c - pc) * 28;
        fades.push({ ...cell, t0: t, delay, segs: plan && plan.fadeSegs.get(wave + ':' + (cell.r * SIZE + cell.c)) });
        burst(cell, t + delay, 4, 60 + ev.combo * 20);
      }
      if (plan) tracks = plan.tracks;
      const [fx, fy] = cellCenter(pr, pc);
      const margin = lay.cell * 1.6;
      const tier = comboTier(ev.combo, ev.lines);
      floaters.push({ text: '+' + ev.points + (ev.nitro ? ' ' + times(ev.nitro) : ''), x: Math.max(margin, Math.min(W - margin, fx)), y: fy, t0: t, big: true,
        scale: 1 + tier * 0.18, tier });
      if (!calm()) {
        for (const r of ev.rows) sweeps.push({ row: r, t0: t });
        for (const c of ev.cols) sweeps.push({ col: c, t0: t });
        if (tier) punch = { t0: t, amp: 0.012 + tier * 0.01 };
        if (tier >= 2 || ev.lines >= 2) confetti(t, 10 + tier * 14 + ev.lines * 6);
      }
      if (ev.combo >= 2) comboAt = t;
      if (ev.perfect || tier >= 2) cuboReact('star', 1300, 1);
      else cuboReact('happy', 900, 0.45 + 0.2 * Math.min(3, ev.lines));
      if (ev.combo >= 2 && comboTier(ev.combo) > comboTier(ev.combo - 1)) sfx.sparkle(comboTier(ev.combo));

      let text = LINE_WORDS[Math.min(ev.lines, LINE_WORDS.length - 1)];
      let sub = ev.combo >= 2 ? 'COMBO ×' + ev.combo : '';
      if (!text && ev.combo >= 2) { text = 'Combo ×' + ev.combo; sub = ''; }
      if (ev.perfect) { text = 'Grille vide !'; sub = '+300'; }
      if (text) banners.push({ text, sub, tier: ev.perfect ? 3 : tier });

      launchFlyers(ev.collected, t, (b) => Math.hypot(b.r - pr, b.c - pc) * 28);
      collectTips(ev.collected);

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
    if (state.stage || state.world) stageEffects(ev, t);
    if (state.stage) bossEffects(ev, t);
    if (tut) { tutorialMoved(idx, t); return; }
    refilled(ev.refilled, t);
    afterChange(t, ev.over);
  }

  // Turns the logic's gravity waves into per-block fall paths. Every block present after a wave's
  // clear follows its moves; blocks cleared by a later wave hand their path to their fade.
  function planFalls(waves, t) {
    let live = new Map();
    const fadeSegs = new Map();
    waves.forEach((wave, w) => {
      if (w > 0) {
        for (const i of wave.cleared) {
          if (live.has(i)) fadeSegs.set(w + ':' + i, live.get(i));
          live.delete(i);
        }
      }
      const start = t + w * WAVE_MS + FALL_AFTER;
      const moved = new Map();
      for (const [from, to] of wave.moves) {
        const rows = Math.floor(to / SIZE) - Math.floor(from / SIZE);
        moved.set(to, [...(live.get(from) || []), { t0: start, dur: fallMs(rows), from: Math.floor(from / SIZE), to: Math.floor(to / SIZE) }]);
      }
      for (const [from] of wave.moves) live.delete(from);
      for (const [to, segs] of moved) live.set(to, segs);
    });
    // One soft landing per wave that moved anything.
    waves.forEach((wave, w) => {
      if (!wave.moves.length) return;
      const longest = Math.max(...wave.moves.map(([a, b]) => Math.floor(b / SIZE) - Math.floor(a / SIZE)));
      setTimeout(() => sfx.land(), w * WAVE_MS + FALL_AFTER + fallMs(longest));
      if (w > 0) setTimeout(() => sfx.clear(1, state.combo), w * WAVE_MS);
    });
    return { tracks: live, fadeSegs };
  }

  // Row a falling block is drawn at: accelerating fall, then a small bounce on landing.
  function segRow(segs, t, row) {
    for (const seg of segs) {
      if (t < seg.t0) return seg.from;
      const p = (t - seg.t0) / seg.dur;
      if (p < 1) return seg.from + (seg.to - seg.from) * p * p;
      const q = (t - seg.t0 - seg.dur) / 160;
      if (q < 1 && seg === segs[segs.length - 1]) return seg.to - 0.1 * Math.sin(q * Math.PI);
    }
    return row;
  }
  const tracksBusy = (segs, t) => { const last = segs[segs.length - 1]; return t < last.t0 + last.dur + 160; };

  // Aventure feedback: cracked cells, blasts, gravity chains, and what the world dropped this turn.
  function stageEffects(ev, t) {
    for (const d of ev.damaged || []) burst({ r: d.r, c: d.c, kind: d.kind }, t, 5, 80, '#ffffff');
    if ((ev.damaged || []).length) sfx.crack();
    if ((ev.cleared || []).some((c) => c.kind === 'bubble')) sfx.pop();
    if (ev.blasts && ev.blasts.length) {
      banners.push({ text: 'Boum !', sub: 'Explosion en croix' });
      if (!calm()) shake = 18;
      sfx.bomb();
    }
    if (ev.chain) {
      const banner = { text: 'Réaction ×' + (ev.chain + 1), sub: 'La gravité enchaîne', gold: true };
      if (calm()) banners.push(banner); else setTimeout(() => banners.push(banner), WAVE_MS);
    }
    for (const sp of ev.spawned || []) {
      const at = t + 250;
      if (sp.row !== undefined) {
        banners.push({ text: 'Courant !', sub: 'Une ligne a glissé' });
        if (!calm()) shifts.push({ row: sp.row, t0: at });
        sfx.swoosh();
        continue;
      }
      if (sp.kind === 'firefly') {
        pops.push({ r: sp.r, c: sp.c, t0: at });
        burst({ r: sp.r, c: sp.c, kind: 'ember' }, at, 6, 50, '#fff6a0');
        setTimeout(() => sfx.coin(3), 250);
        continue;
      }
      const land = sp.kind === 'mushroom' ? 320 : 420;
      if (!calm()) drops.set(sp.r * SIZE + sp.c, { t0: at, kind: sp.kind, dur: land });
      setTimeout(() => {
        burst({ r: sp.r, c: sp.c, kind: sp.kind }, now(), 6, 70);
        if (sp.kind === 'mushroom') sfx.grow(); else if (sp.kind === 'ember') sfx.sizzle(); else sfx.thunk();
      }, 250 + (calm() ? 0 : land));
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

  // Star confetti thrown up from the board on big clears, in the board's block colors.
  function confetti(t0, count) {
    const colors = pal().filter(Boolean);
    for (let k = 0; k < count; k++) {
      particles.push({
        x: lay.bx + Math.random() * lay.board, y: lay.by + lay.board * (0.3 + Math.random() * 0.3),
        vx: (Math.random() - 0.5) * 420, vy: -320 - Math.random() * 420,
        t0: t0 + Math.random() * 120, life: 1100 + Math.random() * 600, g: 620,
        size: lay.cell * (0.22 + Math.random() * 0.18), color: colors[Math.floor(Math.random() * colors.length)],
        star: true, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
      });
    }
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
    if (keepsBest() && state.score > best) {
      best = state.score;
      if (!recordAnnounced && bestAtStart > 0) {
        recordAnnounced = true;
        banners.push({ text: 'Nouveau record !', sub: '', gold: true });
        cuboReact('star', 1500, 1);
      }
    }
    checkMissions();
    if (state.stuck && !over) {
      if (state.mode === 'puzzle') tip('stuck-puzzle', 'Ça ne rentre plus', 'Annule tes derniers coups (gratuit), ou prends un indice.', undoEl);
      else if (state.mode === 'chill') tip('stuck-chill', 'Coincé ?', 'Annule ton dernier coup, ou maintiens une forme tout en bas pour la jeter.', undoEl);
      else tip('stuck', 'Coincé ?', 'Utilise un bonus, annule ton dernier coup, ou maintiens une forme tout en bas pour la jeter.', undoEl);
    }
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
    renderMissionBadges();
  }

  // Missions: menu row, HUD badge, and a sheet reachable from both (live progress during a run).
  const missionsEl = document.getElementById('missions');
  const missionsOpenEl = document.getElementById('missions-open');
  const liveRun = () => (state.over || state.stage ? {} : L.runStats(state));
  function renderMissionBadges() {
    const status = M.missionStatus(profile, liveRun());
    const done = status.filter((m) => m.done).length;
    missionsOpenEl.querySelector('.badge').textContent = done ? `${done}/${status.length}` : '';
    document.getElementById('menu-missions-sub').textContent = done === status.length ? 'Toutes faites' : `${done}/${status.length} faites aujourd’hui`;
    document.getElementById('menu-missions-pips').innerHTML = status.map((m) => `<i class="${m.done ? 'done' : ''}"><b style="width:${(m.current / m.target) * 100}%"></b></i>`).join('');
  }
  function openMissions() {
    unlockAudio();
    missionsFromMenu = menuEl.classList.contains('show');
    menuEl.classList.remove('show');
    renderMissionList(document.getElementById('missions-list'), [], liveRun());
    missionsEl.classList.add('show');
  }
  let missionsFromMenu = false;
  function closeMissions() {
    missionsEl.classList.remove('show');
    if (missionsFromMenu) openMenu();
  }
  missionsOpenEl.addEventListener('click', openMissions);
  document.getElementById('missions-close').addEventListener('click', closeMissions);
  missionsEl.addEventListener('click', (e) => { if (e.target === missionsEl) closeMissions(); });

  function resetAnnounced() {
    announced = new Set(M.missionStatus(profile, L.runStats(state)).filter((m) => m.done).map((m) => m.id));
    renderMissionBadges();
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
    cuboReact('wow', 900, 0.5);

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
      bossEffects(ev, t);
      shake = 18;
      sfx.bomb();
      buzz([30, 20, 50]);
    } else {
      const ui = BONUS_UI[type];
      banners.length = 0;
      banners.push({ icon: type, text: ui.name, sub: ui.hint(bonusLv(type)), gold: true });
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
    const report = res.report;
    for (const line of stickerLines()) { report.earned.push(line); report.total += line.coins; }
    saveProfile();
    renderWallet();
    return report;
  }

  function endGame(t) {
    hideTips();
    drag = null;
    showTrash(false);
    aiming = null;
    if (state.puzzle) { endPuzzle(t); return; }
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
    renderRunMissions(document.getElementById('over-missions'));
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

  // Game over: one line for today's missions (the ones this run finished are already in the coin lines).
  function renderRunMissions(el) {
    const status = M.missionStatus(profile, {});
    const done = status.filter((m) => m.done).length;
    el.className = 'missions over-missions';
    el.innerHTML = `<div class="missions-line"><span>Missions du jour · ${done}/${status.length}</span><span class="pips">${status.map((m) => `<i class="${m.done ? 'done' : ''}"></i>`).join('')}</span></div>`;
  }

  // opts: { mode, level, stage, seed }; mode and level default to the current game's.
  function newGame(opts = {}) {
    profile = M.ensureDay(profile, today());
    saveProfile();
    if (keepsBest()) bests[recordKey()] = best;
    const mode = opts.mode || (state.mode === 'adventure' ? prefs.mode : state.mode);
    const world = opts.world || (mode === 'worlds' ? state.world : null);
    state = L.createGame(opts.seed ?? Date.now(), { mode, level: opts.level || state.level, budget: profile.coins, stage: opts.stage,
      world, upgrades: profile.upgrades, puzzle: opts.puzzle });
    levelSettled = false;
    failCounted = false;
    paintBackground();
    best = bests[recordKey()] || 0;
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
    tracks = new Map(); shifts = []; drops = new Map();
    sweeps = []; punch = null; comboAt = 0; comboBreak = null;
    showTrash(false);
    syncMode();
    overEl.classList.remove('show');
    resetAnnounced();
    renderInventory();
    refreshBonusTexts();
    save();
    modeTips();
  }

  document.getElementById('again').addEventListener('click', () => { unlockAudio(); newGame(); });

  // Ends the current run (coins and missions count) and starts a new one.
  function restartRun(opts) {
    const report = state.over ? null : settleRun();
    newGame(opts);
    if (report && report.total) banners.push({ icon: 'coin', text: '+' + report.total, sub: 'Pièces de la partie', gold: true });
  }

  const inProgress = () => !state.over && state.moves > 0;
  // ---------- confirmation dialog ----------
  const askEl = document.getElementById('ask');
  let askDone = null;
  // In-game replacement for window.confirm. Resolves true when the player agrees.
  function ask({ title, text, ok, danger }) {
    if (askDone) askDone(false);
    document.getElementById('ask-title').textContent = title;
    document.getElementById('ask-text').textContent = text;
    const yes = document.getElementById('ask-yes');
    yes.textContent = ok;
    yes.classList.toggle('danger', !!danger);
    askEl.classList.add('show');
    return new Promise((resolve) => {
      askDone = (v) => { askDone = null; askEl.classList.remove('show'); resolve(v); };
    });
  }
  document.getElementById('ask-yes').addEventListener('click', () => { if (askDone) askDone(true); });
  document.getElementById('ask-no').addEventListener('click', () => { if (askDone) { sfx.turn(); askDone(false); } });
  askEl.addEventListener('click', (e) => { if (e.target === askEl && askDone) askDone(false); });
  // Runs go() now, or once the player agrees to drop the run in progress (its coins are kept).
  function guardRun(needed, go) {
    if (!needed) { go(); return; }
    ask({ title: 'Abandonner ?', text: 'La partie en cours s’arrête. Les pièces gagnées sont gardées.', ok: 'Abandonner', danger: true })
      .then((yes) => { if (yes) go(); });
  }

  // ---------- home menu (Jouer tab) ----------
  // Continue, the next Aventure level, the daily level and Puzzles, free play, missions.
  const menuEl = document.getElementById('menu');
  const freePickEl = document.getElementById('free');
  const MODE_NAMES = { classic: 'Classique', chrono: 'Chrono', chill: 'Chill' };
  const LEVEL_NAMES = { easy: 'Facile', normal: 'Normal', hard: 'Difficile' };
  const MODE_NOTES = {
    classic: 'Pose des formes sans limite de temps, jusqu’à ce que plus rien ne rentre.',
    chrono: 'La partie tourne contre la montre : chaque ligne effacée rajoute du temps.',
    chill: 'Touche une forme pour la tourner. Pas de bonus, pas de pression.',
  };
  // "Classique · Normal", or "Mondes · Glace".
  const modeLabel = () => (state.puzzle ? `Puzzle ${state.puzzle.n} · ${state.puzzle.name}` : state.mode === 'worlds' ? 'Mondes · ' + WD.WORLDS[state.world].name : `${MODE_NAMES[state.mode]} · ${LEVEL_NAMES[state.level]}`);
  const heroArt = document.getElementById('menu-adventure-art');

  // Next Aventure level to play: the first open level not cleared yet, in map order.
  function nextAdventure() {
    for (const w of M.WORLD_ORDER) {
      if (!M.worldOpen(profile, w)) return null;
      for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) if (M.levelOpen(profile, w, n) && !M.levelCleared(profile, w, n)) return [w, n];
    }
    return null;
  }
  const lastOpenWorld = () => M.WORLD_ORDER.filter((w) => M.worldOpen(profile, w)).pop() || M.WORLD_ORDER[0];

  function renderMenu() {
    const playing = inProgress();
    const cont = document.getElementById('menu-continue');
    cont.style.display = playing ? '' : 'none';
    document.getElementById('menu-continue-sub').textContent = state.stage
      ? `${state.stage.daily ? 'Niveau du jour #' + LV.dayNumber(state.stage.daily) : 'Aventure · ' + WD.WORLDS[state.stage.world].name + ' ' + state.stage.n} · ${LV.goalText(state.stage.goal)}`
      : state.puzzle ? modeLabel() : `${modeLabel()} · ${fmt(state.score)} pts`;
    const next = nextAdventure();
    document.getElementById('menu-hero').classList.toggle('quiet', playing);
    drawPreview(heroArt, profile.equipped.blocks, next ? next[0] : lastOpenWorld());
    document.getElementById('menu-adventure-title').textContent = next ? `${worldName(next[0])} · ${levelName(next[1])}` : 'Carte des mondes';
    document.getElementById('menu-adventure-sub').innerHTML = starSvg(true, 14) + `${M.totalStars(profile)} / ${M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3}`;
    document.getElementById('menu-adventure-go').textContent = next ? 'Jouer' : 'Voir';
    document.getElementById('menu-adventure').setAttribute('aria-label', next ? `Aventure : jouer ${worldName(next[0])}, ${levelName(next[1])}` : 'Aventure : carte des mondes');
    renderDailyButton();
    renderMissionBadges();
    document.getElementById('menu-puzzles-sub').textContent = `${M.puzzlesSolved(profile)} / ${PZ.COUNT} résolus`;
    document.getElementById('menu-free-label').textContent = `${MODE_NAMES[prefs.mode]} · ${LEVEL_NAMES[prefs.level]}`;
    document.getElementById('menu-free-sub').textContent = { classic: 'Sans limite', chrono: 'Contre la montre', chill: 'Rotation libre' }[prefs.mode];
    document.getElementById('menu-coins').textContent = fmt(profile.coins);
    renderFreePick();
  }
  function renderFreePick() {
    for (const b of document.querySelectorAll('#menu-mode button')) b.classList.toggle('on', b.dataset.mode === prefs.mode);
    for (const b of document.querySelectorAll('#menu-level button')) b.classList.toggle('on', b.dataset.level === prefs.level);
    document.getElementById('free-note').textContent = MODE_NOTES[prefs.mode];
  }

  function openMenu() {
    unlockAudio();
    hideTips();
    drag = null;
    showTrash(false);
    setAiming(false);
    renderMenu();
    overEl.classList.remove('show');
    menuEl.classList.add('show');
  }
  const closeMenu = () => menuEl.classList.remove('show');

  document.getElementById('menu-open').addEventListener('click', () => { unlockAudio(); sfx.turn(); openPause(); });
  document.getElementById('over-menu').addEventListener('click', openMenu);
  document.getElementById('menu-continue').addEventListener('click', () => { unlockAudio(); closeMenu(); });
  document.getElementById('menu-adventure').addEventListener('click', () => {
    unlockAudio();
    sfx.turn();
    const next = nextAdventure();
    closeMenu();
    if (next) openStage(next[0], next[1]); else openAdventure();
  });
  document.getElementById('menu-map').addEventListener('click', () => { sfx.turn(); openAdventure(); });
  document.getElementById('menu-defis').addEventListener('click', () => { sfx.turn(); openDailySheet(today(), 'menu'); });
  document.getElementById('menu-missions').addEventListener('click', () => {
    sfx.turn();
    goTab('defis');
    document.getElementById('defis-missions').scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
  });
  document.getElementById('menu-settings').addEventListener('click', () => { sfx.turn(); openSettings('menu'); });

  // Free play: the picked mode and level show on the home row; the sheet changes them.
  const playFree = () => guardRun(inProgress(), () => {
    freePickEl.classList.remove('show');
    closeMenu();
    restartRun({ mode: prefs.mode, level: prefs.level });
  });
  document.getElementById('menu-play').addEventListener('click', () => { unlockAudio(); playFree(); });
  document.getElementById('free-play').addEventListener('click', () => { unlockAudio(); playFree(); });
  document.getElementById('menu-free-pick').addEventListener('click', () => {
    unlockAudio();
    sfx.turn();
    renderFreePick();
    closeMenu();
    freePickEl.classList.add('show');
  });
  const closeFreePick = () => { freePickEl.classList.remove('show'); openMenu(); };
  document.getElementById('free-close').addEventListener('click', closeFreePick);
  freePickEl.addEventListener('click', (e) => { if (e.target === freePickEl) closeFreePick(); });
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

  // ---------- Puzzles ----------
  const puzzlesEl = document.getElementById('puzzles');

  function openPuzzles() {
    unlockAudio();
    menuEl.classList.remove('show');
    overEl.classList.remove('show');
    levelEndEl.classList.remove('show');
    const all = Object.values(profile.puzzles || {}).reduce((a, b) => a + b, 0);
    document.getElementById('puzzles-stars').innerHTML = starSvg(true, 18) + `${fmt(all)} / ${PZ.COUNT * 3}`;
    const list = document.getElementById('puzzles-list');
    list.innerHTML = '';
    PZ.PACKS.forEach((pack, k) => {
      const first = k * PZ.PER_PACK + 1;
      let solved = 0;
      for (let n = first; n < first + PZ.PER_PACK; n++) if (M.puzzleStarsOf(profile, n) !== undefined) solved += 1;
      list.insertAdjacentHTML('beforeend', `<div class="pz-pack"><h3>${pack.name}</h3><span>${solved} / ${PZ.PER_PACK} · ${PZ.quotaOf(first)} à ${PZ.quotaOf(first + PZ.PER_PACK - 1)} formes</span></div>`);
      // A pack not reached yet is a single line instead of ten padlocks.
      if (!M.puzzleOpen(profile, first)) {
        list.insertAdjacentHTML('beforeend', `<div class="pz-locked">${LOCK_SVG}<span>Finis le pack ${PZ.PACKS[k - 1].name} pour ouvrir ces ${PZ.PER_PACK} puzzles.</span></div>`);
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'levels';
      for (let n = first; n < first + PZ.PER_PACK; n++) {
        const open = M.puzzleOpen(profile, n);
        const stars = M.puzzleStarsOf(profile, n);
        const b = document.createElement('button');
        b.className = 'lvl' + (open ? '' : ' locked') + (stars !== undefined ? ' done' : '');
        b.innerHTML = `<span class="num">${open ? n : LOCK_SVG}</span><span class="stars">${starsRow(stars || 0, 12)}</span>`;
        // Solved: the drawing itself replaces the number.
        if (stars !== undefined) b.querySelector('.num').replaceChildren(puzzleThumb(n));
        b.setAttribute('aria-label', `Puzzle ${n}` + (stars !== undefined ? ', ' + pzOf(n).name : '') + (open ? '' : ', verrouillé'));
        b.addEventListener('click', () => { if (open) { sfx.turn(); startPuzzle(n); } else sfx.nope(); });
        grid.appendChild(b);
      }
      list.appendChild(grid);
    });
    puzzlesEl.classList.add('show');
  }
  // Building a puzzle tiles its drawing: keep the ones the list needs.
  const pzCache = {};
  const pzOf = (n) => (pzCache[n] = pzCache[n] || PZ.puzzle(n));
  // Small silhouette of a solved puzzle's drawing, in the theme's accent.
  function puzzleThumb(n) {
    const cv = document.createElement('canvas');
    const px = Math.round(32 * Math.min(window.devicePixelRatio || 1, 3));
    cv.width = px; cv.height = px;
    const g = cv.getContext('2d');
    const cell = px / SIZE;
    g.fillStyle = getComputedStyle(puzzlesEl).getPropertyValue('--accent').trim() || '#7c5cff';
    pzOf(n).mask.forEach((on, i) => {
      if (!on) return;
      g.beginPath();
      g.roundRect((i % SIZE) * cell + 0.3, Math.floor(i / SIZE) * cell + 0.3, cell - 0.6, cell - 0.6, cell * 0.2);
      g.fill();
    });
    return cv;
  }
  document.getElementById('menu-puzzles').addEventListener('click', () => { sfx.turn(); openPuzzles(); });
  document.getElementById('puzzles-close').addEventListener('click', () => { puzzlesEl.classList.remove('show'); openMenu(); });
  puzzlesEl.addEventListener('click', (e) => { if (e.target === puzzlesEl) { puzzlesEl.classList.remove('show'); openMenu(); } });

  function startPuzzle(n) {
    unlockAudio();
    guardRun(inProgress() && !state.stage && !state.puzzle, () => launchPuzzle(n));
  }
  function launchPuzzle(n) {
    puzzlesEl.classList.remove('show');
    levelEndEl.classList.remove('show');
    menuEl.classList.remove('show');
    restartRun({ mode: 'puzzle', puzzle: PZ.puzzle(n) });
    banners.push({ text: 'Puzzle ' + n, sub: state.puzzle.name + ' · ' + state.puzzle.total + ' formes', gold: true });
  }

  // Hint button (puzzle only): places one piece on a right spot for a few coins.
  const hintBtn = document.createElement('button');
  hintBtn.className = 'hint-btn';
  hintBtn.innerHTML = `Indice <span class="price">${M.PUZZLE_HINT}${COIN}</span>`;
  hintBtn.setAttribute('aria-label', `Indice pour ${M.PUZZLE_HINT} pièces`);
  invEl.appendChild(hintBtn);
  function renderHint() {
    hintBtn.disabled = state.mode !== 'puzzle' || state.over || profile.coins < M.PUZZLE_HINT;
  }
  hintBtn.addEventListener('click', () => {
    unlockAudio();
    if (state.mode !== 'puzzle' || state.over) return;
    if (profile.coins < M.PUZZLE_HINT) { sfx.nope(); banners.push({ text: 'Pas assez de pièces', sub: `Un indice coûte ${M.PUZZLE_HINT}` }); return; }
    const res = L.puzzleHint(state);
    if (!res) {
      sfx.nope();
      banners.push({ text: 'Pas de place juste', sub: 'Annule quelques coups, puis réessaie' });
      return;
    }
    payCoins(M.PUZZLE_HINT);
    const t = now();
    state = res.state;
    for (const [r, c] of res.events.placed) {
      pops.push({ r, c, t0: t });
      burst({ r, c }, t, 4, 70, '#fff6a0');
    }
    refilled(res.events.refilled, t);
    sfx.bonus();
    buzz(12);
    renderUndo();
    renderHint();
    afterChange(t, res.events.over);
  });

  // Puzzle solved: pay, record stars, celebrate, then the result card.
  function endPuzzle(t) {
    const pz = state.puzzle;
    const runReport = settleRun();
    let report = null;
    if (!levelSettled) {
      levelSettled = true;
      const res = M.applyPuzzle(profile, pz.n, pz.stars);
      profile = res.profile;
      report = res.report;
      report.earned.push(...stickerLines());
      saveProfile();
      renderWallet();
    }
    banners.length = 0;
    banners.push({ text: 'Bravo !', sub: pz.name + ' complété', tier: 3 });
    if (!calm()) { confetti(t, 70); shake = 10; }
    setTimeout(() => { sfx.mission(); buzz([20, 40, 20]); }, 350);
    setTimeout(() => showPuzzleEnd(runReport, report), 1300);
    save();
  }

  function showPuzzleEnd(runReport, report) {
    const pz = state.puzzle;
    const card = document.getElementById('level-end-card');
    const lines = [...(runReport ? runReport.earned : []), ...(report ? report.earned : [])];
    const total = lines.reduce((a, l) => a + l.coins, 0);
    const next = pz.n < PZ.COUNT ? pz.n + 1 : null;
    card.innerHTML = `
      <h2>Puzzle réussi !</h2>
      <div class="stage-sub">Puzzle ${pz.n} · ${pz.name}</div>
      <div class="stage-stars">${starsRow(pz.stars, 44)}</div>
      <div class="stage-sub">${pz.hints ? `${pz.hints} indice${pz.hints > 1 ? 's' : ''} utilisé${pz.hints > 1 ? 's' : ''}` : 'Sans indice'}</div>
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>Pièces</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="list">Puzzles</button>
        ${pz.stars >= 3 ? '' : `<button class="btn ${next ? 'ghost' : 'primary'}" data-act="again">Rejouer</button>`}
        ${next ? '<button class="btn primary" data-act="next">Suivant</button>' : ''}
      </div>`;
    card.querySelector('[data-act="list"]').addEventListener('click', openPuzzles);
    const again = card.querySelector('[data-act="again"]');
    if (again) again.addEventListener('click', () => startPuzzle(pz.n));
    if (next) card.querySelector('[data-act="next"]').addEventListener('click', () => startPuzzle(next));
    levelEndEl.classList.add('show');
    starChimes(pz.stars);
  }

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
  const WORLD_MAX_STARS = M.LEVELS_PER_WORLD * 3;
  // "Niveau 7", "Épreuve" (level 10) or "Boss" (level 20).
  const levelName = (n) => (n === M.LEVELS_PER_WORLD ? 'Boss' : n === M.TRIAL_LEVEL ? 'Épreuve' : 'Niveau ' + n);
  const CHEST_SVG = '<svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true"><path d="M3 11h24v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="#c98b4a"/><path d="M3 11V8a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v3z" fill="#e0a45e"/><path d="M3 11h24" stroke="#8a5526" stroke-width="2.4"/><rect x="12" y="8.5" width="6" height="7" rx="1.6" fill="#ffd166" stroke="#8a5526" stroke-width="1.6"/></svg>';
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
      const prevWorld = M.WORLD_ORDER[M.WORLD_ORDER.indexOf(w) - 1];
      const far = !open && prevWorld && !M.worldOpen(profile, prevWorld);
      tile.className = 'world-tile' + (open ? '' : ' locked') + (far ? ' far' : '');
      const cv = document.createElement('canvas');
      cv.width = 240; cv.height = 180;
      tile.appendChild(cv);
      drawPreview(cv, profile.equipped.blocks, w);
      tile.insertAdjacentHTML('beforeend', `<div class="name">${worldName(w)}</div>`);
      const meta = document.createElement('div');
      meta.className = 'meta';
      if (far) meta.textContent = 'Plus loin sur la carte';
      else if (open) meta.innerHTML = starSvg(true, 13) + `${M.worldStars(profile, w)} / ${WORLD_MAX_STARS}`;
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
    document.getElementById('world-stars').innerHTML = starSvg(true, 18) + `${M.worldStars(profile, w)} / ${WORLD_MAX_STARS}`;
    renderChests(w);
    const rules = WD.WORLDS[w];
    document.getElementById('world-rules').innerHTML =
      `<div class="plus"><b>+</b><span>${rules.plus}</span></div><div class="minus"><b>−</b><span>${rules.minus}</span></div>`;
    const grid = document.getElementById('levels');
    grid.innerHTML = '';
    for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) {
      const open = M.levelOpen(profile, w, n);
      const stars = M.levelStars(profile, w, n);
      const boss = n === M.LEVELS_PER_WORLD;
      const trial = n === M.TRIAL_LEVEL;
      const b = document.createElement('button');
      b.className = 'lvl' + (open ? '' : ' locked') + (stars !== undefined ? ' done' : '') + (boss ? ' boss' : '') + (trial ? ' trial' : '');
      b.innerHTML = `<span class="num">${open ? n : LOCK_SVG}</span>` +
        ((boss || trial) && stars === undefined ? `<small>${boss ? 'Boss' : 'Épreuve'}</small>` : `<span class="stars">${starsRow(stars || 0, 12)}</span>`);
      // Winding path: rows of 5, every other row runs right to left.
      const row = Math.floor((n - 1) / 5);
      b.style.gridRow = row + 1;
      b.style.gridColumn = (row % 2 ? 4 - ((n - 1) % 5) : (n - 1) % 5) + 1;
      b.setAttribute('aria-label', levelName(n) + (trial || boss ? ` (niveau ${n})` : '') + (open ? '' : ', verrouillé'));
      b.addEventListener('click', () => { if (open) { sfx.turn(); openStage(w, n); } else sfx.nope(); });
      grid.appendChild(b);
    }
    renderEndless(w);
    worldEl.classList.add('show');
    requestAnimationFrame(drawLevelPath);
  }

  // Line joining the level buttons in order: solid up to the last cleared level, dotted after.
  function drawLevelPath() {
    const svg = document.getElementById('levels-path');
    if (!worldEl.classList.contains('show')) return;
    const box = svg.getBoundingClientRect();
    const pts = [...document.querySelectorAll('#levels .num')].map((el) => {
      const r = el.getBoundingClientRect();
      return [Math.round(r.left + r.width / 2 - box.left), Math.round(r.top + r.height / 2 - box.top)];
    });
    if (!pts.length || !box.width) return;
    const cleared = [...document.querySelectorAll('#levels .lvl')].filter((b) => b.classList.contains('done')).length;
    const line = (a) => a.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
    svg.setAttribute('viewBox', `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
    svg.innerHTML = `<path class="todo" d="${line(pts.slice(Math.max(0, cleared - 1)))}"/>` + (cleared > 1 ? `<path class="done" d="${line(pts.slice(0, cleared))}"/>` : '');
  }
  window.addEventListener('resize', () => requestAnimationFrame(drawLevelPath));

  // Endless run under the world's rules (the former Mondes mode), opened by the world's trial.
  function renderEndless(w) {
    const el = document.getElementById('world-endless');
    const open = M.worldFreeOpen(profile, w);
    const rules = WD.WORLDS[w];
    if (!open) {
      el.innerHTML = `<div class="endless"><h3>Partie sans fin</h3><p>Réussis l'épreuve (niveau ${M.TRIAL_LEVEL}) pour jouer ici sans limite de coups, avec une prime en pièces.</p></div>`;
      return;
    }
    const rate = M.worldPrimeRate(w);
    el.innerHTML = `<div class="endless"><h3>Partie sans fin</h3>
      <p>Les règles de ${worldName(w)}, sans limite de coups. Chaque point rapporte une prime en pièces.${rules.free && rules.free.note ? ' ' + rules.free.note : ''}</p>
      <div class="fw-facts"><div><small>Record</small><b>${fmt(bests['worlds-' + w] || 0)}</b></div>
      <div><small>Prime</small><b>${fmt(Math.round(rate * 5))}</b>${COIN}<small>par 1 000 pts</small></div></div>
      <button class="btn ghost" data-act="endless">Jouer sans fin</button></div>`;
    el.querySelector('[data-act="endless"]').addEventListener('click', () => {
      unlockAudio();
      guardRun(inProgress() && !state.stage, () => {
        hideAdventure();
        restartRun({ mode: 'worlds', world: w });
      });
    });
  }

  // Star chests of a world: a bar of the world's stars with 3 chests on it; a ready one opens on tap.
  function renderChests(w) {
    const el = document.getElementById('world-chests');
    const stars = M.worldStars(profile, w);
    const pct = (v) => Math.min(100, (v / WORLD_MAX_STARS) * 100);
    const label = (c) => [c.coins ? `${c.coins}${COIN}` : '', c.bombs ? `${c.bombs} Bombes offertes` : ''].filter(Boolean).join(' + ');
    el.innerHTML = `<div class="chest-bar"><i style="width:${pct(stars)}%"></i></div>` + M.CHESTS.map((c, i) => {
      const st = M.chestState(profile, w, i);
      return `<button class="chest ${st}" data-i="${i}" style="left:${pct(c.stars)}%" aria-label="Coffre ${c.stars} étoiles : ${label(c).replace(/<[^>]+>/g, ' pièces')}">
        ${CHEST_SVG}<small>${st === 'open' ? 'Ouvert' : st === 'ready' ? 'Ouvrir !' : starSvg(true, 10) + c.stars}</small></button>`;
    }).join('');
    for (const btn of el.querySelectorAll('.chest')) {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        const res = M.openChest(profile, w, i);
        if (!res) {
          sfx.nope();
          const c = M.CHESTS[i];
          if (M.chestState(profile, w, i) === 'locked') btn.querySelector('small').innerHTML = label(c);
          return;
        }
        profile = res.profile;
        saveProfile();
        renderWallet();
        sfx.buy();
        buzz([15, 30, 15]);
        renderChests(w);
        const opened = el.querySelector(`.chest[data-i="${i}"]`);
        opened.classList.add('burst');
        opened.querySelector('small').innerHTML = '+' + label(res.reward);
      });
    }
  }

  // Level sheet: goal, budget, best stars, then play / skip / starting bonus.
  function openStage(w, n) {
    const stage = LV.level(w, n);
    const best = M.levelStars(profile, w, n);
    const card = document.getElementById('stage-card');
    const budget = stage.clock ? `${Math.round(stage.clock / 1000)} secondes (les lignes rajoutent du temps)` : `${stage.maxMoves} coups`;
    const canSkip = M.canSkip(profile, w, n);
    // Stars: 1 for the win, 2 with 15 % of the budget left, 3 with 30 % (see finishStage in logic.js).
    const keep = (k) => (stage.clock ? `${Math.ceil((stage.clock / 1000) * k)} s` : `${Math.ceil(stage.maxMoves * k)} coups`);
    const starRule = `1 étoile en réussissant, 2 s'il te reste ${keep(0.15)}, 3 s'il t'en reste ${keep(0.3)}.`;
    card.innerHTML = `
      <div class="shop-head">
        <button class="close" data-act="back" aria-label="Retour au monde"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <h2>${levelName(n)}</h2>
      </div>
      <div class="stage-sub">${worldName(w)}${n === M.TRIAL_LEVEL || n === M.LEVELS_PER_WORLD ? ' · niveau ' + n : ''}</div>
      <div class="stage-goal">${LV.goalText(stage.goal)}</div>
      ${stage.boss ? `<div class="stage-note">Il a ${stage.goal.target} PV : chaque ligne qui le traverse lui en retire 2. Tous les ${stage.boss.every} coups, il riposte en posant ${stage.boss.count > 1 ? stage.boss.count + ' ' + LV.KIND_NAMES[stage.boss.kind] : 'un obstacle'}.</div>` : ''}
      ${n === M.TRIAL_LEVEL ? '<div class="stage-note">Un niveau plus corsé au milieu du monde, mieux payé.</div>' : ''}
      <div class="stage-sub">${budget}</div>
      <div class="stage-stars">${starsRow(best || 0, 34)}</div>
      <div class="stage-note">${starRule}</div>
      <button class="opt${stageBomb ? ' on' : ''}" data-act="bomb"><span>Partir avec une Bombe</span><span class="price">${M.freeBombs(profile) ? `Offerte (×${M.freeBombs(profile)})` : M.START_BONUS_COST + COIN}</span></button>
      ${canSkip ? `<button class="opt" data-act="skip"><span>Passer le niveau (sans étoile)</span><span class="price">${M.SKIP_COST}${COIN}</span></button>` : ''}
      <div class="actions"><button class="btn primary" data-act="play">Jouer</button></div>`;
    const bombBtn = card.querySelector('[data-act="bomb"]');
    bombBtn.disabled = !M.freeBombs(profile) && profile.coins < M.START_BONUS_COST;
    if (bombBtn.disabled) stageBomb = false;
    card.querySelector('[data-act="back"]').addEventListener('click', () => openWorld(w));
    bombBtn.addEventListener('click', () => { stageBomb = !stageBomb; bombBtn.classList.toggle('on', stageBomb); sfx.turn(); });
    const skipBtn = card.querySelector('[data-act="skip"]');
    if (skipBtn) {
      skipBtn.disabled = profile.coins < M.SKIP_COST;
      skipBtn.addEventListener('click', async () => {
        if (!await ask({ title: 'Passer le niveau ?', text: `Il coûte ${M.SKIP_COST} pièces et ne rapporte aucune étoile.`, ok: 'Passer' })) return;
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
    guardRun(inProgress() && !state.stage, () => launchLevel(w, n));
  }
  function launchLevel(w, n) {
    const freeBomb = stageBomb && M.freeBombs(profile) > 0;
    const bomb = freeBomb || (stageBomb && profile.coins >= M.START_BONUS_COST);
    stageBomb = false;
    hideAdventure();
    menuEl.classList.remove('show');
    restartRun({ mode: 'adventure', stage: LV.level(w, n) });
    if (bomb) {
      if (freeBomb) { profile = M.useFreeBomb(profile); saveProfile(); } else payCoins(M.START_BONUS_COST);
      state = { ...state, inventory: { ...state.inventory, bomb: state.inventory.bomb + 1 } };
      renderInventory();
      save();
    }
    banners.push({ text: n === M.LEVELS_PER_WORLD ? 'Boss !' : levelName(n), sub: LV.goalText(state.stage.goal), gold: true, tier: n === M.LEVELS_PER_WORLD ? 2 : 0 });
  }

  // Level over: pay the run (grid coins, missions), record stars, then show the result.
  function endLevel() {
    const runReport = settleRun();
    let levelReport = null;
    const stage = state.stage;
    if (stage.won && !levelSettled) {
      levelSettled = true;
      const res = stage.daily
        ? M.applyDaily(profile, stage.daily, today(), stage.stars)
        : M.applyLevel(profile, stage.world, stage.n, stage.stars);
      profile = res.profile;
      levelReport = res.report;
      levelReport.earned.push(...stickerLines());
      saveProfile();
      renderWallet();
    }
    // One failed attempt per level start, even if bought moves run out again.
    if (!stage.won && !stage.daily && !failCounted) {
      failCounted = true;
      profile = M.recordFail(profile, stage.world, stage.n);
      saveProfile();
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
      ? (n === M.LEVELS_PER_WORLD ? 'Boss vaincu !' : n === M.TRIAL_LEVEL ? 'Épreuve réussie !' : 'Niveau réussi !')
      : state.timeUp ? 'Temps écoulé !' : outOfMoves ? 'Plus de coups !' : 'Plus de place !';
    const lines = [...(runReport ? runReport.earned : []), ...(levelReport ? levelReport.earned : [])];
    const total = lines.reduce((a, l) => a + l.coins, 0);
    if (stage.daily) { showDailyEnd(title, lines, total, outOfMoves, levelReport); return; }
    const next = stage.won ? nextLevelOf(w, n) : null;
    const moreCost = M.extraMovesCost(stage.extra);
    card.innerHTML = `
      <h2>${title}</h2>
      <div class="stage-sub">${worldName(w)} · ${levelName(n)}</div>
      <div class="stage-stars">${starsRow(stage.stars, 44)}</div>
      <div class="stage-sub">${LV.goalText(stage.goal)} · ${fmt(Math.min(stage.goal.type === 'score' ? state.score : stage.progress, stage.goal.target))} / ${fmt(stage.goal.target)}</div>
      ${levelReport && levelReport.themeUnlocked ? `<div class="unlock">Thème « ${worldName(levelReport.themeUnlocked)} » débloqué !</div><button class="opt" data-act="equip"><span>Mettre ce thème maintenant</span><span class="price">Équiper</span></button>` : ''}
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>Pièces</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      ${outOfMoves ? `<button class="opt" data-act="more"><span>+${M.EXTRA_MOVES} coups pour finir (1 étoile max)</span><span class="price">${moreCost}${COIN}</span></button>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="map">Carte</button>
        ${stage.won && stage.stars >= 3 ? '' : `<button class="btn ${next ? 'ghost' : 'primary'}" data-act="again">${stage.won ? 'Rejouer' : 'Réessayer'}</button>`}
        ${next ? '<button class="btn primary" data-act="next">Suivant</button>' : ''}
      </div>`;
    card.querySelector('[data-act="map"]').addEventListener('click', () => openWorld(w));
    const again = card.querySelector('[data-act="again"]');
    if (again) again.addEventListener('click', () => startLevel(w, n));
    if (next) card.querySelector('[data-act="next"]').addEventListener('click', () => (next[1] === 1 && next[0] !== w ? openWorld(next[0]) : openStage(next[0], next[1])));
    bindMoreMoves(card, moreCost);
    const equip = card.querySelector('[data-act="equip"]');
    if (equip) equip.addEventListener('click', () => {
      const next = M.equip(profile, 'boards', levelReport.themeUnlocked);
      if (!next) { sfx.nope(); return; }
      profile = next;
      saveProfile();
      paintBackground();
      sfx.buy();
      equip.disabled = true;
      equip.querySelector('.price').textContent = 'Équipé';
    });
    levelEndEl.classList.add('show');
    starChimes(stage.stars);
  }

  // One chime per star, in step with the stars' CSS entrance (0, 180, 360 ms).
  function starChimes(n) {
    for (let k = 0; k < n; k++) setTimeout(() => sfx.star(k), 60 + k * 180);
  }

  function bindMoreMoves(card, cost) {
    const more = card.querySelector('[data-act="more"]');
    if (!more) return;
    more.disabled = profile.coins < cost;
    more.addEventListener('click', () => {
      const revived = L.addMoves(state, M.EXTRA_MOVES);
      if (!revived || profile.coins < cost) { sfx.nope(); return; }
      payCoins(cost);
      state = revived;
      overAt = 0;
      levelEndEl.classList.remove('show');
      banners.push({ text: `+${M.EXTRA_MOVES} coups`, sub: 'Dernière chance !', gold: true });
      sfx.buy();
      renderInventory();
      save();
    });
  }

  document.getElementById('adventure-close').addEventListener('click', () => { hideAdventure(); openMenu(); });
  document.getElementById('world-back').addEventListener('click', openAdventure);
  for (const el of [adventureEl, worldEl, stageEl]) {
    el.addEventListener('click', (e) => { if (e.target === el) { hideAdventure(); openMenu(); } });
  }


  // ---------- daily level, streak, profile ----------
  const profileEl = document.getElementById('profile');
  const FLAME_SVG = (size = 18, on = true) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.3.2 1.7 1 2.8 2.1 3.3-.4-3.3.3-6.3 1-9z" fill="${on ? '#ff7a1a' : 'currentColor'}" opacity="${on ? 1 : 0.35}"/><path d="M12 13.5c.9 1.4 2.6 2.2 2.6 4.2a2.6 2.6 0 0 1-5.2 0c0-1.5.9-2.6 2.6-4.2z" fill="${on ? '#ffd23f' : 'transparent'}"/></svg>`;
  const TROPHY_SVG = (kind, size = 44) => {
    const fill = kind === 'gold' ? '#f5c542' : kind === 'silver' ? '#c9d2de' : 'none';
    const stroke = kind ? (kind === 'gold' ? '#b07a12' : '#8a96a8') : 'currentColor';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round" opacity="${kind ? 1 : 0.35}"><path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none"/><path d="M10 13h4v3h-4zM8 19.5h8V21H8zM9.5 16h5l1 3.5h-7z"/></svg>`;
  };
  // One glyph per album page, white on the sticker's colored badge.
  const STICKER_GLYPHS = {
    combo: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
    explorer: '<path d="M6 21V4M6 4h11l-2.5 4L17 12H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>',
    faithful: '<path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.3.2 1.7 1 2.8 2.1 3.3-.4-3.3.3-6.3 1-9z" fill="currentColor"/>',
    collector: '<path d="M7 4h10l4 5-9 11L3 9z M3 9h18 M9.5 4 8 9l4 11 4-11-1.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    secret: '<path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z" fill="currentColor"/><circle cx="19" cy="19" r="1.8" fill="currentColor"/><circle cx="5" cy="4.5" r="1.3" fill="currentColor"/>',
  };
  // Unearned secret stickers show a question mark instead of their glyph, name and hint.
  const SECRET_GLYPH = '<path d="M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.8v.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18.3" r="1.5" fill="currentColor"/>';
  const PAGE_COLORS = { combo: '#ff8fab', explorer: '#6fd6a0', faithful: '#ff9f43', collector: '#8b7cf6', secret: '#3fc1b0' };
  const WORLD_COLORS = { plain: '#5cc64a', sea: '#1a6aa8', space: '#6a3fd0', ice: '#5ccfe6', forest: '#2f7a4a', retro: '#306230', arcade: '#ff3fd0', volcano: '#e8501a' };
  let freshStickers = new Set();

  // Pays newly earned stickers; returns them as report lines and queues their peel animation.
  function stickerLines() {
    const res = M.checkStickers(profile, today());
    profile = res.profile;
    for (const st of res.fresh) freshStickers.add(st.id);
    return res.fresh.map((st) => ({ label: 'Autocollant : ' + st.name, coins: st.reward || M.STICKER_REWARD }));
  }

  const dailyWord = (day) => (day === today() ? 'Niveau du jour' : 'Jour rattrapé');

  // Menu "Défis" button: today's level status and streak.
  function renderDailyButton() {
    const t = today();
    const d = M.dailyOf(profile, t);
    const left = M.dailyAttemptsLeft(profile, t, t);
    const streak = M.streakNow(profile, t);
    const world = worldName(LV.daily(t).world);
    document.getElementById('menu-daily-sub').textContent = d.stars !== undefined ? `${world} · réussi`
      : left ? `${world} · ${left} essai${left > 1 ? 's' : ''}` : 'Reviens demain';
    document.getElementById('menu-defis').classList.toggle('done', d.stars !== undefined);
    document.getElementById('menu-flame').innerHTML = FLAME_SVG(18, streak > 0) + streak;
    document.getElementById('menu-flame').setAttribute('aria-label', `Série de ${streak} jour${streak > 1 ? 's' : ''}`);
  }

  let dailyBack = 'menu'; // where "Retour" goes from the daily sheet: 'menu' or 'defis'

  function openDailySheet(day, from) {
    if (from) dailyBack = from;
    const t = today();
    const stage = LV.daily(day);
    const d = M.dailyOf(profile, day);
    const left = M.dailyAttemptsLeft(profile, day, t);
    const st = M.streakOf(profile);
    const card = document.getElementById('stage-card');
    const budget = stage.clock ? `${Math.round(stage.clock / 1000)} secondes` : `${stage.maxMoves} coups`;
    const tries = day === t ? `${left} essai${left > 1 ? 's' : ''} sur ${M.DAILY_ATTEMPTS} aujourd'hui` : 'Essais illimités, ne compte pas pour la série';
    card.innerHTML = `
      <div class="shop-head"><h2>${dailyWord(day)}</h2><span class="star-pill">#${LV.dayNumber(day)}</span></div>
      <div class="day-nav">
        <button class="close" data-nav="-1" aria-label="Jour précédent" ${day <= LV.DAILY_START ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <span class="stage-sub">${worldName(stage.world)} · ${frDate(day)}</span>
        <button class="close" data-nav="1" aria-label="Jour suivant" ${day >= t ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>
      <div class="stage-goal">${LV.goalText(stage.goal)}</div>
      <div class="stage-sub">${budget} · ${tries}</div>
      <div class="stage-stars">${starsRow(d.stars || 0, 34)}</div>
      ${day === t ? `<button class="opt" data-act="freeze"><span>Gel de série (${st.freezes}/${M.FREEZE_MAX}) : protège un jour manqué</span><span class="price">${M.FREEZE_COST}${COIN}</span></button>` : ''}
      <div class="actions"><button class="btn ghost" data-act="back">Retour</button><button class="btn primary" data-act="play">Jouer</button></div>`;
    const play = card.querySelector('[data-act="play"]');
    play.disabled = !left;
    if (!left) play.textContent = 'Reviens demain';
    card.querySelector('[data-act="back"]').addEventListener('click', () => {
      hideAdventure();
      if (dailyBack === 'defis') goTab('defis'); else openMenu();
    });
    for (const b of card.querySelectorAll('[data-nav]')) b.addEventListener('click', () => { sfx.turn(); openDailySheet(M.addDays(day, +b.dataset.nav)); });
    play.addEventListener('click', () => startDaily(day));
    const freeze = card.querySelector('[data-act="freeze"]');
    if (freeze) {
      freeze.disabled = st.freezes >= M.FREEZE_MAX || profile.coins < M.FREEZE_COST;
      freeze.addEventListener('click', () => {
        const next = M.buyFreeze(profile);
        if (!next) { sfx.nope(); return; }
        profile = next; saveProfile(); renderWallet(); sfx.buy(); openDailySheet(day);
      });
    }
    hideAdventure();
    profileEl.classList.remove('show');
    defisEl.classList.remove('show');
    menuEl.classList.remove('show');
    stageEl.classList.add('show');
  }

  function startDaily(day) {
    unlockAudio();
    guardRun(inProgress() && !state.stage, () => launchDaily(day));
  }
  function launchDaily(day) {
    const next = M.startDaily(profile, day, today());
    if (!next) { sfx.nope(); return; }
    profile = next;
    saveProfile();
    hideAdventure();
    menuEl.classList.remove('show');
    const stage = LV.daily(day);
    restartRun({ mode: 'adventure', stage, seed: stage.seed });
    banners.push({ text: dailyWord(day), sub: LV.goalText(stage.goal), gold: true });
  }

  const frDate = (day) => new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  function showDailyEnd(title, lines, total, outOfMoves, report) {
    const stage = state.stage;
    const day = stage.daily;
    const card = document.getElementById('level-end-card');
    const left = M.dailyAttemptsLeft(profile, day, today());
    const moreCost = M.extraMovesCost(stage.extra);
    const streak = report && report.streak;
    card.innerHTML = `
      <h2>${title}</h2>
      <div class="stage-sub">${dailyWord(day)} #${LV.dayNumber(day)} · ${worldName(stage.world)}</div>
      <div class="stage-stars">${starsRow(stage.stars, 44)}</div>
      <div class="stage-sub">${LV.goalText(stage.goal)} · ${fmt(Math.min(stage.goal.type === 'score' ? state.score : stage.progress, stage.goal.target))} / ${fmt(stage.goal.target)}</div>
      ${streak ? `<div class="unlock flame">${FLAME_SVG(20)} Série : ${streak.count} jour${streak.count > 1 ? 's' : ''}</div>` : ''}
      ${report && report.unlocked ? `<div class="unlock">Skin de blocs « Or » débloqué ! Équipe-le dans la Boutique, onglet Blocs.</div>` : ''}
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>Pièces</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      ${outOfMoves ? `<button class="opt" data-act="more"><span>+${M.EXTRA_MOVES} coups pour finir (1 étoile max)</span><span class="price">${moreCost}${COIN}</span></button>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="menu">Menu</button>
        ${left && !(stage.won && stage.stars >= 3)
          ? `<button class="btn primary" data-act="retry">${stage.won ? 'Rejouer' : 'Réessayer'}${Number.isFinite(left) ? ` (${left})` : ''}</button>` : ''}
      </div>`;
    card.querySelector('[data-act="menu"]').addEventListener('click', () => { hideAdventure(); openMenu(); });
    const retry = card.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', () => startDaily(day));
    bindMoreMoves(card, moreCost);
    levelEndEl.classList.add('show');
    starChimes(stage.stars);
  }

  // ----- profile screen -----
  let profileTab = 'album';

  function openProfile(tab) {
    unlockAudio();
    if (tab) profileTab = tab;
    if (profileTab === 'calendar') profileTab = 'album';
    menuEl.classList.remove('show');
    renderProfile();
    profileEl.classList.add('show');
  }
  for (const b of document.querySelectorAll('.ptab')) {
    b.addEventListener('click', () => { profileTab = b.dataset.ptab; sfx.turn(); renderProfile(); });
  }

  function renderProfile() {
    for (const b of document.querySelectorAll('.ptab')) b.classList.toggle('on', b.dataset.ptab === profileTab);
    const body = document.getElementById('profile-body');
    if (profileTab === 'album') body.innerHTML = albumHtml();
    else body.innerHTML = statsHtml();
    freshStickers.clear();
    for (const b of body.querySelectorAll('[data-smode]')) {
      b.addEventListener('click', () => { statsMode = b.dataset.smode; sfx.turn(); renderProfile(); });
    }
    const cap = body.querySelector('#chart-cap');
    for (const bar of body.querySelectorAll('.chart .bar')) {
      const show = () => {
        for (const o of body.querySelectorAll('.chart .bar.on')) o.classList.remove('on');
        bar.classList.add('on');
        const n = +bar.dataset.n;
        const count = body.querySelectorAll('.chart .bar').length;
        cap.textContent = `${n === count ? 'Dernière partie' : `Partie ${n} sur ${count}`} : ${fmt(+bar.dataset.v)} points`;
      };
      bar.addEventListener('pointerenter', show);
      bar.addEventListener('click', show);
    }
  }

  function monthsSinceStart() {
    const out = [];
    let m = LV.DAILY_START.slice(0, 7);
    const end = today().slice(0, 7);
    while (m <= end) { out.push(m); m = M.addDays(m + '-28', 5).slice(0, 7); }
    return out;
  }
  const frMonth = (m) => new Date(m + '-15T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const frMonthShort = (m) => new Date(m + '-15T12:00:00').toLocaleDateString('fr-FR', { month: 'short' });

  // Day a sticker was earned ('YYYY-MM-DD'), e.g. "Obtenu le 30 sept. 2026".
  const gotOn = (day) => typeof day === 'string'
    ? `Obtenu le ${new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'Obtenu';

  function albumHtml() {
    const got = profile.stickers || {};
    const count = M.STICKERS.filter((s) => got[s.id]).length; // ignores retired stickers
    let html = `
      <div class="section-title" style="margin-top:0">Trophées du mois</div>
      <div class="shelf">${monthsSinceStart().map((m) => `<div class="trophy">${TROPHY_SVG(M.monthTrophy(profile, m))}${frMonthShort(m)}</div>`).join('')}</div>`;
    html += `<div class="section-title">Autocollants · ${count} / ${M.STICKERS.length}</div>`;
    for (const page of M.STICKER_PAGES) {
      html += `<div class="section-title">${page.name}</div><div class="stickers">`;
      for (const sk of M.STICKERS.filter((x) => x.page === page.id)) {
        const on = !!got[sk.id];
        const hidden = sk.secret && !on;
        const color = sk.world ? WORLD_COLORS[sk.world] : PAGE_COLORS[page.id];
        html += `<div class="sticker${on ? '' : ' off'}${freshStickers.has(sk.id) ? ' fresh' : ''}" style="--c:${color}">
          <span class="badge"><svg width="28" height="28" viewBox="0 0 24 24">${hidden ? SECRET_GLYPH : STICKER_GLYPHS[page.id]}</svg></span>
          <b>${hidden ? 'Secret' : sk.name}</b><span>${on ? (sk.secret ? sk.hint : gotOn(got[sk.id])) : hidden ? 'À découvrir' : sk.hint}</span>${on && sk.secret ? `<span class="when">${gotOn(got[sk.id])}</span>` : ''}</div>`;
      }
      html += '</div>';
    }
    return html;
  }

  // ----- Défis tab: today's level first, the streak, today's missions, then past days on demand -----
  const defisEl = document.getElementById('defis');
  let calMonth = null; // 'YYYY-MM' shown in the calendar
  let defisDay = null; // day picked in the calendar
  let calOpen = false;

  function openDefis(day) {
    unlockAudio();
    defisDay = day || defisDay || today();
    if (defisDay > today()) defisDay = today();
    calMonth = defisDay.slice(0, 7);
    if (day && day !== today()) calOpen = true;
    menuEl.classList.remove('show');
    hideAdventure();
    renderDefis();
    defisEl.classList.add('show');
  }

  function renderDefis() {
    const t = today();
    const streak = M.streakNow(profile, t);
    document.getElementById('defis-flame').innerHTML = FLAME_SVG(18, streak > 0) + streak;
    const body = document.getElementById('defis-body');
    body.innerHTML = todayHtml() + streakHtml() + '<div class="missions" id="defis-missions"></div>'
      + '<div class="defis-note">Elles avancent dans tous les modes. Trois nouvelles chaque jour.</div>'
      + `<div class="section-title">Jours passés</div>
         <button class="opt cal-toggle" data-act="cal" aria-expanded="${calOpen}"><span>Rattraper un niveau manqué</span>
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>`
      + (calOpen ? `<div id="defis-cal">${calendarHtml()}${dayHtml(defisDay)}</div>` : '');
    renderMissionList(document.getElementById('defis-missions'), [], liveRun());
    body.querySelector('[data-act="today"]').addEventListener('click', () => { sfx.turn(); startDaily(t); });
    body.querySelector('[data-act="cal"]').addEventListener('click', () => {
      calOpen = !calOpen;
      sfx.turn();
      renderDefis();
      if (calOpen) document.getElementById('defis-cal').scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
    });
    const freeze = body.querySelector('[data-act="freeze"]');
    freeze.addEventListener('click', () => {
      const next = M.buyFreeze(profile);
      if (!next) { sfx.nope(); return; }
      profile = next; saveProfile(); renderWallet(); sfx.buy(); renderDefis();
    });
    for (const b of body.querySelectorAll('[data-cal]')) {
      b.addEventListener('click', () => {
        calMonth = M.addDays(calMonth + '-15', +b.dataset.cal * 30).slice(0, 7);
        sfx.turn();
        renderDefis();
      });
    }
    for (const b of body.querySelectorAll('[data-day]')) b.addEventListener('click', () => { defisDay = b.dataset.day; sfx.turn(); renderDefis(); });
    const daily = body.querySelector('[data-act="daily"]');
    if (daily) daily.addEventListener('click', () => openDailySheet(defisDay, 'defis'));
  }

  // Today's level with its Play button: the reason to open the tab.
  function todayHtml() {
    const t = today();
    const stage = LV.daily(t);
    const d = M.dailyOf(profile, t);
    const left = M.dailyAttemptsLeft(profile, t, t);
    const done = d.stars !== undefined;
    const budget = stage.clock ? `${Math.round(stage.clock / 1000)} s` : `${stage.maxMoves} coups`;
    const status = done ? `<span class="stars">${starsRow(d.stars, 18)}</span>`
      : left ? `${budget} · ${left} essai${left > 1 ? 's' : ''} sur ${M.DAILY_ATTEMPTS}` : 'Plus d’essai aujourd’hui';
    return `
      <div class="today${done ? ' done' : ''}">
        <small>Niveau du jour #${LV.dayNumber(t)} · ${worldName(stage.world)}</small>
        <span class="goal-line">${LV.goalText(stage.goal)}</span>
        <div class="row"><span>${status}</span>
          <button class="btn primary" data-act="today" ${left ? '' : 'disabled'}>${!left ? 'Demain' : done ? 'Rejouer' : 'Jouer'}</button></div>
      </div>
      <p class="defis-note">Le même niveau pour tout le monde. Réussis-en un chaque jour pour garder ta série.</p>`;
  }

  function streakHtml() {
    const t = today();
    const st = M.streakOf(profile);
    const now = M.streakNow(profile, t);
    return `
      <div class="section-title">Série</div>
      <div class="streak-card">
        ${FLAME_SVG(38, now > 0)}<span class="big">${now}</span>
        <div class="txt"><b>jour${now > 1 ? 's' : ''} d'affilée</b><br>Record : ${st.best} · Gels : ${st.freezes}/${M.FREEZE_MAX}</div>
      </div>
      <button class="opt" data-act="freeze" ${st.freezes >= M.FREEZE_MAX || profile.coins < M.FREEZE_COST ? 'disabled' : ''}><span>Gel de série : protège un jour manqué</span><span class="price">${M.FREEZE_COST}${COIN}</span></button>`;
  }

  function calendarHtml() {
    const t = today();
    const days = M.monthDays(calMonth);
    const offset = (new Date(days[0] + 'T12:00:00').getDay() + 6) % 7; // Monday first
    let html = `<div class="cal-head">
        <button class="close" data-cal="-1" aria-label="Mois précédent" ${calMonth <= LV.DAILY_START.slice(0, 7) ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <b>${frMonth(calMonth)}</b>
        <button class="close" data-cal="1" aria-label="Mois suivant" ${calMonth >= t.slice(0, 7) ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
      </div><div class="cal">`;
    for (const d of ['L', 'M', 'M', 'J', 'V', 'S', 'D']) html += `<span class="dow">${d}</span>`;
    for (let i = 0; i < offset; i++) html += '<span></span>';
    for (const day of days) {
      const d = M.dailyOf(profile, day);
      const off = day > t || day < LV.DAILY_START;
      const cls = (d.stars !== undefined ? ' done' : '') + (day === t ? ' today' : '') + (day === defisDay ? ' pick' : '');
      const mark = d.stars !== undefined ? `<span class="stars">${starsRow(d.stars, 8)}</span>` : '';
      html += `<button data-day="${day}" class="${cls.trim()}" ${off ? 'disabled' : ''} aria-label="${frDate(day)}">${Number(day.slice(8))}${mark}</button>`;
    }
    return html + '</div>';
  }

  // The picked day's level card (stars, attempts).
  function dayHtml(day) {
    const t = today();
    const stage = LV.daily(day);
    const d = M.dailyOf(profile, day);
    const left = M.dailyAttemptsLeft(profile, day, t);
    const done = d.stars !== undefined;
    const side = done ? `<span class="stars">${starsRow(d.stars, 14)}</span>Réussi`
      : day === t ? (left ? `${left} essai${left > 1 ? 's' : ''}` : 'Demain') : 'Rattrapage';
    const dateLabel = new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const trophy = M.monthTrophy(profile, calMonth);
    return `
      <div class="day-title">${day === t ? "Aujourd'hui" : dateLabel}</div>
      <button class="defi${done ? ' done' : ''}" data-act="daily">
        <span class="txt"><b>Niveau #${LV.dayNumber(day)} · ${worldName(stage.world)}</b><span>${LV.goalText(stage.goal)}</span></span>
        <span class="side">${side}</span>
      </button>
      <div class="defis-note">${trophy ? `Trophée ${trophy === 'gold' ? "d'or" : "d'argent"} gagné ce mois-ci.` : 'Trophée du mois : réussis chaque niveau du jour (or avec 3 étoiles partout).'}</div>`;
  }

  // ----- stats: one mode at a time (tiles + last scores), then lifetime counters -----
  const STAT_MODES = [['classic', 'Classique'], ['chrono', 'Chrono'], ['chill', 'Chill'], ['worlds', 'Mondes']];
  const CHART_RUNS = 20;
  let statsMode = 'classic';

  function modeStatsHtml() {
    const ms = M.modeStats(profile, statsMode);
    const record = Math.max(ms.best, bests[statsMode] || 0);
    const tiles = [
      ['Parties', fmt(ms.games)],
      ['Record', fmt(record)],
      ['Moyenne', ms.games ? fmt(Math.round(ms.total / ms.games)) : '–'],
      ['Meilleur combo', ms.bestCombo ? '×' + ms.bestCombo : '–'],
    ];
    return `
      <div class="seg pills stat-modes">${STAT_MODES.map(([id, name]) => `<button data-smode="${id}" class="${id === statsMode ? 'on' : ''}">${name}</button>`).join('')}</div>
      <div class="stat-tiles">${tiles.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      ${scoreChart(M.recentScores(profile, statsMode, CHART_RUNS))}`;
  }

  // Last scores as bars, oldest left. One series: accent bars, the best one labeled; tap a bar for its value.
  function scoreChart(scores) {
    if (!scores.length) return '<div class="chart-empty">Tes prochaines parties dans ce mode s’afficheront ici.</div>';
    const W0 = 300;
    const H0 = 96;
    const top = 16;
    const max = Math.max(...scores, 1);
    const slot = W0 / CHART_RUNS;
    const bw = slot - 2; // 2px surface gap between bars
    const peak = scores.indexOf(Math.max(...scores));
    const bars = scores.map((v, i) => {
      const h = Math.max(3, ((H0 - top) * v) / max);
      const x = i * slot + 1;
      const y = H0 - h;
      const r = Math.min(4, h, bw / 2);
      // Rounded data end, square on the baseline.
      const d = `M${x},${H0}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${H0}Z`;
      return `<g class="bar" data-v="${v}" data-n="${i + 1}"><rect x="${i * slot}" y="0" width="${slot}" height="${H0}" fill="transparent"/><path d="${d}"/><title>${fmt(v)} points</title></g>`;
    }).join('');
    const px = peak * slot + 1 + bw / 2;
    const label = `<text x="${Math.min(W0 - 4, Math.max(4, px))}" y="${H0 - Math.max(3, ((H0 - top) * scores[peak]) / max) - 4}" text-anchor="${px < 30 ? 'start' : px > W0 - 30 ? 'end' : 'middle'}">${fmt(scores[peak])}</text>`;
    return `
      <div class="chart">
        <svg viewBox="0 0 ${W0} ${H0 + 1}" role="img" aria-label="Scores des ${scores.length} dernières parties">${bars}<line x1="0" x2="${W0}" y1="${H0 + 0.5}" y2="${H0 + 0.5}"/>${label}</svg>
        <div class="chart-cap" id="chart-cap">${scores.length} dernière${scores.length > 1 ? 's' : ''} partie${scores.length > 1 ? 's' : ''} · meilleure : ${fmt(scores[peak])}</div>
      </div>`;
  }

  function statsHtml() {
    const lt = profile.lifetime || {};
    const dailies = Object.values(profile.daily || {}).filter((d) => d.stars !== undefined).length;
    const rows = [
      ['Parties jouées', fmt(lt.games || 0)],
      ['Meilleur score (tous modes)', fmt(lt.score || 0)],
      ['Meilleur combo', lt.bestCombo ? '×' + lt.bestCombo : '–'],
      ['Lignes effacées', fmt(lt.lines || 0)],
      ['Formes posées', fmt(lt.pieces || 0)],
      ['Grilles vidées', fmt(lt.perfects || 0)],
      ['Bonus utilisés', fmt(lt.bonusUsed || 0)],
      ['Pièces gagnées', fmt(lt.coinsEarned || 0)],
      ['Étoiles en Aventure', `${M.totalStars(profile)} / ${M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3}`],
      ['Niveaux du jour réussis', fmt(dailies)],
      ['Plus longue série', M.streakOf(profile).best + ' jours'],
    ];
    return modeStatsHtml() + `<div class="section-title">Depuis le début</div><div class="stats">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
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
      if (key === 'darkMenus') applyThemeCss();
      save();
    });
  }
  // The whole row flips its switch, not just the small toggle.
  for (const row of document.querySelectorAll('.setting')) {
    const toggle = row.querySelector('.toggle');
    if (toggle) row.addEventListener('click', (e) => { if (!toggle.contains(e.target)) toggle.click(); });
  }
  let settingsFrom = 'menu'; // 'menu' or 'pause': where closing goes back to
  function openSettings(from) {
    settingsFrom = from;
    if (from === 'menu') closeMenu();
    renderSettings();
    settingsEl.classList.add('show');
  }
  function closeSettings() {
    settingsEl.classList.remove('show');
    if (settingsFrom === 'pause') openPause(); else openMenu();
  }
  document.getElementById('settings-close').addEventListener('click', closeSettings);
  settingsEl.addEventListener('click', (e) => { if (e.target === settingsEl) closeSettings(); });

  // ---------- pause ----------
  // The HUD button pauses; so does leaving the app mid-run. Timers stop under any open overlay.
  const pauseEl = document.getElementById('pause');
  function runLabel() {
    const st = state.stage;
    if (st) {
      const where = st.daily ? `Niveau du jour #${LV.dayNumber(st.daily)}` : `${worldName(st.world)} · ${levelName(st.n)}`;
      return `${where} · ${LV.goalText(st.goal)}`;
    }
    if (state.puzzle) return `${modeLabel()} · ${state.puzzle.placed} / ${state.puzzle.total} formes`;
    return `${modeLabel()} · ${fmt(state.score)} pts`;
  }
  function openPause() {
    if (state.over) { openMenu(); return; }
    hideTips();
    drag = null;
    showTrash(false);
    setAiming(false);
    document.getElementById('pause-sub').textContent = runLabel();
    // A daily attempt is counted when it starts: no free restart from here.
    document.getElementById('pause-restart').style.display = state.stage && state.stage.daily ? 'none' : '';
    pauseEl.classList.add('show');
  }
  const closePause = () => pauseEl.classList.remove('show');
  document.getElementById('pause-resume').addEventListener('click', () => { unlockAudio(); closePause(); });
  pauseEl.addEventListener('click', (e) => { if (e.target === pauseEl) closePause(); });
  document.getElementById('pause-restart').addEventListener('click', async () => {
    unlockAudio();
    if (inProgress() && !await ask({ title: 'Recommencer ?', text: 'La partie reprend depuis le début. Les pièces gagnées sont gardées.', ok: 'Recommencer', danger: true })) return;
    closePause();
    if (state.stage) startLevel(state.stage.world, state.stage.n);
    else if (state.puzzle) startPuzzle(state.puzzle.n);
    else restartRun({ mode: state.mode, level: state.level });
  });
  document.getElementById('pause-settings').addEventListener('click', () => { closePause(); openSettings('pause'); });
  document.getElementById('pause-menu').addEventListener('click', () => { closePause(); openMenu(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !tut && !state.over && !pausedByUi() && (state.moves > 0 || state.clock > 0)) openPause();
  });

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
    document.body.classList.toggle('puzzle', state.mode === 'puzzle');
    renderHint();
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
    document.getElementById('menu-coins').textContent = fmt(profile.coins);
    renderHint();
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
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => { shopTab = tab.dataset.tab; renderShop(); });
  }

  function renderShop(justBought) {
    renderWallet();
    for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('on', tab.dataset.tab === shopTab);
    shopBody.innerHTML = '';
    if (shopTab === 'bonus') { renderUpgrades(justBought); return; }
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
      else if (skin.price == null) { btn.className = 'exclusive'; btn.textContent = skin.exclusive; btn.disabled = true; }
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
        if (!owned) {
          for (const line of stickerLines()) banners.push({ text: 'Autocollant !', sub: line.label.replace('Autocollant : ', '') + ' · +' + line.coins, subIcon: 'coin', gold: true });
        }
        saveProfile();
        if (kind === 'boards') paintBackground();
        if (owned) sfx.turn(); else { sfx.buy(); buzz([20, 40, 20]); }
        renderShop(owned ? null : skin.id);
      });
      card.append(cv, name);
      if (kind === 'boards' && !owned && WD.WORLDS[skin.id]) {
        const via = document.createElement('div');
        via.className = 'via';
        via.textContent = 'Ou bats son boss';
        card.appendChild(via);
      }
      card.appendChild(btn);
      grid.appendChild(card);
      drawPreview(cv, kind === 'blocks' ? skin.id : profile.equipped.blocks, kind === 'boards' ? skin.id : profile.equipped.boards);
    }
    shopBody.appendChild(grid);
  }

  // Bonus tab: each bonus goes up to level 3. Bought levels apply to the run in progress too.
  function renderUpgrades(justBought) {
    const list = document.createElement('div');
    list.className = 'ups';
    for (const [type, ui] of Object.entries(BONUS_UI)) {
      const lv = M.upgradeLevel(profile, type);
      const price = M.upgradePrice(profile, type);
      const row = document.createElement('div');
      row.className = 'up' + (justBought === type ? ' just-bought' : '');
      const cv = document.createElement('canvas');
      const px = Math.round(40 * Math.min(window.devicePixelRatio || 1, 3));
      cv.width = px; cv.height = px;
      drawIcon(type, px / 2, px / 2, px * 0.94, cv.getContext('2d'));
      const txt = document.createElement('div');
      txt.className = 'txt';
      txt.innerHTML = '<b><span></span><span class="lv"></span></b><span></span>';
      txt.querySelector('b > span').textContent = ui.name;
      txt.querySelector('.lv').innerHTML = [1, 2, 3].map((k) => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('');
      txt.querySelector('.lv').setAttribute('aria-label', `Niveau ${lv} sur ${L.UPGRADE_MAX}`);
      txt.lastChild.textContent = price == null ? ui.levels[lv - 1] + ' · niveau max' : `${ui.levels[lv - 1]} → ${ui.levels[lv]}`;
      const btn = document.createElement('button');
      if (price == null) { btn.className = 'max'; btn.textContent = 'Max'; btn.disabled = true; }
      else {
        btn.innerHTML = COIN + ' ' + fmt(price);
        btn.disabled = profile.coins < price;
        btn.setAttribute('aria-label', `Améliorer ${ui.name} pour ${price} pièces`);
      }
      btn.addEventListener('click', () => {
        const next = M.buyUpgrade(profile, type);
        if (!next) { sfx.nope(); return; }
        profile = next;
        state = { ...state, upgrades: { ...profile.upgrades } };
        saveProfile();
        save();
        refreshBonusTexts();
        sfx.buy(); buzz([20, 40, 20]);
        renderShop(type);
      });
      row.append(cv, txt, btn);
      list.appendChild(row);
    }
    shopBody.appendChild(list);
    const note = document.createElement('p');
    note.className = 'ups-note';
    note.textContent = 'Les améliorations comptent dans tous les modes, même dans la partie en cours.';
    shopBody.appendChild(note);
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
        if (v) drawBlock(x, y, cell, paletteOf(th)[v], 1, 1, null, BLOCK_SKINS[blocksId], v);
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
  const legendTexts = {};
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
    text.lastChild.textContent = typeof ui.desc === 'function' ? '' : ui.desc;
    if (BONUS_UI[type]) legendTexts[type] = text.lastChild;
    row.append(cv, text);
    legendList.appendChild(row);
  }
  // Bonus texts follow the upgrade levels: tooltips and legend lines.
  function refreshBonusTexts() {
    for (const [type, ui] of Object.entries(BONUS_UI)) {
      const d = ui.desc(bonusLv(type));
      invButtons[type].dataset.tip = ui.name + ' — ' + d;
      legendTexts[type].textContent = d;
    }
  }
  refreshBonusTexts();
  legendBtn.addEventListener('click', () => { setAiming(false); refreshBonusTexts(); legendEl.classList.add('show'); });
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

  // ---------- tab bar ----------
  // Jouer, Défis, Boutique and Profil are the four hub screens. The bar shows while one of them is
  // up and nothing else covers it (level sheets, settings, dialogs, the game itself).
  const tabbarEl = document.getElementById('tabbar');
  const HUBS = { menu: menuEl, defis: defisEl, shop: shopEl, profile: profileEl };
  const HUB_OPEN = { menu: openMenu, defis: () => openDefis(), shop: openShop, profile: () => openProfile() };

  function goTab(name) {
    unlockAudio();
    const was = Object.values(HUBS).some((el) => el.classList.contains('show'));
    for (const [k, el] of Object.entries(HUBS)) if (k !== name) el.classList.remove('show');
    HUBS[name].classList.toggle('no-anim', was);
    HUB_OPEN[name]();
    HUBS[name].querySelector('.card').scrollTop = 0;
  }
  for (const b of tabbarEl.querySelectorAll('[data-go]')) {
    b.addEventListener('click', () => {
      if (HUBS[b.dataset.go].classList.contains('show')) { HUBS[b.dataset.go].querySelector('.card').scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' }); return; }
      sfx.turn();
      goTab(b.dataset.go);
    });
  }

  function syncTabbar() {
    const shown = [...document.querySelectorAll('.overlay.show')];
    const hub = Object.keys(HUBS).find((k) => HUBS[k].classList.contains('show'));
    const on = !!hub && shown.every((el) => el.classList.contains('hub'));
    document.body.classList.toggle('hub-on', on);
    for (const b of tabbarEl.querySelectorAll('[data-go]')) {
      const active = b.dataset.go === hub;
      b.classList.toggle('on', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    }
    // Only touch the class when needed: every class write would call this observer again.
    for (const el of Object.values(HUBS)) if (!el.classList.contains('show') && el.classList.contains('no-anim')) el.classList.remove('no-anim');
    // A dot on Défis while today's level can still be won.
    const t = today();
    tabbarEl.querySelector('.dot').hidden = !(M.dailyOf(profile, t).stars === undefined && M.dailyAttemptsLeft(profile, t, t) > 0);
  }
  const overlayWatch = new MutationObserver(syncTabbar);
  for (const el of document.querySelectorAll('.overlay')) overlayWatch.observe(el, { attributes: true, attributeFilter: ['class'] });

  // ---------- tutorial ----------
  // Guided first game: scripted steps from tutorial.js. The HUD makes room for the coach card,
  // a hand shows the drag, target cells glow. Nothing here is saved or counted.
  const coachEl = document.getElementById('coach');
  const handEl = document.getElementById('hand');
  const tutorialEndEl = document.getElementById('tutorial-end');
  const touchLift = matchMedia('(pointer: coarse)');
  let tut = null; // { step, saved, t0, doneAt }

  function startTutorial() {
    closeMenu();
    settingsEl.classList.remove('show');
    hideTips();
    tut = { step: 0, saved: inProgress() ? state : null, t0: 0, doneAt: 0 };
    document.body.classList.add('tutorial');
    loadStep(0);
  }

  function clearFx(t) {
    drag = null; aiming = null;
    returning = []; pops = []; fades = []; particles = []; floaters = []; banners = []; flyers = [];
    tracks = new Map(); shifts = []; drops = new Map();
    sweeps = []; punch = null; comboAt = 0; comboBreak = null;
    slotIn = [t, t, t]; slotSpin = [0, 0, 0]; nextIn = t;
    showTrash(false);
  }

  function loadStep(i) {
    const t = now();
    tut.step = i;
    tut.t0 = t;
    tut.doneAt = 0;
    state = T.lesson(i);
    displayScore = 0;
    clearFx(t);
    paintBackground();
    renderCoach();
  }

  function renderCoach(mood = '') {
    const step = T.STEPS[tut.step];
    document.getElementById('coach-step').textContent = `Étape ${tut.step + 1} / ${T.STEPS.length}`;
    document.getElementById('coach-title').textContent = mood === 'yay' ? 'Bravo !' : step.title;
    document.getElementById('coach-text').textContent = mood === 'nope' ? 'Vise les cases qui brillent.' : step.text;
    coachEl.className = '';
    void coachEl.offsetWidth; // restart the nudge animation
    coachEl.className = mood;
  }

  function tutorialNope() {
    renderCoach('nope');
    buzz(20);
  }

  function tutorialMoved(slot, t) {
    state = T.afterMove(state, slot);
    if (!T.done(state)) return;
    tut.doneAt = t;
    const step = tut.step;
    setTimeout(() => { if (tut && tut.step === step) { renderCoach('yay'); sfx.mission(); } }, 450);
    setTimeout(() => {
      if (!tut || tut.step !== step) return;
      if (step + 1 < T.STEPS.length) loadStep(step + 1);
      else tutorialEndEl.classList.add('show');
    }, 1900);
  }

  function endTutorial() {
    const saved = tut.saved;
    tut = null;
    document.body.classList.remove('tutorial');
    tutorialEndEl.classList.remove('show');
    handEl.classList.remove('on');
    profile = M.markTip(profile, 'tutorial');
    saveProfile();
    if (saved) {
      // Replayed from the settings: back to the run that was going on.
      state = saved;
      displayScore = state.score;
      clearFx(now());
      paintBackground();
      syncMode();
      renderInventory();
    } else {
      newGame({ mode: prefs.mode, level: prefs.level });
    }
  }
  document.getElementById('tutorial-play').addEventListener('click', () => { unlockAudio(); endTutorial(); });
  document.getElementById('coach-skip').addEventListener('click', () => { unlockAudio(); endTutorial(); });
  document.getElementById('setting-tutorial').addEventListener('click', () => { unlockAudio(); sfx.turn(); startTutorial(); });

  // Where the next scripted piece should go: its center on the board, in pixels.
  function tutorialTarget() {
    const [target] = T.targets(tut.step, state);
    if (!target) return null;
    const rows = target.cells.map((p) => p[0]);
    const cols = target.cells.map((p) => p[1]);
    const r = (Math.min(...rows) + Math.max(...rows)) / 2;
    const c = (Math.min(...cols) + Math.max(...cols)) / 2;
    return { slot: target.slot, x: lay.bx + (c + 0.5) * lay.cell, y: lay.by + (r + 0.5) * lay.cell };
  }

  function drawTutorialCells(t) {
    if (tut.doneAt) return;
    const th = theme();
    // Free placement (first step): a softer glow, it is only a suggestion.
    const strength = T.STEPS[tut.step].lines ? 1 : 0.6;
    ctx.fillStyle = withAlpha(th.accent, (0.3 + 0.2 * Math.sin(t / 220)) * strength);
    for (const target of T.targets(tut.step, state)) {
      for (const [r, c] of target.cells) {
        if (state.board[r * SIZE + c]) continue;
        ctx.beginPath();
        ctx.roundRect(lay.bx + c * lay.cell + 3, lay.by + r * lay.cell + 3, lay.cell - 6, lay.cell - 6, lay.cell * 0.2);
        ctx.fill();
      }
    }
  }

  // Loop: the hand picks the piece in the tray, drags it (ghost included) to the glowing cells.
  const HAND_LOOP = 2200;
  function drawTutorialHand(t) {
    const target = tut && !drag && !tut.doneAt && !returning.length && tutorialTarget();
    const since = tut ? t - tut.t0 - 700 : -1;
    if (!target || since < 0) { handEl.classList.remove('on'); return; }
    const p = (since % HAND_LOOP) / HAND_LOOP;
    const piece = state.tray[target.slot];
    const [sx, sy] = slotCenter(target.slot);
    const lift = touchLift.matches ? lay.cell * 2.2 : 0;
    const move = easeInOut(Math.min(1, Math.max(0, (p - 0.18) / 0.47)));
    const alpha = p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1;
    const pressed = p > 0.12 && p < 0.72;
    // The piece rides above the finger, like a real drag.
    const px = sx + (target.x - sx) * move;
    const py = sy + (target.y - sy) * move;
    const fx = px;
    const fy = py + lift * move + (lift ? 0 : lay.cell * 0.4);
    if (pressed && move > 0) {
      const size = miniCell() + (lay.cell - miniCell()) * Math.min(1, move * 3);
      drawPiece(piece, px, py, size, 0.55 * alpha);
    }
    handEl.classList.add('on');
    handEl.style.opacity = alpha.toFixed(3);
    handEl.style.transform = `translate(${fx - 17}px, ${fy - 3}px) scale(${pressed ? 0.9 : 1})`;
  }
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

  // ---------- tips ----------
  // One-time bubbles, shown the first time something happens. Seen ids live in profile.tips.
  const tipEl = document.getElementById('tip');
  let tipQueue = [];
  let tipShown = null; // the tip on screen: { id, title, text, anchor }

  function tip(id, title, text, anchor) {
    if (tut || M.tipSeen(profile, id) || tipQueue.some((q) => q.id === id) || (tipShown && tipShown.id === id)) return;
    tipQueue.push({ id, title, text, anchor });
  }
  function hideTips() {
    tipQueue = [];
    tipShown = null;
    tipEl.classList.remove('show');
  }
  tipEl.addEventListener('click', () => { tipShown = null; });

  // Called each frame: shows the next tip once no screen covers the game, hides it under overlays.
  function pumpTips() {
    const covered = pausedByUi() || !!tut;
    if (!tipShown && tipQueue.length && !covered && !state.over) {
      tipShown = tipQueue.shift();
      profile = M.markTip(profile, tipShown.id);
      saveProfile();
      tipEl.innerHTML = `<b>${tipShown.title}</b>${tipShown.text}<small>Touche pour fermer</small>`;
      placeTip(tipShown.anchor);
    }
    tipEl.classList.toggle('show', !!tipShown && !covered);
  }

  // Next to its anchor (element or rect getter), above it in the lower half of the screen.
  function placeTip(anchor) {
    const r = anchor && (anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor());
    tipEl.classList.remove('above', 'below', 'free');
    tipEl.style.top = tipEl.style.bottom = '';
    const w = Math.min(300, W - 32);
    if (!r || !r.width) {
      tipEl.classList.add('free');
      tipEl.style.left = (W - w) / 2 + 'px';
      tipEl.style.top = lay.by + lay.cell * 2 + 'px';
      return;
    }
    const cx = (r.left + r.right) / 2;
    const left = Math.max(16, Math.min(W - 16 - w, cx - w / 2));
    tipEl.style.left = left + 'px';
    tipEl.style.setProperty('--arrow', Math.max(18, Math.min(w - 18, cx - left)) + 'px');
    if ((r.top + r.bottom) / 2 > H / 2) {
      tipEl.classList.add('above');
      tipEl.style.bottom = H - r.top + 12 + 'px';
    } else {
      tipEl.classList.add('below');
      tipEl.style.top = r.bottom + 12 + 'px';
    }
  }

  const rectOf = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });

  function collectTips(collected) {
    const bonus = collected.find((b) => !b.coins);
    if (bonus) {
      tip('bonus', 'Bonus gagné !', `${BONUS_UI[bonus.type].name} : touche-le en bas pour l'utiliser. Le bouton « ? » explique chaque bonus.`, invButtons[bonus.type]);
    }
    if (collected.some((b) => b.coins)) {
      tip('coins', 'Des pièces !', 'Dépense-les en Boutique, ou pour jeter une forme et annuler un coup.', walletEl);
    }
  }

  function modeTips() {
    const plate = () => rectOf(W / 2 - 110, lay.plateY, 220, lay.plateH);
    if (state.mode === 'chrono') {
      tip('chrono', 'Chrono', 'Le temps file ! Chaque ligne effacée te rend quelques secondes.', () => {
        const [x, y] = chronoBar();
        return rectOf(x, y - 6, lay.board, 12);
      });
    } else if (state.mode === 'chill') {
      tip('chill', 'Chill', 'Touche une forme pour la tourner. Pas de bonus, pas de pression.', () => rectOf(lay.bx, lay.ty, lay.nextX - lay.bx, lay.trayH));
    } else if (state.mode === 'puzzle') {
      tip('puzzle', 'Puzzle', 'Remplis tout le dessin avec les formes données. Touche une forme pour la tourner.', () => rectOf(lay.bx, lay.ty, lay.nextX - lay.bx, lay.trayH));
    } else if (state.mode === 'worlds') {
      tip('worlds', 'Mondes', 'Partie sans fin avec les règles du monde. Plus tu marques, plus la prime en pièces grossit.', plate);
    } else if (state.stage && state.stage.daily) {
      tip('daily', 'Niveau du jour', 'Le même niveau pour tout le monde aujourd’hui. Atteins l’objectif affiché en haut.', plate);
    } else if (state.stage) {
      tip('adventure', 'Aventure', 'Atteins l’objectif affiché en haut avant d’avoir joué tous tes coups.', plate);
    }
  }

  // ---------- mascot ----------
  // Cubo, a mint jelly with a sprout, perched on the top-right corner of the board. Its base mood
  // follows the game (watching the dragged piece, worried on a crowded board, asleep behind a menu,
  // sad or partying at the end); events (clears, combos, bonuses, a broken combo) play short moods
  // over it. Tap it: it bounces and throws hearts; tap it a lot and it gets dizzy.
  const CUBO = { base: '#5ad9a8', dark: '#2f9f78', light: '#b7f5dc', ink: '#23313a', cheek: '#ff8fa8', leaf: '#7bcf52', leafDark: '#4f9e33' };
  const cubo = { mood: null, until: 0, jumpAt: -1e9, jumpH: 0, taps: [], hearts: [], blinkAt: 0, dizzyUntil: 0 };

  function cuboReact(mood, ms, jump = 0) {
    if (!settings.mascot) return;
    const t = now();
    if (t < cubo.dizzyUntil) return;
    cubo.mood = mood;
    cubo.until = t + ms;
    if (jump && !calm()) { cubo.jumpAt = t; cubo.jumpH = jump; }
  }

  // Where Cubo sits: bottom center on the board frame, and its size.
  // In a puzzle it stands on the drawing's rightmost column, on its top cell (clear of the score sign).
  function cuboSpot() {
    const s = Math.max(34, Math.min(58, lay.cell * 1.15));
    if (state.puzzle) {
      for (let c = SIZE - 1; c >= 0; c--) {
        for (let r = 0; r < SIZE; r++) {
          if (isVoid(r * SIZE + c)) continue;
          return { x: lay.bx + (c + 1) * lay.cell - s * 0.5 + 2, y: lay.by + r * lay.cell - 10, s };
        }
      }
    }
    return { x: lay.bx + lay.board - s * 0.5 + 2, y: lay.by - 10, s };
  }

  function cuboHit(x, y) {
    if (!settings.mascot || tut) return false;
    const m = cuboSpot();
    return Math.abs(x - m.x) < m.s * 0.7 && y > m.y - m.s * 1.2 && y < m.y + 6;
  }

  function cuboTap() {
    const t = now();
    cubo.taps = cubo.taps.filter((x) => t - x < 1600).concat(t);
    const m = cuboSpot();
    if (cubo.taps.length >= 5) {
      cubo.taps = [];
      cuboReact('dizzy', 2200, 0.5);
      cubo.dizzyUntil = now() + 2200;
      sfx.fizzle();
    } else {
      cuboReact(['happy', 'wow', 'happy', 'star'][cubo.taps.length - 1] || 'happy', 900, 0.6);
      sfx.pop();
    }
    for (let k = 0; k < 3; k++) cubo.hearts.push({ x: m.x + (k - 1) * m.s * 0.3, y: m.y - m.s, t0: t + k * 90, dx: (k - 1) * 18 });
    buzz(8);
  }

  // Base mood when no event mood is playing.
  function cuboBaseMood() {
    if (pausedByUi() && !state.over) return 'sleep';
    if (state.over) {
      const won = (state.puzzle && state.puzzle.won) || (state.stage && state.stage.won);
      return won ? 'party' : 'sad';
    }
    if (state.stuck) return 'worried';
    let cells = 0;
    let full = 0;
    for (let i = 0; i < state.board.length; i++) {
      if (state.special && state.special[i] && state.special[i].kind === 'void') continue;
      cells += 1;
      if (state.board[i]) full += 1;
    }
    if (state.mode !== 'puzzle' && full / cells >= 0.7) return 'worried';
    return drag ? 'watch' : 'idle';
  }

  function drawCubo(t) {
    if (!settings.mascot) return;
    const { x, y, s } = cuboSpot();
    const mood = t < cubo.until ? cubo.mood : cuboBaseMood();
    const still = calm();
    // Jumps: event jumps, plus little hops while partying.
    let lift = 0;
    let squash = 0;
    const jk = (t - cubo.jumpAt) / 520;
    if (jk >= 0 && jk < 1) lift = Math.sin(jk * Math.PI) * s * 0.7 * cubo.jumpH;
    else if (jk >= 1 && jk < 1.35) squash = Math.sin(((jk - 1) / 0.35) * Math.PI) * 0.18;
    if (mood === 'party' && !still) {
      const pk = (t % 700) / 700;
      lift = Math.max(lift, Math.sin(pk * Math.PI) * s * 0.35);
    }
    const breathe = still ? 0 : Math.sin(t / 650) * 0.03;
    const sw = s * (1 + squash + breathe * 0.5);
    const sh = s * 0.84 * (1 - squash + breathe * -0.5 + (lift > 1 ? 0.06 : 0));
    const cx = x + (mood === 'dizzy' && !still ? Math.sin(t / 90) * s * 0.06 : 0);
    const bottom = y - lift;
    const top = bottom - sh;
    ctx.save();

    // Shadow on the frame, smaller while in the air.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(x, y + 1, s * 0.42 * (1 - Math.min(0.5, lift / s)), s * 0.07, 0, 0, Math.PI * 2); ctx.fill();

    // Feet.
    ctx.fillStyle = CUBO.dark;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + side * sw * 0.22, bottom - s * 0.02, s * 0.13, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Sprout: two leaves swaying on top.
    const sway = still ? 0 : Math.sin(t / 420) * 0.25 + (lift > 1 ? -0.2 : 0);
    ctx.save();
    ctx.translate(cx, top + s * 0.04);
    ctx.rotate(sway);
    ctx.strokeStyle = CUBO.leafDark; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.16); ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.fillStyle = side < 0 ? CUBO.leaf : CUBO.leafDark;
      ctx.beginPath(); ctx.ellipse(side * s * 0.1, -s * 0.2, s * 0.12, s * 0.06, side * -0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Body: a soft rounded block with a darker base and a glossy top.
    const bx = cx - sw / 2;
    const r = Math.min(sw, sh) * 0.42;
    ctx.fillStyle = CUBO.dark;
    ctx.beginPath(); ctx.roundRect(bx, top + sh * 0.1, sw, sh * 0.9, r); ctx.fill();
    ctx.fillStyle = CUBO.base;
    ctx.beginPath(); ctx.roundRect(bx, top, sw, sh * 0.9, r); ctx.fill();
    ctx.fillStyle = withAlpha(CUBO.light, 0.7);
    ctx.beginPath(); ctx.ellipse(bx + sw * 0.3, top + sh * 0.2, sw * 0.14, sh * 0.08, -0.5, 0, Math.PI * 2); ctx.fill();

    // Face.
    const fy = top + sh * 0.45;
    const ex = sw * 0.2;
    const er = s * 0.075;
    ctx.fillStyle = withAlpha(CUBO.cheek, 0.55);
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + side * sw * 0.32, fy + s * 0.1, s * 0.08, s * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = CUBO.ink; ctx.fillStyle = CUBO.ink; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (!cubo.blinkAt || t > cubo.blinkAt + 140) cubo.blinkAt = t + 2200 + Math.random() * 2600;
    const blinking = !still && t > cubo.blinkAt && t < cubo.blinkAt + 140;
    // Pupils look at the dragged piece, else down at the tray.
    let look = [0, 0.4];
    if (drag) {
      const dx = drag.x - cx;
      const dy = drag.y - fy;
      const d = Math.hypot(dx, dy) || 1;
      look = [dx / d, dy / d];
    }
    for (const side of [-1, 1]) {
      const exx = cx + side * ex;
      if (mood === 'happy' || mood === 'party') {
        ctx.beginPath(); ctx.arc(exx, fy + er * 0.6, er, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      } else if (mood === 'sleep' || mood === 'sad') {
        ctx.beginPath(); ctx.arc(exx, fy - er * 0.4, er, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      } else if (mood === 'oops') {
        ctx.beginPath(); ctx.moveTo(exx - side * er, fy - er); ctx.lineTo(exx + side * er * 0.4, fy); ctx.lineTo(exx - side * er, fy + er); ctx.stroke();
      } else if (mood === 'star') {
        ctx.save(); ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = CUBO.ink; ctx.lineWidth = s * 0.025;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5 + (still ? 0 : t / 500);
          const rr = k % 2 ? er * 0.55 : er * 1.35;
          ctx.lineTo(exx + Math.cos(a) * rr, fy + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      } else if (mood === 'dizzy') {
        ctx.save(); ctx.lineWidth = s * 0.03; ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.3) {
          const rr = (a / (Math.PI * 4)) * er * 1.2;
          const aa = a + (still ? 0 : t / 120) * side;
          ctx.lineTo(exx + Math.cos(aa) * rr, fy + Math.sin(aa) * rr);
        }
        ctx.stroke(); ctx.restore();
      } else if (blinking) {
        ctx.beginPath(); ctx.moveTo(exx - er, fy); ctx.lineTo(exx + er, fy); ctx.stroke();
      } else {
        const big = mood === 'wow' || mood === 'worried' ? 1.3 : 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(exx, fy, er * 1.15 * big, er * 1.35 * big, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = CUBO.ink;
        const pr = er * (mood === 'worried' ? 0.55 : 0.8);
        ctx.beginPath(); ctx.arc(exx + look[0] * er * 0.35, fy + look[1] * er * 0.45, pr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(exx + look[0] * er * 0.35 - pr * 0.35, fy + look[1] * er * 0.45 - pr * 0.4, pr * 0.35, 0, Math.PI * 2); ctx.fill();
      }
      if (mood === 'worried') {
        // Worried brows: raised toward the middle.
        ctx.beginPath(); ctx.moveTo(exx - side * er * 1.1, fy - er * 2.6); ctx.lineTo(exx + side * er * 0.8, fy - er * 2); ctx.stroke();
      }
    }

    // Mouth.
    const my = fy + s * 0.14;
    ctx.fillStyle = CUBO.ink;
    ctx.beginPath();
    if (mood === 'happy' || mood === 'party' || mood === 'star') {
      ctx.moveTo(cx - s * 0.12, my - s * 0.02); ctx.quadraticCurveTo(cx, my + s * 0.2, cx + s * 0.12, my - s * 0.02); ctx.closePath(); ctx.fill();
      ctx.fillStyle = CUBO.cheek;
      ctx.beginPath(); ctx.ellipse(cx, my + s * 0.06, s * 0.05, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    } else if (mood === 'wow' || mood === 'dizzy') {
      ctx.ellipse(cx, my + s * 0.02, s * 0.05, s * 0.065, 0, 0, Math.PI * 2); ctx.fill();
    } else if (mood === 'sleep') {
      ctx.ellipse(cx, my, s * 0.03, s * 0.025, 0, 0, Math.PI * 2); ctx.fill();
    } else if (mood === 'sad' || mood === 'oops') {
      ctx.arc(cx, my + s * 0.07, s * 0.08, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (mood === 'worried') {
      ctx.moveTo(cx - s * 0.1, my + s * 0.02);
      for (let k = 1; k <= 4; k++) ctx.lineTo(cx - s * 0.1 + k * s * 0.05, my + (k % 2 ? -0.02 : 0.02) * s);
      ctx.stroke();
    } else {
      ctx.arc(cx, my - s * 0.02, s * 0.07, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    }

    // Extras: sweat drop, tear, sleeping z's.
    if (mood === 'worried') {
      const dy = still ? 0 : ((t / 900) % 1) * s * 0.12;
      ctx.fillStyle = '#7fd8ff';
      ctx.beginPath(); ctx.ellipse(bx + sw * 0.9, top + sh * 0.25 + dy, s * 0.05, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (mood === 'sad') {
      ctx.fillStyle = '#7fd8ff';
      ctx.beginPath(); ctx.ellipse(cx - ex, fy + s * 0.1, s * 0.035, s * 0.055, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (mood === 'sleep') {
      ctx.fillStyle = withAlpha(theme().ink, 0.7);
      for (let k = 0; k < 3; k++) {
        const ph = still ? k / 3 : ((t / 1400) + k / 3) % 1;
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.font = themeFont(theme(), Math.round(s * (0.22 + ph * 0.18)));
        ctx.fillText('z', cx + sw * 0.35 + ph * s * 0.4, top - ph * s * 0.6);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Hearts from taps.
    cubo.hearts = cubo.hearts.filter((h) => t - h.t0 < 900);
    for (const h of cubo.hearts) {
      const k = (t - h.t0) / 900;
      if (k < 0) continue;
      drawHeart(h.x + h.dx * k, h.y - k * s * 1.1, s * 0.22 * (1 - k * 0.3), 1 - k);
    }
  }

  function drawHeart(x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.35);
    ctx.bezierCurveTo(x - size, y - size * 0.3, x - size * 0.4, y - size, x, y - size * 0.4);
    ctx.bezierCurveTo(x + size * 0.4, y - size, x + size, y - size * 0.3, x, y + size * 0.35);
    ctx.fill();
    ctx.restore();
  }

  // ---------- render ----------
  let last = now();
  // Timed bonuses drain as a ring around their inventory button.
  function syncTimers() {
    for (const [type, btn] of Object.entries(invButtons)) {
      const ms = state.effects[type] || 0;
      if (!ms && !btn.style.getPropertyValue('--left')) continue;
      btn.style.setProperty('--left', ms ? Math.min(1, ms / L.effectMs(state, type)).toFixed(3) : '');
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

    shake = calm() ? 0 : shake * 0.86;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    drawHUD(t);
    ctx.save();
    ctx.translate(sx, sy);
    const pk = punch ? (t - punch.t0) / 240 : 1;
    if (pk < 1) {
      const zoom = 1 + punch.amp * Math.sin(Math.PI * pk);
      const cx = lay.bx + lay.board / 2;
      const cy = lay.by + lay.board / 2;
      ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
    } else punch = null;
    drawBoard(t);
    drawComboGlow(t);
    if (tut) drawTutorialCells(t);
    drawFades(t);
    drawSweeps(t);
    if (aiming) drawAim(t);
    ctx.restore();
    drawCubo(t);
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
    drawTutorialHand(t);
    pumpTips();
    requestAnimationFrame(frame);
  }

  function drawHUD(t) {
    if (tut) return;
    displayScore += (state.score - displayScore) * 0.18;
    if (Math.abs(state.score - displayScore) < 0.5) displayScore = state.score;
    const th = theme();
    const p = th.plate;
    let pw = Math.min(lay.board * 0.62, 244);
    if (lay.compact) {
      // Fit between the wallet and the right HUD buttons.
      pw = Math.min(pw, hudGap());
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
    let sub = best ? 'RECORD ' + fmt(best) : 'SCORE';
    let main = fmt(Math.round(displayScore));
    let lowMoves = false;
    if (state.puzzle) {
      main = `${state.puzzle.placed} / ${state.puzzle.total}`;
      sub = `PUZZLE ${state.puzzle.n} · ${state.puzzle.name.toUpperCase()}`;
    } else if (stage) {
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
    if (stage && stage.goal.type === 'boss') drawBossBar(th, px, py, pw, ph, t);
    else {
      ctx.save();
      if (p.glow) { ctx.shadowColor = p.glow; ctx.shadowBlur = 12; }
      ctx.fillStyle = p.ink;
      ctx.font = themeFont(th, Math.round(ph * (stage || state.puzzle ? 0.52 : 0.64) * bump));
      ctx.fillText(main, W / 2, py + ph - ph * 0.13);
      ctx.restore();
    }

    // Combo: small pill hung under the score. Pops when it grows, drops away when it breaks.
    const tagY = py + ph + 4;
    if (state.combo > 0) {
      const left = L.COMBO_GRACE - state.movesSinceClear;
      const pulse = left === 1 ? 0.55 + 0.45 * Math.abs(Math.sin(t / 180)) : 1;
      const pop = calm() || !comboAt ? 0 : 1 - easeOut((t - comboAt) / 420);
      drawComboTag(th, state.combo, left, tagY, pulse, 1 + 0.45 * pop, 0, false, t);
    } else if (comboBreak && !calm()) {
      const k = (t - comboBreak.t0) / 700;
      if (k >= 1) comboBreak = null;
      else drawComboTag(th, comboBreak.n, 0, tagY + k * k * lay.cell * 1.6, 1 - k, 1 - 0.2 * k, 0.3 * k, true, t);
    }
  }

  function drawComboTag(th, combo, left, ty, alpha, scale, rot, broken, t) {
    const tag = th.tag;
    const tier = broken ? 0 : comboTier(combo);
    const label = 'COMBO ×' + combo;
    ctx.font = themeFont(th, 17);
    const tw = ctx.measureText(label).width + 20 + L.COMBO_GRACE * 11 + 8;
    const tx = W / 2 - tw / 2;
    ctx.save();
    ctx.translate(W / 2, ty + 12.5);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.translate(-W / 2, -(ty + 12.5));
    ctx.globalAlpha = alpha;
    ctx.save();
    if (tier >= 2) { ctx.shadowColor = tierColor(tier, t); ctx.shadowBlur = 8 + 6 * tier; }
    else if (tag.glow) { ctx.shadowColor = tag.glow; ctx.shadowBlur = 10; }
    ctx.fillStyle = broken ? '#9b93aa' : tag.fill;
    ctx.beginPath(); ctx.roundRect(tx, ty, tw, 25, 12.5); ctx.fill();
    ctx.restore();
    if (tag.line && !broken) {
      ctx.strokeStyle = tag.line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx + 2.5, ty + 2.5, tw - 5, 20, 4); ctx.stroke();
    }
    ctx.fillStyle = broken ? '#ffffff' : tag.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx + 11, ty + 14);
    for (let i = 0; i < L.COMBO_GRACE; i++) {
      ctx.globalAlpha = alpha * (i < left ? 1 : 0.25);
      ctx.beginPath();
      ctx.arc(tx + tw - 12 - (L.COMBO_GRACE - 1 - i) * 11, ty + 12.5, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  // While a combo runs, the board frame glows in the tier color, faster on the last move of grace.
  function drawComboGlow(t) {
    if (state.combo < 2 || state.over) return;
    const tier = comboTier(state.combo);
    const left = L.COMBO_GRACE - state.movesSinceClear;
    const pulse = 0.5 + 0.5 * Math.sin(t / (left === 1 ? 110 : 260));
    const { bx, by, board } = lay;
    ctx.save();
    ctx.strokeStyle = tierColor(tier, t);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = calm() ? 6 : 10 + 8 * tier * pulse;
    ctx.globalAlpha = calm() ? 0.6 : 0.45 + 0.45 * pulse;
    ctx.lineWidth = 2 + tier;
    ctx.beginPath(); ctx.roundRect(bx - 10, by - 10, board + 20, board + 20, theme().frame.r); ctx.stroke();
    ctx.restore();
  }

  // A flash of light along each cleared line, widening as it fades.
  function drawSweeps(t) {
    sweeps = sweeps.filter((w) => t - w.t0 < 380);
    const { bx, by, board, cell } = lay;
    for (const w of sweeps) {
      const k = (t - w.t0) / 380;
      const thick = cell * (0.8 + 0.6 * easeOut(k));
      ctx.globalAlpha = (1 - k) * (1 - k) * 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (w.row !== undefined) ctx.roundRect(bx - 4, by + (w.row + 0.5) * cell - thick / 2, board + 8, thick, thick / 2);
      else ctx.roundRect(bx + (w.col + 0.5) * cell - thick / 2, by - 4, thick, board + 8, thick / 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const isVoid = (i) => !!(state.special && state.special[i] && state.special[i].kind === 'void');

  function drawBoard(t) {
    const { bx, by, board, cell } = lay;
    const th = theme();
    if (state.puzzle) drawShapedFrame(ctx, th, (i) => !isVoid(i));
    else drawFrame(ctx, th, bx - 10, by - 10, board + 20, board + 20);

    // Preview: ghost of the dragged piece + lines it would clear.
    let ghost = null;
    let preview = null;
    if (drag) {
      const g = dragGeometry(drag, t);
      if (g.valid) {
        ghost = g;
        preview = state.mode === 'puzzle' ? null : L.previewClears(state.board, g.piece, g.row, g.col);
      }
    }

    const overK = overAt ? easeOut((t - overAt) / 900) : 0;

    // Empty cells first, so falling blocks can pass over them.
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (isVoid(r * SIZE + c)) continue; // puzzle: outside the drawing
        const [x, y] = cellCenter(r, c);
        drawEmpty(ctx, th, x, y, cell);
      }
    }
    shifts = shifts.filter((sh) => t - sh.t0 < 420);
    for (let r = 0; r < SIZE; r++) {
      // Sea current: the row slides one cell right (the wrapped cell enters from the left edge).
      const sh = shifts.find((x) => x.row === r);
      const dx = sh ? -(1 - easeBack(Math.max(0, (t - sh.t0) / 420))) * cell : 0;
      if (dx) { ctx.save(); ctx.beginPath(); ctx.rect(bx, by + r * cell, board, cell); ctx.clip(); }
      for (let c = 0; c < SIZE; c++) {
        let [x, y] = cellCenter(r, c);
        x += dx;
        const i = r * SIZE + c;
        const v = state.board[i];
        if (!v) continue;
        const segs = tracks.get(i);
        if (segs) {
          if (tracksBusy(segs, t)) y = cellCenter(segRow(segs, t, r), c)[1];
          else tracks.delete(i);
        }

        let scale = 1;
        const pop = pops.find((p) => p.r === r && p.c === c);
        if (pop) {
          const k = (t - pop.t0) / 220;
          scale = k < 1 ? 1 + 0.16 * Math.sin(k * Math.PI) : 1;
        }
        const alpha = 1 - overK * 0.65;
        if (v === L.SPECIAL && state.special && state.special[i]) {
          if (state.special[i].kind === 'boss' || state.special[i].kind === 'void') continue; // boss: drawn whole by drawBoss
          const drop = drops.get(i);
          if (drop) {
            const k = (t - drop.t0) / drop.dur;
            if (k >= 1.4) drops.delete(i);
            else if (k < 0) continue; // not arrived yet
            else if (drop.kind === 'mushroom') scale *= k < 1 ? 0.3 + 0.7 * easeBack(k) : 1;
            else if (k < 1) y = by - cell * 1.5 + (y - by + cell * 1.5) * k * k;
            else scale *= 1 + 0.12 * Math.sin(Math.min(1, (k - 1) / 0.4) * Math.PI);
          }
          drawSpecial(state.special[i], x, y, cell, t, alpha, scale);
          continue;
        }
        const fam = preview && preview.has(i) ? ghost.piece.color : v;
        drawBlock(x, y, cell, pal()[fam], alpha, scale, state.bonus[i], undefined, fam);
      }
      if (dx) ctx.restore();
    }
    pops = pops.filter((p) => t - p.t0 < 240);
    if (state.stage && state.stage.goal.type === 'boss') drawBoss(t, 1 - overK * 0.65, ghost);

    if (ghost) {
      const b = ghost.piece.bonus;
      for (const [r, c] of ghost.piece.cells) {
        const [x, y] = cellCenter(ghost.row + r, ghost.col + c);
        drawBlock(x, y, cell, pal()[ghost.piece.color], 0.35, 1, b && b.r === r && b.c === c ? b.type : null, undefined, ghost.piece.color);
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
      else if (L.canUndo(state)) text = 'Bloqué ! Annule ton coup ou jette une forme';
      else text = 'Bloqué ! Maintiens une forme en bas pour la jeter';
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
    for (const [r, c] of L.bombArea(r0, c0, bonusLv('bomb'))) {
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
      let [x, y] = cellCenter(f.r, f.c);
      if (f.segs && k < 0) y = cellCenter(segRow(f.segs, t, f.r), f.c)[1];
      if (f.kind) { drawSpecial({ kind: f.kind, hp: 1 }, x, y, lay.cell, t, k < 0 ? 1 : 1 - k, k < 0 ? 1 : 1.1 - easeOut(k)); continue; }
      if (k < 0) { drawBlock(x, y, lay.cell, pal()[f.color], 1, 1, null, undefined, f.color); continue; }
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
    if (tut) return;
    const th = theme();
    ctx.fillStyle = withAlpha(th.ink, 0.07);
    ctx.strokeStyle = withAlpha(th.ink, 0.14);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(nextX + 4, ty + 6, nextW - 6, trayH - 12, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = withAlpha(th.ink, 0.72);
    ctx.font = themeFont(th, 11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    ctx.fillText('ENSUITE', nextX + nextW / 2 + 1, ty + 20);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';
    const piece = state.next;
    if (!piece) return;
    const more = state.puzzle ? state.puzzle.queue.length - 1 : 0;
    if (more > 0) {
      ctx.fillStyle = withAlpha(th.ink, 0.75);
      ctx.font = themeFont(th, 15);
      ctx.textAlign = 'center';
      ctx.fillText('+' + more, nextX + nextW / 2 + 1, ty + trayH - 16);
    }
    const size = Math.min(miniCell() * 0.62, (nextW - 16) / Math.max(piece.w, piece.h, 3));
    const k = easeOut((t - nextIn) / 320);
    drawPiece(piece, nextX + nextW / 2 + 2, ty + trayH / 2 + 6 + (1 - k) * 20, size, 0.9 * k);
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
      p.vy += (p.g ?? 900) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = (t - p.t0) / p.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.color;
      if (p.star) {
        p.vx *= 0.985;
        p.rot += p.vr * dt;
        const s = p.size * (1 - k * 0.3);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? s * 0.22 : s * 0.5;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }
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
      ctx.fillStyle = f.tier ? tierColor(f.tier, t) : th.ink;
      ctx.font = themeFont(th, Math.round((f.big ? 32 : 20) * (f.scale || 1)));
      ctx.strokeStyle = withAlpha(th.base, 0.92);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5 + (f.tier || 0);
      const y = f.y - easeOut(k) * lay.cell * 1.4;
      // Combo points pop in with a bounce.
      const pop = f.tier && !calm() ? easeBack(k * 5) : 1;
      ctx.save();
      ctx.translate(f.x, y);
      ctx.scale(pop, pop);
      ctx.strokeText(f.text, 0, 0);
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawBanner(t) {
    const banner = banners[0];
    if (!banner) return;
    banner.t0 ??= t;
    const k = (t - banner.t0) / 1300;
    if (k >= 1) { banners.shift(); return; }
    const scale = calm() ? 1 : easeBack(k * 4);
    const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : calm() ? Math.min(1, k * 8) : 1;
    const tier = banner.tier || 0;
    ctx.save();
    ctx.translate(W / 2, lay.by + lay.board * 0.42);
    ctx.scale(scale * (1 + 0.08 * Math.max(0, tier - 1)), scale * (1 + 0.08 * Math.max(0, tier - 1)));
    // Higher tiers wobble in, over a slowly turning sunburst.
    if (tier && !calm()) ctx.rotate(Math.sin(k * 20) * 0.035 * tier * (1 - Math.min(1, k * 2.5)));
    ctx.globalAlpha = alpha;
    if (tier >= 2 && !calm()) {
      ctx.save();
      ctx.translate(0, -lay.cell * 0.3);
      ctx.rotate(t / 1600);
      ctx.globalAlpha = alpha * 0.2;
      ctx.fillStyle = tierColor(tier, t);
      const R = lay.board * 0.52 * easeOut(k * 3);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, (i * Math.PI) / 6, (i * Math.PI) / 6 + Math.PI / 14);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = alpha;
    }
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
    if (tier >= 3) {
      // Rainbow sliding across the letters.
      const g = ctx.createLinearGradient(shift - textW / 2, 0, shift + textW / 2, 0);
      for (let i = 0; i <= 4; i++) g.addColorStop(i / 4, `hsl(${(Math.round(t / 4) + i * 70) % 360} 92% 58%)`);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = tier ? tierColor(tier, t) : banner.gold ? th.accent : th.ink;
    }
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
  if (M.needsTutorial(profile)) startTutorial();
  else { renderMenu(); menuEl.classList.add('show'); }
  requestAnimationFrame(frame);
})();
