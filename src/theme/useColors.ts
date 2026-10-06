// The menu colors of the equipped theme: screens, sheets and the tab bar wear it (legacy applyThemeCss).
// The game screen overrides it with the played theme (a world's, a free run's own) for its HUD and cards.
import { createContext, useContext, useMemo } from 'react';
import { useGame } from '../state/store';
import { MENU_OVERRIDES } from './menu-themes';
import { colors } from './tokens';

// A background dark enough for light status / navigation bar content.
export const darkBg = (hex: string) => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 150;
};

export const colorsFor = (board: string) => ({ ...colors, ...(MENU_OVERRIDES[board] || {}) }) as typeof colors;

const Played = createContext<string | null>(null);
export const PlayedTheme = Played.Provider;

export function useColors(): typeof colors {
  const equipped = useGame((s) => s.profile.equipped.boards);
  const board = useContext(Played) ?? equipped;
  return useMemo(() => colorsFor(board), [board]);
}
