// Cubo Blocks — Design tokens of the default theme, Jouet (DESIGN.md front matter, legacy base.css).
// World and season themes come with their screens (milestone 6 / 8).
export const colors = {
  bg: '#ffeef4', // toy-pink
  dot: '#ffd6e5', // toy-dot
  panel: '#ffffff', // toy-white
  panel2: '#fbf1f6',
  cell: '#f6e9f2', // toy-cell
  text: '#4a3a66', // toy-ink
  muted: '#6e5f8c',
  accent: '#7c5cff', // toy-violet
  onAccent: '#ffffff',
  mint: '#b7f0d8',
  mintInk: '#1e7a55',
  good: '#1f9e68',
  danger: '#ff5d7a',
  edge: '#f3dce8',
  coin: '#ffd166',
  coinEdge: '#e0a43a',
  hairline: 'rgba(74,58,102,0.14)',
  sunken: 'rgba(74,58,102,0.1)',
} as const;

export const radius = { pill: 999, card: 22, board: 26 } as const;
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
