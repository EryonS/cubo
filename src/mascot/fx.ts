// Cubo Blocks — Bursts and hearts thrown by Cubo (legacy mascot/fx.js).
import type { G } from '../render/g';
import type { CuboLook } from './looks';

export function drawHeart(g: G, x: number, y: number, size: number, alpha: number) {
  const a = g.alpha;
  g.alpha = a * Math.max(0, alpha);
  g.path().moveTo(x, y + size * 0.35)
    .bezierCurveTo(x - size, y - size * 0.3, x - size * 0.4, y - size, x, y - size * 0.4)
    .bezierCurveTo(x + size * 0.4, y - size, x + size, y - size * 0.3, x, y + size * 0.35)
    .fill('#ff5d8f');
  g.alpha = a;
}

export function drawBurst(g: G, C: Pick<CuboLook, 'burst' | 'leaf' | 'leafDark' | 'ink'>, x: number, y: number, size: number, alpha: number, rot: number) {
  const kind = C.burst || 'heart';
  if (kind === 'heart') { drawHeart(g, x, y, size, alpha); return; }
  const a = g.alpha;
  g.alpha = a * Math.max(0, alpha);
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const rnd = { cap: 'round', join: 'round' } as const;
  if (kind === 'petal') {
    for (let k = 0; k < 5; k++) g.path().ellipse(Math.cos(k * 1.257) * size * 0.45, Math.sin(k * 1.257) * size * 0.45, size * 0.38, size * 0.24, k * 1.257, 0, Math.PI * 2).fill('#ffb3cf');
    g.circle(0, 0, size * 0.24, '#ffd23f');
  } else if (kind === 'bubble') {
    const p = g.path().arc(0, 0, size * 0.6, 0, Math.PI * 2);
    p.fill('rgba(160,225,255,0.3)');
    p.stroke('#e6f8ff', size * 0.14, rnd);
    g.circle(-size * 0.22, -size * 0.22, size * 0.13, '#ffffff');
  } else if (kind === 'star' || kind === 'spark') {
    const pts = kind === 'star' ? 5 : 4;
    const p = g.path();
    for (let k = 0; k < pts * 2; k++) {
      const ang = -Math.PI / 2 + (k * Math.PI) / pts;
      const r = k % 2 ? size * (kind === 'star' ? 0.3 : 0.18) : size * 0.75;
      p.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    p.closePath();
    p.fill(kind === 'star' ? '#ffe066' : '#ffb000', kind === 'spark' ? { shadow: { color: '#ff4a00', blur: size * 0.8 } } : {});
  } else if (kind === 'snow') {
    for (let k = 0; k < 3; k++) {
      const ang = (k * Math.PI) / 3;
      g.path().moveTo(-Math.cos(ang) * size * 0.65, -Math.sin(ang) * size * 0.65).lineTo(Math.cos(ang) * size * 0.65, Math.sin(ang) * size * 0.65).stroke('#ffffff', size * 0.14, rnd);
    }
  } else if (kind === 'leaf') {
    g.path().ellipse(0, 0, size * 0.65, size * 0.32, -0.6, 0, Math.PI * 2).fill(C.leaf);
    g.path().moveTo(-size * 0.45, size * 0.3).lineTo(size * 0.45, -size * 0.3).stroke(C.leafDark, size * 0.08, rnd);
  } else if (kind === 'pixel') {
    // A heart made of 7x6 squares, like a console sprite.
    const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
    const u = size * 0.22;
    rows.forEach((row, r) => { for (let c = 0; c < 7; c++) if (row[c] === '1') g.rect((c - 3.5) * u, (r - 3) * u, u, u, C.ink); });
  } else if (kind === 'bat') {
    const f = Math.sin(rot * 6) * 0.5 + 0.6;
    g.path().moveTo(0, 0)
      .quadraticCurveTo(-size * 0.5, -size * f, -size * 1.1, -size * 0.1)
      .quadraticCurveTo(-size * 0.6, size * 0.25, 0, size * 0.3)
      .quadraticCurveTo(size * 0.6, size * 0.25, size * 1.1, -size * 0.1)
      .quadraticCurveTo(size * 0.5, -size * f, 0, 0)
      .fill('#3a2a5a');
  } else if (kind === 'note') {
    const sh = { shadow: { color: '#36f9ff', blur: size * 0.6 } };
    g.path().ellipse(-size * 0.2, size * 0.4, size * 0.24, size * 0.18, -0.4, 0, Math.PI * 2).fill('#36f9ff', sh);
    g.path().moveTo(size * 0.02, size * 0.38).lineTo(size * 0.02, -size * 0.6).quadraticCurveTo(size * 0.35, -size * 0.45, size * 0.45, -size * 0.1).stroke('#36f9ff', size * 0.13, { ...rnd, ...sh });
  }
  g.restore();
  g.alpha = a;
}
