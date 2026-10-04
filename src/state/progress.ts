// Cubo Blocks — Progress shown on menus, from the profile. Pure.
import { M } from '../core';
import { tr } from '../core/i18n';
import type { Profile } from '../core/types';

// The first open level not cleared yet, as [world, n]; null once every open level is cleared.
export function nextAdventure(profile: Profile): [string, number] | null {
  for (const w of M.WORLD_ORDER) {
    if (!M.worldOpen(profile, w)) return null;
    for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) if (M.levelOpen(profile, w, n) && !M.levelCleared(profile, w, n)) return [w, n];
  }
  return null;
}

// "Niveau 7", "Épreuve" (level 10) or "Boss" (level 20).
export const levelName = (n: number) => (n === M.LEVELS_PER_WORLD ? tr('Boss') : n === M.TRIAL_LEVEL ? tr('Épreuve') : tr('Niveau ') + n);
