// Cubo Blocks — Menu colors of every theme (legacy themes css tokens). Generated from the legacy tables.
// Screens, sheets and the tab bar wear the equipped theme (useColors). Checked for WCAG contrast:
// muted ≥ 4.5:1 on bg, panel and panel2; onAccent ≥ 3:1 on accent (button labels are large bold text).
import type { colors } from './tokens';

export type MenuColors = { [K in keyof typeof colors]: string };
export const MENU_OVERRIDES: Record<string, Partial<MenuColors>> = {
  toy: { bg: '#ffeef4', panel: '#ffffff', panel2: '#fbf1f6', text: '#4a3a66', muted: '#6e5f8c', accent: '#7c5cff', onAccent: '#ffffff', good: '#1f9e68', scrim: 'rgba(74,58,102,0.45)', edge: '#f3dce8', hairline: 'rgba(74,58,102,0.14)', sunken: 'rgba(74,58,102,0.1)' },
  plain: { bg: '#8fdcff', panel: '#ffffff', panel2: '#eef8ff', text: '#1d3557', muted: '#455c7a', accent: '#f74a69', onAccent: '#ffffff', good: '#2f9e44', scrim: 'rgba(29,53,87,0.45)', edge: '#d6e9f7', hairline: 'rgba(29,53,87,0.14)', sunken: 'rgba(29,53,87,0.1)' },
  sea: { bg: '#07284a', panel: '#0b3a66', panel2: '#0f4a80', text: '#e8f7ff', muted: '#9fcbe6', accent: '#ffd166', onAccent: '#07284a', good: '#5ee08a', scrim: 'rgba(6,7,10,0.72)', edge: '#5fd4ff', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  space: { bg: '#0a0a24', panel: '#1a1440', panel2: '#261d57', text: '#f1ecff', muted: '#b8aee0', accent: '#ffd23f', onAccent: '#1a1440', good: '#5ee08a', scrim: 'rgba(6,7,10,0.72)', edge: '#8a6bff', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  ice: { bg: '#dff3fc', panel: '#ffffff', panel2: '#eef8fd', text: '#1b3a5c', muted: '#4a6884', accent: '#2690e0', onAccent: '#ffffff', good: '#1f9e68', scrim: 'rgba(27,58,92,0.45)', edge: '#cdeaf8', hairline: 'rgba(27,58,92,0.14)', sunken: 'rgba(27,58,92,0.1)' },
  forest: { bg: '#0f2419', panel: '#1a3a28', panel2: '#234a33', text: '#f2ffe8', muted: '#b4d6b0', accent: '#ffe066', onAccent: '#1a3a28', good: '#5ee08a', scrim: 'rgba(6,7,10,0.72)', edge: '#5a8a4a', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  retro: { bg: '#9bbc0f', panel: '#b4cc4a', panel2: '#a6c22e', text: '#0f380f', muted: '#234d23', accent: '#0f380f', onAccent: '#9bbc0f', good: '#0f380f', scrim: 'rgba(15,56,15,0.6)', edge: '#306230', hairline: 'rgba(15,56,15,0.3)', sunken: 'rgba(15,56,15,0.18)' },
  arcade: { bg: '#1a0b3d', panel: '#221047', panel2: '#2f1860', text: '#ffffff', muted: '#c9b3f0', accent: '#36f9ff', onAccent: '#1a0b3d', good: '#7cff4f', scrim: 'rgba(6,7,10,0.72)', edge: '#36f9ff', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  volcano: { bg: '#1a0a0a', panel: '#2a120c', panel2: '#3a1a10', text: '#fff1e6', muted: '#e0b49a', accent: '#ffb000', onAccent: '#1a0a0a', good: '#9be36b', scrim: 'rgba(6,7,10,0.72)', edge: '#ff6a1a', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  newyear: { bg: '#0b0f2e', panel: '#161c48', panel2: '#212a63', text: '#f4f1ff', muted: '#b4bce6', accent: '#ffd23f', onAccent: '#1a1440', good: '#5ee08a', scrim: 'rgba(6,7,10,0.72)', edge: '#ffd23f', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  lunar: { bg: '#3a0a10', panel: '#4f1018', panel2: '#651820', text: '#fff1d6', muted: '#f0bfa0', accent: '#ffc94a', onAccent: '#5a0a10', good: '#5ee08a', scrim: 'rgba(6,7,10,0.72)', edge: '#ffc94a', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  valentine: { bg: '#ffc2d4', panel: '#ffffff', panel2: '#ffeaf1', text: '#6a1b4d', muted: '#894468', accent: '#f74a69', onAccent: '#ffffff', good: '#2f9e44', scrim: 'rgba(106,27,77,0.4)', edge: '#ffc2d4', hairline: 'rgba(106,27,77,0.14)', sunken: 'rgba(106,27,77,0.08)' },
  easter: { bg: '#bfe8ff', panel: '#ffffff', panel2: '#f1fae4', text: '#3a4a1e', muted: '#586b3b', accent: '#7a5cff', onAccent: '#ffffff', good: '#2f9e44', scrim: 'rgba(58,74,30,0.4)', edge: '#dcefc4', hairline: 'rgba(58,74,30,0.14)', sunken: 'rgba(58,74,30,0.08)' },
  beach: { bg: '#8fdcff', panel: '#ffffff', panel2: '#eaf8ff', text: '#0d4a6b', muted: '#345f76', accent: '#db6834', onAccent: '#ffffff', good: '#2f9e44', scrim: 'rgba(13,74,107,0.4)', edge: '#cfeefb', hairline: 'rgba(13,74,107,0.14)', sunken: 'rgba(13,74,107,0.08)' },
  xmas: { bg: '#0d2238', panel: '#15324f', panel2: '#1d4266', text: '#f2fbff', muted: '#a9c4dc', accent: '#ed5662', onAccent: '#ffffff', good: '#5ee08a', scrim: 'rgba(6,7,10,0.72)', edge: '#e8364a', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
  halloween: { bg: '#160c26', panel: '#24123a', panel2: '#341c50', text: '#fff1e0', muted: '#c9b0e0', accent: '#ff8a1a', onAccent: '#160c26', good: '#9be36b', scrim: 'rgba(6,7,10,0.72)', edge: '#ff8a1a', hairline: 'rgba(255,255,255,0.12)', sunken: 'rgba(0,0,0,0.3)' },
};
