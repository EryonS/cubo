// Cubo Blocks — Drawing the run: background, board, tray, next piece, score band, clear effects.
// Ported call for call from legacy render/board.js, render/hud.js, render/effects.js,
// themes/draw.js and themes/skins.js (classic block skin).
import { L } from '../core';
import { tr, locale } from '../core/i18n';
import type { Piece, RunState } from '../core/types';
import { dragGeometry, easeBack, easeOut, type DragGeometry } from '../game/drag';
import { anim, type DragState } from '../game/anim';
import { bannerHead, bannerLook, comboTagLook, COMBO_BREAK_MS, comboTier, flagFall, flagWave, hslToHex, PUNCH_MS, tierHex } from '../game/juice';
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
    // Combo points pop in with a bounce.
    const pop = f.tier && !anim.calm ? easeBack(k * 5) : 1;
    g.save();
    g.translate(f.x, y);
    g.scale(pop);
    g.text(f.text, 0, 0, size, f.tier ? tierHex(f.tier, t, th.accent) : th.ink, 'center', { color: withAlpha(th.base, 0.92), width: 5 + (f.tier || 0) });
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

// ---------- score band (render/hud.js hudBand / drawHUD) ----------
interface Flag { beaten: boolean; fall: number; s: number; label: string; size: number; fw: number; room: number }

// Free runs: a pennant planted in the band's left end, carrying the record the run started with.
function recordFlag(g: G, lay: Layout, state: RunState, t: number): Flag | null {
  if (!(anim.bestAtStart > 0)) return null;
  const beaten = state.score > anim.bestAtStart;
  const s = lay.band.h;
  const label = fmt(anim.bestAtStart);
  const size = g.fit(label, Math.round(s * 0.3), lay.band.w * 0.3);
  const fw = g.textWidth(label, size) + s * 0.36;
  return { beaten, fall: flagFall(beaten, anim.flagDownAt, t), s, label, size, fw, room: 16 + fw + s * 0.16 + 6 };
}

// The score band: the pennant on its left, the score in the middle of what is left.
function hudBand(g: G, lay: Layout, state: RunState, t: number) {
  const { x, y, w, h } = lay.band;
  const flag = recordFlag(g, lay, state, t);
  const flagW = flag ? flag.room * (1 - flag.fall) : 0;
  return { x, y, w, h, flag, cx: x + flagW + (w - flagW) / 2, cw: w - flagW - 28 };
}

export function drawHUD(g: G, th: Theme, lay: Layout, state: RunState, best: number, t: number) {
  anim.displayScore += (state.score - anim.displayScore) * 0.18;
  if (Math.abs(state.score - anim.displayScore) < 0.5) anim.displayScore = state.score;
  const p = th.plate;
  const { x, y, w, h, flag, cx, cw } = hudBand(g, lay, state, t);
  const bump = state.score !== Math.round(anim.displayScore) ? 1.05 : 1;
  drawPlate(g, th, x, y, w, h);
  // While the pennant stands in the band, it carries the record. Once the score is the record,
  // showing it again above would only repeat the big number.
  let sub = tr('SCORE');
  if (best > state.score && !(flag && flag.fall < 1)) sub = tr('RECORD ') + fmt(best);
  else if (flag && flag.beaten) sub = tr('NOUVEAU RECORD');
  const subSize = g.fit(sub, 11, cw);
  g.text(sub, cx, y + h * 0.34 + subSize * 0.35, subSize, p.sub, 'center');
  const main = fmt(Math.round(anim.displayScore));
  g.text(main, cx, y + h - h * 0.14, g.fit(main, Math.round(h * 0.56 * bump), cw), p.ink, 'center');
}

