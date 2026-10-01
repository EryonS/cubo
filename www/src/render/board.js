// Cubo Blocks — Board, hint, aim, tray, next piece and chrono bar.
'use strict';

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
      preview = state.mode === 'puzzle' ? null : L.previewClears(state.board, g.piece, g.row, g.col, state.special);
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
          else if (drop.from && k < 0) [x, y] = cellCenter(drop.from[0], drop.from[1]); // waits on its old cell
          else if (k < 0) continue; // not arrived yet
          else if (drop.from) {
            // Moving cell: glides (or blinks, for a jump) from its old cell.
            const [fx, fy] = cellCenter(drop.from[0], drop.from[1]);
            const e = easeOut(Math.min(1, k));
            if (drop.hop) scale *= k < 0.5 ? 1 - k * 2 : Math.min(1, (k - 0.5) * 2);
            if (drop.hop && k < 0.5) { x = fx; y = fy; } else if (!drop.hop) { x = fx + (x - fx) * e; y = fy + (y - fy) * e; }
          }
          else if (drop.grow || drop.kind === 'mushroom') scale *= k < 1 ? 0.3 + 0.7 * easeBack(k) : 1;
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
  if (aiming && aiming.drag) text = tr('Lâche la bombe sur la grille');
  else if (aiming) text = tr('Touche la grille pour viser · ailleurs pour annuler');
  else if (state.stuck) {
    const inv = state.inventory;
    if (inv.bomb > 0 || inv.reroll > 0 || inv.rotate > 0) text = tr('Bloqué ! Utilise un bonus ou termine la partie');
    else if (L.canUndo(state)) text = tr('Bloqué ! Annule ton coup ou jette une forme');
    else text = tr('Bloqué ! Maintiens une forme en bas pour la jeter');
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
      if (f.coins) { runCoinsShown += f.coins; renderWallet(); sfx.coin(2); haptic('coin'); }
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
  const free = freeTray();
  if (!free) drawNext(t);
  const n = free ? state.tray.length : 3;
  // Each slot sits on a pad in the board's color, so pieces read on any background.
  // Puzzle surprise: smaller pads on two rows, one per piece of the quota.
  const gap = free ? 3 : 6;
  for (let i = 0; i < n; i++) {
    const b = slotBox(i);
    drawTrayPad(b.x + 4, b.y + gap, b.w - 8, b.h - gap * 2);
  }
  for (let i = 0; i < n; i++) {
    const piece = state.tray[i];
    if (!piece || returning.some((p) => p.idx === i)) continue;
    const [cx, cy] = slotCenter(i);
    if (canTurn) {
      const b = slotBox(i);
      ctx.fillStyle = withAlpha(theme().accent, 0.06 + 0.04 * Math.sin(t / 250 + i));
      ctx.beginPath();
      ctx.roundRect(b.x + 6, b.y + 4, b.w - 12, b.h - 8, 16);
      ctx.fill();
    }
    if (drag && drag.idx === i) continue;
    const k = easeBack((t - slotIn[i]) / 380);
    const offset = free ? 0 : (1 - k) * (lay.nextX + lay.nextW / 2 - cx);
    const fits = L.pieceFits(state, piece);
    const spin = slotSpin[i] ? 1 - easeBack((t - slotSpin[i]) / 260) : 0;
    ctx.save();
    ctx.translate(cx + offset, cy);
    ctx.rotate(-spin * Math.PI / 2);
    drawPiece(piece, 0, 0, m, fits ? 1 : 0.28);
    ctx.restore();
  }
}

// A tray pad: the board slab's color, half see-through, with a hairline edge.
function drawTrayPad(x, y, w, h) {
  const th = theme();
  const r = Math.min(16, th.frame.r);
  ctx.save();
  // Half see-through and no shadow: it must not read as a second board.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = th.board;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = withAlpha(th.ink, 0.1);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
}

// Narrow column right of the tray: the piece that fills the next emptied slot.
function drawNext(t) {
  const { nextX, nextW, ty, trayH } = lay;
  if (tut) return;
  const th = theme();
  drawTrayPad(nextX + 4, ty + 6, nextW - 6, trayH - 12);
  ctx.fillStyle = withAlpha(th.ink, 0.72);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1px'; // before measuring: the spacing counts in the width
  fitFont(th, 11, tr('ENSUITE'), nextW - 20); // narrow phones: stays inside its pad
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tr('ENSUITE'), nextX + nextW / 2 + 1, ty + 20);
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
