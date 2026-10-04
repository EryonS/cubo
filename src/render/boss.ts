// Cubo Blocks — The boss of Aventure level 20: one 2x2 creature in the center of the board, and its
// hit points bar in the score band. (Legacy game/boss.js drawBoss / drawBossBar.)
import { L } from '../core';
import { tr } from '../core/i18n';
import type { RunState } from '../core/types';
import { anim } from '../game/anim';
import { bossLeft } from '../game/hud';
import { Ctx } from './ctx2d';
import { G, withAlpha } from './g';
import type { Layout } from './layout';

// Body tint of each world's boss (and the specks it bursts into).
export const BOSS_LOOK: Record<string, string> = {
  plain: '#6cc94f', sea: '#9b6bff', space: '#62d6b4', ice: '#dff2ff',
  forest: '#a2703c', retro: '#306230', arcade: '#ff4fb8', volcano: '#ff5a2a', halloween: '#ff8a1a',
  newyear: '#5c6bff', lunar: '#d9262f', valentine: '#ff4d8f', easter: '#9b7bff', beach: '#ff6a4a', xmas: '#c8a27a',
};

export const bossCenter = (lay: Layout): [number, number] => [lay.bx + (L.BOSS_AT[1] + 1) * lay.cell, lay.by + (L.BOSS_AT[0] + 1) * lay.cell];

// A white flash when hit, a squash when it strikes back, sweat under 30% hp; the eyes follow the
// dragged piece (ghost) or look down at the tray.
export function drawBoss(g: G, lay: Layout, state: RunState, t: number, alpha: number, ghost: { row: number; col: number } | null) {
  const stage = state.stage;
  if (!stage) return;
  const ctx = new Ctx(g);
  const [cx, cy] = bossCenter(lay);
  const size = lay.cell * 2 - lay.cell * 0.12;
  const calm = anim.calm;
  const hit = calm ? 0 : Math.max(0, 1 - (t - anim.bossHitAt) / 260);
  const atk = calm ? 0 : Math.max(0, 1 - (t - anim.bossAttackAt) / 420);
  const beaten = stage.won;
  const breathe = calm || beaten ? 0 : Math.sin(t / 420) * 0.025;
  const sx = 1 + breathe + atk * 0.14 * Math.sin(atk * Math.PI);
  const sy = 1 - breathe - atk * 0.12 * Math.sin(atk * Math.PI);
  const wob = hit ? Math.sin(t / 22) * hit * lay.cell * 0.08 : 0;
  const base = BOSS_LOOK[stage.world] || '#9b6bff';
  ctx.save();
  ctx.globalAlpha = alpha * (beaten ? Math.max(0, 1 - (t - anim.overAt) / 500) : 1);
  ctx.translate(cx + wob, cy + size / 2);
  ctx.scale(sx, sy);
  ctx.translate(0, -size / 2);
  const h = size / 2;
  // Body
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.roundRect(-h, -h + size * 0.06, size, size, size * 0.26); ctx.fill();
  const grad = ctx.createLinearGradient(0, -h, 0, h);
  grad.addColorStop(0, withAlpha('#ffffff', 0.35)); grad.addColorStop(0.35, withAlpha('#ffffff', 0)); grad.addColorStop(1, withAlpha('#000000', 0.18));
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(-h, -h, size, size, size * 0.26); ctx.fill();
  // Eyes
  const target: [number, number] = ghost ? [lay.bx + (ghost.col + 0.5) * lay.cell, lay.by + (ghost.row + 0.5) * lay.cell] : [cx, lay.ty];
  const ang = Math.atan2(target[1] - cy, target[0] - cx);
  const blink = calm ? 1 : (t % 3200) < 120 ? 0.15 : 1;
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
  if (bossLeft(state) / stage.goal.target < 0.3 && !beaten) {
    ctx.fillStyle = '#7fd8ff';
    const dy = calm ? 0 : ((t / 900) % 1) * size * 0.1;
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
export function drawBossBar(g: G, state: RunState, px: number, py: number, pw: number, ph: number, t: number) {
  const stage = state.stage;
  if (!stage) return;
  const max = stage.goal.target;
  const left = bossLeft(state);
  const hit = anim.calm ? 0 : Math.max(0, 1 - (t - anim.bossHitAt) / 300);
  const bw = pw - 36;
  const bh = Math.round(ph * 0.26);
  const x = px + 18 + (hit ? Math.sin(t / 25) * 3 * hit : 0);
  const y = py + ph * 0.5;
  g.rrect(x, y, bw, bh, bh / 2, 'rgba(0,0,0,0.18)');
  if (left > 0) {
    const w = Math.max(bh, bw * (left / max));
    if (hit > 0.5) g.rrect(x, y, w, bh, bh / 2, '#ffffff');
    else g.rrect(x, y, w, bh, bh / 2, '#ff4d6d', { shader: g.linear(x, 0, x + bw, 0, [[0, '#ff4d6d'], [1, '#ff9f43']]) });
  }
  const label = tr`${left} / ${max} PV`;
  const size = Math.round(bh * 0.8);
  g.text(label, x + bw / 2, y + bh / 2 + 1 + size * 0.35, size, '#ffffff', 'center', { color: 'rgba(0,0,0,0.35)', width: 3 });
}