// It waves harder in the last 10 %, and topples over once the record is beaten.
export function drawRecordFlag(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  const f = hudBand(g, lay, state, t).flag;
  if (!f || f.fall >= 1) return;
  const { s, fw, fall } = f;
  const band = lay.band;
  const h = s * 0.7;
  const a = g.alpha;
  g.save();
  g.translate(band.x + 16, band.y + band.h - s * 0.14);
  g.rotate(fall * fall * 1.5); // topples toward the score
  g.alpha = a * (1 - fall);
  // Pole and its little base.
  g.ellipse(0, 1, s * 0.12, s * 0.04, 'rgba(0,0,0,0.16)');
  g.line(0, 0, 0, -h, th.plate.sub, Math.max(2, s * 0.05));
  g.circle(0, -h, s * 0.06, th.tag.fill);
  // Pennant: width from the label, a wave running along it.
  const fh = s * 0.4;
  const { amp, speed } = flagWave(s, state.score, anim.bestAtStart, f.beaten, anim.calm);
  const top = -h + s * 0.05;
  const wave = (k: number) => Math.sin(t / speed - k * 3) * amp * k;
  const pts: [number, number][] = [[0, top]];
  for (let k = 0; k <= 1.0001; k += 0.1) pts.push([fw * k, top + wave(k)]);
  pts.push([fw + s * 0.16, top + fh / 2 + wave(1)]); // swallowtail point
  for (let k = 1; k >= -0.0001; k -= 0.1) pts.push([fw * Math.max(0, k), top + fh + wave(Math.max(0, k))]);
  g.poly(pts, th.tag.fill);
  g.text(f.label, s * 0.18, top + fh / 2 + wave(0.3) + 1 + f.size * 0.35, f.size, th.tag.ink, 'left');
  g.restore();
  g.alpha = a;
}

// ---------- combo feel (render/hud.js, render/effects.js, render/loop.js) ----------
// Combo: small pill hung from the band's bottom edge, over the frame's top margin. Drawn after the
// board so the frame never covers it. Pops when it grows, drops away when it breaks.
export function drawComboHang(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  const band = hudBand(g, lay, state, t);
  const tagY = band.y + band.h - 4;
  if (state.combo > 0) {
    const { left, pulse, scale } = comboTagLook(t, L.COMBO_GRACE, state.movesSinceClear, anim.comboAt, anim.calm);
    drawComboTag(g, th, state.combo, left, tagY, pulse, scale, 0, false, t, band.cx);
  } else if (anim.comboBreak && !anim.calm) {
    const k = (t - anim.comboBreak.t0) / COMBO_BREAK_MS;
    if (k >= 1) anim.comboBreak = null;
    else drawComboTag(g, th, anim.comboBreak.n, 0, tagY + k * k * lay.cell * 1.6, 1 - k, 1 - 0.2 * k, 0.3 * k, true, t, band.cx);
  }
}

function drawComboTag(g: G, th: Theme, combo: number, left: number, ty: number, alpha: number, scale: number, rot: number, broken: boolean, t: number, mid: number) {
  const tag = th.tag;
  const tier = broken ? 0 : comboTier(combo);
  const label = tr('COMBO ×') + combo;
  const tw = g.textWidth(label, 17) + 20 + L.COMBO_GRACE * 11 + 8;
  const tx = mid - tw / 2;
  const a0 = g.alpha;
  g.save();
  g.translate(mid, ty + 12.5);
  g.rotate(rot);
  g.scale(scale);
  g.translate(-mid, -(ty + 12.5));
  g.alpha = a0 * alpha;
  const glow = tier >= 2 ? { color: tierHex(tier, t, th.accent), blur: 8 + 6 * tier } : undefined;
  g.rrect(tx, ty, tw, 25, 12.5, broken ? '#9b93aa' : tag.fill, { shadow: glow });
  if (tag.line && !broken) g.rrect(tx + 2.5, ty + 2.5, tw - 5, 20, 4, tag.line, { stroke: { width: 1.5 } });
  const ink = broken ? '#ffffff' : tag.ink;
  g.text(label, tx + 11, ty + 14 + 17 * 0.35, 17, ink, 'left');
  for (let i = 0; i < L.COMBO_GRACE; i++) {
    g.circle(tx + tw - 12 - (L.COMBO_GRACE - 1 - i) * 11, ty + 12.5, 3.6, ink, { alpha: i < left ? 1 : 0.25 });
  }
  g.restore();
  g.alpha = a0;
}

// While a combo runs, the board frame glows in the tier color, faster on the last move of grace.
export function drawComboGlow(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  if (state.combo < 2 || state.over) return;
  const tier = comboTier(state.combo);
  const left = L.COMBO_GRACE - state.movesSinceClear;
  const pulse = 0.5 + 0.5 * Math.sin(t / (left === 1 ? 110 : 260));
  const color = tierHex(tier, t, th.accent);
  const { bx, by, board } = lay;
  g.rrect(bx - 10, by - 10, board + 20, board + 20, th.frame.r, color, {
    stroke: { width: 2 + tier },
    shadow: { color, blur: anim.calm ? 6 : 10 + 8 * tier * pulse },
    alpha: anim.calm ? 0.6 : 0.45 + 0.45 * pulse,
  });
}

