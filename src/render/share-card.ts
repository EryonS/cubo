// Cubo Blocks — The picture shared from an end card: the run's last board on the played theme, Cubo on
// the plate, the score (free run) or the stars (daily level) on the theme's plate, and a few numbers.
// Drawn in a 360 x 450 logical frame, exported at 1080 x 1350 (4:5, what feeds and chats show whole).
import { L } from '../core';
import type { RunState } from '../core/types';
import { drawCubo } from '../mascot/body';
import type { CuboLook } from '../mascot/looks';
import { drawSpecial } from './cells';
import { drawBlock, drawEmpty, drawFrame, drawPlate, paintBackground } from './draw';
import { withAlpha, type G } from './g';
import type { Theme } from './theme';

export const SHARE_W = 360;
export const SHARE_H = 450;
export const SHARE_SCALE = 3;

export interface ShareCard {
  th: Theme;
  look: CuboLook;
  mood: string;
  state: Pick<RunState, 'board' | 'special' | 'bonus'>;
  kicker: string; // the mode or the level, under the score or the stars
  score?: number; // free run: the score; else stars
  scoreText?: string; // the score as the player reads it (locale digits)
  stars?: number;
  record?: string; // the "new record" tag, when there is one
  chips: { label: string; value: string }[];
}

const SIZE = L.SIZE;
const COL = { x: 75, w: 210, board: 158 }; // the column (plate, board frame, number row) and the frame's top; cells sit 10 units inside

// The Aventure star (Stars.tsx LStar): gold with an amber edge, or the ink at 25 % when not won.
function star(g: G, cx: number, cy: number, r: number, on: boolean, ink: string) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const k = i % 2 ? r * 0.48 : r;
    pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]);
  }
  if (!on) { g.poly(pts, withAlpha(ink, 0.22)); return; }
  g.poly(pts, '#d99a00', { shadow: { color: 'rgba(0,0,0,0.18)', blur: 6, dy: 2 } });
  const inner = pts.map(([x, y]) => [cx + (x - cx) * 0.86, cy + (y - cy) * 0.86 + 0.4] as [number, number]);
  g.poly(inner, '#ffc83d');
}

function drawBoardAt(g: G, th: Theme, state: ShareCard['state']) {
  drawFrame(g, th, COL.x, COL.board, COL.w, COL.w);
  const cell = (COL.w - 20) / SIZE;
  const ox = COL.x + 10;
  const oy = COL.board + 10;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c;
      const x = ox + (c + 0.5) * cell;
      const y = oy + (r + 0.5) * cell;
      const sp = state.special[i];
      if (sp?.kind === 'void') continue;
      drawEmpty(g, th, x, y, cell);
      const v = state.board[i];
      if (!v) continue;
      if (v === L.SPECIAL && sp) {
        if (sp.kind !== 'boss') drawSpecial(g, sp, x, y, cell);
        continue;
      }
      drawBlock(g, th, x, y, cell, th.palette[v] || th.ink, 1, 1, state.bonus[i], v);
    }
  }
}

export function drawShareCard(g: G, card: ShareCard) {
  const { th } = card;
  const mid = SHARE_W / 2;
  g.save();
  g.scale(SHARE_SCALE);
  g.face(th);
  paintBackground(g, th, SHARE_W, SHARE_H);

  // One centered column, as wide as the board: Cubo standing on the plate, plate, board, numbers, the game's name.

  const { x: px, w: pw } = COL;
  const py = 76;
  const ph = 64;
  drawCubo(g, 0, { x: mid, y: py - 2, s: 50 }, card.look, card.mood, { calm: true, look: null, ink: th.ink }, true);
  drawPlate(g, th, px, py, pw, ph);
  if (card.stars != null) {
    for (let k = 0; k < 3; k++) star(g, mid + (k - 1) * 34, py + 27, k === 1 ? 15 : 13, k < card.stars, th.plate.ink);
  } else {
    const s = card.scoreText ?? String(card.score ?? 0);
    g.textGlow = th.plate.glow ? { color: th.plate.glow, blur: 10 } : null;
    g.text(s, mid, py + 36, g.fit(s, 31, pw - 40), th.plate.ink, 'center');
    g.textGlow = null;
  }
  g.text(card.kicker, mid, py + 51, g.fit(card.kicker, 11, pw - 48), th.plate.sub, 'center');
  if (card.record) {
    const tw = g.textWidth(card.record, 10) + 20;
    g.rrect(mid - tw / 2, py + ph - 8, tw, 18, 9, th.tag.fill, { shadow: { color: th.shadow, blur: 8, dy: 3 } });
    g.text(card.record, mid, py + ph + 5, 10, th.tag.ink, 'center');
  }

  drawBoardAt(g, th, card.state);

  const n = card.chips.length;
  if (n) {
    const gap = 8;
    const cw = (COL.w - gap * (n - 1)) / n;
    const cy = COL.board + COL.w + 10;
    card.chips.forEach((chip, k) => {
      const cx = COL.x + k * (cw + gap);
      g.rrect(cx, cy, cw, 38, 12, th.tag.fill, { shadow: { color: th.shadow, blur: 10, dy: 4 } });
      g.text(chip.value, cx + cw / 2, cy + 19, g.fit(chip.value, 16, cw - 18), th.tag.ink, 'center');
      g.text(chip.label, cx + cw / 2, cy + 31, g.fit(chip.label, 10, cw - 16), withAlpha(th.tag.ink, 0.7), 'center');
    });
  }
  g.text('CUBO BLOCKS', mid, SHARE_H - 12, 11, withAlpha(th.ink, 0.7), 'center');
  g.restore();
}
