// Cubo Blocks — The colors of every board theme (legacy themes/worlds.js and themes/events.js), for
// previews in the Boutique. In game, board themes other than Jouet come with milestone 6: until
// then the run keeps the Jouet look. Generated once from the legacy tables; decor is not ported.
import { EVENT_DECOR } from './decor/events';
import { WORLD_DECOR } from './decor/worlds';
import { TOY, TOY_PALETTE, type Theme } from './theme';

type Look = Omit<Theme, 'id' | 'palette' | 'dots' | 'skin' | 'patterns' | 'shadow' | 'paint' | 'animate'> & { palette?: readonly (string | null)[]; shadow?: string };

const LOOKS: Record<string, Look> = {
  toy: {
    base: '#ffeef4',
    board: '#ffffff',
    empty: '#f6e9f2',
    cellR: 0.24,
    ink: '#4a3a66',
    accent: '#7c5cff',
    danger: '#ff5d7a',
    shadow: 'rgba(200,110,160,0.28)',
    frame: { r: 26 },
    plate: { fill: '#ffffff', r: 40, ink: '#7c5cff', sub: '#b39bd6', shadow: 'rgba(200,110,160,0.28)' },
    tag: { fill: '#b7f0d8', ink: '#1e7a55' },
    palette: [null, '#b8a4f0', '#ffab76', '#ffcf4d', '#6fd6a0', '#5ccfe6', '#6ea8ff', '#8b7cf6', '#d49cff', '#ff8fb8', '#b6e36b', '#ff7a8a', '#3fc1b0', '#a3b1c9', '#e0b07a'],
  },
  plain: {
    base: '#8fdcff',
    board: '#8a5a3b',
    empty: '#6e4630',
    cellR: 0.2,
    ink: '#1d3557',
    accent: '#ffcf33',
    danger: '#e63946',
    frame: { r: 20, line: '#a8744e', lw: 4, inset: 3 },
    plate: { fill: '#ffffff', r: 22, ink: '#ff4d6d', sub: '#6b8bb0' },
    tag: { fill: '#ffd23f', ink: '#6b3a00' },
  },
  sea: {
    base: '#07284a',
    board: 'rgba(4,26,52,0.86)',
    empty: 'rgba(120,200,255,0.1)',
    cellR: 0.22,
    ink: '#e8f7ff',
    accent: '#ffd166',
    danger: '#ff7a8a',
    frame: { r: 22, line: 'rgba(140,220,255,0.45)', lw: 2, inset: 3 },
    plate: { fill: 'rgba(4,26,52,0.85)', line: '#5fd4ff', lw: 2, inset: 0, r: 24, ink: '#ffffff', sub: '#8fd8f5' },
    tag: { fill: '#ff8fab', ink: '#3a0a1c' },
  },
  space: {
    base: '#0a0a24',
    board: 'rgba(18,14,48,0.88)',
    empty: 'rgba(170,150,255,0.1)',
    cellR: 0.2,
    ink: '#f1ecff',
    accent: '#ffd23f',
    danger: '#ff6b8b',
    frame: { r: 20, line: '#8a6bff', lw: 2, inset: 3, glow: '#8a6bff' },
    plate: { fill: 'rgba(18,14,48,0.9)', line: '#b69cff', lw: 2, inset: 0, r: 24, ink: '#ffffff', sub: '#c9b8ff', glow: '#8a6bff' },
    tag: { fill: '#ffd23f', ink: '#2a1a00' },
  },
  ice: {
    base: '#dff3fc',
    board: '#ffffff',
    empty: '#e3f2fa',
    cellR: 0.18,
    ink: '#1b3a5c',
    accent: '#2a9df4',
    danger: '#e5484d',
    shadow: 'rgba(60,140,200,0.25)',
    frame: { r: 20, line: '#bfe6fa', lw: 3, inset: 2 },
    plate: { fill: '#ffffff', line: '#bfe6fa', lw: 2, inset: 3, r: 22, ink: '#1f7fd1', sub: '#7fa6c4', shadow: 'rgba(60,140,200,0.25)' },
    tag: { fill: '#2a9df4', ink: '#ffffff' },
  },
  forest: {
    base: '#0f2419',
    board: 'rgba(14,34,22,0.9)',
    empty: 'rgba(190,255,200,0.08)',
    cellR: 0.2,
    ink: '#f2ffe8',
    accent: '#ffe066',
    danger: '#ff7a6a',
    frame: { r: 20, line: '#5a8a4a', lw: 2.5, inset: 3 },
    plate: { fill: '#e84a4a', line: '#ffffff', lw: 3, inset: 5, r: 24, ink: '#ffffff', sub: '#ffe0e0', dots: true },
    tag: { fill: '#ffe066', ink: '#2a2400' },
  },
  retro: {
    pixel: true, scale: 0.62,
    base: '#9bbc0f',
    board: '#8bac0f',
    empty: '#9bbc0f',
    cellR: 0.04,
    ink: '#0f380f',
    accent: '#306230',
    danger: '#0f380f',
    frame: { r: 4, line: '#306230', lw: 4, inset: 2 },
    plate: { fill: '#0f380f', line: '#8bac0f', lw: 2, inset: 4, r: 4, ink: '#9bbc0f', sub: '#8bac0f' },
    tag: { fill: '#306230', ink: '#9bbc0f' },
  },
  arcade: {
    pixel: true, scale: 0.62,
    base: '#1a0b3d',
    board: 'rgba(13,6,36,0.86)',
    empty: '#1d1147',
    cellR: 0.14,
    ink: '#ffffff',
    accent: '#36f9ff',
    danger: '#ff3fd0',
    frame: { r: 12, line: '#7a4dff', lw: 2, inset: 2, glow: '#7a4dff' },
    plate: { fill: 'rgba(13,6,36,0.9)', line: '#36f9ff', lw: 2, inset: 4, r: 10, ink: '#ffffff', sub: '#ff3fd0', glow: '#36f9ff', bulbs: '#ffe600' },
    tag: { fill: '#ff3fd0', ink: '#1a0b3d', glow: '#ff3fd0' },
  },
  volcano: {
    base: '#1a0a0a',
    board: 'rgba(30,12,8,0.9)',
    empty: 'rgba(255,140,80,0.08)',
    cellR: 0.16,
    ink: '#fff1e6',
    accent: '#ffb000',
    danger: '#ff3b30',
    frame: { r: 18, line: '#ff6a1a', lw: 2, inset: 3, glow: '#ff4a00' },
    plate: { fill: '#2a120c', line: '#ff6a1a', lw: 2.5, inset: 3, r: 20, ink: '#ffcf4d', sub: '#ff9a5a', glow: '#ff4a00' },
    tag: { fill: '#ff6a1a', ink: '#1a0a0a', glow: '#ff4a00' },
  },
  newyear: {
    base: '#0b0f2e',
    board: 'rgba(14,18,52,0.88)',
    empty: 'rgba(160,180,255,0.1)',
    cellR: 0.2,
    ink: '#f4f1ff',
    accent: '#ffd23f',
    danger: '#ff5d7a',
    frame: { r: 20, line: '#ffd23f', lw: 2, inset: 3, glow: '#ffb000' },
    plate: { fill: 'rgba(14,18,52,0.92)', line: '#ffd23f', lw: 2, inset: 3, r: 22, ink: '#ffe58a', sub: '#b9c2ff', glow: '#ffb000' },
    tag: { fill: '#ffd23f', ink: '#1a1440', glow: '#ffb000' },
  },
  lunar: {
    base: '#3a0a10',
    board: 'rgba(48,8,14,0.9)',
    empty: 'rgba(255,190,90,0.1)',
    cellR: 0.2,
    ink: '#fff1d6',
    accent: '#ffc94a',
    danger: '#ff6b5a',
    frame: { r: 20, line: '#ffc94a', lw: 2.5, inset: 3, glow: '#ff9a1a' },
    plate: { fill: '#b8141f', line: '#ffc94a', lw: 2.5, inset: 4, r: 22, ink: '#ffe9a8', sub: '#ffd0b0', glow: '#ff9a1a' },
    tag: { fill: '#ffc94a', ink: '#5a0a10', glow: '#ff9a1a' },
  },
  valentine: {
    base: '#ffc2d4',
    board: '#ffffff',
    empty: '#ffe4ec',
    cellR: 0.24,
    ink: '#6a1b4d',
    accent: '#ff4d6d',
    danger: '#d6204a',
    frame: { r: 22, line: '#ff8fab', lw: 3, inset: 3 },
    plate: { fill: '#ffffff', line: '#ff8fab', lw: 2.5, inset: 3, r: 24, ink: '#ff4d6d', sub: '#b0577e' },
    tag: { fill: '#ff4d6d', ink: '#ffffff' },
  },
  easter: {
    base: '#bfe8ff',
    board: '#fff8e6',
    empty: '#f3e8cc',
    cellR: 0.22,
    ink: '#3a4a1e',
    accent: '#ff8fb8',
    danger: '#e63946',
    frame: { r: 22, line: '#b7e07a', lw: 4, inset: 3 },
    plate: { fill: '#ffffff', r: 22, ink: '#7a5cff', sub: '#6a8a3a' },
    tag: { fill: '#ffd23f', ink: '#6b3a00' },
  },
  beach: {
    base: '#8fdcff',
    board: '#fff3d6',
    empty: '#f5e2b8',
    cellR: 0.22,
    ink: '#0d4a6b',
    accent: '#ff7a3d',
    danger: '#e63946',
    frame: { r: 22, line: '#f0c987', lw: 4, inset: 3 },
    plate: { fill: '#ffffff', r: 22, ink: '#ff7a3d', sub: '#3d86a8' },
    tag: { fill: '#2ec4d6', ink: '#ffffff' },
  },
  xmas: {
    base: '#0d2238',
    board: 'rgba(10,30,50,0.9)',
    empty: 'rgba(200,230,255,0.1)',
    cellR: 0.2,
    ink: '#f2fbff',
    accent: '#ffd23f',
    danger: '#ff5d6a',
    frame: { r: 20, line: '#e8364a', lw: 3, inset: 3, glow: '#e8364a' },
    plate: { fill: '#e8364a', line: '#ffffff', lw: 2.5, inset: 4, r: 22, ink: '#ffffff', sub: '#ffd6da' },
    tag: { fill: '#2f9e5a', ink: '#ffffff' },
  },
  halloween: {
    base: '#160c26',
    board: 'rgba(24,14,40,0.9)',
    empty: 'rgba(255,150,60,0.09)',
    cellR: 0.2,
    ink: '#fff1e0',
    accent: '#ff8a1a',
    danger: '#ff4d6a',
    frame: { r: 20, line: '#ff8a1a', lw: 2, inset: 3, glow: '#ff6a00' },
    plate: { fill: '#24123a', line: '#ff8a1a', lw: 2.5, inset: 3, r: 22, ink: '#ffb347', sub: '#c9a8f0', glow: '#ff6a00' },
    tag: { fill: '#ff8a1a', ink: '#160c26', glow: '#ff6a00' },
  },
};

