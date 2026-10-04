// Cubo Blocks — Drawing the run: background, board, tray, next piece, score band, clear effects.
// Ported call for call from legacy render/board.js, render/hud.js, render/effects.js,
// themes/draw.js and themes/skins.js (classic block skin).
import { L } from '../core';
import { tr, locale } from '../core/i18n';
import type { Piece, RunState } from '../core/types';
import { dragGeometry, easeBack, easeOut, type DragGeometry } from '../game/drag';
import { anim, type DragState } from '../game/anim';
import { G, withAlpha } from './g';
import { cellCenter, miniCell, slotBox, slotCenter, type Layout } from './layout';
import type { Theme } from './theme';

const SIZE = L.SIZE;
const fmt = (n: number) => n.toLocaleString(locale());

// ---------- theme parts (themes/draw.js) ----------
export function paintBackground(g: G, th: Theme, W: number, H: number) {
  g.rect(0, 0, W, H, th.base);
  if (!th.dots) return;
  for (let y = 0, row = 0; y < H + 20; y += 20, row++) {
    for (let x = row % 2 ? 10 : 0; x < W + 20; x += 20) g.circle(x, y, 2.2, th.dots);
  }
}

export function drawFrame(g: G, th: Theme, x: number, y: number, w: number, h: number) {
  const f = th.frame;
  g.rrect(x, y, w, h, f.r, th.board, { shadow: { color: th.shadow, blur: 20, dy: 8 } });
  if (!f.line) return;
  const i = f.inset || 0;
  g.rrect(x + i, y + i, w - i * 2, h - i * 2, Math.max(2, f.r - i), f.line, { stroke: { width: f.lw || 2 } });
}

function drawEmpty(g: G, th: Theme, x: number, y: number, cell: number) {
  g.rrect(x - cell * 0.44, y - cell * 0.44, cell * 0.88, cell * 0.88, cell * th.cellR, th.empty);
}

// The score plate: fill and drop shadow, optional inner border.
function drawPlate(g: G, th: Theme, x: number, y: number, w: number, h: number) {
  const p = th.plate;
  g.rrect(x, y, w, h, p.r, p.fill, { shadow: { color: p.shadow || 'rgba(0,0,0,0.4)', blur: 14, dy: 5 } });
  if (!p.line) return;
  const lw = p.lw || 2;
  const i = (p.inset || 0) + lw / 2;
  g.rrect(x + i, y + i, w - i * 2, h - i * 2, Math.max(2, p.r - i), p.line, { stroke: { width: lw } });
}

// ---------- blocks (themes/skins.js classic, render/helpers.js drawBlock / drawPiece) ----------
function classicBlock(g: G, x: number, y: number, s: number, color: string) {
  const r = s * 0.2;
  g.rrect(x, y, s, s, r, color);
  g.rrect(x, y + s * 0.74, s, s * 0.26, [0, 0, r, r], 'rgba(0,0,0,0.2)');
  g.rrect(x + s * 0.12, y + s * 0.09, s * 0.76, s * 0.2, r * 0.6, 'rgba(255,255,255,0.3)');
}

export function drawBlock(g: G, cx: number, cy: number, size: number, color: string, alpha = 1, scale = 1) {
  const s = size * scale * 0.9;
  if (s <= 0.5) return;
  const a = g.alpha;
  g.alpha = a * alpha;
  classicBlock(g, cx - s / 2, cy - s / 2, s, color);
  g.alpha = a;
}

export function drawPiece(g: G, th: Theme, piece: Piece, cx: number, cy: number, cellSize: number, alpha = 1) {
  const ox = cx - (piece.w * cellSize) / 2;
  const oy = cy - (piece.h * cellSize) / 2;
  for (const [r, c] of piece.cells) {
    drawBlock(g, ox + (c + 0.5) * cellSize, oy + (r + 0.5) * cellSize, cellSize, th.palette[piece.color] || th.ink, alpha);
  }
}

