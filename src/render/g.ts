// Cubo Blocks — A thin canvas-2D-like layer over Skia's SkCanvas, so the legacy drawing code
// (ctx.roundRect, fillStyle, globalAlpha, shadows...) ports call for call.
import { BlurStyle, ClipOp, PaintStyle, Skia, TileMode, type SkCanvas, type SkFont, type SkPaint, type SkPathBuilder, type SkShader, type SkTypeface } from '@shopify/react-native-skia';

// Corner radii: one number, or [topLeft, topRight, bottomRight, bottomLeft] as canvas roundRect.
export type Radii = number | [number, number, number, number];
export interface Shadow { color: string; blur: number; dy?: number }
export interface StrokeOpts { width: number; dash?: [number, number]; cap?: 'round'; join?: 'round' }
// Everything a draw call can add to its color: a stroke instead of a fill, a drop shadow, an alpha, a gradient.
export interface DrawOpts { stroke?: StrokeOpts; shadow?: Shadow; alpha?: number; shader?: SkShader }

export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Text before the bundled fonts load (or on canvases without one): Android has no default face for
// Skia.Font(undefined), so take the system sans-serif.
let sysFace: SkTypeface | null = null;
const systemFace = () => (sysFace ??= Skia.FontMgr.System().matchFamilyStyle('sans-serif', { weight: 700 }));

export class G {
  // globalAlpha: multiplies every color drawn (the legacy ctx.globalAlpha).
  alpha = 1;
  private fonts = new Map<number, SkFont>();
  // The theme's text face: Press Start 2P at a fraction of the size for Rétro and Arcade (legacy themeFont).
  private pixel = false;
  private fscale = 1;
  // A glow under the text drawn next (the score of glowing plates).
  textGlow: { color: string; blur: number } | null = null;

  constructor(readonly c: SkCanvas, private typeface: SkTypeface | null, private pixelFace: SkTypeface | null = null) {}

  face(th: { pixel?: boolean; scale?: number }) { this.pixel = !!th.pixel && !!this.pixelFace; this.fscale = th.scale || 1; }

  font(size: number): SkFont {
    const px = Math.round(size * this.fscale * 2) / 2;
    const key = this.pixel ? -px : px;
    let f = this.fonts.get(key);
    if (!f) {
      const face = this.pixel ? this.pixelFace : this.typeface;
      f = Skia.Font(face ?? systemFace(), px);
      this.fonts.set(key, f);
    }
    return f;
  }

