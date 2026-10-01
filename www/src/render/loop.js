// Cubo Blocks — Frame loop and timers.
'use strict';

// ---------- render ----------
let last = now();
// Timed bonuses drain as a ring around their inventory button.
function syncTimers() {
  for (const [type, btn] of Object.entries(invButtons)) {
    const ms = state.effects[type] || 0;
    if (!ms && !btn.style.getPropertyValue('--left')) continue;
    btn.style.setProperty('--left', ms ? Math.min(1, ms / L.effectMs(state, type)).toFixed(3) : '');
    btn.classList.toggle('ending', ms > 0 && ms < 5000);
  }
}

// Timers (bonuses, chrono) only run while actually playing.
const pausedByUi = () => document.querySelector('.overlay.show') !== null;

function frame() {
  const t = now();
  syncTimers();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  // Bonus timers only run while actually playing.
  if (!pausedByUi()) {
    const ticked = L.tick(state, dt * 1000);
    if (ticked !== state) {
      const wasOver = state.over;
      state = ticked;
      if (state.over && !wasOver) endGame(t);
      renderInventory();
    }
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const decor = menuDecorShown();
  // Only write the class when it changes (overlay observers watch class writes).
  if (document.body.classList.contains('menu-decor') !== decor) document.body.classList.toggle('menu-decor', decor);
  if (decor) {
    const th = menuTheme();
    ctx.drawImage(menuBackground(), 0, 0, W, H);
    if (th.animate) th.animate(ctx, W, H, t);
    requestAnimationFrame(frame);
    return;
  }
  ctx.drawImage(bgCanvas, 0, 0, W, H);
  if (theme().animate) theme().animate(ctx, W, H, t);

  shake = calm() ? 0 : shake * 0.86;
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;

  drawHUD(t);
  ctx.save();
  ctx.translate(sx, sy);
  const pk = punch ? (t - punch.t0) / 240 : 1;
  if (pk < 1) {
    const zoom = 1 + punch.amp * Math.sin(Math.PI * pk);
    const cx = lay.bx + lay.board / 2;
    const cy = lay.by + lay.board / 2;
    ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
  } else punch = null;
  drawBoard(t);
  drawComboGlow(t);
  if (tut) drawTutorialCells(t);
  drawFades(t);
  drawSweeps(t);
  if (aiming) drawAim(t);
  ctx.restore();
  drawRecordFlag(t);
  drawCubo(t);
  drawTray(t);
  drawChrono(t);
  drawHint(t);
  drawReturning(t);
  drawParticles(t, dt);
  drawFloaters(t);
  drawFlyers(t);
  drawBanner(t);
  if (drag) {
    const g = dragGeometry(drag, t);
    drawPiece(g.piece, g.cx, g.cy, g.size, 1);
  }
  if (aiming && aiming.drag) drawIcon('bomb', aiming.x, aiming.y - aiming.lift, lay.cell * 1.1);
  drawTutorialHand(t);
  pumpTips();
  requestAnimationFrame(frame);
}
