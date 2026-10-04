// Cubo Blocks — The little scene shown on Boutique cards and the Aventure card: a score sign over a
// patch of board, painted with the real theme and block skin code (legacy screens/shop.js drawPreview).
import { locale } from '../core/i18n';
import { drawBlock, drawEmpty, drawFrame, drawPlate, paintBackground } from './draw';
import type { G } from './g';
import type { Theme } from './theme';

export const PREVIEW_W = 240;
export const PREVIEW_H = 180;

const PATTERN = [
  [6, 6, 0, 11, 0],
  [6, 6, 11, 11, 3],
  [9, 0, 11, 4, 3],
];

export function drawPreview(g: G, th: Theme, w = PREVIEW_W, h = PREVIEW_H) {
  g.save();
  g.scale(w / PREVIEW_W);
  paintBackground(g, th, PREVIEW_W, PREVIEW_H);
  const cell = 30;
  const cols = 5;
  const rows = 3;
  const ox = (PREVIEW_W - cols * cell) / 2;
  const oy = 64;
  const pw = 132;
  drawPlate(g, th, (PREVIEW_W - pw) / 2, 12, pw, 40);
  g.text((12480).toLocaleString(locale()), PREVIEW_W / 2, 42, 26, th.plate.ink, 'center');
  drawFrame(g, th, ox - 7, oy - 7, cols * cell + 14, rows * cell + 14);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + (c + 0.5) * cell;
      const y = oy + (r + 0.5) * cell;
      drawEmpty(g, th, x, y, cell);
      const v = PATTERN[r][c];
      if (v) drawBlock(g, th, x, y, cell, th.palette[v] || th.ink, 1, 1, null, v);
    }
  }
  g.restore();
  void h;
}