// ---------- board (render/board.js drawBoard) ----------
export function drawBoard(g: G, th: Theme, lay: Layout, state: RunState, ghost: (DragGeometry & { piece: Piece }) | null, t: number) {
  const { bx, by, board, cell } = lay;
  drawFrame(g, th, bx - 10, by - 10, board + 20, board + 20);
  const preview = ghost ? L.previewClears(state.board, ghost.piece, ghost.row, ghost.col, state.special) : null;
  const overK = anim.overAt ? easeOut((t - anim.overAt) / 900) : 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const [x, y] = cellCenter(lay, r, c);
      drawEmpty(g, th, x, y, cell);
    }
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c;
      const v = state.board[i];
      if (!v) continue;
      const [x, y] = cellCenter(lay, r, c);
      let scale = 1;
      const pop = anim.pops.find((p) => p.r === r && p.c === c);
      if (pop) {
        const k = (t - pop.t0) / 220;
        scale = k < 1 ? 1 + 0.16 * Math.sin(k * Math.PI) : 1;
      }
      // Cells the dragged piece would clear take its color.
      const fam = preview && ghost && preview.has(i) ? ghost.piece.color : v;
      drawBlock(g, x, y, cell, th.palette[fam] || th.ink, 1 - overK * 0.65, scale);
    }
  }
  anim.pops = anim.pops.filter((p) => t - p.t0 < 240);

  if (ghost) {
    for (const [r, c] of ghost.piece.cells) {
      const [x, y] = cellCenter(lay, ghost.row + r, ghost.col + c);
      drawBlock(g, x, y, cell, th.palette[ghost.piece.color] || th.ink, 0.35);
    }
    if (preview && preview.size) {
      const a = 0.12 + 0.06 * Math.sin(t / 90);
      for (const i of preview) {
        const [x, y] = cellCenter(lay, Math.floor(i / SIZE), i % SIZE);
        g.rrect(x - cell * 0.45, y - cell * 0.45, cell * 0.9, cell * 0.9, cell * 0.18, '#ffffff', { alpha: a });
      }
    }
  }
}

// Ghost of the dragged piece where it would land (null when it would not fit).
export function ghostOf(lay: Layout, state: RunState, drag: DragState | null, t: number) {
  if (!drag) return null;
  const piece = state.tray[drag.idx];
  if (!piece) return null;
  const g = dragGeometry(lay, state.board, piece, drag.x, drag.y, drag.lift, easeOut((t - drag.t0) / 110));
  return g.valid ? { ...g, piece } : null;
}

// ---------- clear effects (render/effects.js) ----------
export function drawFades(g: G, th: Theme, lay: Layout, t: number) {
  anim.fades = anim.fades.filter((f) => t - f.t0 - f.delay < 320);
  for (const f of anim.fades) {
    const k = (t - f.t0 - f.delay) / 320;
    const [x, y] = cellCenter(lay, f.r, f.c);
    const color = th.palette[f.color] || th.ink;
    if (k < 0) { drawBlock(g, x, y, lay.cell, color); continue; }
    drawBlock(g, x, y, lay.cell, k < 0.25 ? '#ffffff' : color, 1 - k, 1.1 - easeOut(k));
  }
}

export function drawFloaters(g: G, th: Theme, lay: Layout, t: number) {
  anim.floaters = anim.floaters.filter((f) => t - f.t0 < 900);
  for (const f of anim.floaters) {
    const k = (t - f.t0) / 900;
    const a = g.alpha;
    g.alpha = 1 - easeOut(Math.max(0, (k - 0.5) * 2));
    const size = Math.round((f.big ? 32 : 20) * (f.scale || 1));
    const y = f.y - easeOut(k) * lay.cell * 1.4;
    const pop = f.tier ? easeBack(k * 5) : 1;
    g.save();
    g.translate(f.x, y);
    g.scale(pop);
    g.text(f.text, 0, 0, size, th.ink, 'center', { color: withAlpha(th.base, 0.92), width: 5 + (f.tier || 0) });
    g.restore();
    g.alpha = a;
  }
}

export function drawReturning(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  anim.returning = anim.returning.filter((p) => t - p.t0 < 200 && state.tray[p.idx]);
  for (const p of anim.returning) {
    const k = easeOut((t - p.t0) / 200);
    const [tx, ty] = slotCenter(lay, p.idx);
    drawPiece(g, th, state.tray[p.idx]!, p.x + (tx - p.x) * k, p.y + (ty - p.y) * k, p.size + (miniCell(lay) - p.size) * k);
  }
}

