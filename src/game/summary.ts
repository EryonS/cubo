// Cubo Blocks — End-of-run summary tiles (legacy screens/gameover.js runSummary).
import { locale, tr } from '../core/i18n';
import type { RunEnd } from './run';
import { times } from './bonus-ui';

const fmt = (n: number) => n.toLocaleString(locale());

export interface Tile { label: string; value: string; best?: boolean }

// Four numbers of the run; a personal best is flagged against the lifetime bests from before the run.
export function runSummary(end: Pick<RunEnd, 'stats' | 'lifeBefore'>): Tile[] {
  const st = end.stats;
  const was = end.lifeBefore as Record<string, number | undefined>;
  const beat = (k: 'bestCombo' | 'bestMulti') => (was[k] || 0) > 0 && (st[k] || 0) > (was[k] || 0);
  const combo = st.bestCombo || 0;
  const multi = st.bestMulti || 0;
  return [
    { label: tr('Lignes'), value: fmt(st.lines || 0) },
    { label: tr('Combo max'), value: combo >= 2 ? times(combo) : '–', best: combo >= 2 && beat('bestCombo') },
    { label: tr('D’un coup'), value: multi >= 2 ? multi + tr(' lignes') : multi === 1 ? tr('1 ligne') : '–', best: multi >= 2 && beat('bestMulti') },
    { label: tr('Formes'), value: fmt(st.pieces || 0) },
  ];
}
