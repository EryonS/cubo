// Cubo Blocks — End of an Aventure level (legacy aventure.js endLevel / nextLevelOf). Pure: the card
// applies the level's result to the profile once per start, whatever the number of times the receiver is called.
import { M } from '../core';
import { tr } from '../core/i18n';
import type { Earned } from '../core/meta';
import type { Profile } from '../core/types';

export interface LevelReport { earned: Earned[]; total: number; themeUnlocked: string | null; streak?: { count: number } | null; unlocked?: { id: string } | null }
// Per start of a level: the win is paid once, a failed attempt counts once (even if bought moves run out again).
export interface SettleFlags { key: string; won: boolean; failed: boolean }
export const freshFlags = (): SettleFlags => ({ key: '', won: false, failed: false });

interface Ending { world: string; n: number; stars: number; won: boolean; daily?: string; event?: unknown }

// Applies stars, level rewards, stickers (on a win) or one recorded fail (on a loss). A daily is paid here too; event levels are
// settled by their own screen: untouched here.
export function settleLevel(profile: Profile, stage: Ending, key: string, flags: SettleFlags, day: string): { profile: Profile; report: LevelReport | null; flags: SettleFlags } {
  const f = flags.key === key ? flags : { key, won: false, failed: false };
  if (stage.event) return { profile, report: null, flags: f };
  if (stage.daily) {
    // A won daily: stars, first-clear coins, streak, week chest, gold skin. A lost one is only an attempt (counted when the run ended).
    if (!stage.won || f.won) return { profile, report: null, flags: f };
    const res = M.applyDaily(profile, stage.daily, day, stage.stars);
    const rep = res.report;
    const report: LevelReport = { earned: [...rep.earned], total: rep.total, themeUnlocked: null, streak: rep.streak, unlocked: rep.unlocked };
    const st = M.checkStickers(res.profile, day);
    for (const s of st.fresh) report.earned.push({ label: tr('Autocollant : ') + s.name, coins: s.reward || M.STICKER_REWARD });
    return { profile: st.profile, report, flags: { ...f, won: true } };
  }
  if (stage.won) {
    if (f.won) return { profile, report: null, flags: f };
    const res = M.applyLevel(profile, stage.world, stage.n, stage.stars);
    const report: LevelReport = { ...res.report, earned: [...res.report.earned] };
    const st = M.checkStickers(res.profile, day);
    for (const s of st.fresh) report.earned.push({ label: tr('Autocollant : ') + s.name, coins: s.reward || M.STICKER_REWARD });
    return { profile: st.profile, report, flags: { ...f, won: true } };
  }
  if (f.failed) return { profile, report: null, flags: f };
  return { profile: M.recordFail(profile, stage.world, stage.n), report: null, flags: { ...f, failed: true } };
}

// The level after [w, n]: the next of the world, then level 1 of the next world once open.
export function nextLevelOf(profile: Profile, w: string, n: number): [string, number] | null {
  if (n < M.LEVELS_PER_WORLD) return [w, n + 1];
  const next = M.WORLD_ORDER[M.WORLD_ORDER.indexOf(w) + 1];
  return next && M.worldOpen(profile, next) ? [next, 1] : null;
}

export const lastOpenWorld = (profile: Profile) => M.WORLD_ORDER.filter((w) => M.worldOpen(profile, w)).pop() || M.WORLD_ORDER[0];

export const levelMood = (won: boolean, stars: number) => (!won ? 'sad' : stars >= 3 ? 'star' : 'party');
