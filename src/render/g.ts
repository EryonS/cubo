// Cubo Blocks — A thin canvas-2D-like layer over Skia's SkCanvas, so the legacy drawing code
// (ctx.roundRect, fillStyle, globalAlpha, shadows...) ports call for call.
import { BlurStyle, PaintStyle, Skia, type SkCanvas, type SkFont, type SkPaint, type SkTypeface } from '@shopify/react-native-skia';

// Corner radii: one number, or [topLeft, topRight, bottomRight, bottomLeft] as canvas roundRect.
export type Radii = number | [number, number, number, number];
export interface Shadow { color: string; blur: number; dy?: number }
export interface StrokeOpts { width: number; dash?: [number, number] }

export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export class G {
  // globalAlpha: multiplies every color drawn (the legacy ctx.globalAlpha).
  alpha = 1;
  private fonts = new Map<number, SkFont>();

  constructor(readonly c: SkCanvas, private typeface: SkTypeface | null) {}

  font(size: number): SkFont {
    const key = Math.round(size * 2) / 2;
    let f = this.fonts.get(key);
    if (!f) {
      f = this.typeface ? Skia.Font(this.typeface, key) : Skia.Font(undefined, key);
      this.fonts.set(key, f);
    }
    return f;
  }

  paint(color: string, opts: { stroke?: StrokeOpts; shadow?: Shadow; alpha?: number } = {}): SkPaint {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    const a = this.alpha * (opts.alpha ?? 1);
    if (a < 1) p.setAlphaf(p.getAlphaf() * a);
    if (opts.stroke) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(opts.stroke.width);
      if (opts.stroke.dash) p.setPathEffect(Skia.PathEffect.MakeDash(opts.stroke.dash, 0));
    }
    // Canvas shadowBlur is about twice the Gaussian sigma.
    if (opts.shadow) p.setImageFilter(Skia.ImageFilter.MakeDropShadow(0, opts.shadow.dy || 0, opts.shadow.blur / 2, opts.shadow.blur / 2, Skia.Color(opts.shadow.color)));
    return p;
  }

  rrect(x: number, y: number, w: number, h: number, r: Radii, color: string, opts: { stroke?: StrokeOpts; shadow?: Shadow; alpha?: number } = {}) {
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

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.c.drawRect(Skia.XYWHRect(x, y, w, h), this.paint(color));
  }

  circle(x: number, y: number, r: number, color: string, opts: { alpha?: number; blur?: number } = {}) {
    const p = this.paint(color, opts);
    if (opts.blur) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, opts.blur, true));
    this.c.drawCircle(x, y, r, p);
  }

  textWidth(text: string, size: number) {
    return this.font(size).getTextWidth(text);
  }

  // Text at (x, y) on its alphabetic baseline; align as canvas textAlign. outline: a stroke drawn
  // under the fill (legacy strokeText then fillText).
  text(text: string, x: number, y: number, size: number, color: string, align: 'left' | 'center' | 'right' = 'left',
    outline?: { color: string; width: number }) {
    const f = this.font(size);
    const w = align === 'left' ? 0 : f.getTextWidth(text);
    const tx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    if (outline) {
      const p = this.paint(outline.color, { stroke: { width: outline.width } });
      p.setStrokeJoin(1); // round
      this.c.drawText(text, tx, y, p, f);
    }
    this.c.drawText(text, tx, y, this.paint(color), f);
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