// A flash of light along each cleared line, widening as it fades.
export function drawSweeps(g: G, lay: Layout, t: number) {
  anim.sweeps = anim.sweeps.filter((w) => t - w.t0 < 380);
  const { bx, by, board, cell } = lay;
  const a0 = g.alpha;
  for (const w of anim.sweeps) {
    const k = (t - w.t0) / 380;
    const thick = cell * (0.8 + 0.6 * easeOut(k));
    g.alpha = a0 * (1 - k) * (1 - k) * 0.85;
    if (w.row !== undefined) g.rrect(bx - 4, by + (w.row + 0.5) * cell - thick / 2, board + 8, thick, thick / 2, '#ffffff');
    else g.rrect(bx + (w.col + 0.5) * cell - thick / 2, by - 4, thick, board + 8, thick / 2, '#ffffff');
  }
  g.alpha = a0;
}

// Screen shake and board punch of the frame: the board group is drawn translated and zoomed by this.
export function frameFx(lay: Layout, t: number) {
  anim.shake = anim.calm ? 0 : anim.shake * 0.86;
  const sx = (Math.random() - 0.5) * anim.shake;
  const sy = (Math.random() - 0.5) * anim.shake;
  let zoom = 1;
  if (anim.punch) {
    const pk = (t - anim.punch.t0) / PUNCH_MS;
    if (pk < 1) zoom = 1 + anim.punch.amp * Math.sin(Math.PI * pk); else anim.punch = null;
  }
  return { sx, sy, zoom, cx: lay.bx + lay.board / 2, cy: lay.by + lay.board / 2 };
}

export function drawParticles(g: G, t: number, dt: number) {
  anim.particles = anim.particles.filter((p) => t - p.t0 < p.life);
  const a0 = g.alpha;
  for (const p of anim.particles) {
    if (t < p.t0) continue;
    p.vy += (p.g ?? 900) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = (t - p.t0) / p.life;
    g.alpha = a0 * (1 - k);
    if (p.star) {
      p.vx *= 0.985;
      p.rot = (p.rot || 0) + (p.vr || 0) * dt;
      const s = p.size * (1 - k * 0.3);
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? s * 0.22 : s * 0.5;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.poly(pts, p.color);
      g.restore();
      continue;
    }
    const s = p.size * (1 - k * 0.5);
    g.rrect(p.x - s / 2, p.y - s / 2, s, s, s * 0.25, p.color);
  }
  g.alpha = a0;
}

// Big center text: the head of the queue, popping in, higher tiers wobbling over a turning sunburst.
export function drawBanner(g: G, th: Theme, lay: Layout, t: number) {
  const head = bannerHead(anim.banners, t);
  if (!head) return;
  const { banner, k } = head;
  const tier = banner.tier || 0;
  const look = bannerLook(k, tier, anim.calm);
  const a0 = g.alpha;
  g.save();
  g.translate(lay.W / 2, lay.by + lay.board * 0.42);
  g.scale(look.scale);
  g.rotate(look.wobble);
  g.alpha = a0 * look.alpha;
  if (look.sunburst) {
    g.save();
    g.translate(0, -lay.cell * 0.3);
    g.rotate(t / 1600);
    g.alpha = a0 * look.alpha * 0.2;
    const color = tierHex(tier, t, th.accent);
    const R = lay.board * 0.52 * look.burstR;
    for (let i = 0; i < 12; i++) g.wedge(R, (i * Math.PI) / 6, (i * Math.PI) / 6 + Math.PI / 14, color);
    g.restore();
    g.alpha = a0 * look.alpha;
  }
  const maxW = lay.board - 24;
  const size = g.fit(banner.text, Math.round(lay.cell * 1.05), maxW);
  const textW = g.textWidth(banner.text, size);
  const outline = { color: withAlpha(th.base, 0.95), width: 10 };
  if (tier >= 3) {
    // Rainbow sliding across the letters.
    const colors = [0, 1, 2, 3, 4].map((i) => hslToHex((Math.round(t / 4) + i * 70) % 360, 92, 58));
    g.text(banner.text, 0, 0, size, colors[0], 'center', outline, { colors, x0: -textW / 2, x1: textW / 2 });
  } else {
    g.text(banner.text, 0, 0, size, tier ? tierHex(tier, t, th.accent) : banner.gold ? th.accent : th.ink, 'center', outline);
  }
  if (banner.sub) {
    const subSize = g.fit(banner.sub, Math.round(lay.cell * 0.5), maxW);
    g.text(banner.sub, 0, lay.cell * 0.7, subSize, th.accent, 'center', { color: withAlpha(th.base, 0.95), width: 6 });
  }
  g.restore();
  g.alpha = a0;
}
