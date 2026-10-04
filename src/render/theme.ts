// Cubo Blocks — Game themes as the renderer sees them (legacy themes/worlds.js THEMES). Milestone 2
// ports the default Jouet theme; the world and season themes come with Aventure (milestone 6).

// Block colors by shape family (index = family + 1, see FAMILIES in core/logic.ts).
export const TOY_PALETTE = [
  null, '#b8a4f0', '#ffab76', '#ffcf4d', '#6fd6a0', '#5ccfe6', '#6ea8ff', '#8b7cf6',
  '#d49cff', '#ff8fb8', '#b6e36b', '#ff7a8a', '#3fc1b0', '#a3b1c9', '#e0b07a',
] as const;

export interface Frame { r: number; line?: string | null; lw?: number; inset?: number; glow?: string }
export interface Plate { fill: string; line?: string | null; r: number; ink: string; sub: string; shadow?: string; lw?: number; inset?: number; glow?: string }
export interface Theme {
  id: string;
  base: string; // background color
  dots?: string; // Jouet's polka dots
  board: string; // board slab
  empty: string; // empty cell
  cellR: number; // empty cell corner radius, in cells
  palette: readonly (string | null)[];
  ink: string;
  accent: string;
  danger: string;
  shadow: string; // drop shadow of plate and frame
  frame: Frame;
  plate: Plate;
  tag: { fill: string; line?: string | null; ink: string; glow?: string };
  skin?: string; // equipped block skin (classic, neon, pixel, gold)
  patterns?: boolean; // color-blind marks on blocks (Réglages > Motifs)
}

// The theme for the equipped block skin and the Motifs setting. Board themes other than Jouet come
// with milestone 6: equipping one keeps this look in game for now.
export const themeFor = (skin: string, patterns: boolean): Theme => ({ ...TOY, skin, patterns });

export const TOY: Theme = {
  id: 'toy',
  base: '#ffeef4', dots: '#ffd6e5', board: '#ffffff', empty: '#f6e9f2', cellR: 0.24,
  palette: TOY_PALETTE,
  ink: '#4a3a66', accent: '#7c5cff', danger: '#ff5d7a', shadow: 'rgba(200,110,160,0.28)',
  frame: { r: 26, line: null },
  plate: { fill: '#ffffff', line: null, r: 40, ink: '#7c5cff', sub: '#b39bd6', shadow: 'rgba(200,110,160,0.28)' },
  tag: { fill: '#b7f0d8', line: null, ink: '#1e7a55' },
};
