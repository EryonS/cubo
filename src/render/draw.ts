// Cubo Blocks — Drawing the run: background, board, tray, next piece, score band, clear effects.
// Ported call for call from legacy render/board.js, render/hud.js, render/effects.js,
// themes/draw.js and themes/skins.js (classic block skin).
import { L, LV } from '../core';
import { tr, locale } from '../core/i18n';
import type { Piece, RunState } from '../core/types';
import { dragGeometry, easeBack, easeOut, type DragGeometry } from '../game/drag';
import { anim, type DragState } from '../game/anim';
import { bannerHead, bannerLook, comboTagLook, COMBO_BREAK_MS, comboTier, flagFall, flagWave, hslToHex, PUNCH_MS, tierHex } from '../game/juice';
import { drawCubo } from '../mascot/body';
import { cuboLookFor } from '../mascot/looks';
import { cuboBaseMood, cuboMoodAt, cuboRoom, cuboSpot } from '../mascot/state';
import { Ctx } from './ctx2d';
import { G, withAlpha } from './g';
import { drawBoss, drawBossBar } from './boss';
import { segRow, tracksBusy } from '../game/falls';
import { drawSpecial } from './cells';
import { drawIcon, drawMark, iconScale } from './icons';
import { chronoBar, cellCenter, hintY, invBoxes, invCenter, miniCell, slotBox, slotCenter, trashBox, walletTarget, type InvBox, type Layout } from './layout';
import { blockSkin, isNeon } from './skins';
import type { Theme } from './theme';
import { hasClock, hasInventory, hintText, invView, ringEnding, ringFill, trashFill, trashLabel, trashView } from '../game/hud';
import { TRASH_ARM_MS } from '../game/anim';
import { keepsBest } from '../game/modes';
import { tutActive } from '../game/tut-state';
import { freeTray, isVoid, puzzleLabel } from '../game/puzzle';

const SIZE = L.SIZE;
const fmt = (n: number) => n.toLocaleString(locale());

// ---------- theme parts (themes/draw.js) ----------
export function paintBackground(g: G, th: Theme, W: number, H: number) {
  if (th.paint) { th.paint(new Ctx(g), W, H); return; }
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
  g.rrect(x + i, y + i, w - i * 2, h - i * 2, Math.max(2, f.r - i), f.line, { stroke: { width: f.lw || 2 }, shadow: f.glow ? { color: f.glow, blur: 16 } : undefined });
}

// Puzzle frame: follows the drawing instead of the square (one padded rounded tile per cell of the
// drawing, filled as a single path so the shadow stays one piece). No frame line: it would cut through the joins.
export function drawShapedFrame(g: G, th: Theme, lay: Layout, inside: (i: number) => boolean) {
  const { bx, by, cell } = lay;
  const pad = 10;
  const path = g.path();
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!inside(i)) continue;
    path.roundRect(bx + (i % SIZE) * cell - pad, by + Math.floor(i / SIZE) * cell - pad, cell + pad * 2, cell + pad * 2, Math.min(th.frame.r, pad + cell * 0.2));
  }
  path.fill(th.board, { shadow: { color: th.shadow, blur: 20, dy: 8 } });
}

export function drawEmpty(g: G, th: Theme, x: number, y: number, cell: number) {
  g.rrect(x - cell * 0.44, y - cell * 0.44, cell * 0.88, cell * 0.88, cell * th.cellR, th.empty);
}

