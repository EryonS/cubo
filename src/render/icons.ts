// Cubo Blocks — Bonus and coin icons drawn on the canvas (legacy ui/icons.js GLYPHS / drawIcon, and
// the color-blind marks of render/helpers.js). Drawn in a 100-unit box centered on (0, 0).
// Internal ids stay (rotate, nitro, shield, reroll) so old saves keep their inventory; what the
// player sees is Toupie, Étoile, Bulle, Tornade.
import { G, withAlpha } from './g';

const TAU = Math.PI * 2;

// Bonuses sit on a white badge ringed with their color; coins are drawn as gold objects.
export const ICON_COLORS: Record<string, string> = { rotate: '#ff5d8f', nitro: '#f5a300', shield: '#1fa9e0', bomb: '#ef4444', reroll: '#8b5cf6' };

type Glyph = (g: G, c: string) => void;

const GLYPHS: Record<string, Glyph> = {
  // Toupie: a spinning top with a handle and two motion arcs.
  rotate(g, c) {
    g.path().roundRect(-5, -38, 10, 16, 4).fill(c);
    g.path().moveTo(0, 36).bezierCurveTo(-12, 22, -34, 4, -34, -8).quadraticCurveTo(-34, -24, 0, -24)
      .quadraticCurveTo(34, -24, 34, -8).bezierCurveTo(34, 4, 12, 22, 0, 36).fill(c);
    g.path().ellipse(0, -8, 30, 6, 0, 0, TAU).fill('rgba(255,255,255,0.85)');
    g.path().ellipse(0, -8, 30, 2.5, 0, 0, TAU).fill(c);
    g.path().arc(0, -8, 44, Math.PI * 0.85, Math.PI * 1.1).stroke(c, 5, { cap: 'round' });
    g.path().arc(0, -8, 44, -Math.PI * 0.1, Math.PI * 0.15).stroke(c, 5, { cap: 'round' });
  },
  // Étoile: a chubby five-point star with a shine.
  nitro(g, c) {
    const p = g.path();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const r = i % 2 ? 17 : 36;
      p.lineTo(Math.cos(a) * r, Math.sin(a) * r + 3);
    }
    p.closePath().fill(c).stroke(c, 9, { join: 'round' });
    g.path().ellipse(-9, -6, 6, 3.5, -0.7, 0, TAU).fill('rgba(255,255,255,0.7)');
  },
  // Bulle: a soap bubble, translucent with a bright rim and highlights.
  shield(g, c) {
    g.path().arc(0, 0, 34, 0, TAU).fill(withAlpha(c, 0.22)).stroke(c, 6);
    g.path().arc(0, 0, 22, Math.PI * 1.05, Math.PI * 1.45).stroke('#ffffff', 6, { cap: 'round' });
    g.path().arc(14, -16, 4, 0, TAU).fill('#ffffff');
  },
  bomb(g) {
    g.path().moveTo(10, -12).quadraticCurveTo(16, -26, 26, -26).stroke('#374151', 7, { cap: 'round' });
    g.path().arc(-4, 6, 25, 0, TAU).fill('#1f2937');
    g.path().arc(-13, -3, 7, 0, TAU).fill('rgba(255,255,255,0.45)');
    const spark = g.path();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const r = i % 2 ? 5 : 12;
      spark.lineTo(28 + Math.cos(a) * r, -28 + Math.sin(a) * r);
    }
    spark.closePath().fill('#f97316');
    g.path().arc(28, -28, 4, 0, TAU).fill('#fde047');
  },
  // Tornade: stacked swirls narrowing toward the ground.
  reroll(g, c) {
    const rows = [[-26, 36], [-12, 28], [2, 20], [16, 12], [28, 6]];
    rows.forEach(([y, rx], i) => {
      const x = Math.sin(i * 1.1) * 5;
      g.path().moveTo(x - rx, y).lineTo(x + rx, y).stroke(c, 8, { cap: 'round' });
    });
    g.path().arc(Math.sin(5.5) * 5, 36, 4, 0, TAU).fill(c);
  },
  coin(g) {
    const grad = g.linear(0, -46, 0, 46, [[0, '#fde68a'], [0.5, '#facc15'], [1, '#ca8a04']]);
    g.path().arc(0, 4, 46, 0, TAU).fill('#a16207');
    g.path().arc(0, 0, 44, 0, TAU).fill('#facc15', { shader: grad });
    g.path().arc(0, 0, 31, 0, TAU).stroke('rgba(161,98,7,0.55)', 5);
    const star = g.path();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const r = i % 2 ? 8 : 19;
      star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    star.closePath().fill('#b45309');
    g.path().ellipse(-18, -22, 10, 5, -0.6, 0, TAU).fill('rgba(255,255,255,0.6)');
  },
  bag(g) {
    const grad = g.linear(0, -40, 0, 46, [[0, '#fcd34d'], [1, '#b45309']]);
    g.path().moveTo(-14, -16).bezierCurveTo(-48, 2, -42, 46, 0, 46).bezierCurveTo(42, 46, 48, 2, 14, -16).closePath().fill('#fcd34d', { shader: grad });
    g.path().moveTo(-15, -20).lineTo(-24, -40).lineTo(0, -30).lineTo(24, -40).lineTo(15, -20).closePath().fill('#fcd34d', { shader: grad });
    g.path().roundRect(-17, -24, 34, 9, 4).fill('#78350f');
    g.text('$', 0, 16 + 40 * 0.35, 40, '#78350f', 'center');
  },
};

