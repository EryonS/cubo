// Cubo Blocks — Boutique card for Cubo's wardrobe: Cubo wearing the piece, on the equipped theme's
// background (legacy screens/shop.js drawCuboPreview).
import { drawCubo } from '../mascot/body';
import { cuboLookFor } from '../mascot/looks';
import { drawFrame, paintBackground } from './draw';
import type { G } from './g';
import type { Theme } from './theme';
import { PREVIEW_H, PREVIEW_W } from './preview';

export function drawCuboPreview(g: G, th: Theme, themeKey: string, wear: string, w = PREVIEW_W) {
  g.save();
  g.scale(w / PREVIEW_W);
  paintBackground(g, th, PREVIEW_W, PREVIEW_H);
  drawFrame(g, th, 40, PREVIEW_H - 34, PREVIEW_W - 80, 60);
  drawCubo(g, 0, { x: PREVIEW_W / 2, y: PREVIEW_H - 34, s: 84 }, cuboLookFor(themeKey, wear), 'happy', { calm: true, look: null, ink: th.ink }, true);
  g.restore();
}
