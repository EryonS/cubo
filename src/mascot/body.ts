// Cubo Blocks — Cubo drawing: body and face (legacy mascot/body.js drawCubo).
// pose: a still Cubo elsewhere (home, result card, Boutique) instead of the board one.
import { withAlpha, type G } from '../render/g';
import { drawBurst, drawHeart } from './fx';
import { drawCuboHat } from './hats';
import type { CuboLook } from './looks';
import { cubo, type Spot } from './state';

const TAU = Math.PI * 2;
const RND = { cap: 'round', join: 'round' } as const;

export interface CuboEnv {
  calm: boolean; // reduced motion: no hops, sway, blink, spin
  look: { x: number; y: number } | null; // the dragged piece the pupils follow
  ink: string; // theme ink, for the sleeping z's
}

export function drawCubo(g: G, t: number, spot: Spot, C: CuboLook, mood: string, env: CuboEnv, pose = false) {
  const { x, y, s } = spot;
  const still = env.calm;
  const a0 = g.alpha;
  // Jumps: event jumps, plus little hops while partying.
  let lift = 0;
  let squash = 0;
  const jk = pose ? -1 : (t - cubo.jumpAt) / 520;
  if (jk >= 0 && jk < 1) lift = Math.sin(jk * Math.PI) * s * 0.7 * cubo.jumpH;
  else if (jk >= 1 && jk < 1.35) squash = Math.sin(((jk - 1) / 0.35) * Math.PI) * 0.18;
  if (mood === 'party' && !still && !pose) {
    const pk = (t % 700) / 700;
    lift = Math.max(lift, Math.sin(pk * Math.PI) * s * 0.35);
  }
  const breathe = still ? 0 : Math.sin(t / 650) * 0.03;
  const sw = s * (1 + squash + breathe * 0.5);
  const sh = s * 0.84 * (1 - squash + breathe * -0.5 + (lift > 1 ? 0.06 : 0));
  const cx = x + (still ? 0 : mood === 'dizzy' ? Math.sin(t / 90) * s * 0.06 : mood === 'shiver' ? Math.sin(t / 25) * s * 0.025 : 0);
  const bottom = y - lift;
  const top = bottom - sh;
  g.save();

  // Shadow on the frame, smaller while in the air.
  g.ellipse(x, y + 1, s * 0.42 * (1 - Math.min(0.5, lift / s)), s * 0.07, 'rgba(0,0,0,0.16)');
  // Feet.
  for (const side of [-1, 1]) g.ellipse(cx + side * sw * 0.22, bottom - s * 0.02, s * 0.13, s * 0.08, C.dark);
  // Head piece behind the body (sprout, flower, flame...), swaying on top.
  const sway = still ? 0 : Math.sin(t / 420) * 0.25 + (lift > 1 ? -0.2 : 0);
  drawCuboHat(g, C, 'back', cx, top, sw, sh, s, sway, t, still);

  // Body: a soft rounded block with a darker base and a glossy top.
  const bx = cx - sw / 2;
  const r = Math.min(sw, sh) * 0.42;
  g.rrect(bx, top + sh * 0.1, sw, sh * 0.9, r, C.dark);
  g.rrect(bx, top, sw, sh * 0.9, r, C.base);
  if (!C.flat) g.path().ellipse(bx + sw * 0.3, top + sh * 0.2, sw * 0.14, sh * 0.08, -0.5, 0, TAU).fill(withAlpha(C.light, 0.7));

  // Face.
  const fy = top + sh * 0.45;
  const ex = sw * 0.2;
  const er = s * 0.075;
  const ink = C.ink;
  const lw = s * 0.05;
  // Puffed cheeks blow up; love and heat make them glow.
  const cheek = mood === 'puff' ? 1.6 : 1;
  for (const side of [-1, 1]) g.ellipse(cx + side * sw * 0.32, fy + s * 0.1, s * 0.08 * cheek, s * 0.05 * cheek, withAlpha(C.cheek, mood === 'love' || mood === 'hot' ? 0.85 : 0.55));

  if (!pose && (!cubo.blinkAt || t > cubo.blinkAt + 140)) cubo.blinkAt = t + 2200 + Math.random() * 2600;
  const blinking = !pose && !still && t > cubo.blinkAt && t < cubo.blinkAt + 140;
  // Pupils look at the dragged piece, else down at the tray.
  let look = [0, 0.4];
  if (env.look && !pose) {
    const dx = env.look.x - cx;
    const dy = env.look.y - fy;
    const d = Math.hypot(dx, dy) || 1;
    look = [dx / d, dy / d];
  }
  for (const side of [-1, 1]) {
    const exx = cx + side * ex;
    if (mood === 'happy' || mood === 'party' || (mood === 'wink' && side === 1)) {
      g.path().arc(exx, fy + er * 0.6, er, Math.PI * 1.15, Math.PI * 1.85).stroke(ink, lw, RND);
    } else if (mood === 'love') {
      const beat = still ? 1 : 1 + 0.12 * Math.sin(t / 90);
      drawHeart(g, exx, fy + er * 0.3, er * 1.5 * beat, 1);
    } else if (mood === 'cool') {
      // Shades drawn across both eyes below.
    } else if (mood === 'puff') {
      g.path().moveTo(exx - er, fy).lineTo(exx + er, fy).stroke(ink, lw, RND);
    } else if (mood === 'hot' || mood === 'shiver' || mood === 'oops') {
      g.path().moveTo(exx - side * er, fy - er).lineTo(exx + side * er * 0.4, fy).lineTo(exx - side * er, fy + er).stroke(ink, lw, RND);
    } else if (mood === 'sleep' || mood === 'sad') {
      g.path().arc(exx, fy - er * 0.4, er, Math.PI * 0.15, Math.PI * 0.85).stroke(ink, lw, RND);
    } else if (mood === 'star') {
      const p = g.path();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5 + (still ? 0 : t / 500);
        const rr = k % 2 ? er * 0.55 : er * 1.35;
        p.lineTo(exx + Math.cos(a) * rr, fy + Math.sin(a) * rr);
      }
      p.closePath();
      p.fill('#ffd23f');
      p.stroke(ink, s * 0.025, RND);
    } else if (mood === 'dizzy') {
      const p = g.path();
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const rr = (a / (Math.PI * 4)) * er * 1.2;
        const aa = a + (still ? 0 : t / 120) * side;
        p.lineTo(exx + Math.cos(aa) * rr, fy + Math.sin(aa) * rr);
      }
      p.stroke(ink, s * 0.03, RND);
    } else if (blinking) {
      g.path().moveTo(exx - er, fy).lineTo(exx + er, fy).stroke(ink, lw, RND);
    } else {
      const big = mood === 'wow' || mood === 'worried' ? 1.3 : 1;
      g.ellipse(exx, fy, er * 1.15 * big, er * 1.35 * big, '#ffffff');
      const pr = er * (mood === 'worried' ? 0.55 : 0.8);
      g.circle(exx + look[0] * er * 0.35, fy + look[1] * er * 0.45, pr, ink);
      g.circle(exx + look[0] * er * 0.35 - pr * 0.35, fy + look[1] * er * 0.45 - pr * 0.4, pr * 0.35, '#ffffff');
    }
    if (mood === 'cool' && side === 1) {
      // Shades: two dark lenses on a bar, with a glint sliding across.
      for (const k of [-1, 1]) g.rrect(cx + k * ex - er * 1.6, fy - er * 1.1, er * 3.2, er * 2.1, er * 0.7, '#1a1030');
      g.rect(cx - ex, fy - er * 0.9, ex * 2, er * 0.5, '#1a1030');
      const gl = still ? 0.3 : (t / 700) % 1;
      g.path().moveTo(cx - ex - er + gl * er * 2, fy - er * 0.7).lineTo(cx - ex - er * 1.6 + gl * er * 2, fy + er * 0.4).stroke(withAlpha('#ffffff', 0.8), s * 0.025, RND);
    }
    if (mood === 'worried') {
      // Worried brows: raised toward the middle.
      g.path().moveTo(exx - side * er * 1.1, fy - er * 2.6).lineTo(exx + side * er * 0.8, fy - er * 2).stroke(ink, lw, RND);
    }
  }

  // Mouth.
  const my = fy + s * 0.14;
  const mp = g.path();
  if (mood === 'cool') {
    mp.moveTo(cx - s * 0.08, my + s * 0.01).quadraticCurveTo(cx + s * 0.04, my + s * 0.06, cx + s * 0.11, my - s * 0.03).stroke(ink, lw, RND);
  } else if (mood === 'puff') {
    mp.ellipse(cx, my + s * 0.02, s * 0.035, s * 0.035, 0, 0, TAU).fill(ink);
  } else if (mood === 'hot') {
    mp.ellipse(cx, my + s * 0.03, s * 0.08, s * 0.06, 0, 0, TAU).fill(ink);
    g.ellipse(cx, my + s * 0.065, s * 0.045, s * 0.03, '#ff6b8a');
  } else if (mood === 'happy' || mood === 'party' || mood === 'star' || mood === 'love' || mood === 'wink') {
    mp.moveTo(cx - s * 0.12, my - s * 0.02).quadraticCurveTo(cx, my + s * 0.2, cx + s * 0.12, my - s * 0.02).closePath().fill(ink);
    g.ellipse(cx, my + s * 0.06, s * 0.05, s * 0.03, C.cheek);
  } else if (mood === 'wow' || mood === 'dizzy') {
    mp.ellipse(cx, my + s * 0.02, s * 0.05, s * 0.065, 0, 0, TAU).fill(ink);
  } else if (mood === 'sleep') {
    mp.ellipse(cx, my, s * 0.03, s * 0.025, 0, 0, TAU).fill(ink);
  } else if (mood === 'sad' || mood === 'oops') {
    mp.arc(cx, my + s * 0.07, s * 0.08, Math.PI * 1.15, Math.PI * 1.85).stroke(ink, lw, RND);
  } else if (mood === 'worried' || mood === 'shiver') {
    mp.moveTo(cx - s * 0.1, my + s * 0.02);
    for (let k = 1; k <= 4; k++) mp.lineTo(cx - s * 0.1 + k * s * 0.05, my + (k % 2 ? -0.02 : 0.02) * s);
    mp.stroke(ink, lw, RND);
  } else {
    mp.arc(cx, my - s * 0.02, s * 0.07, Math.PI * 0.2, Math.PI * 0.8).stroke(ink, lw, RND);
  }

  // Extras: sweat drop, tear, sleeping z's.
  if (mood === 'worried') {
    const dy = still ? 0 : ((t / 900) % 1) * s * 0.12;
    g.ellipse(bx + sw * 0.9, top + sh * 0.25 + dy, s * 0.05, s * 0.08, '#7fd8ff');
  }
  if (mood === 'hot') {
    // Steam puffs rising off the head.
    for (const side of [-1, 1]) {
      const ph = still ? 0.4 : ((t / 600) + (side + 1) * 0.25) % 1;
      g.alpha = a0 * Math.sin(ph * Math.PI);
      g.circle(cx + side * sw * 0.42, top - ph * s * 0.35, s * (0.05 + ph * 0.05), withAlpha('#ffffff', 0.75));
    }
    g.alpha = a0;
  }
  if (mood === 'shiver') {
    for (const side of [-1, 1]) {
      g.path().moveTo(cx + side * sw * 0.6, top + sh * 0.3).lineTo(cx + side * sw * 0.68, top + sh * 0.42).lineTo(cx + side * sw * 0.6, top + sh * 0.54)
        .stroke(withAlpha('#7fd8ff', 0.9), s * 0.03, RND);
    }
  }
  if (mood === 'sad') g.ellipse(cx - ex, fy + s * 0.1, s * 0.035, s * 0.055, '#7fd8ff');
  if (mood === 'sleep') {
    for (let k = 0; k < 3; k++) {
      const ph = still ? k / 3 : ((t / 1400) + k / 3) % 1;
      g.alpha = a0 * Math.sin(ph * Math.PI);
      g.text('z', cx + sw * 0.35 + ph * s * 0.4, top - ph * s * 0.6, Math.round(s * (0.22 + ph * 0.18)), withAlpha(env.ink, 0.7));
    }
    g.alpha = a0;
  }
  // Head piece over the body (hat, helmet, headphones).
  drawCuboHat(g, C, 'front', cx, top, sw, sh, s, sway, t, still);
  g.restore();
  g.alpha = a0;
  if (pose) return;

  // What flies out on taps: hearts, or the look's own burst.
  cubo.hearts = cubo.hearts.filter((h) => t - h.t0 < 900);
  for (const h of cubo.hearts) {
    const k = (t - h.t0) / 900;
    if (k < 0) continue;
    drawBurst(g, C, h.x + h.dx * k, h.y - k * s * 1.1, s * 0.22 * (1 - k * 0.3), 1 - k, h.spin * k * (still ? 0 : 1));
  }
}
