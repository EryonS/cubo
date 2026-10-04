// Cubo Blocks — Cubo drawing: body and face.
'use strict';

// pose: { x, y, s, C, mood } draws a still Cubo elsewhere (Boutique previews) instead of the board one.
function drawCubo(t, pose) {
  if (!pose && !settings.mascot) return;
  const { x, y, s } = pose || cuboSpot();
  const C = pose ? pose.C : cuboLook();
  const mood = pose ? pose.mood : t < cubo.until ? cubo.mood : cuboBaseMood();
  const still = calm();
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
  ctx.save();

  // Shadow on the frame, smaller while in the air.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(x, y + 1, s * 0.42 * (1 - Math.min(0.5, lift / s)), s * 0.07, 0, 0, Math.PI * 2); ctx.fill();

  // Feet.
  ctx.fillStyle = C.dark;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + side * sw * 0.22, bottom - s * 0.02, s * 0.13, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Head piece behind the body (sprout, flower, flame...), swaying on top.
  const sway = still ? 0 : Math.sin(t / 420) * 0.25 + (lift > 1 ? -0.2 : 0);
  drawCuboHat(C, 'back', cx, top, sw, sh, s, sway, t, still);

  // Body: a soft rounded block with a darker base and a glossy top.
  const bx = cx - sw / 2;
  const r = Math.min(sw, sh) * 0.42;
  ctx.fillStyle = C.dark;
  ctx.beginPath(); ctx.roundRect(bx, top + sh * 0.1, sw, sh * 0.9, r); ctx.fill();
  ctx.fillStyle = C.base;
  ctx.beginPath(); ctx.roundRect(bx, top, sw, sh * 0.9, r); ctx.fill();
  if (!C.flat) {
    ctx.fillStyle = withAlpha(C.light, 0.7);
    ctx.beginPath(); ctx.ellipse(bx + sw * 0.3, top + sh * 0.2, sw * 0.14, sh * 0.08, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  // Face.
  const fy = top + sh * 0.45;
  const ex = sw * 0.2;
  const er = s * 0.075;
  // Puffed cheeks blow up; love and heat make them glow.
  const cheek = mood === 'puff' ? 1.6 : 1;
  ctx.fillStyle = withAlpha(C.cheek, mood === 'love' || mood === 'hot' ? 0.85 : 0.55);
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + side * sw * 0.32, fy + s * 0.1, s * 0.08 * cheek, s * 0.05 * cheek, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  if (!cubo.blinkAt || t > cubo.blinkAt + 140) cubo.blinkAt = t + 2200 + Math.random() * 2600;
  const blinking = !still && t > cubo.blinkAt && t < cubo.blinkAt + 140;
  // Pupils look at the dragged piece, else down at the tray.
  let look = [0, 0.4];
  if (drag && !pose) {
    const dx = drag.x - cx;
    const dy = drag.y - fy;
    const d = Math.hypot(dx, dy) || 1;
    look = [dx / d, dy / d];
  }
  for (const side of [-1, 1]) {
    const exx = cx + side * ex;
    if (mood === 'happy' || mood === 'party' || (mood === 'wink' && side === 1)) {
      ctx.beginPath(); ctx.arc(exx, fy + er * 0.6, er, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (mood === 'love') {
      const beat = still ? 1 : 1 + 0.12 * Math.sin(t / 90);
      drawHeart(exx, fy + er * 0.3, er * 1.5 * beat, 1);
    } else if (mood === 'cool') {
      // Shades drawn across both eyes below.
    } else if (mood === 'puff') {
      ctx.beginPath(); ctx.moveTo(exx - er, fy); ctx.lineTo(exx + er, fy); ctx.stroke();
    } else if (mood === 'hot' || mood === 'shiver') {
      ctx.beginPath(); ctx.moveTo(exx - side * er, fy - er); ctx.lineTo(exx + side * er * 0.4, fy); ctx.lineTo(exx - side * er, fy + er); ctx.stroke();
    } else if (mood === 'sleep' || mood === 'sad') {
      ctx.beginPath(); ctx.arc(exx, fy - er * 0.4, er, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    } else if (mood === 'oops') {
      ctx.beginPath(); ctx.moveTo(exx - side * er, fy - er); ctx.lineTo(exx + side * er * 0.4, fy); ctx.lineTo(exx - side * er, fy + er); ctx.stroke();
    } else if (mood === 'star') {
      ctx.save(); ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = C.ink; ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5 + (still ? 0 : t / 500);
        const rr = k % 2 ? er * 0.55 : er * 1.35;
        ctx.lineTo(exx + Math.cos(a) * rr, fy + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (mood === 'dizzy') {
      ctx.save(); ctx.lineWidth = s * 0.03; ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const rr = (a / (Math.PI * 4)) * er * 1.2;
        const aa = a + (still ? 0 : t / 120) * side;
        ctx.lineTo(exx + Math.cos(aa) * rr, fy + Math.sin(aa) * rr);
      }
      ctx.stroke(); ctx.restore();
    } else if (blinking) {
      ctx.beginPath(); ctx.moveTo(exx - er, fy); ctx.lineTo(exx + er, fy); ctx.stroke();
    } else {
      const big = mood === 'wow' || mood === 'worried' ? 1.3 : 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(exx, fy, er * 1.15 * big, er * 1.35 * big, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink;
      const pr = er * (mood === 'worried' ? 0.55 : 0.8);
      ctx.beginPath(); ctx.arc(exx + look[0] * er * 0.35, fy + look[1] * er * 0.45, pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(exx + look[0] * er * 0.35 - pr * 0.35, fy + look[1] * er * 0.45 - pr * 0.4, pr * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    if (mood === 'cool' && side === 1) {
      // Shades: two dark lenses on a bar, with a glint sliding across.
      ctx.save();
      ctx.fillStyle = '#1a1030';
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + k * ex - er * 1.6, fy - er * 1.1, er * 3.2, er * 2.1, er * 0.7); ctx.fill(); }
      ctx.fillRect(cx - ex, fy - er * 0.9, ex * 2, er * 0.5);
      ctx.strokeStyle = withAlpha('#ffffff', 0.8); ctx.lineWidth = s * 0.025;
      const gl = still ? 0.3 : (t / 700) % 1;
      ctx.beginPath(); ctx.moveTo(cx - ex - er + gl * er * 2, fy - er * 0.7); ctx.lineTo(cx - ex - er * 1.6 + gl * er * 2, fy + er * 0.4); ctx.stroke();
      ctx.restore();
    }
    if (mood === 'worried') {
      // Worried brows: raised toward the middle.
      ctx.beginPath(); ctx.moveTo(exx - side * er * 1.1, fy - er * 2.6); ctx.lineTo(exx + side * er * 0.8, fy - er * 2); ctx.stroke();
    }
  }

  // Mouth.
  const my = fy + s * 0.14;
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  if (mood === 'cool') {
    ctx.moveTo(cx - s * 0.08, my + s * 0.01); ctx.quadraticCurveTo(cx + s * 0.04, my + s * 0.06, cx + s * 0.11, my - s * 0.03); ctx.stroke();
  } else if (mood === 'puff') {
    ctx.ellipse(cx, my + s * 0.02, s * 0.035, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'hot') {
    ctx.ellipse(cx, my + s * 0.03, s * 0.08, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath(); ctx.ellipse(cx, my + s * 0.065, s * 0.045, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'happy' || mood === 'party' || mood === 'star' || mood === 'love' || mood === 'wink') {
    ctx.moveTo(cx - s * 0.12, my - s * 0.02); ctx.quadraticCurveTo(cx, my + s * 0.2, cx + s * 0.12, my - s * 0.02); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.cheek;
    ctx.beginPath(); ctx.ellipse(cx, my + s * 0.06, s * 0.05, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'wow' || mood === 'dizzy') {
    ctx.ellipse(cx, my + s * 0.02, s * 0.05, s * 0.065, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'sleep') {
    ctx.ellipse(cx, my, s * 0.03, s * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'sad' || mood === 'oops') {
    ctx.arc(cx, my + s * 0.07, s * 0.08, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else if (mood === 'worried' || mood === 'shiver') {
    ctx.moveTo(cx - s * 0.1, my + s * 0.02);
    for (let k = 1; k <= 4; k++) ctx.lineTo(cx - s * 0.1 + k * s * 0.05, my + (k % 2 ? -0.02 : 0.02) * s);
    ctx.stroke();
  } else {
    ctx.arc(cx, my - s * 0.02, s * 0.07, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  }

  // Extras: sweat drop, tear, sleeping z's.
  if (mood === 'worried') {
    const dy = still ? 0 : ((t / 900) % 1) * s * 0.12;
    ctx.fillStyle = '#7fd8ff';
    ctx.beginPath(); ctx.ellipse(bx + sw * 0.9, top + sh * 0.25 + dy, s * 0.05, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (mood === 'hot') {
    // Steam puffs rising off the head.
    ctx.save(); ctx.fillStyle = withAlpha('#ffffff', 0.75);
    for (const side of [-1, 1]) {
      const ph = still ? 0.4 : ((t / 600) + (side + 1) * 0.25) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.arc(cx + side * sw * 0.42, top - ph * s * 0.35, s * (0.05 + ph * 0.05), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (mood === 'shiver') {
    ctx.save(); ctx.strokeStyle = withAlpha('#7fd8ff', 0.9); ctx.lineWidth = s * 0.03;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + side * sw * 0.6, top + sh * 0.3); ctx.lineTo(cx + side * sw * 0.68, top + sh * 0.42); ctx.lineTo(cx + side * sw * 0.6, top + sh * 0.54); ctx.stroke();
    }
    ctx.restore();
  }
  if (mood === 'sad') {
    ctx.fillStyle = '#7fd8ff';
    ctx.beginPath(); ctx.ellipse(cx - ex, fy + s * 0.1, s * 0.035, s * 0.055, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (mood === 'sleep') {
    ctx.fillStyle = withAlpha(theme().ink, 0.7);
    for (let k = 0; k < 3; k++) {
      const ph = still ? k / 3 : ((t / 1400) + k / 3) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.font = themeFont(theme(), Math.round(s * (0.22 + ph * 0.18)));
      ctx.fillText('z', cx + sw * 0.35 + ph * s * 0.4, top - ph * s * 0.6);
    }
    ctx.globalAlpha = 1;
  }
  // Head piece over the body (hat, helmet, headphones).
  drawCuboHat(C, 'front', cx, top, sw, sh, s, sway, t, still);
  ctx.restore();
  if (pose) return;

  // What flies out on taps: hearts, or the look's own burst.
  cubo.hearts = cubo.hearts.filter((h) => t - h.t0 < 900);
  for (const h of cubo.hearts) {
    const k = (t - h.t0) / 900;
    if (k < 0) continue;
    drawBurst(C, h.x + h.dx * k, h.y - k * s * 1.1, s * 0.22 * (1 - k * 0.3), 1 - k, h.spin * k * (still ? 0 : 1));
  }
}
