// The menu colors of the equipped theme: screens, sheets and the tab bar wear it (legacy applyThemeCss).
import { useMemo } from 'react';
import { useGame } from '../state/store';
import { MENU_OVERRIDES } from './menu-themes';
import { colors } from './tokens';

// A background dark enough for light status / navigation bar content.
export const darkBg = (hex: string) => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 150;
};

export const colorsFor = (board: string) => ({ ...colors, ...(MENU_OVERRIDES[board] || {}) }) as typeof colors;

export function useColors(): typeof colors {
  const board = useGame((s) => s.profile.equipped.boards);
  return useMemo(() => colorsFor(board), [board]);
}
