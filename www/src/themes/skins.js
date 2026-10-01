// Cubo Blocks — Block skins: how one block is painted.
'use strict';

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
