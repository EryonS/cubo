// Cubo Blocks — Theme drawing parts: fonts, score plate, board frame, empty cells.
'use strict';

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
