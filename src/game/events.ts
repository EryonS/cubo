// Cubo Blocks — Season event rows and the payoff of a won event level (legacy screens/events.js). Pure.
import { M } from '../core';
import { lang, locale, tr } from '../core/i18n';
import type { Earned } from '../core/meta';
import type { Profile, RunState } from '../core/types';
import { freshFlags, type SettleFlags } from './levelend';

export const eventLevelName = (n: number) => (n === 10 ? tr('Boss') : tr('Niveau ') + n);

// "31 octobre" / "1er novembre", "October 31" in English.
export function eventDate(day: string) {
  const date = new Date(day + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
  return lang() === 'fr' && day.slice(8, 10) === '01' ? date.replace(/^1 /, '1er ') : date;
}

export const hatName = (id: string) => M.SKINS.cubo.find((x) => x.id === id)?.name || '';

export interface EventRow { id: string; name: string; icon: string; sub: string; playing: boolean }

// One row per event open today, plus the event of a level still in progress (it stays reachable).
export function eventRows(profile: Profile, state: RunState, day: string): EventRow[] {
  const list = M.eventsFor(day).slice();
  const stage = state.stage;
  const going = !!(stage?.event && !state.over && (state.moves > 0 || (state.clock || 0) > 0));
  const playing = going ? M.eventById(stage!.event!) : null;
  if (playing && !list.some((e) => e.id === playing.id)) list.unshift(playing);
  return list.map((ev) => {
    const done = M.eventCleared(profile, ev.id, day);
    const trophy = M.seasonTrophy(profile, ev.id, M.eventYear(day));
    const sub = playing && playing.id === ev.id ? tr`${eventLevelName(stage!.n)} en cours`
      : done >= ev.levels ? (trophy === 'gold' ? tr('Terminé · trophée en or') : tr('Terminé · trophée en argent'))
        : tr`${done} / ${ev.levels} niveaux · jusqu’au ${eventDate(M.eventEnd(ev.id, day))}`;
    return { id: ev.id, name: ev.name, icon: ev.icon, sub, playing: !!(playing && playing.id === ev.id) };
  });
}

export interface EventPay { earned: Earned[]; unlocked: { kind: string; id: string }[]; trophy: 'silver' | 'gold' | null }

// A won event level is paid once per start (applyEvent itself keeps the best stars).
export function settleEvent(
  profile: Profile,
  stage: { event?: string; eventDay?: string; n: number; stars: number; won: boolean },
  key: string,
  flags: SettleFlags,
  day: string,
): { profile: Profile; pay: EventPay | null; flags: SettleFlags } {
  const f = flags.key === key ? flags : freshFlags();
  if (f.key !== key) f.key = key;
  if (!stage.event || !stage.won || f.won) return { profile, pay: null, flags: { ...f, key } };
  const res = M.applyEvent(profile, stage.event, stage.eventDay || day, stage.n, stage.stars);
  return {
    profile: res.profile,
    pay: { earned: res.report.earned, unlocked: res.report.unlocked, trophy: res.report.trophy },
    flags: { key, won: true, failed: f.failed },
  };
}