  paint(color: string, opts: DrawOpts = {}): SkPaint {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    const a = this.alpha * (opts.alpha ?? 1);
    if (a < 1) p.setAlphaf(p.getAlphaf() * a);
    if (opts.stroke) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(opts.stroke.width);
      if (opts.stroke.dash) p.setPathEffect(Skia.PathEffect.MakeDash(opts.stroke.dash, 0));
      if (opts.stroke.cap) p.setStrokeCap(1); // round
      if (opts.stroke.join) p.setStrokeJoin(1); // round
    }
    if (opts.shader) p.setShader(opts.shader);
    // Canvas shadowBlur is about twice the Gaussian sigma.
    if (opts.shadow) p.setImageFilter(Skia.ImageFilter.MakeDropShadow(0, opts.shadow.dy || 0, opts.shadow.blur / 2, opts.shadow.blur / 2, Skia.Color(opts.shadow.color)));
    return p;
  }

  rrect(x: number, y: number, w: number, h: number, r: Radii, color: string, opts: DrawOpts = {}) {
    if (w <= 0 || h <= 0) return;
    const rect = Skia.XYWHRect(x, y, w, h);
    const p = this.paint(color, opts);
    if (typeof r === 'number') {
      const rr = Math.min(r, w / 2, h / 2);
      this.c.drawRRect(Skia.RRectXY(rect, rr, rr), p);
    } else {
      const k = (v: number) => ({ x: Math.min(v, w / 2, h / 2), y: Math.min(v, w / 2, h / 2) });
      this.c.drawRRect({ rect, topLeft: k(r[0]), topRight: k(r[1]), bottomRight: k(r[2]), bottomLeft: k(r[3]) }, p);
    }
  }

  rect(x: number, y: number, w: number, h: number, color: string, opts: DrawOpts = {}) {
    this.c.drawRect(Skia.XYWHRect(x, y, w, h), this.paint(color, opts));
  }

  // Linear gradient between two points (canvas createLinearGradient + addColorStop).
  linear(x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): SkShader {
    return Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 },
      stops.map((s) => Skia.Color(s[1])), stops.map((s) => s[0]), TileMode.Clamp);
  }

  // A path in canvas terms (beginPath / moveTo / arc ... / fill / stroke).
  path() { return new P(this); }

  circle(x: number, y: number, r: number, color: string, opts: DrawOpts & { blur?: number } = {}) {
    const p = this.paint(color, opts);
    if (opts.blur) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, opts.blur, true));
    this.c.drawCircle(x, y, r, p);
  }

  // Closed polygon (pennant, star), filled; opts as rrect.
  poly(points: [number, number][], color: string, opts: { shadow?: Shadow; alpha?: number } = {}) {
    if (points.length < 3) return;
    const b = Skia.PathBuilder.Make();
    b.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) b.lineTo(points[i][0], points[i][1]);
    b.close();
    this.c.drawPath(b.detach(), this.paint(color, opts));
  }

  // Stroked segment with round caps (the pennant's pole).
  line(x0: number, y0: number, x1: number, y1: number, color: string, width: number) {
    const p = this.paint(color, { stroke: { width } });
    p.setStrokeCap(1); // round
    this.c.drawLine(x0, y0, x1, y1, p);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string) {
    this.c.drawOval(Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2), this.paint(color));
  }

  // Pie slice from the origin: radius R, angles a0..a1 in radians (canvas arc).
  wedge(R: number, a0: number, a1: number, color: string) {
    const b = Skia.PathBuilder.Make();
    b.moveTo(0, 0);
    const d = (a1 - a0) / 6;
    for (let i = 0; i <= 6; i++) b.lineTo(Math.cos(a0 + d * i) * R, Math.sin(a0 + d * i) * R);
    b.close();
    this.c.drawPath(b.detach(), this.paint(color));
  }

  textWidth(text: string, size: number) {
    return this.font(size).getTextWidth(this.plain(text));
  }

  // Text at (x, y) on its alphabetic baseline; align as canvas textAlign. outline: a stroke drawn
  // under the fill (legacy strokeText then fillText).
  // Press Start 2P has no narrow no-break space (the thousands separator): plain spaces there.
  private plain(text: string) { return this.pixel ? text.replace(/[\u00a0\u202f]/g, ' ') : text; }

  text(text: string, x: number, y: number, size: number, color: string, align: 'left' | 'center' | 'right' = 'left',
    outline?: { color: string; width: number }, gradient?: { colors: string[]; x0: number; x1: number }) {
    text = this.plain(text);
    const f = this.font(size);
    const w = align === 'left' ? 0 : f.getTextWidth(text);
    const tx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    if (outline) {
      const p = this.paint(outline.color, { stroke: { width: outline.width } });
      p.setStrokeJoin(1); // round
      this.c.drawText(text, tx, y, p, f);
    }
    const fill = this.paint(color, this.textGlow ? { shadow: { color: this.textGlow.color, blur: this.textGlow.blur } } : {});
    if (gradient) {
      fill.setShader(Skia.Shader.MakeLinearGradient({ x: gradient.x0, y: 0 }, { x: gradient.x1, y: 0 },
        gradient.colors.map((c) => Skia.Color(c)), null, TileMode.Clamp));
    }
    this.c.drawText(text, tx, y, fill, f);
  }

  // Largest size <= size at which text fits in maxW (legacy fitFont).
  fit(text: string, size: number, maxW: number) {
    const w = this.textWidth(text, size);
    return w > maxW ? Math.max(6, Math.floor(size * (maxW / w))) : size;
  }

  save() { this.c.save(); }
  restore() { this.c.restore(); }
  translate(x: number, y: number) { this.c.translate(x, y); }
  rotate(rad: number) { this.c.rotate((rad * 180) / Math.PI, 0, 0); }
  scale(s: number) { this.c.scale(s, s); }
  clip(x: number, y: number, w: number, h: number) { this.c.clipRect(Skia.XYWHRect(x, y, w, h), 1, true); }
}

// A path drawn like a canvas 2D path: build it, then fill or stroke it. Arcs and ellipses are
// flattened to segments, so they connect to the current point as canvas does.
export class P {
  private b: SkPathBuilder = Skia.PathBuilder.Make();
  private has = false;

  constructor(private g: G) {}

  moveTo(x: number, y: number) { this.b.moveTo(x, y); this.has = true; return this; }
  lineTo(x: number, y: number) { if (this.has) this.b.lineTo(x, y); else this.moveTo(x, y); return this; }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) { this.b.quadTo(cx, cy, x, y); return this; }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) { this.b.cubicTo(c1x, c1y, c2x, c2y, x, y); return this; }
  closePath() { this.b.close(); return this; }

  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw = false) {
    let sweep = a1 - a0;
    if (!ccw && sweep < 0) sweep = (sweep % (Math.PI * 2)) + Math.PI * 2;
    if (ccw && sweep > 0) sweep = (sweep % (Math.PI * 2)) - Math.PI * 2;
    if (Math.abs(sweep) > Math.PI * 2) sweep = Math.sign(sweep) * Math.PI * 2;
    const n = Math.max(8, Math.ceil(Math.abs(sweep) * Math.sqrt(Math.max(rx, ry)) * 2.2));
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const a = a0 + (sweep * i) / n;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      this.lineTo(cx + x * cr - y * sr, cy + x * sr + y * cr);
    }
    return this;
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw = false) { return this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); }

  roundRect(x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    this.b.addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), rr, rr));
    this.has = true;
    return this;
  }
  rect(x: number, y: number, w: number, h: number) { this.b.addRect(Skia.XYWHRect(x, y, w, h)); this.has = true; return this; }

  // Limits what is drawn next (until the enclosing save / restore) to this path.
  clip() { this.g.c.clipPath(this.b.build(), ClipOp.Intersect, true); return this; }
  fill(color: string, opts: DrawOpts = {}) { this.g.c.drawPath(this.b.build(), this.g.paint(color, opts)); return this; }
  stroke(color: string, width: number, opts: DrawOpts & { cap?: 'round'; join?: 'round' } = {}) {
    const { cap, join, ...rest } = opts;
    this.g.c.drawPath(this.b.build(), this.g.paint(color, { ...rest, stroke: { width, cap, join } }));
    return this;
  }
}