// The score plate: fill and drop shadow, optional inner border.
export function drawPlate(g: G, th: Theme, x: number, y: number, w: number, h: number, t = 0) {
  const p = th.plate;
  g.rrect(x, y, w, h, p.r, p.fill, { shadow: { color: p.shadow || 'rgba(0,0,0,0.4)', blur: 14, dy: 5 } });
  if (p.line) {
    const lw = p.lw || 2;
    const i = (p.inset || 0) + lw / 2;
    g.rrect(x + i, y + i, w - i * 2, h - i * 2, Math.max(2, p.r - i), p.line, { stroke: { width: lw }, shadow: p.glow ? { color: p.glow, blur: 14 } : undefined });
  }
  if (p.dots) {
    // Mushroom cap: a few white spots peeking from the corners.
    for (const [fx, fy, fr] of [[0.07, 0.3, 0.09], [0.93, 0.28, 0.07], [0.12, 0.78, 0.05], [0.9, 0.76, 0.06]]) g.circle(x + w * fx, y + h * fy, h * fr, 'rgba(255,255,255,0.9)');
  }
  if (p.bulbs) {
    // Arcade marquee: bulbs chase around the edge.
    const n = Math.max(8, Math.round((w + h) / 11));
    const per = (w + h) * 2;
    const m = 2.5;
    for (let k = 0; k < n * 2; k++) {
      let d = (k / (n * 2)) * per;
      let bx: number, by: number;
      if (d < w) { bx = x + d; by = y + m; } else if ((d -= w) < h) { bx = x + w - m; by = y + d; }
      else if ((d -= h) < w) { bx = x + w - d; by = y + h - m; } else { d -= w; bx = x + m; by = y + h - d; }
      const on = (k + Math.floor(t / 180)) % 3 !== 0;
      g.circle(bx, by, 1.6, on ? p.bulbs : 'rgba(255,212,107,0.25)');
    }
  }
}

// ---------- blocks (themes/skins.js, render/helpers.js drawBlock / drawPiece) ----------
// bonus: the bonus or coin icon the block carries. fam: its shape family, for the Motifs marks.
export function drawBlock(g: G, th: Theme, cx: number, cy: number, size: number, color: string, alpha = 1, scale = 1, bonus: string | null = null, fam = 0) {
  const s = size * scale * 0.9;
  if (s <= 0.5) return;
  const a = g.alpha;
  g.alpha = a * alpha;
  blockSkin(th.skin)(g, cx - s / 2, cy - s / 2, s, color);
  if (bonus) drawIcon(g, bonus, cx, cy, s * iconScale(bonus));
  else if (fam && th.patterns) drawMark(g, fam, cx, cy, s, isNeon(th.skin) ? color : 'rgba(0,0,0,0.42)');
  g.alpha = a;
}

export function drawPiece(g: G, th: Theme, piece: Piece, cx: number, cy: number, cellSize: number, alpha = 1) {
  const ox = cx - (piece.w * cellSize) / 2;
  const oy = cy - (piece.h * cellSize) / 2;
  const b = piece.bonus;
  for (const [r, c] of piece.cells) {
    const bonus = b && b.r === r && b.c === c ? b.type : null;
    drawBlock(g, th, ox + (c + 0.5) * cellSize, oy + (r + 0.5) * cellSize, cellSize, th.palette[piece.color] || th.ink, alpha, 1, bonus, piece.color);
  }
}

