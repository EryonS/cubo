// Cubo Blocks — Where a one-time tip bubble sits (legacy ui/tips.js placeTip, and the anchors of its callers). Pure.
import type { BonusType } from '../core/types';
import { chronoBar, HUD_BTN, invBoxes, type Layout } from '../render/layout';

export interface Rect { left: number; top: number; right: number; bottom: number; width: number; height: number }
export const rectOf = (left: number, top: number, width: number, height: number): Rect => ({ left, top, right: left + width, bottom: top + height, width, height });

// What a tip points at.
export type Anchor = 'undo' | 'wallet' | 'plate' | 'chrono' | 'tray' | 'trayWide' | { inv: BonusType } | null;

// The HUD buttons are laid out by the game screen: top row, from the right (pause 16, undo 66, missions 116).
export function anchorRect(a: Anchor, lay: Layout, safeTop: number): Rect | null {
  if (!a) return null;
  const hudY = safeTop + 12;
  if (a === 'undo') return rectOf(lay.W - 66 - HUD_BTN, hudY, HUD_BTN, HUD_BTN);
  if (a === 'wallet') return rectOf(16, hudY, 96, HUD_BTN);
  if (a === 'plate') return rectOf(lay.band.x, lay.band.y, lay.band.w, lay.band.h);
  if (a === 'chrono') { const [x, y] = chronoBar(lay); return rectOf(x, y - 6, lay.board, 12); }
  if (a === 'tray') return rectOf(lay.bx, lay.ty, lay.nextX - lay.bx, lay.trayH);
  if (a === 'trayWide') return rectOf(lay.bx, lay.ty, lay.board, lay.trayH);
  const b = invBoxes(lay).find((v) => v.id === a.inv);
  return b ? rectOf(b.x, b.y, b.w, b.h) : null;
}

export interface TipPlace { side: 'above' | 'below' | 'free'; left: number; width: number; arrow: number; top?: number; bottom?: number }

// Next to its anchor, above it in the lower half of the screen. No anchor: free, over the board.
export function placeTip(r: Rect | null, W: number, H: number, freeTop: number): TipPlace {
  const width = Math.min(300, W - 32);
  if (!r || !r.width) return { side: 'free', left: (W - width) / 2, width, arrow: width / 2, top: freeTop };
  const cx = (r.left + r.right) / 2;
  const left = Math.max(16, Math.min(W - 16 - width, cx - width / 2));
  const arrow = Math.max(18, Math.min(width - 18, cx - left));
  if ((r.top + r.bottom) / 2 > H / 2) return { side: 'above', left, width, arrow, bottom: H - r.top + 12 };
  return { side: 'below', left, width, arrow, top: r.bottom + 12 };
}
