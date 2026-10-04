// Cubo Blocks — Boutique card for Cubo's wardrobe. PLACEHOLDER until milestone 5 (mascot): a simple
// cube face on the equipped theme's background with a flat sketch of the head piece. The real
// drawCubo / drawWardrobeHat (legacy mascot/) replace this.
import { paintBackground } from './draw';
import type { G } from './g';
import type { Theme } from './theme';
import { PREVIEW_H, PREVIEW_W } from './preview';

const BODY = '#8b7cf6';

// A flat sketch of the piece on top of the head (head box: x 90..150, top y 74).
function hat(g: G, id: string) {
  const cx = 120;
  const top = 74;
  switch (id) {
    case 'bow':
      g.poly([[cx, top + 2], [cx - 22, top - 12], [cx - 22, top + 12]], '#ff6f91');
      g.poly([[cx, top + 2], [cx + 22, top - 12], [cx + 22, top + 12]], '#ff6f91');
      g.circle(cx, top + 2, 6, '#ff3f6c');
      break;
    case 'cap':
      g.rrect(cx - 28, top - 20, 56, 24, [24, 24, 3, 3], '#4a90e2');
      g.rrect(cx - 4, top - 2, 40, 8, 4, '#2f6fba');
      break;
    case 'party':
      g.poly([[cx, top - 40], [cx - 20, top + 2], [cx + 20, top + 2]], '#ffb347');
      g.circle(cx, top - 42, 5, '#ff6f91');
      break;
    case 'glasses':
      g.circle(cx - 17, top + 32, 11, 'rgba(255,255,255,0.35)');
      g.circle(cx + 17, top + 32, 11, 'rgba(255,255,255,0.35)');
      g.path().arc(cx - 17, top + 32, 11, 0, Math.PI * 2).stroke('#2b2142', 3);
      g.path().arc(cx + 17, top + 32, 11, 0, Math.PI * 2).stroke('#2b2142', 3);
      g.line(cx - 6, top + 32, cx + 6, top + 32, '#2b2142', 3);
      break;
    case 'tophat':
      g.rrect(cx - 34, top - 4, 68, 8, 3, '#2b2142');
      g.rrect(cx - 21, top - 38, 42, 38, 4, '#2b2142');
      g.rect(cx - 21, top - 12, 42, 7, '#ff6f91');
      break;
    case 'crown':
      g.poly([[cx - 26, top + 2], [cx - 26, top - 24], [cx - 12, top - 10], [cx, top - 28], [cx + 12, top - 10], [cx + 26, top - 24], [cx + 26, top + 2]], '#ffd23f');
      break;
    case 'auto':
      g.circle(cx, top - 6, 4, '#4fb36b');
      g.line(cx, top, cx, top - 6, '#4fb36b', 3);
      g.ellipse(cx - 9, top - 12, 9, 5, '#6fd6a0');
      g.ellipse(cx + 9, top - 12, 9, 5, '#6fd6a0');
      break;
    default: // season pieces: a festive pennant until the real art lands
      g.poly([[cx, top - 34], [cx - 20, top + 2], [cx + 20, top + 2]], '#ff8fb8');
      g.circle(cx, top - 36, 5, '#ffd23f');
  }
}

export function drawCuboPreview(g: G, th: Theme, wear: string, w = PREVIEW_W, h = PREVIEW_H) {
  g.save();
  g.scale(w / PREVIEW_W);
  paintBackground(g, th, PREVIEW_W, PREVIEW_H);
  g.rrect(70, 74, 100, 82, 22, BODY, { shadow: { color: th.shadow, blur: 14, dy: 6 } });
  g.rrect(76, 80, 88, 14, 7, 'rgba(255,255,255,0.28)');
  g.circle(102, 112, 7, '#2b2142');
  g.circle(138, 112, 7, '#2b2142');
  g.path().arc(120, 124, 10, 0.2, Math.PI - 0.2).stroke('#2b2142', 3, { cap: 'round' });
  hat(g, wear);
  g.restore();
  void h;
}
