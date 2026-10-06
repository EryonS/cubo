// Cubo Blocks — The app icon of each theme: Cubo dressed for the theme, sitting on three blocks in the
// theme's colors, over the theme's own background. Drawn by scripts/icons/app-icons.ts for the native
// icons, and live in Réglages > Icône de l'app.
import { drawCubo } from '../mascot/body';
import { cuboLookFor } from '../mascot/looks';
import { boardTheme } from './board-themes';
import { Ctx } from './ctx2d';
import type { G } from './g';
import { blockSkin, type BlockSkin } from './skins';
import type { Theme } from './theme';

// The three blocks under Cubo, left to right, and their skin. tall: a head piece that would reach the
// top edge, so the artwork shrinks and sits lower. bgH: the decor painted that many squares tall and
// cropped at the top, so its ground meets the blocks (the Volcan crater).
interface Look { blocks: [string, string, string]; skin?: BlockSkin; tall?: boolean; bgH?: number }
export const APP_ICONS: Record<string, Look> = {
  toy: { blocks: ['#ff8fb8', '#6fd6a0', '#6ea8ff'] },
  plain: { blocks: ['#ff4d6d', '#ffcf33', '#6ea8ff'] },
  sea: { blocks: ['#ff8fab', '#ffd166', '#5fd4ff'] },
  space: { blocks: ['#8a6bff', '#ffd23f', '#ff6b8b'], tall: true },
  ice: { blocks: ['#2a9df4', '#9fdcf7', '#ffffff'], tall: true },
  forest: { blocks: ['#e84a4a', '#ffe066', '#7ccf7a'] },
  retro: { blocks: ['#0f380f', '#306230', '#4d7a1e'], skin: 'pixel' },
  arcade: { blocks: ['#ff3fd0', '#36f9ff', '#ffe600'], skin: 'neon' },
  volcano: { blocks: ['#ff3b30', '#ffb000', '#ff6a1a'], bgH: 1.13 },
  newyear: { blocks: ['#ffd23f', '#b9c2ff', '#ff5d7a'], tall: true },
  lunar: { blocks: ['#b8141f', '#ffc94a', '#ff6b5a'], tall: true },
  valentine: { blocks: ['#ff4d6d', '#ffffff', '#ff8fab'] },
  easter: { blocks: ['#ff8fb8', '#ffd23f', '#7a5cff'], tall: true },
  beach: { blocks: ['#ff7a3d', '#2ec4d6', '#ffd23f'] },
  xmas: { blocks: ['#e8364a', '#ffffff', '#2f9e5a'] },
  halloween: { blocks: ['#ff8a1a', '#7a3db8', '#9be36b'], tall: true },
};

// Native name of a theme's icon (the iOS alternate icon, the Android activity alias); Jouet is the
// app's own icon.
export const appIconName = (id: string) => (id === 'toy' ? null : id[0].toUpperCase() + id.slice(1));

// Artwork in a 100-unit square; safe: the share of the canvas it fills (iOS 0.92; Android 0.68, since
// launchers only show the middle 66 % of an adaptive icon).
export function drawAppIconArt(g: G, id: string, size: number, safe = 0.92) {
  const look = APP_ICONS[id];
  const u = (size * safe * (look.tall ? 0.92 : 1)) / 100;
  const cx = size / 2;
  const base = size / 2 + (look.tall ? 26 : 22) * u;
  const cell = 22 * u;
  const s = cell * 0.9;
  const skin = blockSkin(look.skin || 'classic');
  look.blocks.forEach((color, i) => skin(g, cx + (i - 1) * cell - s / 2, base + cell / 2 - 2 * u - s / 2, s, color));
  drawCubo(g, 0, { x: cx, y: base - 3 * u, s: 52 * u }, cuboLookFor(id), 'happy', { calm: true, look: null, ink: boardTheme(id).ink }, true);
}

// The theme's background: its decor painted on a logical square (sized like the phone screens it is
// drawn for), Jouet's pink gradient.
const LOGICAL = 420;
export function drawAppIconBackground(g: G, id: string, size: number) {
  const th: Theme = boardTheme(id);
  const h = LOGICAL * (APP_ICONS[id].bgH || 1);
  g.save();
  g.scale(size / LOGICAL);
  g.translate(0, LOGICAL - h);
  if (id === 'toy') g.rect(0, 0, LOGICAL, LOGICAL, '#ffeef4', { shader: g.linear(0, 0, 0, LOGICAL, [[0, '#fff1f7'], [1, '#ffd3e4']]) });
  else if (th.paint) {
    th.paint(new Ctx(g), LOGICAL, h);
    th.animate?.(new Ctx(g), LOGICAL, h, 4000);
  } else g.rect(0, 0, LOGICAL, h, th.base);
  g.restore();
}

export function drawAppIcon(g: G, id: string, size: number) {
  drawAppIconBackground(g, id, size);
  drawAppIconArt(g, id, size);
}