// ---------- tray (render/board.js drawTray, drawTrayPad, drawNext) ----------
function drawTrayPad(g: G, th: Theme, x: number, y: number, w: number, h: number) {
  const r = Math.min(16, th.frame.r);
  // Half see-through and no shadow: it must not read as a second board.
  g.rrect(x, y, w, h, r, th.board, { alpha: 0.5 });
  g.rrect(x, y, w, h, r, withAlpha(th.ink, 0.1), { stroke: { width: 1.5 } });
}

export function drawTray(g: G, th: Theme, lay: Layout, state: RunState, drag: DragState | null, t: number) {
  const m = miniCell(lay);
  drawNext(g, th, lay, state, t);
  for (let i = 0; i < 3; i++) {
    const b = slotBox(lay, i);
    drawTrayPad(g, th, b.x + 4, b.y + 6, b.w - 8, b.h - 12);
  }
  for (let i = 0; i < 3; i++) {
    const piece = state.tray[i];
    if (!piece || anim.returning.some((p) => p.idx === i)) continue;
    if (drag && drag.idx === i) continue;
    const [cx, cy] = slotCenter(lay, i);
    // A new piece slides in from the next column.
    const k = easeBack((t - anim.slotIn[i]) / 380);
    const offset = (1 - k) * (lay.nextX + lay.nextW / 2 - cx);
    const fits = L.pieceFits(state, piece);
    drawPiece(g, th, piece, cx + offset, cy, m, fits ? 1 : 0.28);
  }
}

// Narrow column right of the tray: the piece that fills the next emptied slot. A dashed preview box
// with a label chip on its top edge, so it never reads as a 4th playable pad.
function drawNext(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  const { nextX, nextW, ty, trayH } = lay;
  const x = nextX + 6, w = nextW - 8;
  const h = Math.min(trayH - 28, w * 1.35);
  const y = ty + (trayH - h) / 2 + 6;
  const r = Math.min(14, th.frame.r);
  g.rrect(x, y, w, h, r, withAlpha(th.accent, 0.08));
  g.rrect(x, y, w, h, r, withAlpha(th.accent, 0.55), { stroke: { width: 2, dash: [5, 5] } });
  const label = tr('SUIVANT');
  const size = g.fit(label, 10, w - 6);
  const cw = Math.min(w + 4, g.textWidth(label, size) + 14);
  const cx = x + w / 2;
  g.rrect(cx - cw / 2, y - 9, cw, 18, 9, th.accent);
  g.text(label, cx + 0.5, y + size * 0.36, size, '#ffffff', 'center');
  const piece = state.next;
  if (!piece) return;
  const s = Math.min(miniCell(lay) * 0.62, (w - 12) / Math.max(piece.w, piece.h, 3));
  const k = easeOut((t - anim.nextIn) / 320);
  drawPiece(g, th, piece, cx, y + h / 2 + 4 + (1 - k) * 20, s, 0.9 * k);
}

// ---------- score band (render/hud.js drawHUD) ----------
export function drawHUD(g: G, th: Theme, lay: Layout, state: RunState, best: number) {
  anim.displayScore += (state.score - anim.displayScore) * 0.18;
  if (Math.abs(state.score - anim.displayScore) < 0.5) anim.displayScore = state.score;
  const p = th.plate;
  const { x, y, w, h } = lay.band;
  const cx = x + w / 2;
  const cw = w - 28;
  const bump = state.score !== Math.round(anim.displayScore) ? 1.05 : 1;
  drawPlate(g, th, x, y, w, h);
  let sub = tr('SCORE');
  if (best > state.score) sub = tr('RECORD ') + fmt(best);
  else if (anim.bestAtStart > 0 && state.score > anim.bestAtStart) sub = tr('NOUVEAU RECORD');
  const subSize = g.fit(sub, 11, cw);
  g.text(sub, cx, y + h * 0.34 + subSize * 0.35, subSize, p.sub, 'center');
  const main = fmt(Math.round(anim.displayScore));
  g.text(main, cx, y + h - h * 0.14, g.fit(main, Math.round(h * 0.56 * bump), cw), p.ink, 'center');
}
