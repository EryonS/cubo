// Cubo Blocks — HUD: score band, record pennant, combo tag and glow, line sweeps.
'use strict';

// The score band above the board: the record pennant on its left, the score in the middle,
// and Cubo standing on the frame at its right end (the band stops short of him).
function hudBand(t) {
  const { x, y, h } = lay.band;
  const cuboRoom = settings.mascot && !state.puzzle && !tut ? cuboSpot().s + 16 : 0;
  const w = lay.band.w - cuboRoom;
  const flag = recordFlag(t);
  // Aventure with a move limit: the moves left get their own column at the band's left end.
  const movesW = state.stage && !state.stage.clock ? Math.round(h * 1.15) : 0;
  const flagW = flag ? flag.room * (1 - flag.fall) : movesW;
  return { x, y, w, h, flag, movesW, cx: x + flagW + (w - flagW) / 2, cw: w - flagW - 28 };
}

function drawHUD(t) {
  if (tut) return;
  displayScore += (state.score - displayScore) * 0.18;
  if (Math.abs(state.score - displayScore) < 0.5) displayScore = state.score;
  const th = theme();
  const p = th.plate;
  const band = hudBand(t);
  const { x, y, w, h, cx, cw } = band;
  const bump = state.score !== Math.round(displayScore) ? 1.05 : 1;

  drawPlate(ctx, p, x, y, w, h, t);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Aventure: the band shows the goal progress and the moves left instead of score / record.
  const stage = state.stage;
  // While the record pennant stands in the band, it carries the record. Once the score is
  // the record, showing it again above would only repeat the big number.
  let sub = tr('SCORE');
  if (best > state.score && !(band.flag && band.flag.fall < 1)) sub = tr('RECORD ') + fmt(best);
  else if (band.flag && band.flag.beaten) sub = tr('NOUVEAU RECORD');
  let main = fmt(Math.round(displayScore));
  let lowMoves = false;
  if (state.puzzle) {
    main = `${state.puzzle.placed} / ${state.puzzle.total}`;
    sub = `${puzzleTitle(state.puzzle).toUpperCase()} · ${state.puzzle.name.toUpperCase()}`;
  } else if (stage) {
    const progress = stage.goal.type === 'score' ? Math.round(displayScore) : stage.progress;
    main = fmt(Math.min(progress, stage.goal.target)) + ' / ' + fmt(stage.goal.target);
    sub = LV.goalLabel(stage.goal);
    lowMoves = !stage.clock && stage.movesLeft <= 3 && !state.over;
  }
  ctx.fillStyle = p.sub;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
  fitFont(th, 11, sub, cw);
  ctx.fillText(sub, cx, y + h * 0.34);
  if (band.movesW) {
    // Moves left: same label-over-number shape as the goal, split off by a hairline.
    const mx = x + 10 + band.movesW / 2;
    const label = stage.movesLeft > 1 ? tr('COUPS') : tr('COUP');
    fitFont(th, 11, label, band.movesW - 8);
    ctx.fillText(label, mx, y + h * 0.34);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = lowMoves ? th.danger : p.ink;
    ctx.globalAlpha = lowMoves ? 0.7 + 0.3 * Math.sin(t / 120) : 1;
    fitFont(th, Math.round(h * 0.46), String(stage.movesLeft), band.movesW - 8);
    ctx.fillText(String(stage.movesLeft), mx, y + h - h * 0.14);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = p.sub;
    ctx.fillRect(x + 10 + band.movesW, y + h * 0.2, 1.5, h * 0.6);
    ctx.globalAlpha = 1;
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  if (stage && stage.goal.type === 'boss') drawBossBar(th, cx - cw / 2 - 14, y, cw + 28, h, t);
  else {
    ctx.save();
    if (p.glow) { ctx.shadowColor = p.glow; ctx.shadowBlur = 12; }
    ctx.fillStyle = p.ink;
    fitFont(th, Math.round(h * (stage || state.puzzle ? 0.46 : 0.56) * bump), main, cw);
    ctx.fillText(main, cx, y + h - h * 0.14);
    ctx.restore();
  }
}

// Combo: small pill hung from the band's bottom edge, over the frame's top margin.
// Drawn after the board so the frame never covers it. Pops when it grows, drops away when it breaks.
function drawComboHang(t) {
  if (tut) return;
  const th = theme();
  const band = hudBand(t);
  const tagY = band.y + band.h - 4;
  if (state.combo > 0) {
    const left = L.COMBO_GRACE - state.movesSinceClear;
    const pulse = left === 1 ? 0.55 + 0.45 * Math.abs(Math.sin(t / 180)) : 1;
    const pop = calm() || !comboAt ? 0 : 1 - easeOut((t - comboAt) / 420);
    drawComboTag(th, state.combo, left, tagY, pulse, 1 + 0.45 * pop, 0, false, t, band.cx);
  } else if (comboBreak && !calm()) {
    const k = (t - comboBreak.t0) / 700;
    if (k >= 1) comboBreak = null;
    else drawComboTag(th, comboBreak.n, 0, tagY + k * k * lay.cell * 1.6, 1 - k, 1 - 0.2 * k, 0.3 * k, true, t, band.cx);
  }
}

// Free runs: a pennant planted in the score band's left end, carrying the record the run
// started with. It waves harder in the last 10 %, and topples over once the record is beaten;
// the score then slides back to the band's middle.
let flagDownAt = 0;
function recordFlag(t) {
  if (!keepsBest() || !(bestAtStart > 0) || tut) return null;
  const beaten = state.score > bestAtStart;
  const fall = beaten ? (flagDownAt ? Math.min(1, (t - flagDownAt) / 700) : 1) : 0;
  const s = lay.band.h;
  const label = fmt(bestAtStart);
  fitFont(theme(), Math.round(s * 0.3), label, lay.band.w * 0.3);
  const fw = ctx.measureText(label).width + s * 0.36;
  return { beaten, fall, s, label, font: ctx.font, fw, room: 16 + fw + s * 0.16 + 6 };
}

function drawRecordFlag(t) {
  const band = hudBand(t);
  const f = band.flag;
  if (!f || f.fall >= 1) return;
  const th = theme();
  const { s, fw, fall } = f;
  const x = band.x + 16;
  const y = band.y + band.h - s * 0.14;
  const h = s * 0.7;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(fall * fall * 1.5); // topples toward the score
  ctx.globalAlpha = 1 - fall;
  // Pole and its little base.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(0, 1, s * 0.12, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = th.plate.sub; ctx.lineWidth = Math.max(2, s * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
  ctx.fillStyle = th.tag.fill;
  ctx.beginPath(); ctx.arc(0, -h, s * 0.06, 0, Math.PI * 2); ctx.fill();
  // Pennant: width from the label, a wave running along it.
  const fh = s * 0.4;
  const close = !f.beaten && state.score >= bestAtStart * 0.9;
  const amp = calm() ? 0 : s * (close ? 0.06 : 0.03);
  const speed = close ? 110 : 260;
  const top = -h + s * 0.05;
  const wave = (k) => Math.sin(t / speed - k * 3) * amp * k;
  ctx.save();
  if (th.tag.glow) { ctx.shadowColor = th.tag.glow; ctx.shadowBlur = 8; }
  ctx.beginPath();
  ctx.moveTo(0, top);
  for (let k = 0; k <= 1; k += 0.1) ctx.lineTo(fw * k, top + wave(k));
  ctx.lineTo(fw + s * 0.16, top + fh / 2 + wave(1)); // swallowtail point
  for (let k = 1; k >= 0; k -= 0.1) ctx.lineTo(fw * k, top + fh + wave(k));
  ctx.closePath();
  ctx.fillStyle = th.tag.fill;
  ctx.fill();
  ctx.restore();
  ctx.font = f.font;
  ctx.fillStyle = th.tag.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(f.label, s * 0.18, top + fh / 2 + wave(0.3) + 1);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
}

// Sets ctx.font to the theme font at `size`, smaller if `text` would be wider than maxW
// (wide pixel fonts, big goals on a narrow phone).
function fitFont(th, size, text, maxW) {
  ctx.font = themeFont(th, size);
  const w = ctx.measureText(text).width;
  if (w > maxW) ctx.font = themeFont(th, Math.max(6, Math.floor(size * maxW / w)));
}

function drawComboTag(th, combo, left, ty, alpha, scale, rot, broken, t, mid = W / 2) {
  const tag = th.tag;
  const tier = broken ? 0 : comboTier(combo);
  const label = tr('COMBO ×') + combo;
  ctx.font = themeFont(th, 17);
  const tw = ctx.measureText(label).width + 20 + L.COMBO_GRACE * 11 + 8;
  const tx = mid - tw / 2;
  ctx.save();
  ctx.translate(mid, ty + 12.5);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.translate(-mid, -(ty + 12.5));
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
