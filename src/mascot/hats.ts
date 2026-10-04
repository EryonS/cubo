// Cubo Blocks — Cubo head pieces: per theme looks and the wardrobe (legacy mascot/hats.js).
import type { G } from '../render/g';
import type { CuboLook } from './looks';

const TAU = Math.PI * 2;
const RND = { cap: 'round', join: 'round' } as const;
type Hat = Pick<CuboLook, 'hat' | 'leaf' | 'leafDark'>;

const ell = (g: G, x: number, y: number, rx: number, ry: number, rot: number, color: string) => g.path().ellipse(x, y, rx, ry, rot, 0, TAU).fill(color);

// One head piece per look. layer 'back' is drawn before the body, 'front' after the face.
export function drawCuboHat(g: G, C: Hat, layer: 'back' | 'front', cx: number, top: number, sw: number, sh: number, s: number, sway: number, t: number, still: boolean) {
  const hat = C.hat;
  g.save();
  if (layer === 'back' && (hat === 'sprout' || hat === 'flower' || hat === 'pixel')) {
    g.translate(cx, top + s * 0.04);
    g.rotate(hat === 'pixel' ? 0 : sway);
    if (hat === 'pixel') {
      // Blocky sprout: little squares, like the console's sprites.
      const u = s * 0.07;
      g.rect(-u / 2, -u * 2.5, u, u * 2.5, C.leafDark);
      g.rect(-u * 2.5, -u * 3.5, u * 2, u, C.leaf); g.rect(-u * 1.5, -u * 2.5, u, u, C.leaf);
      g.rect(u * 0.5, -u * 3.5, u * 2, u, C.leafDark); g.rect(u * 0.5, -u * 2.5, u, u, C.leafDark);
    } else {
      const stem = hat === 'flower' ? 0.24 : 0.16;
      g.path().moveTo(0, 0).lineTo(0, -s * stem).stroke(C.leafDark, s * 0.05, RND);
      for (const side of [-1, 1]) ell(g, side * s * 0.1, -s * (hat === 'flower' ? 0.12 : 0.2), s * 0.12, s * 0.06, side * -0.5, side < 0 ? C.leaf : C.leafDark);
      if (hat === 'flower') {
        // A daisy on the stem.
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3 + (still ? 0 : t / 2600);
          ell(g, Math.cos(a) * s * 0.07, -s * 0.3 + Math.sin(a) * s * 0.07, s * 0.055, s * 0.035, a, '#ffffff');
        }
        g.circle(0, -s * 0.3, s * 0.045, '#ffd23f');
      }
    }
  } else if (layer === 'back' && hat === 'flame') {
    // A little flame flickering on top.
    const f = still ? 1 : 1 + Math.sin(t / 110) * 0.08;
    g.translate(cx, top + s * 0.06);
    for (const [col, k] of [['#ff5a2a', 1], ['#ffd23f', 0.55]] as [string, number][]) {
      const h = s * 0.32 * k * f;
      const w = s * 0.13 * k;
      g.path().moveTo(0, 0)
        .quadraticCurveTo(-w * 1.5, -h * 0.35, -w * 0.2 + sway * w, -h)
        .quadraticCurveTo(w * 1.2, -h * 0.5, w, -h * 0.15)
        .quadraticCurveTo(w * 0.8, 0, 0, 0)
        .fill(col);
    }
  } else if (layer === 'front' && hat === 'starfish') {
    g.translate(cx + sw * 0.2, top + sh * 0.04);
    g.rotate(-0.25 + sway * 0.4);
    const p = g.path();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? s * 0.06 : s * 0.15;
      p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    p.closePath();
    p.fill('#ff9f43');
    p.stroke('#d9692a', s * 0.02, RND);
    for (const [dx, dy] of [[0, -0.07], [0.05, 0], [-0.05, 0]]) g.circle(dx * s, dy * s, s * 0.012, '#ffd6a8');
  } else if (layer === 'front' && hat === 'beanie') {
    // Knit beanie with a pompom, folded brim.
    const y0 = top + sh * 0.18;
    g.path().moveTo(cx - sw * 0.46, y0).quadraticCurveTo(cx - sw * 0.4, top - sh * 0.32, cx, top - sh * 0.34)
      .quadraticCurveTo(cx + sw * 0.4, top - sh * 0.32, cx + sw * 0.46, y0).closePath().fill('#ff5d73');
    for (const k of [-0.2, 0, 0.2]) g.path().moveTo(cx + k * sw, y0 - sh * 0.05).lineTo(cx + k * sw * 0.8, top - sh * 0.22).stroke('rgba(0,0,0,0.12)', s * 0.025, RND);
    g.rrect(cx - sw * 0.5, y0 - sh * 0.1, sw, sh * 0.15, sh * 0.07, '#ffffff');
    g.circle(cx + sway * s * 0.05, top - sh * 0.38, s * 0.09, '#ffffff');
  } else if (layer === 'front' && hat === 'mushroom') {
    // Red mushroom cap with white dots, tilted.
    g.translate(cx, top + sh * 0.08);
    g.rotate(-0.12 + sway * 0.2);
    g.path().ellipse(0, 0, sw * 0.56, sh * 0.34, 0, Math.PI, 0).closePath().fill('#e8473f');
    for (const [dx, dy, r] of [[-0.28, -0.12, 0.07], [0.05, -0.24, 0.08], [0.3, -0.1, 0.06]]) g.circle(dx * sw, dy * sh, r * s, '#ffffff');
  } else if (layer === 'front' && hat === 'headphones') {
    // Neon headphones: band over the head, cups on the sides.
    g.path().ellipse(cx, top + sh * 0.42, sw * 0.52, sh * 0.58, 0, Math.PI * 1.08, Math.PI * 1.92).stroke('#36f9ff', s * 0.06, RND);
    for (const side of [-1, 1]) {
      g.rrect(cx + side * sw * 0.5 - s * 0.07, top + sh * 0.28, s * 0.14, sh * 0.32, s * 0.05, '#1a0b3d');
      g.rrect(cx + side * sw * 0.5 - s * 0.035, top + sh * 0.34, s * 0.07, sh * 0.2, s * 0.03, '#36f9ff');
    }
  } else if (layer === 'front' && hat === 'helmet') {
    // Astronaut bubble helmet with a shine and an antenna light.
    const hy = top + sh * 0.42;
    const hr = Math.max(sw, sh) * 0.66;
    const dome = g.path().arc(cx, hy, hr, Math.PI * 0.9, Math.PI * 2.1);
    dome.fill('rgba(200,230,255,0.18)');
    dome.stroke('rgba(255,255,255,0.85)', s * 0.035, RND);
    g.path().arc(cx, hy, hr * 0.8, Math.PI * 1.2, Math.PI * 1.45).stroke('rgba(255,255,255,0.7)', s * 0.03, RND);
    g.path().moveTo(cx + hr * 0.5, hy - hr * 0.85).lineTo(cx + hr * 0.62, hy - hr * 1.15).stroke('#c9c4e0', s * 0.03, RND);
    g.circle(cx + hr * 0.62, hy - hr * 1.15, s * 0.04, still || Math.floor(t / 600) % 2 ? '#ff5d73' : '#ffd23f');
  } else if (layer === 'front') {
    drawWardrobeHat(g, hat, cx, top, sw, sh, s, sway, t, still);
  }
  g.restore();
}

