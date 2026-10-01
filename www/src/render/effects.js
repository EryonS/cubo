// Cubo Blocks — Returning pieces, particles, floaters, banners.
'use strict';

let lastTickSec = 0;

function drawReturning(t) {
  returning = returning.filter((p) => t - p.t0 < 200 && state.tray[p.idx]);
  for (const p of returning) {
    const k = easeOut((t - p.t0) / 200);
    const [tx, ty] = slotCenter(p.idx);
    const piece = state.tray[p.idx];
    drawPiece(piece, p.x + (tx - p.x) * k, p.y + (ty - p.y) * k, p.size + (miniCell() - p.size) * k);
  }
}

function drawParticles(t, dt) {
  particles = particles.filter((p) => t - p.t0 < p.life);
  for (const p of particles) {
    if (t < p.t0) continue;
    p.vy += (p.g ?? 900) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = (t - p.t0) / p.life;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = p.color;
    if (p.star) {
      p.vx *= 0.985;
      p.rot += p.vr * dt;
      const s = p.size * (1 - k * 0.3);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? s * 0.22 : s * 0.5;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }
    const s = p.size * (1 - k * 0.5);
    ctx.beginPath(); ctx.roundRect(p.x - s / 2, p.y - s / 2, s, s, s * 0.25); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(t) {
  floaters = floaters.filter((f) => t - f.t0 < 900);
  ctx.textAlign = 'center';
  const th = theme();
  for (const f of floaters) {
    const k = (t - f.t0) / 900;
    ctx.globalAlpha = 1 - easeOut(Math.max(0, (k - 0.5) * 2));
    ctx.fillStyle = f.tier ? tierColor(f.tier, t) : th.ink;
    ctx.font = themeFont(th, Math.round((f.big ? 32 : 20) * (f.scale || 1)));
    ctx.strokeStyle = withAlpha(th.base, 0.92);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5 + (f.tier || 0);
    const y = f.y - easeOut(k) * lay.cell * 1.4;
    // Combo points pop in with a bounce.
    const pop = f.tier && !calm() ? easeBack(k * 5) : 1;
    ctx.save();
    ctx.translate(f.x, y);
    ctx.scale(pop, pop);
    ctx.strokeText(f.text, 0, 0);
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawBanner(t) {
  const banner = banners[0];
  if (!banner) return;
  banner.t0 ??= t;
  const k = (t - banner.t0) / 1300;
  if (k >= 1) { banners.shift(); return; }
  const scale = calm() ? 1 : easeBack(k * 4);
  const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : calm() ? Math.min(1, k * 8) : 1;
  const tier = banner.tier || 0;
  ctx.save();
  ctx.translate(W / 2, lay.by + lay.board * 0.42);
  ctx.scale(scale * (1 + 0.08 * Math.max(0, tier - 1)), scale * (1 + 0.08 * Math.max(0, tier - 1)));
  // Higher tiers wobble in, over a slowly turning sunburst.
  if (tier && !calm()) ctx.rotate(Math.sin(k * 20) * 0.035 * tier * (1 - Math.min(1, k * 2.5)));
  ctx.globalAlpha = alpha;
  if (tier >= 2 && !calm()) {
    ctx.save();
    ctx.translate(0, -lay.cell * 0.3);
    ctx.rotate(t / 1600);
    ctx.globalAlpha = alpha * 0.2;
    ctx.fillStyle = tierColor(tier, t);
    const R = lay.board * 0.52 * easeOut(k * 3);
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, (i * Math.PI) / 6, (i * Math.PI) / 6 + Math.PI / 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;
  }
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  const th = theme();
  ctx.strokeStyle = withAlpha(th.base, 0.95);
  const fit = (text, weight, size) => {
    ctx.font = themeFont(th, size, weight);
    const w = ctx.measureText(text).width;
    const maxW = lay.board - 24;
    if (w > maxW) ctx.font = themeFont(th, Math.floor((size * maxW) / w), weight);
  };
  const iconSize = lay.cell * 0.9;
  fit(banner.text, th.weight, Math.round(lay.cell * 1.05));
  const textW = ctx.measureText(banner.text).width;
  const shift = banner.icon ? (iconSize + 10) / 2 : 0;
  ctx.lineWidth = 10;
  ctx.strokeText(banner.text, shift, 0);
  if (tier >= 3) {
    // Rainbow sliding across the letters.
    const g = ctx.createLinearGradient(shift - textW / 2, 0, shift + textW / 2, 0);
    for (let i = 0; i <= 4; i++) g.addColorStop(i / 4, `hsl(${(Math.round(t / 4) + i * 70) % 360} 92% 58%)`);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = tier ? tierColor(tier, t) : banner.gold ? th.accent : th.ink;
  }
  ctx.fillText(banner.text, shift, 0);
  if (banner.icon) drawIcon(banner.icon, shift - textW / 2 - 10 - iconSize / 2, -lay.cell * 0.32, iconSize);
  if (banner.sub) {
    fit(banner.sub, th.weight, Math.round(lay.cell * 0.5));
    const subW = ctx.measureText(banner.sub).width;
    const subShift = banner.subIcon ? -lay.cell * 0.25 : 0;
    ctx.lineWidth = 6;
    ctx.strokeText(banner.sub, subShift, lay.cell * 0.7);
    ctx.fillStyle = th.accent;
    ctx.fillText(banner.sub, subShift, lay.cell * 0.7);
    if (banner.subIcon) drawIcon(banner.subIcon, subShift + subW / 2 + lay.cell * 0.3, lay.cell * 0.55, lay.cell * 0.45);
  }
  ctx.restore();
}
