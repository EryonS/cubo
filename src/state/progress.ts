// Cubo Blocks — Progress shown on menus, from the profile. Pure.
import { M } from '../core';
import { tr } from '../core/i18n';
import type { Profile } from '../core/types';

// The first open level not cleared yet, as [world, n]; the bonus levels (21-25) once the Aventure is finished;
// null once every open level is cleared.
export function nextAdventure(profile: Profile): [string, number] | null {
  let open = true;
  for (const w of M.WORLD_ORDER) {
    if (!M.worldOpen(profile, w)) { open = false; break; }
    for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) if (M.levelOpen(profile, w, n) && !M.levelCleared(profile, w, n)) return [w, n];
  }
  if (!open || !M.bonusOpen(profile)) return null;
  for (const w of M.WORLD_ORDER) {
    for (let n = M.LEVELS_PER_WORLD + 1; n <= M.LEVELS_PER_WORLD + M.BONUS_LEVELS; n++) if (M.levelOpen(profile, w, n) && !M.levelCleared(profile, w, n)) return [w, n];
  }
  return null;
}

// "Niveau 7", "Épreuve" (level 10), "Boss" (level 20), "Bonus 1" to "Bonus 4" (21-24) or "Revanche" (25).
export const levelName = (n: number) => (n === M.LEVELS_PER_WORLD ? tr('Boss') : n === M.TRIAL_LEVEL ? tr('Épreuve')
  : n === M.LEVELS_PER_WORLD + M.BONUS_LEVELS ? tr('Revanche') : M.isBonus(n) ? tr`Bonus ${n - M.LEVELS_PER_WORLD}` : tr('Niveau ') + n);
