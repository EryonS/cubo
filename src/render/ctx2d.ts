// Cubo Blocks — A canvas-2D drawing context over the G wrapper (Skia). The legacy theme backgrounds and
// special cells are written against `ctx.fillStyle`, `beginPath`, `arc`, `createLinearGradient`...: this
// class lets that code port line for line. Only the calls the game uses are there.
import { Skia, TileMode, type SkShader } from '@shopify/react-native-skia';
import { G, P, type DrawOpts } from './g';

type GradSpec = { kind: 'lin'; x0: number; y0: number; x1: number; y1: number } | { kind: 'rad'; x0: number; y0: number; r0: number; x1: number; y1: number; r1: number };

export class Grad {
  private stops: [number, string][] = [];
  constructor(private spec: GradSpec) {}
  addColorStop(offset: number, color: string) { this.stops.push([offset, color]); }
  shader(): SkShader {
    const colors = this.stops.map((s) => Skia.Color(s[1]));
    const pos = this.stops.map((s) => s[0]);
    const k = this.spec;
    if (k.kind === 'lin') return Skia.Shader.MakeLinearGradient({ x: k.x0, y: k.y0 }, { x: k.x1, y: k.y1 }, colors, pos, TileMode.Clamp);
    if (k.r0 <= 0) return Skia.Shader.MakeRadialGradient({ x: k.x1, y: k.y1 }, k.r1, colors, pos, TileMode.Clamp);
    return Skia.Shader.MakeTwoPointConicalGradient({ x: k.x0, y: k.y0 }, k.r0, { x: k.x1, y: k.y1 }, k.r1, colors, pos, TileMode.Clamp);
  }
}

type Style = string | Grad;
interface State { fillStyle: Style; strokeStyle: Style; lineWidth: number; lineCap: 'butt' | 'round'; lineJoin: 'miter' | 'round'; globalAlpha: number; shadowColor: string; shadowBlur: number; shadowOffsetY: number }

export class Ctx {
  fillStyle: Style = '#000000';
  strokeStyle: Style = '#000000';
  lineWidth = 1;
  lineCap: 'butt' | 'round' = 'butt';
  lineJoin: 'miter' | 'round' = 'miter';
  globalAlpha = 1;
  shadowColor = 'transparent';
  shadowBlur = 0;
  shadowOffsetY = 0;
  // Accepted and ignored: every draw is source-over.
  globalCompositeOperation = 'source-over';
  private p: P;
  private stack: State[] = [];

  constructor(readonly g: G) { this.p = g.path(); }

  // ---- state ----
  save() {
    this.stack.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, lineCap: this.lineCap, lineJoin: this.lineJoin, globalAlpha: this.globalAlpha, shadowColor: this.shadowColor, shadowBlur: this.shadowBlur, shadowOffsetY: this.shadowOffsetY });
    this.g.save();
  }
  restore() {
    const s = this.stack.pop();
    if (s) Object.assign(this, s);
    this.g.restore();
  }
  translate(x: number, y: number) { this.g.translate(x, y); }
  rotate(a: number) { this.g.rotate(a); }
  scale(sx: number, sy: number) { this.g.c.scale(sx, sy); }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number) { return new Grad({ kind: 'lin', x0, y0, x1, y1 }); }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) { return new Grad({ kind: 'rad', x0, y0, r0, x1, y1, r1 }); }

  // ---- path ----
  beginPath() { this.p = this.g.path(); }
  moveTo(x: number, y: number) { this.p.moveTo(x, y); }
  lineTo(x: number, y: number) { this.p.lineTo(x, y); }
  closePath() { this.p.closePath(); }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) { this.p.quadraticCurveTo(cx, cy, x, y); }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) { this.p.bezierCurveTo(c1x, c1y, c2x, c2y, x, y); }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw = false) { this.p.arc(x, y, r, a0, a1, ccw); }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw = false) { this.p.ellipse(x, y, rx, ry, rot, a0, a1, ccw); }
  roundRect(x: number, y: number, w: number, h: number, r: number) { this.p.roundRect(x, y, w, h, r); }
  rect(x: number, y: number, w: number, h: number) { this.p.rect(x, y, w, h); }
  clip() { this.p.clip(); }

  // ---- paint ----
  private opts(style: Style): DrawOpts {
    const o: DrawOpts = {};
    if (this.globalAlpha < 1) o.alpha = this.globalAlpha;
    if (this.shadowBlur > 0 && this.shadowColor !== 'transparent') o.shadow = { color: this.shadowColor, blur: this.shadowBlur, dy: this.shadowOffsetY };
    if (typeof style !== 'string') o.shader = style.shader();
    return o;
  }
  private color = (style: Style) => (typeof style === 'string' ? style : '#000000');

  fill() { this.p.fill(this.color(this.fillStyle), this.opts(this.fillStyle)); }
  stroke() {
    this.p.stroke(this.color(this.strokeStyle), this.lineWidth, {
      ...this.opts(this.strokeStyle), cap: this.lineCap === 'round' ? 'round' : undefined, join: this.lineJoin === 'round' ? 'round' : undefined,
    });
  }
  fillRect(x: number, y: number, w: number, h: number) { this.g.rect(x, y, w, h, this.color(this.fillStyle), this.opts(this.fillStyle)); }
}
