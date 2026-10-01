// Cubo Blocks — HUD: score plate, record pennant, combo tag and glow, line sweeps.
'use strict';

function drawHUD(t) {
  if (tut) return;
  displayScore += (state.score - displayScore) * 0.18;
  if (Math.abs(state.score - displayScore) < 0.5) displayScore = state.score;
  const th = theme();
  const p = th.plate;
  let pw = Math.min(lay.board * 0.62, 244);
  if (lay.compact) {
    // Fit between the wallet and the right HUD buttons.
    pw = Math.min(pw, hudGap());
  }
  const ph = lay.plateH;
  const px = W / 2 - pw / 2;
  const py = lay.plateY;
  const bump = state.score !== Math.round(displayScore) ? 1.05 : 1;

  drawPlate(ctx, p, px, py, pw, ph, t);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Aventure: the plate shows the goal progress and the moves left instead of score / record.
  const stage = state.stage;
  // While the record flag stands on the frame, it carries the record.
  let sub = best && !(bestAtStart > 0 && state.score <= bestAtStart) ? tr('RECORD ') + fmt(best) : tr('SCORE');
  let main = fmt(Math.round(displayScore));
  let lowMoves = false;
  if (state.puzzle) {
    main = `${state.puzzle.placed} / ${state.puzzle.total}`;
    sub = `${puzzleTitle(state.puzzle).toUpperCase()} · ${state.puzzle.name.toUpperCase()}`;
  } else if (stage) {
    const progress = stage.goal.type === 'score' ? Math.round(displayScore) : stage.progress;
    main = fmt(Math.min(progress, stage.goal.target)) + ' / ' + fmt(stage.goal.target);
    sub = LV.goalLabel(stage.goal) + (stage.clock ? '' : ' · ' + stage.movesLeft + (stage.movesLeft > 1 ? tr(' COUPS') : tr(' COUP')));
    lowMoves = !stage.clock && stage.movesLeft <= 3 && !state.over;
  }
  ctx.fillStyle = lowMoves ? th.danger : p.sub;
  ctx.globalAlpha = lowMoves ? 0.7 + 0.3 * Math.sin(t / 120) : 1;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
  fitFont(th, 12, sub, pw - 28);
  ctx.fillText(sub, W / 2, py + ph * 0.32);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;
  if (stage && stage.goal.type === 'boss') drawBossBar(th, px, py, pw, ph, t);
  else {
    ctx.save();
    if (p.glow) { ctx.shadowColor = p.glow; ctx.shadowBlur = 12; }
    ctx.fillStyle = p.ink;
    fitFont(th, Math.round(ph * (stage || state.puzzle ? 0.52 : 0.64) * bump), main, pw - 28);
    ctx.fillText(main, W / 2, py + ph - ph * 0.13);
    ctx.restore();
  }

  // Combo: small pill hung under the score. Pops when it grows, drops away when it breaks.
  const tagY = py + ph + 4;
  if (state.combo > 0) {
    const left = L.COMBO_GRACE - state.movesSinceClear;
    const pulse = left === 1 ? 0.55 + 0.45 * Math.abs(Math.sin(t / 180)) : 1;
    const pop = calm() || !comboAt ? 0 : 1 - easeOut((t - comboAt) / 420);
    drawComboTag(th, state.combo, left, tagY, pulse, 1 + 0.45 * pop, 0, false, t);
  } else if (comboBreak && !calm()) {
    const k = (t - comboBreak.t0) / 700;
    if (k >= 1) comboBreak = null;
    else drawComboTag(th, comboBreak.n, 0, tagY + k * k * lay.cell * 1.6, 1 - k, 1 - 0.2 * k, 0.3 * k, true, t);
  }
}

// Free runs: a pennant planted on the board frame's top-left corner, carrying the record the run
// started with. It waves harder in the last 10 %, and topples over once the record is beaten.
let flagDownAt = 0;
function drawRecordFlag(t) {
  if (!keepsBest() || !(bestAtStart > 0) || tut) return;
  const beaten = state.score > bestAtStart;
  const fall = beaten ? (flagDownAt ? Math.min(1, (t - flagDownAt) / 700) : 1) : 0;
  if (fall >= 1) return;
  const th = theme();
  const s = Math.max(34, Math.min(58, lay.cell * 1.15));
  const x = lay.bx + 8;
  const y = lay.by - 8;
  const h = s * 0.8; // low enough for the pennant to pass under the score plate
  const label = fmt(bestAtStart);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(fall * fall * 1.5); // topples toward the board
  ctx.globalAlpha = 1 - fall;
  // Pole and its little base.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(0, 1, s * 0.16, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = th.ink; ctx.globalAlpha *= 0.85; ctx.lineWidth = Math.max(2, s * 0.06); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
  ctx.globalAlpha = 1 - fall;
  ctx.fillStyle = th.tag.fill;
  ctx.beginPath(); ctx.arc(0, -h, s * 0.07, 0, Math.PI * 2); ctx.fill();
  // Pennant: width from the label, a wave running along it.
  // Never reach the combo tag hung in the middle: the label shrinks to fit the room left of it.
  const room = W / 2 - 74 - x;
  fitFont(th, Math.round(s * 0.3), label, room - s * 0.5);
  const fw = ctx.measureText(label).width + s * 0.36;
  const fh = s * 0.44;
  const close = !beaten && state.score >= bestAtStart * 0.9;
  const amp = calm() ? 0 : s * (close ? 0.07 : 0.035);
  const speed = close ? 110 : 260;
  const top = -h + s * 0.06;
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
  ctx.fillStyle = th.tag.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, s * 0.18, top + fh / 2 + wave(0.3) + 1);
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

function drawComboTag(th, combo, left, ty, alpha, scale, rot, broken, t) {
  const tag = th.tag;
  const tier = broken ? 0 : comboTier(combo);
  const label = tr('COMBO ×') + combo;
  ctx.font = themeFont(th, 17);
  const tw = ctx.measureText(label).width + 20 + L.COMBO_GRACE * 11 + 8;
  const tx = W / 2 - tw / 2;
  ctx.save();
  ctx.translate(W / 2, ty + 12.5);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -(ty + 12.5));
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
