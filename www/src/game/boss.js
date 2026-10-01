// Cubo Blocks — Boss fights (Aventure level 20).
'use strict';

// ---------- boss (Aventure level 20) ----------
// One 2x2 creature in the center: body in the world's tint, a face whose eyes follow the dragged
// piece, a white flash when hit, a squash when it strikes back, sweat under 30% hp.
const BOSS_LOOK = {
  plain: '#6cc94f', sea: '#9b6bff', space: '#62d6b4', ice: '#dff2ff',
  forest: '#a2703c', retro: '#306230', arcade: '#ff4fb8', volcano: '#ff5a2a', halloween: '#ff8a1a',
  newyear: '#5c6bff', lunar: '#d9262f', valentine: '#ff4d8f', easter: '#9b7bff', beach: '#ff6a4a', xmas: '#c8a27a',
};
let bossHitAt = 0;
let bossAttackAt = 0;
const bossCenter = () => [lay.bx + (L.BOSS_AT[1] + 1) * lay.cell, lay.by + (L.BOSS_AT[0] + 1) * lay.cell];
const bossLeft = () => (state.stage ? Math.max(0, state.stage.goal.target - state.stage.progress) : 0);

function drawBoss(t, alpha, ghost) {
  const stage = state.stage;
  const [cx, cy] = bossCenter();
  const size = lay.cell * 2 - lay.cell * 0.12;
  const hit = calm() ? 0 : Math.max(0, 1 - (t - bossHitAt) / 260);
  const atk = calm() ? 0 : Math.max(0, 1 - (t - bossAttackAt) / 420);
  const beaten = stage.won;
  const breathe = calm() || beaten ? 0 : Math.sin(t / 420) * 0.025;
  const sx = 1 + breathe + atk * 0.14 * Math.sin(atk * Math.PI);
  const sy = 1 - breathe - atk * 0.12 * Math.sin(atk * Math.PI);
  const wob = hit ? Math.sin(t / 22) * hit * lay.cell * 0.08 : 0;
  const base = BOSS_LOOK[stage.world] || '#9b6bff';
  ctx.save();
  ctx.globalAlpha = alpha * (beaten ? Math.max(0, 1 - (t - overAt) / 500) : 1);
  ctx.translate(cx + wob, cy + size / 2);
  ctx.scale(sx, sy);
  ctx.translate(0, -size / 2);
  const h = size / 2;
  // Body
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.roundRect(-h, -h + size * 0.06, size, size, size * 0.26); ctx.fill();
  const g = ctx.createLinearGradient(0, -h, 0, h);
  g.addColorStop(0, withAlpha('#ffffff', 0.35)); g.addColorStop(0.35, withAlpha('#ffffff', 0)); g.addColorStop(1, withAlpha('#000000', 0.18));
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
  // Eyes follow the dragged piece (or look down at the tray).
  const target = ghost ? cellCenter(ghost.row, ghost.col) : [cx, lay.ty];
  const ang = Math.atan2(target[1] - cy, target[0] - cx);
  const blink = calm() ? 1 : (t % 3200) < 120 ? 0.15 : 1;
  for (const side of [-1, 1]) {
    const ex = side * size * 0.2;
    const ey = -size * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.13, size * 0.15 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2140';
    ctx.beginPath(); ctx.arc(ex + Math.cos(ang) * size * 0.05, ey + Math.sin(ang) * size * 0.05 * blink, size * 0.065 * Math.max(0.3, blink), 0, Math.PI * 2); ctx.fill();
    // Angry brows
    ctx.strokeStyle = '#2b2140'; ctx.lineWidth = size * 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex - side * size * 0.13, ey - size * 0.22); ctx.lineTo(ex + side * size * 0.06, ey - size * 0.16); ctx.stroke();
  }
  // Mouth: grin, wide open when striking back, wobbly when hurt.
  ctx.fillStyle = '#2b2140';
  ctx.beginPath();
  if (atk > 0.2) ctx.ellipse(0, size * 0.2, size * 0.14, size * 0.11 * atk + size * 0.03, 0, 0, Math.PI * 2);
  else if (hit > 0) ctx.ellipse(0, size * 0.22, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
  else { ctx.moveTo(-size * 0.16, size * 0.16); ctx.quadraticCurveTo(0, size * 0.3, size * 0.16, size * 0.16); ctx.closePath(); }
  ctx.fill();
  // Low hp: a sweat drop.
  if (bossLeft() / stage.goal.target < 0.3 && !beaten) {
    ctx.fillStyle = '#7fd8ff';
    const dy = calm() ? 0 : ((t / 900) % 1) * size * 0.1;
    ctx.beginPath(); ctx.ellipse(size * 0.36, -size * 0.2 + dy, size * 0.05, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (hit) {
    ctx.globalAlpha *= hit * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
  }
  ctx.restore();
}

// Boss hp bar in the score plate, red and shaking right after a hit.
function drawBossBar(th, px, py, pw, ph, t) {
  const stage = state.stage;
  const max = stage.goal.target;
  const left = bossLeft();
  const hit = calm() ? 0 : Math.max(0, 1 - (t - bossHitAt) / 300);
  const bw = pw - 36;
  const bh = Math.round(ph * 0.26);
  const x = px + 18 + (hit ? Math.sin(t / 25) * 3 * hit : 0);
  const y = py + ph * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.roundRect(x, y, bw, bh, bh / 2); ctx.fill();
  if (left > 0) {
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, '#ff4d6d'); g.addColorStop(1, '#ff9f43');
    ctx.fillStyle = hit > 0.5 ? '#ffffff' : g;
    ctx.beginPath(); ctx.roundRect(x, y, Math.max(bh, bw * (left / max)), bh, bh / 2); ctx.fill();
  }
  ctx.font = themeFont(th, Math.round(bh * 0.8));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeText(tr`${left} / ${max} PV`, x + bw / 2, y + bh / 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(tr`${left} / ${max} PV`, x + bw / 2, y + bh / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

// Hits and strikes: flash, "-N", sounds; the last hit blows the boss up.
function bossEffects(ev, t) {
  const stage = state.stage;
  if (!stage || stage.goal.type !== 'boss') return;
  const hits = (ev.bossHits || []).length;
  const [cx, cy] = bossCenter();
  if (hits) {
    bossHitAt = t;
    floaters.push({ text: '-' + hits, x: cx, y: cy - lay.cell, t0: t, big: true, scale: 1.2, tier: 2 });
    for (const b of ev.bossHits) burst({ r: b.r, c: b.c, kind: 'boss' }, t, 5, 90, BOSS_LOOK[stage.world]);
    sfx.thunk();
    haptic('boss');
    if (stage.won) {
      banners.length = 0;
      banners.push({ text: tr('Boss vaincu !'), sub: stage.goal.name, tier: 3 });
      if (!calm()) { confetti(t, 60); shake = 20; }
    }
  }
  if ((ev.spawned || []).some((s) => s.attack)) {
    bossAttackAt = t;
    banners.push({ text: tr('Riposte !'), sub: stage.goal.name + ' contre-attaque' });
    sfx.fizzle();
  }
}
