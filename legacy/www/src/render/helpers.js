// Cubo Blocks — Drawing helpers shared by the board, tray and previews.
'use strict';

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

// Puzzle surprise: the whole quota sits in the tray, on two rows over the full board width.
const freeTray = () => !!(state.puzzle && state.puzzle.free);
function slotBox(i) {
  if (!freeTray()) return { x: lay.bx + lay.slotW * i, y: lay.ty, w: lay.slotW, h: lay.trayH };
  const cols = Math.max(3, Math.ceil(state.tray.length / 2));
  const w = lay.board / cols;
  const h = lay.trayH / 2;
  return { x: lay.bx + w * (i % cols), y: lay.ty + h * Math.floor(i / cols), w, h };
}
function slotCenter(i) {
  const b = slotBox(i);
  return [b.x + b.w / 2, b.y + b.h / 2];
}
// A 5-long piece stays inside its tray pad.
function miniCell() {
  if (!freeTray()) return Math.min(lay.cell * 0.46, lay.slotW / 5.8);
  const b = slotBox(0);
  return Math.min(lay.cell * 0.4, b.w / 5.6, (b.h - 8) / 3.4);
}

function drawPiece(piece, cx, cy, cellSize, alpha = 1) {
  const ox = cx - (piece.w * cellSize) / 2;
  const oy = cy - (piece.h * cellSize) / 2;
  const b = piece.bonus;
  for (const [r, c] of piece.cells) {
    const bonus = b && b.r === r && b.c === c ? b.type : null;
    drawBlock(ox + (c + 0.5) * cellSize, oy + (r + 0.5) * cellSize, cellSize, pal()[piece.color], alpha, 1, bonus, undefined, piece.color);
  }
}
