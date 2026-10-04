// Cubo Blocks — SVG icons used in menus, HUD and buttons.
'use strict';

// ---------- icons ----------
// Puzzle surprise: a gift box.
const SURPRISE_SVG = '<rect x="3.5" y="9" width="17" height="11.5" rx="2" fill="currentColor"/><rect x="2.5" y="6.5" width="19" height="4" rx="1.4" fill="currentColor" opacity=".8"/><path d="M12 6.5v14" stroke="#fff" stroke-width="2.4"/><path d="M12 6.3C10.5 3 7 2.8 7.2 5c.2 1.6 3 1.5 4.8 1.3M12 6.3c1.5-3.3 5-3.5 4.8-1.3-.2 1.6-3 1.5-4.8 1.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
const CROWN_PATH = '<path d="M3.5 18.5 2.5 7l5.2 4.3L12 4l4.3 7.3L21.5 7l-1 11.5z" fill="currentColor" stroke="rgba(0,0,0,.25)" stroke-width="1" stroke-linejoin="round"/><rect x="3.5" y="19.3" width="17" height="2.2" rx="1" fill="currentColor"/>';
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