const DECOR = { ...WORLD_DECOR, ...EVENT_DECOR };

// The theme of a board id: colors, fonts and the decor painted behind the board (Jouet when unknown).
export function boardTheme(id: string, skin = 'classic'): Theme {
  const look = LOOKS[id];
  if (!look || id === 'toy') return { ...TOY, skin };
  const decor = DECOR[id] || {};
  return { ...TOY, ...look, id, palette: look.palette || TOY_PALETTE, dots: undefined, skin, shadow: look.shadow || 'rgba(0,0,0,0.35)', paint: decor.paint, animate: decor.animate };
}

// Rétro levels squash every shape family into three LCD greens (the world's drawback).
const RETRO4: readonly (string | null)[] = [null, ...Array.from({ length: 14 }, (_, i) => ['#0f380f', '#306230', '#4d7a1e'][i % 3])];

// The theme being played: the world of an Aventure level / Mondes run, else the equipped board,
// with the equipped block skin and the Motifs setting (legacy themes/current.js).
export const worldOf = (st: { stage?: { world: string } | null; world?: string | null }) => (st.stage ? st.stage.world : st.world) || null;
export function themeFor(st: { stage?: { world: string } | null; world?: string | null }, board: string, skin: string, patterns: boolean): Theme {
  const id = worldOf(st) || board;
  const th = boardTheme(LOOKS[id] ? id : 'toy', skin);
  return { ...th, patterns, palette: id === 'retro' ? RETRO4 : th.palette };
}

// Block colors of the theme being played (confetti, specks).
export const paletteFor = (st: { stage?: { world: string } | null; world?: string | null }, board: string) => themeFor(st, board, 'classic', false).palette;
