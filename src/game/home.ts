// Cubo Blocks — What the Jouer tab puts first: the run to continue. Pure.
import { LV, M, WD } from '../core';
import { tr } from '../core/i18n';
import type { Profile, RunState } from '../core/types';
import { levelName } from '../state/progress';
import { eventLevelName } from './events';
import { inProgress, isFree, modeLabel } from './modes';
import { puzzleTitle } from './puzzle';

export type ResumeKind = 'free' | 'adventure' | 'daily' | 'event' | 'puzzle';
export interface Resume { kind: ResumeKind; title: string; sub: string }

// The run on the board when it is worth resuming (one only: a parked free run keeps its own row).
// title = what it is, sub = where it stands (score, goal, moves left).
export function resumeOf(st: RunState): Resume | null {
  if (!inProgress(st)) return null;
  const pts = tr`${st.score.toLocaleString('fr-FR')} pts`;
  if (isFree(st)) return { kind: 'free', title: modeLabel(st), sub: pts };
  if (st.puzzle) return { kind: 'puzzle', title: puzzleTitle(st.puzzle), sub: pts };
  const stage = st.stage;
  if (!stage) return null;
  const left = stage.clock ? '' : ' · ' + tr`${stage.movesLeft} coups`;
  const goal = LV.goalText(stage.goal) + left;
  if (stage.daily) return { kind: 'daily', title: tr('Défi du jour'), sub: goal };
  if (stage.event) return { kind: 'event', title: `${M.eventById(stage.event)?.name || ''} · ${eventLevelName(stage.n)}`, sub: goal };
  return { kind: 'adventure', title: `${WD.WORLDS[stage.world]?.name || ''} · ${levelName(stage.n)}`, sub: goal };
}

// The first event level not cleared yet (the one "Jouer" opens); null once all are.
export function eventNext(profile: Profile, id: string, day: string): number | null {
  const ev = M.eventById(id);
  if (!ev) return null;
  for (let n = 1; n <= ev.levels; n++) if (M.eventStars(profile, id, day, n) === undefined) return n;
  return null;
}
