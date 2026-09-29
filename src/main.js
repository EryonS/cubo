/*
 * Gridlock — web renderer + input. Rules live in logic.js, progression in meta.js;
 * this file only draws, animates, plays sounds and persists.
 */
(() => {
  'use strict';

  const L = window.GridlockLogic;
  const M = window.GridlockMeta;
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
    rotate: { name: 'Volant', hint: 'Touche une pièce pour la tourner', desc: '30 s : touche une pièce du bac pour la faire pivoter.' },
    nitro: { name: 'Nitro', hint: 'Points ×2', desc: '30 s : tous les points comptent double.' },
    shield: { name: 'Régulateur', hint: 'Le combo ne casse plus', desc: '30 s : ton combo ne peut pas retomber.' },
    bomb: { name: 'Bombe', hint: 'Glisse-la sur la grille', desc: 'Glisse-la sur la grille : elle fait sauter une zone de 21 cases.' },
    reroll: { name: 'Déviation', hint: 'Nouvelles pièces', desc: 'Remplace les 3 pièces du bac.' },
  };
  const COIN_UI = {
    coin: { name: 'Pièce', desc: '+1 pièce quand le bloc est effacé.' },
    bag: { name: 'Sac de pièces', desc: '+5 pièces quand le bloc est effacé.' },
  };
  const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';

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
  const ICON_COLORS = { rotate: '#2563eb', nitro: '#f59e0b', shield: '#059669', bomb: '#ef4444', reroll: '#7c3aed' };

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

  const GLYPHS = {
    rotate(g, c) {
      g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 11; g.lineCap = 'round';
      const a0 = -Math.PI * 0.2;
      const a1 = Math.PI * 1.3;
      g.beginPath(); g.arc(0, 0, 23, a0, a1); g.stroke();
      const x = Math.cos(a1) * 23;
      const y = Math.sin(a1) * 23;
      arrowHead(g, x, y, -Math.sin(a1), Math.cos(a1), 15);
    },
    nitro(g, c) {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(8, -36); g.lineTo(-22, 6); g.lineTo(-2, 6); g.lineTo(-9, 36);
      g.lineTo(22, -8); g.lineTo(2, -8); g.closePath();
      g.fill();
    },
    shield(g, c) {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(0, -34); g.lineTo(27, -23); g.lineTo(25, 4);
      g.quadraticCurveTo(21, 26, 0, 37); g.quadraticCurveTo(-21, 26, -25, 4);
      g.lineTo(-27, -23); g.closePath(); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-11, 1); g.lineTo(-2, 11); g.lineTo(13, -9); g.stroke();
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
    reroll(g, c) {
      g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-30, -15); g.lineTo(-10, -15); g.bezierCurveTo(4, -15, 4, 15, 18, 15); g.stroke();
      g.beginPath(); g.moveTo(-30, 15); g.lineTo(-10, 15); g.bezierCurveTo(4, 15, 4, -15, 18, -15); g.stroke();
      arrowHead(g, 20, 15, 1, 0, 12);
      arrowHead(g, 20, -15, 1, 0, 12);
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
  // A theme is a whole visual world: background, board, score sign, fonts and the menu colors (css).
  // paint() draws the static background once per resize; animate() runs every frame.
  // plate: the score sign. tag: the small sign hung under it (combo). frame: the board slab.
  const UI_FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';
  const THEMES = {
    night: {
      base: '#16181c', board: '#1f2227', empty: '#2a2d33', cellR: 0.1,
      font: '"DIN Condensed", "DIN Alternate", "Roboto Condensed", "Arial Narrow", sans-serif', weight: 700,
      ink: '#ffffff', accent: '#ffc400', danger: '#ff6b5e',
      frame: { r: 10, line: 'rgba(255,255,255,0.62)', lw: 2, inset: 4 },
      plate: { fill: '#1f4fa3', line: '#ffffff', lw: 2.5, inset: 5, r: 12, ink: '#ffffff', sub: 'rgba(255,255,255,0.78)' },
      tag: { fill: '#ffc400', line: '#16181c', ink: '#16181c' },
      css: {
        '--bg': '#16181c', '--panel': '#1f4fa3', '--panel-2': '#173e83', '--slot': '#23262c',
        '--text': '#ffffff', '--muted': 'rgba(255,255,255,0.74)', '--accent': '#ffc400', '--on-accent': '#16181c',
        '--good': '#5ee08a', '--edge': '#ffffff', '--radius': '14px',
        '--card-edge': 'inset 0 0 0 7px var(--panel), inset 0 0 0 10px var(--edge)',
        '--plate-edge': 'inset 0 0 0 3px var(--panel), inset 0 0 0 5px var(--edge)',
      },
      paint(g, w, h) {
        g.fillStyle = this.base; g.fillRect(0, 0, w, h);
        // Asphalt grain.
        const rnd = seeded(3);
        for (let i = 0; i < (w * h) / 50; i++) {
          g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.18)';
          g.fillRect(rnd() * w, rnd() * h, 1 + rnd(), 1 + rnd());
        }
        // Continuous shoulder line on the left, like the edge of a motorway lane.
        g.fillStyle = 'rgba(255,255,255,0.14)';
        g.fillRect(4, 0, 3, h);
      },
      animate(g, w, h, t) {
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = 4;
        g.setLineDash([30, 38]);
        g.lineDashOffset = -(t * 0.09) % 68;
        g.beginPath(); g.moveTo(w - 7, 0); g.lineTo(w - 7, h); g.stroke();
        g.setLineDash([]);
      },
    },
    sunset: {
      base: '#2a0f45', board: 'rgba(28,10,48,0.88)', empty: 'rgba(255,255,255,0.07)', cellR: 0.16,
      font: '"Futura", "Century Gothic", "Trebuchet MS", sans-serif', weight: 800, italic: true,
      ink: '#fff4fb', accent: '#ffe26a', danger: '#ff8a9b',
      frame: { r: 16, line: '#ff4f8b', lw: 2, inset: 3, glow: '#ff4f8b' },
      plate: { fill: 'rgba(26,8,48,0.82)', line: '#ff4f8b', lw: 2, inset: 0, r: 14, ink: '#ffe26a', sub: '#ff9ec4', glow: '#ff4f8b' },
      tag: { fill: '#ff4f8b', line: null, ink: '#1a0b36' },
      css: {
        '--bg': '#2a0f45', '--panel': '#221040', '--panel-2': '#341a5a', '--slot': 'rgba(34,16,64,0.86)',
        '--text': '#fff4fb', '--muted': '#d4b3e0', '--accent': '#ffe26a', '--on-accent': '#2a0f45',
        '--good': '#6ff0c0', '--edge': '#ff4f8b', '--radius': '16px',
        '--card-edge': 'inset 0 0 0 2px var(--edge), 0 0 36px rgba(255,79,139,0.35)',
        '--plate-edge': 'inset 0 0 0 1.5px var(--edge)',
      },
      paint(g, w, h) {
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#1a0b36');
        sky.addColorStop(0.45, '#5b1f5e');
        sky.addColorStop(0.75, '#c2415a');
        sky.addColorStop(1, '#f2994a');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        const r = Math.min(w, h) * 0.42;
        const sun = g.createLinearGradient(0, h * 0.62 - r, 0, h * 0.62 + r);
        sun.addColorStop(0, '#ffe26a'); sun.addColorStop(1, '#ff4f8b');
        g.fillStyle = sun;
        g.beginPath(); g.arc(w / 2, h * 0.62, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#c2415a';
        for (let i = 0; i < 7; i++) {
          const y = h * 0.62 + r * (0.1 + i * 0.13);
          g.fillRect(0, y, w, 2 + i * 1.6);
        }
        // Synthwave floor.
        const horizon = h * 0.8;
        g.fillStyle = '#240b3a'; g.fillRect(0, horizon, w, h - horizon);
        g.strokeStyle = 'rgba(255,90,200,0.45)'; g.lineWidth = 1.5;
        for (let i = 1; i < 10; i++) {
          const y = horizon + Math.pow(i / 9, 2) * (h - horizon);
          g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        }
        for (let i = -8; i <= 8; i++) {
          g.beginPath(); g.moveTo(w / 2 + i * 6, horizon); g.lineTo(w / 2 + i * w * 0.18, h); g.stroke();
        }
      },
    },
    desert: {
      base: '#2a1a10', board: 'rgba(40,24,14,0.9)', empty: 'rgba(255,220,170,0.08)', cellR: 0.08,
      font: '"Rockwell", "Roboto Slab", "American Typewriter", Georgia, serif', weight: 800,
      ink: '#fff3dc', accent: '#f4b63a', danger: '#ff8a6a',
      frame: { r: 8, line: '#1f9e8f', lw: 3, inset: 3 },
      plate: { fill: '#1f9e8f', line: '#fff3dc', lw: 2.5, inset: 5, r: 8, ink: '#fff3dc', sub: '#d6fff6', bulbs: '#ffd46b' },
      tag: { fill: '#d9562b', line: '#fff3dc', ink: '#fff3dc' },
      css: {
        '--bg': '#2a1a10', '--panel': '#1c7f74', '--panel-2': '#15665d', '--slot': 'rgba(40,24,14,0.9)',
        '--text': '#fff3dc', '--muted': '#cdeee7', '--accent': '#f4b63a', '--on-accent': '#2a1a10',
        '--good': '#b6f27a', '--edge': '#fff3dc', '--radius': '8px',
        '--card-edge': 'inset 0 0 0 6px var(--panel), inset 0 0 0 8px var(--edge)',
        '--plate-edge': 'inset 0 0 0 3px var(--panel), inset 0 0 0 5px var(--edge)',
      },
      paint(g, w, h) {
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#1b1020'); sky.addColorStop(0.5, '#6b3a2a'); sky.addColorStop(1, '#c9824a');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,236,200,0.35)';
        g.beginPath(); g.arc(w * 0.84, h * 0.72, Math.min(w, h) * 0.07, 0, Math.PI * 2); g.fill();
        const dune = (y0, amp, color, phase) => {
          g.fillStyle = color;
          g.beginPath(); g.moveTo(0, h);
          for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 2 + phase) * amp);
          g.lineTo(w, h); g.fill();
        };
        dune(h * 0.7, h * 0.03, '#8a5530', 0.5);
        dune(h * 0.8, h * 0.035, '#6e4126', 2.2);
        dune(h * 0.9, h * 0.025, '#4f2e1b', 4);
        g.fillStyle = '#3a2416';
        for (const [cx, s] of [[w * 0.12, 1], [w * 0.9, 0.7]]) {
          const base = h * 0.92;
          g.fillRect(cx - 5 * s, base - 70 * s, 10 * s, 70 * s);
          g.fillRect(cx - 22 * s, base - 50 * s, 8 * s, 26 * s);
          g.fillRect(cx - 22 * s, base - 30 * s, 20 * s, 7 * s);
          g.fillRect(cx + 14 * s, base - 58 * s, 8 * s, 30 * s);
          g.fillRect(cx + 4 * s, base - 34 * s, 18 * s, 7 * s);
        }
      },
    },
    mountain: {
      base: '#0b1326', board: 'rgba(9,15,30,0.88)', empty: 'rgba(160,190,255,0.08)', cellR: 0.14,
      font: '"Avenir Next Condensed", "Avenir Next", "Roboto Condensed", "Arial Narrow", sans-serif', weight: 700,
      ink: '#ffffff', accent: '#9fd3ff', danger: '#ff8a9b',
      frame: { r: 12, line: 'rgba(235,242,255,0.55)', lw: 1.5, inset: 4 },
      plate: { fill: '#6b3d22', line: '#ffffff', lw: 2.5, inset: 5, r: 12, ink: '#ffffff', sub: '#f1d9c6' },
      tag: { fill: '#eef4ff', line: null, ink: '#0b1326' },
      css: {
        '--bg': '#0b1326', '--panel': '#6b3d22', '--panel-2': '#55301a', '--slot': 'rgba(15,28,51,0.9)',
        '--text': '#ffffff', '--muted': '#f1d9c6', '--accent': '#9fd3ff', '--on-accent': '#0b1326',
        '--good': '#8ef0b0', '--edge': '#ffffff', '--radius': '14px',
        '--card-edge': 'inset 0 0 0 7px var(--panel), inset 0 0 0 10px var(--edge)',
        '--plate-edge': 'inset 0 0 0 3px var(--panel), inset 0 0 0 5px var(--edge)',
      },
      paint(g, w, h) {
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#050a18'); sky.addColorStop(0.6, '#13233f'); sky.addColorStop(1, '#2b4a78');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        const rnd = seeded(42);
        g.fillStyle = '#fff';
        for (let i = 0; i < 90; i++) {
          g.globalAlpha = 0.2 + rnd() * 0.7;
          g.fillRect(rnd() * w, rnd() * h * 0.7, 1.5, 1.5);
        }
        g.globalAlpha = 1;
        const range = (y0, peaks, color, snow, seed) => {
          const r = seeded(seed);
          const pts = [[0, y0]];
          for (let i = 0; i < peaks; i++) {
            pts.push([((i + 0.5) / peaks) * w, y0 - (0.4 + r() * 0.6) * h * 0.14]);
            pts.push([((i + 1) / peaks) * w, y0 - r() * h * 0.05]);
          }
          g.fillStyle = color;
          g.beginPath(); g.moveTo(0, h);
          for (const [x, y] of pts) g.lineTo(x, y);
          g.lineTo(w, h); g.fill();
          if (!snow) return;
          // Snow caps follow the actual slopes down to 30% of each side, with a ragged lower edge.
          g.fillStyle = 'rgba(235,242,255,0.9)';
          const along = ([ax, ay], [bx, by], f) => [ax + (bx - ax) * f, ay + (by - ay) * f];
          for (let i = 1; i < pts.length - 1; i += 2) {
            const peak = pts[i];
            const left = along(peak, pts[i - 1], 0.3);
            const right = along(peak, pts[i + 1], 0.3);
            const midL = along(left, right, 0.33);
            const midR = along(left, right, 0.66);
            g.beginPath();
            g.moveTo(peak[0], peak[1]);
            g.lineTo(right[0], right[1]);
            g.lineTo(midR[0], midR[1] - 6);
            g.lineTo(midL[0], midL[1] + 4);
            g.lineTo(left[0], left[1]);
            g.fill();
          }
        };
        range(h * 0.82, 4, '#1e3456', true, 7);
        range(h * 0.95, 6, '#0f1d33', false, 11);
      },
    },
    dash: {
      base: '#0e0e10', board: '#141417', empty: '#1d1d22', cellR: 0.14,
      font: '"DIN Alternate", "DIN Condensed", "Roboto Condensed", "Arial Narrow", sans-serif', weight: 700,
      ink: '#f3eee4', accent: '#ffb000', danger: '#ff5a3c',
      frame: { r: 18, line: 'chrome', lw: 3, inset: 1.5 },
      plate: { fill: '#060606', line: 'chrome', lw: 3, inset: 1.5, r: 14, ink: '#f3eee4', sub: '#ffb000', odometer: true },
      tag: { fill: '#ffb000', line: null, ink: '#140d00', glow: '#ffb000' },
      css: {
        '--bg': '#0e0e10', '--panel': '#17171b', '--panel-2': '#222228', '--slot': '#17171b',
        '--text': '#f3eee4', '--muted': '#a8a195', '--accent': '#ffb000', '--on-accent': '#140d00',
        '--good': '#7be08c', '--edge': '#5a5a63', '--radius': '16px',
        '--card-edge': 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 2px #2c2c33, 0 18px 40px rgba(0,0,0,0.5)',
        '--plate-edge': 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1.5px #34343c',
      },
      paint(g, w, h) {
        const bg = g.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.8);
        bg.addColorStop(0, '#1b1b20'); bg.addColorStop(1, '#070708');
        g.fillStyle = bg; g.fillRect(0, 0, w, h);
        // Two big instrument dials behind the game, speedometer and rev counter.
        const dial = (cx, cy, r, max, step, red) => {
          g.lineCap = 'butt';
          const a0 = Math.PI * 0.75;
          const span = Math.PI * 1.5;
          g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2;
          g.beginPath(); g.arc(cx, cy, r, a0, a0 + span); g.stroke();
          for (let v = 0; v <= max; v += step / 2) {
            const a = a0 + (v / max) * span;
            const major = v % step === 0;
            g.strokeStyle = v >= red ? 'rgba(255,90,60,0.22)' : `rgba(255,255,255,${major ? 0.12 : 0.06})`;
            g.lineWidth = major ? 3 : 1.5;
            const r1 = r - (major ? 16 : 9);
            g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke();
            if (major) {
              g.fillStyle = 'rgba(255,255,255,0.09)';
              g.font = `700 ${Math.round(r * 0.1)}px "DIN Alternate", sans-serif`;
              g.textAlign = 'center'; g.textBaseline = 'middle';
              g.fillText(String(v), cx + Math.cos(a) * (r - 32), cy + Math.sin(a) * (r - 32));
            }
          }
          g.textBaseline = 'alphabetic';
        };
        const r = Math.max(w, h) * 0.34;
        dial(w * 0.06, h * 0.42, r, 220, 20, 999);
        dial(w * 0.96, h * 0.97, r * 0.55, 8, 1, 6.5);
      },
    },
  };
  const themeFont = (th, size, weight = th.weight) => `${th.italic ? 'italic ' : ''}${weight} ${size}px ${th.font}`;

  // Stroke style for a theme line; 'chrome' is a brushed metal bezel.
  function lineStyle(g, line, y, h) {
    if (line !== 'chrome') return line;
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#8d8d96'); grad.addColorStop(0.18, '#3a3a41'); grad.addColorStop(0.55, '#26262b');
    grad.addColorStop(0.85, '#55555d'); grad.addColorStop(1, '#1b1b1f');
    return grad;
  }

  // A sign plate: fill, drop shadow, inner border, optional glow or marquee bulbs.
  function drawPlate(g, p, x, y, w, h, t = 0) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
    g.fillStyle = p.fill;
    g.beginPath(); g.roundRect(x, y, w, h, p.r); g.fill();
    g.restore();
    if (p.line) {
      g.save();
      if (p.glow) { g.shadowColor = p.glow; g.shadowBlur = 14; }
      g.strokeStyle = lineStyle(g, p.line, y, h);
      g.lineWidth = p.lw;
      const i = p.inset + p.lw / 2;
      g.beginPath(); g.roundRect(x + i, y + i, w - i * 2, h - i * 2, Math.max(2, p.r - i)); g.stroke();
      g.restore();
    }
    if (p.bulbs) {
      // Motel marquee: bulbs chase around the edge.
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
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    g.fillStyle = th.board;
    g.beginPath(); g.roundRect(x, y, w, h, f.r); g.fill();
    g.restore();
    if (!f.line) return;
    g.save();
    if (f.glow) { g.shadowColor = f.glow; g.shadowBlur = 16; }
    g.strokeStyle = lineStyle(g, f.line, y, h);
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
    candy(x, y, s, color) {
      const r = s * 0.36;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x, y, s, s, r); ctx.fill();
      const shade = ctx.createLinearGradient(0, y, 0, y + s);
      shade.addColorStop(0, 'rgba(255,255,255,0.35)');
      shade.addColorStop(0.5, 'rgba(255,255,255,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = shade;
      ctx.beginPath(); ctx.roundRect(x, y, s, s, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(x + s * 0.38, y + s * 0.26, s * 0.2, s * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.7, y + s * 0.2, s * 0.05, 0, Math.PI * 2); ctx.fill();
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
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ state, best, muted })); } catch { /* private mode */ }
  }
  function saveProfile() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* private mode */ }
  }

  const saved = loadJSON(STORE_KEY);
  let state = saved.state && saved.state.effects && !saved.state.over ? saved.state : L.createGame(Date.now());
  if (!state.inventory) state = { ...state, inventory: L.createGame(0).inventory, stuck: false };
  let best = saved.best || loadJSON(LEGACY_KEY).best || 0;
  let muted = !!saved.muted;
  const storedProfile = loadJSON(PROFILE_KEY);
  // Local calendar day; daily missions roll over at local midnight.
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  let profile = M.ensureDay(storedProfile.owned ? storedProfile : M.createProfile(today()), today());
  saveProfile();
  let bestAtStart = best;
  let recordAnnounced = false;
  let runSettled = false;
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
  let overAt = 0;
  let aiming = null;      // bomb targeting: { cell: [r, c] | null, pid }
  let flyers = [];        // bonus icons flying from the board to the inventory

  const theme = () => THEMES[profile.equipped.boards] || THEMES.night;
  const blockSkin = () => BLOCK_SKINS[profile.equipped.blocks] || BLOCK_SKINS.classic;
  const fmt = (n) => n.toLocaleString('fr-FR');
  const COIN = '<i class="coin"></i>';

  // ---------- layout ----------
  const invEl = document.getElementById('inventory');
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
    document.body.dataset.theme = profile.equipped.boards;
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
    // board + gap (0.7 cell) + tray (3.4 cells) + inventory must fit below the HUD
    const cell = Math.floor(Math.min(maxBoard / SIZE, (H - topH - invH - 24) / (SIZE + 4.1)));
    const board = cell * SIZE;
    const bx = Math.round((W - board) / 2);
    const used = board + cell * 4.1 + invH;
    const by = Math.round(topH + Math.max(0, (H - topH - used) * 0.5));
    const ty = by + board + cell * 0.7;
    lay = { cell, board, bx, by, ty, trayH: cell * 3.4, slotW: board / 3, compact,
      plateY: compact ? safeTop + 10 : by - 116, plateH: compact ? 64 : 72 };
    invEl.style.top = Math.round(ty + lay.trayH) + 'px';
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
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
    if (muted || !ac) return;
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
      if (muted || !ac) return;
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
  const buzz = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

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
      drawBlock(ox + (c + 0.5) * cellSize, oy + (r + 0.5) * cellSize, cellSize, PALETTE[piece.color], alpha, 1, bonus);
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
    const i = Math.floor((x - lay.bx) / lay.slotW);
    return Math.max(0, Math.min(2, i));
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
    if (!(state.effects.rotate > 0)) sfx.pick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (aiming && (aiming.pid === e.pointerId || e.pointerType === 'mouse')) {
      aiming.cell = boardCellAt(e.clientX, e.clientY);
      return;
    }
    if (!drag || e.pointerId !== drag.pid) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
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
    drag = null;
    if (isTap && e.type === 'pointerup' && state.effects.rotate > 0) {
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

    for (const i of ev.refilled) { slotIn[i] = t; slotSpin[i] = 0; }
    afterChange(t, ev.over);
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
        color: extraColor && k % 3 === 0 ? extraColor : PALETTE[cell.color],
      });
    }
  }

  // Shared bookkeeping after any move: record, missions, game over, persistence.
  function afterChange(t, over) {
    if (state.score > best) {
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
      for (const i of ev.refilled) { slotIn[i] = t; slotSpin[i] = 0; }
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
    aiming = null;
    overAt = t;
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

  function newGame() {
    profile = M.ensureDay(profile, today());
    saveProfile();
    state = L.createGame(Date.now());
    bestAtStart = best;
    recordAnnounced = false;
    runSettled = false;
    runCoinsShown = 0;
    renderWallet();
    displayScore = 0;
    drag = null;
    returning = []; pops = []; fades = []; particles = []; floaters = [];
    banners = []; overAt = 0; slotIn = [now(), now(), now()]; slotSpin = [0, 0, 0];
    aiming = null; flyers = [];
    overEl.classList.remove('show');
    resetAnnounced();
    renderInventory();
    save();
  }

  document.getElementById('again').addEventListener('click', () => { unlockAudio(); newGame(); });
  document.getElementById('restart').addEventListener('click', () => {
    if (state.over || state.moves === 0) { newGame(); return; }
    if (!confirm('Recommencer ? Les pièces de cette partie sont gagnées.')) return;
    const report = settleRun();
    newGame();
    if (report && report.total) banners.push({ icon: 'coin', text: '+' + report.total, sub: 'Pièces de la partie', gold: true });
  });
  const muteBtn = document.getElementById('mute');
  const SOUND_ON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const SOUND_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  const syncMute = () => { muteBtn.innerHTML = muted ? SOUND_OFF : SOUND_ON; };
  muteBtn.addEventListener('click', () => { muted = !muted; syncMute(); unlockAudio(); save(); });
  syncMute();
  document.addEventListener('visibilitychange', save);

  // ---------- wallet & shop ----------
  const walletEl = document.getElementById('wallet');
  const restartEl = document.getElementById('restart');
  let runCoinsShown = 0; // coins picked up this run, landed in the wallet animation

  function renderWallet() {
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
  document.getElementById('over-shop').addEventListener('click', openShop);
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
        if (v) drawBlock(x, y, cell, PALETTE[v], 1, 1, null, BLOCK_SKINS[blocksId]);
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

  function frame() {
    const t = now();
    syncTimers();
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    // Bonus timers only run while actually playing.
    if (!shopEl.classList.contains('show') && !legendEl.classList.contains('show')) {
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
      // Fit between the wallet and the restart button.
      const room = Math.min(W / 2 - walletEl.getBoundingClientRect().right, restartEl.getBoundingClientRect().left - W / 2);
      pw = Math.min(pw, room * 2 - 16);
    }
    const ph = lay.plateH;
    const px = W / 2 - pw / 2;
    const py = lay.plateY;
    const bump = state.score !== Math.round(displayScore) ? 1.05 : 1;

    drawPlate(ctx, p, px, py, pw, ph, t);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = p.sub;
    ctx.font = themeFont(th, 12);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
    ctx.fillText('RECORD ' + fmt(best), W / 2, py + ph * 0.32);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    if (p.odometer) drawOdometer(th, W / 2, py + ph * 0.4, ph * 0.47, displayScore);
    else {
      ctx.save();
      if (p.glow) { ctx.shadowColor = p.glow; ctx.shadowBlur = 12; }
      ctx.fillStyle = p.ink;
      ctx.font = themeFont(th, Math.round(ph * 0.64 * bump));
      ctx.fillText(fmt(Math.round(displayScore)), W / 2, py + ph - ph * 0.13);
      ctx.restore();
    }

    // Combo: small sign hung under the score, like a French "panonceau".
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
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, 25, 6); ctx.fill();
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

  // Odometer drums: each digit rolls continuously toward the score.
  function drawOdometer(th, cx, y, h, value) {
    const digits = Math.max(5, String(Math.round(state.score)).length);
    const dw = h * 0.68;
    const gap = 2;
    const total = digits * dw + (digits - 1) * gap;
    let x = cx - total / 2;
    ctx.font = themeFont(th, Math.round(h * 0.78));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = digits - 1; i >= 0; i--) {
      const drumH = h;
      const light = i === 0;
      const bg = ctx.createLinearGradient(0, y, 0, y + drumH);
      bg.addColorStop(0, light ? '#2a2004' : '#101012'); bg.addColorStop(0.5, light ? '#4a3808' : '#2a2a30'); bg.addColorStop(1, light ? '#2a2004' : '#101012');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(x, y, dw, drumH, 3); ctx.fill();
      // Drum position: lower digits spin through, higher ones only roll while the one below passes 9.
      const unit = Math.pow(10, i);
      const below = value % unit;
      let pos = Math.floor(value / unit) % 10;
      if (i > 0 && below > unit - 1) pos += below - (unit - 1);
      if (i === 0) pos = value % 10;
      const whole = Math.floor(pos);
      const frac = pos - whole;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, dw, drumH); ctx.clip();
      ctx.fillStyle = light ? th.accent : th.ink;
      for (const [d, off] of [[whole % 10, -frac], [(whole + 1) % 10, 1 - frac]]) {
        ctx.fillText(String(d), x + dw / 2, y + drumH / 2 + off * drumH + 1);
      }
      // Curvature shading.
      const sh = ctx.createLinearGradient(0, y, 0, y + drumH);
      sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)');
      sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = sh; ctx.fillRect(x, y, dw, drumH);
      ctx.restore();
      x += dw + gap;
    }
    ctx.textBaseline = 'alphabetic';
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
        const color = preview && preview.has(i) ? PALETTE[ghost.piece.color] : PALETTE[v];
        const alpha = 1 - overK * 0.65;
        drawBlock(x, y, cell, color, alpha, scale, state.bonus[i]);
      }
    }
    pops = pops.filter((p) => t - p.t0 < 240);

    if (ghost) {
      const b = ghost.piece.bonus;
      for (const [r, c] of ghost.piece.cells) {
        const [x, y] = cellCenter(ghost.row + r, ghost.col + c);
        drawBlock(x, y, cell, PALETTE[ghost.piece.color], 0.35, 1, b && b.r === r && b.c === c ? b.type : null);
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
    else if (state.stuck) text = 'Bloqué ! Utilise un bonus ou termine la partie';
    if (!text) return;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t / 200);
    const th = theme();
    ctx.fillStyle = aiming ? th.danger : th.accent;
    ctx.font = themeFont(th, 15);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, lay.by + lay.board + (lay.ty - lay.by - lay.board) / 2 + 4);
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
      if (k < 0) { drawBlock(x, y, lay.cell, PALETTE[f.color]); continue; }
      const flash = k < 0.25 ? '#ffffff' : PALETTE[f.color];
      drawBlock(x, y, lay.cell, flash, 1 - k, 1.1 - easeOut(k));
    }
  }

  function drawTray(t) {
    const m = miniCell();
    const canTurn = state.effects.rotate > 0 && !state.over;
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
      const k = easeBack((t - slotIn[i] - i * 60) / 380);
      const offset = (1 - k) * (W - cx + 60);
      const fits = L.pieceFits(state, piece);
      const spin = slotSpin[i] ? 1 - easeBack((t - slotSpin[i]) / 260) : 0;
      ctx.save();
      ctx.translate(cx + offset, cy);
      ctx.rotate(-spin * Math.PI / 2);
      drawPiece(piece, 0, 0, m, fits ? 1 : 0.28);
      ctx.restore();
    }
  }

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

  requestAnimationFrame(frame);
})();