// Wardrobe head pieces (Boutique tab Cubo), drawn over the face.
export function drawWardrobeHat(g: G, hat: string, cx: number, top: number, sw: number, sh: number, s: number, sway: number, t: number, still: boolean) {
  if (hat === 'crown') {
    const y0 = top + sh * 0.06;
    const w = sw * 0.66;
    const p = g.path().moveTo(cx - w / 2, y0).lineTo(cx - w / 2, y0 - sh * 0.3).lineTo(cx - w / 4, y0 - sh * 0.14).lineTo(cx, y0 - sh * 0.38)
      .lineTo(cx + w / 4, y0 - sh * 0.14).lineTo(cx + w / 2, y0 - sh * 0.3).lineTo(cx + w / 2, y0).closePath();
    p.fill('#ffd23f');
    p.stroke('#c98a0a', s * 0.03, RND);
    for (const [dx, col] of [[-0.25, '#ff5d73'], [0, '#5ccfe6'], [0.25, '#6fd6a0']] as [number, string][]) g.circle(cx + dx * w, y0 - sh * 0.07, s * 0.035, col);
    if (!still && Math.floor(t / 900) % 3 === 0) g.circle(cx, y0 - sh * 0.38, s * 0.03, '#ffffff');
  } else if (hat === 'cap') {
    const y0 = top + sh * 0.16;
    g.path().ellipse(cx, y0, sw * 0.46, sh * 0.34, 0, Math.PI, 0).closePath().fill('#3f7bff');
    ell(g, cx + sw * 0.42, y0 - sh * 0.02, sw * 0.26, sh * 0.07, 0.08, '#2a5ad6');
    ell(g, cx - sw * 0.06, y0 - sh * 0.16, sw * 0.12, sh * 0.08, 0, '#ffffff');
    g.circle(cx, y0 - sh * 0.34, s * 0.035, '#2a5ad6');
  } else if (hat === 'bow') {
    g.translate(cx + sw * 0.26, top + sh * 0.04);
    g.rotate(0.3 + sway * 0.2);
    for (const side of [-1, 1]) {
      const p = g.path().moveTo(0, 0).quadraticCurveTo(side * s * 0.2, -s * 0.14, side * s * 0.2, 0).quadraticCurveTo(side * s * 0.2, s * 0.14, 0, 0);
      p.fill('#ff5d8f');
      p.stroke('#d13a6a', s * 0.03, RND);
    }
    const knot = g.path().arc(0, 0, s * 0.045, 0, TAU);
    knot.fill('#ff5d8f');
    knot.stroke('#d13a6a', s * 0.03, RND);
  } else if (hat === 'party') {
    g.translate(cx - sw * 0.08, top + sh * 0.08);
    g.rotate(-0.18 + sway * 0.3);
    const h = sh * 0.66, w = sw * 0.26;
    g.save();
    const cone = g.path().moveTo(-w, 0).lineTo(0, -h).lineTo(w, 0).closePath();
    cone.fill('#b8a4f0');
    cone.clip();
    for (let k = 0; k < 4; k++) { g.save(); g.translate(0, -h * (0.12 + k * 0.24)); g.rotate(-0.5); g.rect(-w * 2, -s * 0.025, w * 4, s * 0.05, '#ffd23f'); g.restore(); }
    g.restore();
    g.circle(0, -h, s * 0.06, '#ff5d8f');
  } else if (hat === 'glasses') {
    const fy = top + sh * 0.45;
    const ex = sw * 0.2;
    const r = s * 0.12;
    for (const side of [-1, 1]) {
      const lens = g.path().arc(cx + side * ex, fy, r, 0, TAU);
      lens.fill('rgba(255,255,255,0.18)');
      lens.stroke('#1a1a2a', s * 0.035, RND);
    }
    g.path().moveTo(cx - ex + r, fy - r * 0.2).quadraticCurveTo(cx, fy - r * 0.6, cx + ex - r, fy - r * 0.2).stroke('#1a1a2a', s * 0.035, RND);
    for (const side of [-1, 1]) g.path().arc(cx + side * ex, fy, r * 0.65, Math.PI * 1.15, Math.PI * 1.45).stroke('rgba(255,255,255,0.8)', s * 0.02, RND);
  } else if (hat === 'tophat') {
    const y0 = top + sh * 0.08;
    g.translate(cx, y0); g.rotate(-0.08 + sway * 0.12);
    g.ellipse(0, 0, sw * 0.42, sh * 0.07, '#23232e');
    g.rrect(-sw * 0.25, -sh * 0.52, sw * 0.5, sh * 0.52, s * 0.04, '#23232e');
    g.rect(-sw * 0.25, -sh * 0.16, sw * 0.5, sh * 0.1, '#ff5d73');
    g.rect(-sw * 0.18, -sh * 0.48, sw * 0.06, sh * 0.3, 'rgba(255,255,255,0.18)');
  } else if (hat === 'dragon') {
    // Golden dragon horns with a red mane between them.
    for (let k = -2; k <= 2; k++) ell(g, cx + k * sw * 0.08, top + sh * 0.02, s * 0.05, s * 0.12, k * 0.25 + sway * 0.3, '#e8364a');
    for (const d of [-1, 1]) {
      const horn = g.path().moveTo(cx + d * sw * 0.2, top + sh * 0.08)
        .quadraticCurveTo(cx + d * sw * 0.26, top - sh * 0.2, cx + d * sw * 0.4, top - sh * 0.34)
        .quadraticCurveTo(cx + d * sw * 0.3, top - sh * 0.12, cx + d * sw * 0.32, top + sh * 0.08).closePath();
      horn.fill('#ffc94a');
      horn.stroke('#c98a0a', s * 0.02, RND);
      g.path().moveTo(cx + d * sw * 0.27, top - sh * 0.14).lineTo(cx + d * sw * 0.36, top - sh * 0.18).lineTo(cx + d * sw * 0.29, top - sh * 0.06).fill('#ffc94a');
    }
  } else if (hat === 'santa') {
    const y0 = top + sh * 0.16;
    g.path().moveTo(cx - sw * 0.46, y0)
      .quadraticCurveTo(cx - sw * 0.3, top - sh * 0.4, cx + sw * 0.18, top - sh * 0.36)
      .quadraticCurveTo(cx + sw * 0.5 + sway * s * 0.1, top - sh * 0.2, cx + sw * 0.56, top + sh * 0.02) // the tip flops to the side
      .quadraticCurveTo(cx + sw * 0.3, top - sh * 0.1, cx + sw * 0.46, y0)
      .closePath().fill('#e8364a');
    g.rrect(cx - sw * 0.52, y0 - sh * 0.1, sw * 1.04, sh * 0.17, sh * 0.08, '#ffffff');
    g.circle(cx + sw * 0.56, top + sh * 0.04, s * 0.08, '#ffffff');
  } else if (hat === 'hearts') {
    // Headband with two hearts on springs.
    g.path().ellipse(cx, top + sh * 0.3, sw * 0.5, sh * 0.42, 0, Math.PI * 1.1, Math.PI * 1.9).stroke('#ff4d6d', s * 0.04, RND);
    for (const d of [-1, 1]) {
      const hx = cx + d * sw * 0.2 + sway * s * 0.04 * d, hy = top - sh * 0.3;
      g.path().moveTo(cx + d * sw * 0.16, top + sh * 0.02).quadraticCurveTo(cx + d * sw * 0.28, top - sh * 0.12, hx, hy).stroke('#6a1b4d', s * 0.02, RND);
      g.save(); g.translate(hx, hy); g.rotate(d * 0.2);
      g.path().moveTo(0, s * 0.09).bezierCurveTo(-s * 0.14, 0, -s * 0.09, -s * 0.11, 0, -s * 0.04).bezierCurveTo(s * 0.09, -s * 0.11, s * 0.14, 0, 0, s * 0.09).fill('#ff4d6d');
      g.restore();
    }
  } else if (hat === 'bunny') {
    for (const d of [-1, 1]) {
      g.save();
      g.translate(cx + d * sw * 0.18, top + sh * 0.08);
      g.rotate(d * (0.18 + (d > 0 ? sway * 0.4 : 0)));
      g.ellipse(0, -sh * 0.38, s * 0.1, sh * 0.4, '#ffffff');
      g.ellipse(0, -sh * 0.36, s * 0.05, sh * 0.3, '#ffb3cf');
      g.restore();
    }
  } else if (hat === 'straw') {
    const y0 = top + sh * 0.12;
    g.translate(cx, y0); g.rotate(-0.08 + sway * 0.1);
    g.ellipse(0, 0, sw * 0.7, sh * 0.12, '#f2cf74');
    g.path().ellipse(0, -sh * 0.04, sw * 0.32, sh * 0.32, 0, Math.PI, 0).fill('#f2cf74');
    g.rect(-sw * 0.32, -sh * 0.12, sw * 0.64, sh * 0.08, '#ff7a3d');
    for (const k of [0.3, 0.5]) g.path().ellipse(0, 0, sw * k * 1.4, sh * 0.06, 0, 0, TAU).stroke('rgba(160,110,40,0.45)', s * 0.015, RND);
    g.circle(sw * 0.22, -sh * 0.1, s * 0.05, '#ff5d8f');
  } else if (hat === 'sequin') {
    // Gold top hat covered in sparkles.
    const y0 = top + sh * 0.08;
    g.translate(cx, y0); g.rotate(-0.1 + sway * 0.12);
    const shader = g.linear(-sw * 0.25, -sh * 0.5, sw * 0.25, 0, [[0, '#fff1a8'], [0.5, '#ffd23f'], [1, '#c9900a']]);
    g.path().ellipse(0, 0, sw * 0.42, sh * 0.07, 0, 0, TAU).fill('#ffd23f', { shader });
    g.path().roundRect(-sw * 0.25, -sh * 0.5, sw * 0.5, sh * 0.5, s * 0.04).fill('#ffd23f', { shader });
    g.rect(-sw * 0.25, -sh * 0.15, sw * 0.5, sh * 0.09, '#1a1440');
    for (let k = 0; k < 5; k++) {
      const on = still || (Math.floor(t / 200) + k) % 3 === 0;
      if (!on) continue;
      const px = (-0.18 + (k % 3) * 0.17) * sw, py = -sh * (0.24 + (k % 2) * 0.16);
      g.path().moveTo(px, py - s * 0.04).lineTo(px + s * 0.012, py).lineTo(px, py + s * 0.04).lineTo(px - s * 0.012, py).fill('#ffffff');
    }
  } else if (hat === 'witch') {
    const y0 = top + sh * 0.1;
    g.translate(cx, y0); g.rotate(-0.06 + sway * 0.15);
    g.ellipse(0, 0, sw * 0.62, sh * 0.1, '#3a2a5a');
    g.path().moveTo(-sw * 0.3, 0)
      .quadraticCurveTo(-sw * 0.12, -sh * 0.5, sw * 0.02, -sh * 0.78)
      .quadraticCurveTo(sw * 0.2, -sh * 0.7, sw * 0.36, -sh * 0.62) // the tip folds over
      .quadraticCurveTo(sw * 0.16, -sh * 0.5, sw * 0.3, 0)
      .closePath().fill('#3a2a5a');
    g.path().moveTo(-sw * 0.29, -sh * 0.05).lineTo(sw * 0.29, -sh * 0.05).lineTo(sw * 0.26, -sh * 0.17).lineTo(-sw * 0.25, -sh * 0.17).closePath().fill('#ff8a1a');
    g.path().rect(-s * 0.05, -sh * 0.165, s * 0.1, sh * 0.11).stroke('#ffd23f', s * 0.025, RND);
  }
}
