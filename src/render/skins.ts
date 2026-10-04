// Cubo Blocks — Block skins: how one block is painted (legacy themes/skins.js).
import { G, withAlpha } from './g';

export type BlockSkin = 'classic' | 'neon' | 'gold' | 'pixel';

// Each draws one block in the square (x, y, s).
const SKINS: Record<BlockSkin, (g: G, x: number, y: number, s: number, color: string) => void> = {
  classic(g, x, y, s, color) {
    const r = s * 0.2;
    g.rrect(x, y, s, s, r, color);
    g.rrect(x, y + s * 0.74, s, s * 0.26, [0, 0, r, r], 'rgba(0,0,0,0.2)');
    g.rrect(x + s * 0.12, y + s * 0.09, s * 0.76, s * 0.2, r * 0.6, 'rgba(255,255,255,0.3)');
  },
  neon(g, x, y, s, color) {
    const r = s * 0.18;
    const lw = Math.max(1.5, s * 0.09);
    g.rrect(x + lw / 2, y + lw / 2, s - lw, s - lw, r, withAlpha(color, 0.16));
    g.rrect(x + lw / 2, y + lw / 2, s - lw, s - lw, r, color, { stroke: { width: lw }, shadow: { color, blur: s * 0.45 } });
    g.rrect(x + s * 0.28, y + s * 0.26, s * 0.44, s * 0.08, s * 0.04, 'rgba(255,255,255,0.75)');
  },
  // "Or": the 30-day streak reward. Keeps the family color under a gold rim and sheen.
  gold(g, x, y, s, color) {
    const r = s * 0.22;
    g.rrect(x, y, s, s, r, color);
    const rim = g.linear(x, y, x + s, y + s, [[0, '#fff3b0'], [0.45, '#f5c542'], [1, '#b07a12']]);
    g.rrect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, r * 0.8, '#f5c542', { stroke: { width: Math.max(1.5, s * 0.12) }, shader: rim });
    g.path().moveTo(x + s * 0.18, y + s * 0.62).lineTo(x + s * 0.6, y + s * 0.2).lineTo(x + s * 0.74, y + s * 0.2).lineTo(x + s * 0.32, y + s * 0.62).fill('rgba(255,255,255,0.45)');
  },
  pixel(g, x, y, s, color) {
    const b = Math.max(2, Math.round(s * 0.14));
    x = Math.round(x); y = Math.round(y); s = Math.round(s);
    g.rect(x, y, s, s, color);
    g.rect(x, y, s, b, 'rgba(255,255,255,0.38)');
    g.rect(x, y, b, s, 'rgba(255,255,255,0.38)');
    g.rect(x, y + s - b, s, b, 'rgba(0,0,0,0.32)');
    g.rect(x + s - b, y, b, s, 'rgba(0,0,0,0.32)');
    g.rect(x + b, y + b, b, b, 'rgba(255,255,255,0.6)');
  },
};

export const blockSkin = (id: string | undefined) => SKINS[(id as BlockSkin) in SKINS ? (id as BlockSkin) : 'classic'];
export const isNeon = (id: string | undefined) => id === 'neon';
