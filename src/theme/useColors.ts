// The menu colors of the equipped theme: screens, sheets and the tab bar wear it (legacy applyThemeCss).
import { useMemo } from 'react';
import { useGame } from '../state/store';
import { MENU_OVERRIDES } from './menu-themes';
import { colors } from './tokens';

export const colorsFor = (board: string) => ({ ...colors, ...(MENU_OVERRIDES[board] || {}) }) as typeof colors;

export function useColors(): typeof colors {
  const board = useGame((s) => s.profile.equipped.boards);
  return useMemo(() => colorsFor(board), [board]);
}