// ---------- board (render/board.js drawBoard) ----------
export function drawBoard(g: G, th: Theme, lay: Layout, state: RunState, ghost: (DragGeometry & { piece: Piece }) | null, t: number) {
  const { bx, by, board, cell } = lay;
  if (state.puzzle) drawShapedFrame(g, th, lay, (i) => !isVoid(state.special, i));
  else drawFrame(g, th, bx - 10, by - 10, board + 20, board + 20);
  // Puzzles have no line clears: no preview.
  const preview = ghost && state.mode !== 'puzzle' ? L.previewClears(state.board, ghost.piece, ghost.row, ghost.col, state.special) : null;
  const overK = anim.overAt ? easeOut((t - anim.overAt) / 900) : 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isVoid(state.special, r * SIZE + c)) continue; // puzzle: outside the drawing
      const [x, y] = cellCenter(lay, r, c);
      drawEmpty(g, th, x, y, cell);
    }
  }
  anim.shifts = anim.shifts.filter((sh) => t - sh.t0 < 420);
  for (const [i, segs] of anim.tracks) if (!tracksBusy(segs, t)) anim.tracks.delete(i);
  for (let r = 0; r < SIZE; r++) {
    // Sea current: the row slides one cell right (the wrapped cell enters from the left edge).
    const sh = anim.shifts.find((x) => x.row === r);
    const dx = sh ? -(1 - easeBack(Math.max(0, (t - sh.t0) / 420))) * cell : 0;
    if (dx) { g.save(); g.clip(bx, by + r * cell, board, cell); }
    for (let c = 0; c < SIZE; c++) {
      let [x, y] = cellCenter(lay, r, c);
      x += dx;
      const i = r * SIZE + c;
      const v = state.board[i];
      if (!v) continue;
      const segs = anim.tracks.get(i);
      if (segs) y = cellCenter(lay, segRow(segs, t, r), c)[1];
      let scale = 1;
      const pop = anim.pops.find((p) => p.r === r && p.c === c);
      if (pop) {
        const k = (t - pop.t0) / 220;
        scale = k < 1 ? 1 + 0.16 * Math.sin(k * Math.PI) : 1;
      }
      const alpha = 1 - overK * 0.65;
      const sp = state.special && state.special[i];
      if (v === L.SPECIAL && sp) {
        if (sp.kind === 'boss' || sp.kind === 'void') continue; // boss: drawn whole by drawBoss
        // An obstacle: it may be arriving (dropped from above, grown, or gliding from another cell).
        const drop = anim.drops.get(i);
        if (drop) {
          const k = (t - drop.t0) / drop.dur;
          if (k >= 1.4) anim.drops.delete(i);
          else if (drop.from && k < 0) [x, y] = cellCenter(lay, drop.from[0], drop.from[1]);
          else if (k < 0) continue;
          else if (drop.from) {
            const [fx, fy] = cellCenter(lay, drop.from[0], drop.from[1]);
            const e = easeOut(Math.min(1, k));
            if (drop.hop) scale *= k < 0.5 ? 1 - k * 2 : Math.min(1, (k - 0.5) * 2);
            if (drop.hop && k < 0.5) { x = fx; y = fy; } else if (!drop.hop) { x = fx + (x - fx) * e; y = fy + (y - fy) * e; }
          } else if (drop.grow || drop.kind === 'mushroom') scale *= k < 1 ? 0.3 + 0.7 * easeBack(k) : 1;
          else if (k < 1) y = lay.by - cell * 1.5 + (y - lay.by + cell * 1.5) * k * k;
          else scale *= 1 + 0.12 * Math.sin(Math.min(1, (k - 1) / 0.4) * Math.PI);
        }
        drawSpecial(g, sp, x, y, cell, alpha, scale, t);
        continue;
      }
      // Cells the dragged piece would clear take its color.
      const fam = preview && ghost && preview.has(i) ? ghost.piece.color : v;
      drawBlock(g, th, x, y, cell, th.palette[fam] || th.ink, alpha, scale, state.bonus[i], fam);
    }
    if (dx) g.restore();
  }
  anim.pops = anim.pops.filter((p) => t - p.t0 < 240);
  if (state.stage && state.stage.goal.type === 'boss') drawBoss(g, lay, state, t, 1 - overK * 0.65, ghost);

  if (ghost) {
    const b = ghost.piece.bonus;
    for (const [r, c] of ghost.piece.cells) {
      const [x, y] = cellCenter(lay, ghost.row + r, ghost.col + c);
      drawBlock(g, th, x, y, cell, th.palette[ghost.piece.color] || th.ink, 0.35, 1, b && b.r === r && b.c === c ? b.type : null, ghost.piece.color);
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
  const g = dragGeometry(lay, state.board, piece, drag.x + (drag.ox || 0), drag.y + (drag.oy || 0), drag.lift, easeOut((t - drag.t0) / 110), freeTray(state));
  return g.valid ? { ...g, piece } : null;
}

// ---------- clear effects (render/effects.js) ----------
export function drawFades(g: G, th: Theme, lay: Layout, t: number) {
  anim.fades = anim.fades.filter((f) => t - f.t0 - f.delay < 320);
  for (const f of anim.fades) {
    const k = (t - f.t0 - f.delay) / 320;
    const [x, y0] = cellCenter(lay, f.r, f.c);
    const y = f.segs && k < 0 ? cellCenter(lay, segRow(f.segs, t, f.r), f.c)[1] : y0;
    if (f.kind) {
      drawSpecial(g, { kind: f.kind, hp: 1 }, x, y, lay.cell, k < 0 ? 1 : 1 - k, k < 0 ? 1 : 1.1 - easeOut(k), t);
      continue;
    }
    const color = th.palette[f.color] || th.ink;
    if (k < 0) { drawBlock(g, th, x, y, lay.cell, color, 1, 1, null, f.color); continue; }
    drawBlock(g, th, x, y, lay.cell, k < 0.25 ? '#ffffff' : color, 1 - k, 1.1 - easeOut(k));
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
    const free = freeTray(state);
    const [tx, ty] = slotCenter(lay, p.idx, free);
    drawPiece(g, th, state.tray[p.idx]!, p.x + (tx - p.x) * k, p.y + (ty - p.y) * k, p.size + (miniCell(lay, free) - p.size) * k);
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
  // Puzzle surprise: smaller pads on two rows, one per piece of the quota, and no "next" column.
  const free = freeTray(state);
  const m = miniCell(lay, free);
  if (!free) drawNext(g, th, lay, state, t);
  const n = free || 3;
  const gap = free ? 3 : 6;
  for (let i = 0; i < n; i++) {
    const b = slotBox(lay, i, free);
    drawTrayPad(g, th, b.x + 4, b.y + gap, b.w - 8, b.h - gap * 2);
  }
  // While Toupie runs (and always in Chill and puzzles), a tap turns the piece: the pads breathe (not in Chill / puzzles).
  const canTurn = state.effects.rotate > 0 && !state.over;
  for (let i = 0; i < n; i++) {
    const piece = state.tray[i];
    if (!piece || anim.returning.some((p) => p.idx === i)) continue;
    const [cx, cy] = slotCenter(lay, i, free);
    if (canTurn) {
      const b = slotBox(lay, i, free);
      g.rrect(b.x + 6, b.y + 4, b.w - 12, b.h - 8, 16, withAlpha(th.accent, 0.06 + 0.04 * Math.sin(t / 250 + i)));
    }
    if (drag && drag.idx === i) continue;
    // A new piece slides in from the next column.
    const k = easeBack((t - anim.slotIn[i]) / 380);
    const offset = free ? 0 : (1 - k) * (lay.nextX + lay.nextW / 2 - cx);
    const fits = L.pieceFits(state, piece);
    const spin = anim.slotSpin[i] ? 1 - easeBack((t - anim.slotSpin[i]) / 260) : 0;
    g.save();
    g.translate(cx + offset, cy);
    g.rotate(-spin * Math.PI / 2);
    drawPiece(g, th, piece, 0, 0, m, fits ? 1 : 0.28);
    g.restore();
  }
}

// Narrow column right of the tray: the piece that fills the next emptied slot. A dashed preview box
// with a label chip on its top edge, so it never reads as a 4th playable pad.
function drawNext(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  if (tutActive()) return;
  const { nextX, nextW, ty, trayH } = lay;
  const x = nextX + 6, w = nextW - 8;
  const h = Math.min(trayH - 28, w * 1.35);
  const y = ty + (trayH - h) / 2 + 6;
  const r = Math.min(14, th.frame.r);
  // On the theme's score-plate colors (made to read on its background), half see-through so it stays
  // lighter than the three playable pads; the chip wears the combo tag colors.
  g.rrect(x, y, w, h, r, th.plate.fill, { alpha: 0.55 });
  g.rrect(x, y, w, h, r, th.plate.ink, { stroke: { width: 2, dash: [5, 5] }, alpha: 0.6 });
  const label = tr('SUIVANT');
  const size = g.fit(label, 10, w - 6);
  const cw = Math.min(w + 4, g.textWidth(label, size) + 14);
  const cx = x + w / 2;
  g.rrect(cx - cw / 2, y - 9, cw, 18, 9, th.tag.fill, { shadow: { color: th.shadow, blur: 6, dy: 2 } });
  g.text(label, cx + 0.5, y + size * 0.36, size, th.tag.ink, 'center');
  const piece = state.next;
  if (!piece) return;
  // Puzzle: how many more pieces are still to come after the next one.
  const more = state.puzzle ? state.puzzle.queue.length - 1 : 0;
  if (more > 0) g.text('+' + more, cx, y + h + 18, 15, withAlpha(th.ink, 0.75), 'center');
  const s = Math.min(miniCell(lay) * 0.62, (w - 12) / Math.max(piece.w, piece.h, 3));
  const k = easeOut((t - anim.nextIn) / 320);
  drawPiece(g, th, piece, cx, y + h / 2 + 4 + (1 - k) * 20, s, 0.9 * k);
}

// ---------- score band (render/hud.js hudBand / drawHUD) ----------
interface Flag { beaten: boolean; fall: number; s: number; label: string; size: number; fw: number; room: number }

// Free runs: a pennant planted in the band's left end, carrying the record the run started with.
function recordFlag(g: G, lay: Layout, state: RunState, t: number): Flag | null {
  if (!keepsBest(state) || !(anim.bestAtStart > 0) || tutActive()) return null;
  const beaten = state.score > anim.bestAtStart;
  const s = lay.band.h;
  const label = fmt(anim.bestAtStart);
  const size = g.fit(label, Math.round(s * 0.3), lay.band.w * 0.3);
  const fw = g.textWidth(label, size) + s * 0.36;
  return { beaten, fall: flagFall(beaten, anim.flagDownAt, t), s, label, size, fw, room: 16 + fw + s * 0.16 + 6 };
}

// The score band: the pennant on its left (or, in Aventure with a move limit, the moves left), the
// score or goal progress in the middle of what is left.
function hudBand(g: G, lay: Layout, state: RunState, t: number) {
  const { x, y, h } = lay.band;
  const w = lay.band.w - cuboRoom(anim.mascot, lay, state); // the band stops short of Cubo
  const flag = recordFlag(g, lay, state, t);
  const movesW = state.stage && !state.stage.clock ? Math.round(h * 1.15) : 0;
  const flagW = flag ? flag.room * (1 - flag.fall) : movesW;
  return { x, y, w, h, flag, movesW, cx: x + flagW + (w - flagW) / 2, cw: w - flagW - 28 };
}

export function drawHUD(g: G, th: Theme, lay: Layout, state: RunState, best: number, t: number) {
  if (tutActive()) return;
  anim.displayScore += (state.score - anim.displayScore) * 0.18;
  if (Math.abs(state.score - anim.displayScore) < 0.5) anim.displayScore = state.score;
  const p = th.plate;
  const band = hudBand(g, lay, state, t);
  const { x, y, w, h, flag, cx, cw } = band;
  const bump = state.score !== Math.round(anim.displayScore) ? 1.05 : 1;
  drawPlate(g, th, x, y, w, h, t);
  // While the pennant stands in the band, it carries the record. Once the score is the record,
  // showing it again above would only repeat the big number.
  let sub = tr('SCORE');
  if (best > state.score && !(flag && flag.fall < 1)) sub = tr('RECORD ') + fmt(best);
  else if (flag && flag.beaten) sub = tr('NOUVEAU RECORD');
  let main = fmt(Math.round(anim.displayScore));
  let lowMoves = false;
  // Aventure: the goal progress and the moves left instead of score / record.
  const stage = state.stage;
  if (state.puzzle) {
    main = `${state.puzzle.placed} / ${state.puzzle.total}`;
    sub = puzzleLabel(state.puzzle).toUpperCase();
  } else if (stage) {
    const progress = stage.goal.type === 'score' ? Math.round(anim.displayScore) : stage.progress;
    main = fmt(Math.min(progress, stage.goal.target)) + ' / ' + fmt(stage.goal.target);
    sub = LV.goalLabel(stage.goal);
    lowMoves = !stage.clock && stage.movesLeft <= 3 && !state.over;
  }
  const subSize = g.fit(sub, 11, cw);
  g.text(sub, cx, y + h * 0.34 + subSize * 0.35, subSize, p.sub, 'center');
  if (stage && band.movesW) {
    // Moves left: same label-over-number shape as the goal, split off by a hairline.
    const mx = x + 10 + band.movesW / 2;
    const label = stage.movesLeft > 1 ? tr('COUPS') : tr('COUP');
    const ls = g.fit(label, 11, band.movesW - 8);
    g.text(label, mx, y + h * 0.34 + ls * 0.35, ls, p.sub, 'center');
    const num = String(stage.movesLeft);
    const a0 = g.alpha;
    g.alpha = a0 * (lowMoves ? 0.7 + 0.3 * Math.sin(t / 120) : 1);
    g.text(num, mx, y + h - h * 0.14, g.fit(num, Math.round(h * 0.46), band.movesW - 8), lowMoves ? th.danger : p.ink, 'center');
    g.alpha = a0 * 0.25;
    g.rect(x + 10 + band.movesW, y + h * 0.2, 1.5, h * 0.6, p.sub);
    g.alpha = a0;
  }
  if (stage && stage.goal.type === 'boss') drawBossBar(g, state, cx - cw / 2 - 14, y, cw + 28, h, t);
  else {
    if (p.glow) g.textGlow = { color: p.glow, blur: 12 };
    g.text(main, cx, y + h - h * 0.14, g.fit(main, Math.round(h * (stage || state.puzzle ? 0.46 : 0.56) * bump), cw), p.ink, 'center');
    g.textGlow = null;
  }
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

// Cubo, standing at the right end of the score band, on the board frame's corner (legacy drawCubo(t)).
// asleep: a sheet is open over the game. wear: the equipped wardrobe piece.
export function drawMascot(g: G, th: Theme, lay: Layout, state: RunState, drag: DragState | null, asleep: boolean, wear: string, t: number) {
  if (!anim.mascot || tutActive()) return;
  const mood = cuboMoodAt(t, cuboBaseMood(state, asleep, !!drag));
  drawCubo(g, t, cuboSpot(lay, state), cuboLookFor(th.id, wear), mood, { calm: anim.calm, look: drag ? { x: drag.x, y: drag.y } : null, ink: th.ink });
}

// ---------- combo feel (render/hud.js, render/effects.js, render/loop.js) ----------
// Combo: small pill hung from the band's bottom edge, over the frame's top margin. Drawn after the
// board so the frame never covers it. Pops when it grows, drops away when it breaks.
export function drawComboHang(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  if (tutActive()) return;
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
  const glow = tier >= 2 ? { color: tierHex(tier, t, th.accent), blur: 8 + 6 * tier } : tag.glow ? { color: tag.glow, blur: 10 } : undefined;
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
  const iconSize = lay.cell * 0.9;
  const shift = banner.icon ? (iconSize + 10) / 2 : 0;
  const outline = { color: withAlpha(th.base, 0.95), width: 10 };
  if (tier >= 3) {
    // Rainbow sliding across the letters.
    const colors = [0, 1, 2, 3, 4].map((i) => hslToHex((Math.round(t / 4) + i * 70) % 360, 92, 58));
    g.text(banner.text, shift, 0, size, colors[0], 'center', outline, { colors, x0: shift - textW / 2, x1: shift + textW / 2 });
  } else {
    g.text(banner.text, shift, 0, size, tier ? tierHex(tier, t, th.accent) : banner.gold ? th.accent : th.ink, 'center', outline);
  }
  if (banner.icon) drawIcon(g, banner.icon, shift - textW / 2 - 10 - iconSize / 2, -lay.cell * 0.32, iconSize);
  if (banner.sub) {
    const subSize = g.fit(banner.sub, Math.round(lay.cell * 0.5), maxW);
    const subW = g.textWidth(banner.sub, subSize);
    const subShift = banner.subIcon ? -lay.cell * 0.25 : 0;
    g.text(banner.sub, subShift, lay.cell * 0.7, subSize, th.accent, 'center', { color: withAlpha(th.base, 0.95), width: 6 });
    if (banner.subIcon) drawIcon(g, banner.subIcon, subShift + subW / 2 + lay.cell * 0.3, lay.cell * 0.55, lay.cell * 0.45);
  }
  g.restore();
  g.alpha = a0;
}

// ---------- bonuses, bin, hints (render/board.js, ui/inventory.js, css/hud.css) ----------
// Chrono: time bar in the gap between the board and the tray.
export function drawChrono(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  if (!hasClock(state)) return;
  const timed = state.stage && state.stage.clock;
  const clockMax = timed ? state.stage!.clock! : (L.LEVELS[state.level] || L.LEVELS.normal).clockMax;
  const [x, y] = chronoBar(lay);
  const secs = Math.ceil(state.clock / 1000);
  const low = state.clock < 10000 && !state.over;
  const a = g.alpha;
  g.alpha = a * (low ? 0.65 + 0.35 * Math.sin(t / 90) : 1);
  g.text(Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'), x, y + 1 + 16 * 0.35, 16, low ? th.danger : th.ink, 'left');
  g.alpha = a;
  const labelW = 44;
  const bw = lay.board - labelW;
  g.rrect(x + labelW, y - 4, bw, 8, 4, 'rgba(0,0,0,0.3)');
  g.rrect(x + labelW, y - 4, Math.max(8, bw * Math.min(1, state.clock / clockMax)), 8, 4, low ? th.danger : th.accent);
}

// The instruction line between the board and the tray.
export function drawHint(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  const hint = hintText(state, anim.aiming);
  if (!hint) return;
  const size = hasClock(state) ? 13 : 15;
  const a = g.alpha;
  g.alpha = a * (0.7 + 0.3 * Math.sin(t / 200));
  g.text(hint.text, lay.W / 2, hintY(lay, hasClock(state)) + size * 0.35, size, hint.danger ? th.danger : th.accent, 'center');
  g.alpha = a;
}

// Bomb aiming: the board dims, the blast area pulses where the finger is.
export function drawAim(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  const aim = anim.aiming;
  if (!aim) return;
  const { cell } = lay;
  g.rrect(lay.bx - 10, lay.by - 10, lay.board + 20, lay.board + 20, th.frame.r, 'rgba(0,0,0,0.35)');
  if (!aim.cell) return;
  const [r0, c0] = aim.cell;
  const pulse = 0.35 + 0.15 * Math.sin(t / 80);
  for (const [r, c] of L.bombArea(r0, c0, L.upLevel(state, 'bomb'))) {
    const [x, y] = cellCenter(lay, r, c);
    g.rrect(x - cell * 0.46, y - cell * 0.46, cell * 0.92, cell * 0.92, cell * 0.18, '#ff5d73', { alpha: pulse });
  }
  if (aim.drag) return;
  const [x, y] = cellCenter(lay, r0, c0);
  drawIcon(g, 'bomb', x, y, cell * 0.8);
}

// Icons flying from their cell to the wallet or their inventory button (landing: game/run.ts).
export function drawFlyers(g: G, lay: Layout, t: number) {
  for (const f of anim.flyers) {
    const k = (t - f.t0) / 650;
    if (k < 0) continue;
    const [tx, ty] = f.coins ? walletTarget(lay) : invCenter(lay, f.type as InvBox['id']);
    const e = easeOut(k);
    const x = f.x + (tx - f.x) * e;
    const y = f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * lay.cell * 1.5;
    drawIcon(g, f.type, x, y, lay.cell * (0.8 - 0.3 * k));
  }
}

// The bonus bar under the tray: five buttons with their count, timer ring, and a legend button.
export function drawInventory(g: G, th: Theme, lay: Layout, state: RunState, t: number) {
  if (!hasInventory(state) || tutActive()) return;
  const aiming = anim.aiming !== null;
  const a0 = g.alpha;
  for (const b of invBoxes(lay)) {
    if (b.id === 'legend') {
      // Score-plate colors, so the help button reads on every background and apart from the bonuses.
      g.rrect(b.x, b.y, b.w, b.h, Math.min(b.w, b.h) / 2, th.plate.fill, { shadow: { color: th.shadow, blur: 10, dy: 3 } });
      if (th.plate.line) g.rrect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, Math.min(b.w, b.h) / 2 - 1, th.plate.line, { stroke: { width: 2 } });
      g.text('?', b.x + b.w / 2, b.y + b.h / 2 + 26 * 0.36, 26, th.plate.ink, 'center');
      continue;
    }
    const v = invView(state, b.id, aiming);
    const help = v.help ? 0.5 - 0.5 * Math.cos((t / 700) * Math.PI * 2) : 0;
    const y = b.y - 4 * help;
    const cx = b.x + b.w / 2, cy = y + b.h / 2;
    if (v.active) {
      // Timer ring: drains clockwise from the top.
      const left = ringFill(state, b.id);
      g.alpha = a0 * (ringEnding(state, b.id) ? 0.65 + 0.35 * Math.sin(t / 95) : 1);
      g.path().arc(cx, cy, 28.5, 0, Math.PI * 2).stroke('rgba(74,58,102,0.14)', 3);
      g.path().arc(cx, cy, 28.5, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2).stroke(th.accent, 3, { cap: 'round' });
      g.alpha = a0;
    }
    g.alpha = a0 * (v.empty ? 0.6 : 1);
    if (v.empty) g.rrect(b.x + 0.75, y + 0.75, b.w - 1.5, b.h - 1.5, 22, 'rgba(74,58,102,0.14)', { stroke: { width: 1.5 } });
    else {
      g.rrect(b.x, y, b.w, b.h, 22, v.aiming ? '#3a1d24' : th.board, { shadow: { color: 'rgba(0,0,0,0.18)', blur: 12, dy: 4 } });
      g.rrect(b.x + 0.75, y + 0.75, b.w - 1.5, b.h - 1.5, 22, v.aiming ? '#ff5d73' : 'rgba(74,58,102,0.14)', { stroke: { width: v.aiming ? 2.5 : 1.5 } });
    }
    if (help) g.rrect(b.x - 1.5, y - 1.5, b.w + 3, b.h + 3, 24, th.accent, { stroke: { width: 3 }, alpha: help });
    g.alpha = a0 * (v.empty ? 0.3 : 1);
    drawIcon(g, b.id, cx, cy, 30);
    g.alpha = a0;
    if (!v.empty) {
      const label = String(v.count);
      const w = Math.max(21, g.textWidth(label, 15) + 10);
      g.rrect(b.x + b.w + 6 - w, y - 6, w, 21, 6, th.accent, { shadow: { color: 'rgba(0,0,0,0.35)', blur: 6, dy: 2 } });
      g.text(label, b.x + b.w + 6 - w / 2, y - 6 + 15.5, 15, '#ffffff', 'center');
    }
  }
}

// The bin, under the tray while a piece is held: fills while hovered, red once armed.
export function drawTrash(g: G, th: Theme, lay: Layout, state: RunState, coins: number, t: number) {
  const tr_ = anim.trash;
  if (!tr_ || state.mode === 'puzzle') return;
  const view = trashView(state, coins);
  const b = trashBox(lay);
  const hot = tr_.over && !view.broke;
  const armed = hot && tr_.armed;
  const a0 = g.alpha;
  g.alpha = a0 * (view.broke ? 0.55 : 1);
  g.save();
  if (armed) {
    g.translate(b.x + b.w / 2, b.y + b.h / 2);
    g.scale(1.06);
    g.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
  }
  g.rrect(b.x, b.y, b.w, b.h, 22, armed ? '#ff5d73' : 'rgba(74,58,102,0.1)');
  if (hot && !armed) {
    const fill = trashFill(t - tr_.since, TRASH_ARM_MS);
    g.save();
    g.clip(b.x, b.y, b.w * fill, b.h);
    g.rrect(b.x, b.y, b.w, b.h, 22, 'rgba(255,93,115,0.35)');
    g.restore();
  }
  g.rrect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 21, hot ? '#ff5d73' : 'rgba(74,58,102,0.14)', { stroke: { width: hot ? 2.5 : 2 } });
  const ink = armed ? '#ffffff' : th.ink;
  const label = trashLabel(view, armed);
  const size = g.fit(label, 19, b.w * 0.5);
  const costText = String(view.cost);
  const lw = g.textWidth(label, size);
  const cw = g.textWidth(costText, 19) + 6 + 19;
  const total = 22 + 10 + lw + 10 + cw;
  let x = b.x + (b.w - total) / 2;
  const cy = b.y + b.h / 2;
  g.save();
  g.translate(x, cy - 11);
  g.scale(22 / 24);
  g.path().moveTo(4, 7).lineTo(20, 7).moveTo(9, 7).lineTo(9, 4).lineTo(15, 4).lineTo(15, 7)
    .moveTo(6, 7).lineTo(7, 20).lineTo(17, 20).lineTo(18, 7).moveTo(10, 11).lineTo(10, 17).moveTo(14, 11).lineTo(14, 17)
    .stroke(ink, 2.2, { cap: 'round', join: 'round' });
  g.restore();
  x += 22 + 10;
  g.text(label, x, cy + size * 0.35, size, ink, 'left');
  x += lw + 10;
  g.text(costText, x, cy + 19 * 0.35, 19, armed ? '#ffffff' : th.accent, 'left');
  drawIcon(g, 'coin', x + g.textWidth(costText, 19) + 6 + 9.5, cy, 19);
  g.restore();
  g.alpha = a0;
}