// Draws icon `type` centered at (cx, cy), `size` wide.
export function drawIcon(g: G, type: string, cx: number, cy: number, size: number) {
  const glyph = GLYPHS[type];
  if (!glyph) return;
  g.save();
  g.translate(cx, cy);
  g.scale(size / 100);
  const ring = ICON_COLORS[type];
  if (ring) {
    // Canvas shadows ignore the transform: scale them back up to stay 8 px / 3 px on screen.
    const k = 100 / size;
    g.path().arc(0, 0, 48, 0, TAU).fill('#ffffff', { shadow: { color: 'rgba(0,0,0,0.35)', blur: 8 * k, dy: 3 * k } });
    g.path().arc(0, 0, 45, 0, TAU).stroke(ring, 6);
    g.scale(0.78);
  }
  glyph(g, ring);
  g.restore();
}

export const iconScale = (type: string) => (ICON_COLORS[type] ? 0.7 : 0.66);

// ---------- color-blind marks ----------
// One simple mark per shape family, so blocks never rely on color alone. Drawn in a unit box
// (-1..1) scaled to a fifth of the block.
const MARKS: (((g: G, c: string) => void) | null)[] = [
  null,
  (g, c) => { g.path().arc(0, 0, 0.45, 0, TAU).fill(c); }, // dot
  (g, c) => { g.rect(-0.9, -0.28, 1.8, 0.56, c); }, // dash
  (g, c) => { g.rect(-0.28, -0.9, 0.56, 1.8, c); }, // bar
  (g, c) => { g.rect(-0.9, -0.24, 1.8, 0.48, c); g.rect(-0.24, -0.9, 0.48, 1.8, c); }, // plus
  (g, c) => { g.save(); g.rotate(Math.PI / 4); g.rect(-1, -0.22, 2, 0.44, c); g.rect(-0.22, -1, 0.44, 2, c); g.restore(); }, // cross
  (g, c) => { g.path().arc(0, 0, 0.7, 0, TAU).stroke(c, 0.36); }, // ring
  (g, c) => { g.rect(-0.7, -0.7, 1.4, 1.4, c); }, // square
  (g, c) => { g.path().moveTo(0, -0.9).lineTo(0.9, 0.75).lineTo(-0.9, 0.75).closePath().fill(c); }, // triangle
  (g, c) => { g.path().moveTo(0, 0.9).lineTo(0.9, -0.75).lineTo(-0.9, -0.75).closePath().fill(c); }, // down triangle
  (g, c) => { g.path().moveTo(0, -1).lineTo(0.8, 0).lineTo(0, 1).lineTo(-0.8, 0).closePath().fill(c); }, // diamond
  (g, c) => { for (const x of [-0.55, 0.55]) g.path().arc(x, 0, 0.36, 0, TAU).fill(c); }, // two dots
  (g, c) => { for (const k of [-1, 0, 1]) g.path().arc(k * 0.62, k * 0.62, 0.3, 0, TAU).fill(c); }, // three dots
  (g, c) => { g.path().moveTo(-0.8, 0.8).lineTo(0.8, -0.8).stroke(c, 0.4, { cap: 'round' }); }, // slash
  (g, c) => { g.path().moveTo(-0.85, -0.4).lineTo(0, 0.45).lineTo(0.85, -0.4).stroke(c, 0.38, { cap: 'round', join: 'round' }); }, // chevron
];

export function drawMark(g: G, fam: number, cx: number, cy: number, s: number, color: string) {
  const mark = MARKS[fam];
  if (!mark) return;
  g.save();
  g.translate(cx, cy);
  g.scale(s * 0.2);
  mark(g, color);
  g.restore();
}
