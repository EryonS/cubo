// Cubo Blocks — Design tokens. Colors are the default theme, Jouet (DESIGN.md front matter); every other
// theme overrides them in menu-themes.ts and screens read them through useColors().
import { fonts } from './fonts';

export const colors = {
  bg: '#ffeef4', // toy-pink
  dot: '#ffd6e5', // toy-dot
  panel: '#ffffff', // toy-white: a surface on bg (card, row, tile, pill)
  panel2: '#fbf1f6', // a surface inside a panel (inset block)
  cell: '#f6e9f2', // toy-cell
  text: '#4a3a66', // toy-ink
  muted: '#6e5f8c',
  accent: '#7c5cff', // toy-violet
  onAccent: '#ffffff',
  mint: '#b7f0d8',
  mintInk: '#1e7a55',
  good: '#1f9e68',
  danger: '#ff5d7a',
  dangerBtn: '#e5484d', // destructive confirm button (legacy #ask .btn.danger)
  scrim: 'rgba(74,58,102,0.45)',
  edge: '#f3dce8', // the toy lip under a panel
  coin: '#ffd166',
  coinEdge: '#e0a43a',
  hairline: 'rgba(74,58,102,0.14)',
  sunken: 'rgba(74,58,102,0.1)',
} as const;

// Corners: a card on the background, a tile or row inside one (or a small card), a small control.
export const radius = { s: 10, tile: 16, card: 22, board: 26, pill: 999 } as const;

// 4 pt grid. Screen gutter = l, gap between cards = m, card padding = l, inside a row = m.
export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

// Lip under raised surfaces: cards and big buttons get `card`, small tiles and pills `tile`.
export const lip = { card: 5, tile: 3 } as const;

// Smallest comfortable touch target (HIG 44 pt).
export const TOUCH = 44;

// Type scale. lh = line height as a share of the size (Text keeps it when a style changes the size).
// 1.25 is the floor for one-line titles: tighter, iOS clips the accent of an uppercase É.
// display: screen titles. title: card titles, big numbers. headline: row and tile titles.
// body: running text. muted: secondary lines. caption: small print. label: section labels.
export const typeScale = {
  display: { fontFamily: fonts.display, fontSize: 30, lh: 1.25, textTransform: 'uppercase', letterSpacing: 0.5, tone: 'text' },
  title: { fontFamily: fonts.display, fontSize: 22, lh: 1.25, tone: 'text' },
  headline: { fontFamily: fonts.display, fontSize: 18, lh: 1.25, tone: 'text' },
  body: { fontFamily: fonts.bold, fontSize: 16, lh: 1.3, tone: 'text' },
  muted: { fontFamily: fonts.semibold, fontSize: 14, lh: 1.3, tone: 'muted' },
  caption: { fontFamily: fonts.semibold, fontSize: 12, lh: 1.3, tone: 'muted' },
  label: { fontFamily: fonts.bold, fontSize: 12, lh: 1.3, textTransform: 'uppercase', letterSpacing: 0.8, tone: 'muted' },
  big: { fontFamily: fonts.display, fontSize: 40, lh: 1.1, tone: 'accent' },
} as const;
export type TypeVariant = keyof typeof typeScale;
