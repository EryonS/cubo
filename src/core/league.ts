/*
 * Cubo Blocks — weekly leagues: tiers, group promotion / demotion, rewards and the end-of-week claim. Pure; the
 * group itself (who is in it, the scores) is Firestore's (platform/social.ts) and the claim is driven by game/social.ts.
 */
import { tr } from './i18n';
import { earn } from './meta';
import { rankRows, weekId, type Ranked } from './social';
import type { Profile } from './types';

export const TIER_COUNT = 6; // Bronze, Argent, Or, Saphir, Rubis, Diamant
export const GROUP_SIZE = 30; // players per group (firestore.rules pointer)
export const BIG_GROUP = 15; // from this size five go up and five go down, under it one
export const PROMO_BONUS = 15;
const POINTS_PAY = [20, 12, 8, 4, 4, 4, 4, 4, 4, 4]; // coins for points rank 1..10
const BEST_PAY = [10, 6, 4]; // coins for best-score rank 1..3
export const MIN_PAID = 5; // smaller groups only pay the promotion (a lone player would win both boards every week)

export const clampTier = (tier: number) => Math.max(0, Math.min(TIER_COUNT - 1, Math.floor(tier) || 0));
export const tierName = (tier: number) => [tr('Bronze'), tr('Argent'), tr('Or'), tr('Saphir'), tr('Rubis'), tr('Diamant')][clampTier(tier)];

export type League = NonNullable<Profile['league']>;
export const tierOf = (p: Pick<Profile, 'league'>) => clampTier(p.league?.tier ?? 0);
export const groupTier = (group: string) => clampTier(parseInt(group, 10));

// Places that go up / down in a group of `size`: 5 from 15 players, else 1; a group of 1 stays put.
export const cut = (size: number) => (size >= BIG_GROUP ? 5 : size >= 2 ? 1 : 0);

// -1 down, 0 stay, +1 up for a (shared) rank in a group. Ties at a cut are not split: players tied on the last
// promotion place all go up, players tied on the first demotion place all stay (a demotion needs the whole tie
// inside the bottom places). Never under Bronze nor over Diamant; nobody with 0 points goes up.
export function leagueMove(rank: number, size: number, tier: number, points = 1): -1 | 0 | 1 {
  const n = cut(size);
  if (n && rank <= n && points > 0 && tier < TIER_COUNT - 1) return 1;
  if (n && rank > size - n && tier > 0) return -1;
  return 0;
}

export interface Pay { label: string; coins: number }
// Coins of a finished week in a group of `size`. A rank of 0 = no ranking (nothing paid). The promotion bonus
// rides on `promoted`; ranks pay from MIN_PAID players.
export function leagueRewards(pointsRank: number, bestRank: number, promoted: boolean, size: number): Pay[] {
  const out: Pay[] = [];
  if (size < MIN_PAID) pointsRank = bestRank = 0;
  const pts = pointsRank >= 1 ? POINTS_PAY[pointsRank - 1] || 0 : 0;
  if (pts) out.push({ label: tr`Points de la semaine, ${pointsRank}e`, coins: pts });
  const best = bestRank >= 1 ? BEST_PAY[bestRank - 1] || 0 : 0;
  if (best) out.push({ label: tr`Meilleur score, ${bestRank}e`, coins: best });
  if (promoted) out.push({ label: tr('Promotion'), coins: PROMO_BONUS });
  return out;
}
export const totalPay = (lines: Pay[]) => lines.reduce((s, l) => s + l.coins, 0);

export interface GroupScore { uid: string; name: string; points: number; best: number }
// The two boards of a group (ties by name, then uid, so every device orders the same).
const byName = (a: GroupScore, b: GroupScore) => a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid);
export const pointsBoard = (rows: GroupScore[]): Ranked<GroupScore>[] => rankRows(rows, (r) => r.points, byName);
export const bestBoard = (rows: GroupScore[]): Ranked<GroupScore>[] => rankRows(rows, (r) => r.best, byName);

export interface LeagueReport {
  week: string; group: string; size: number; from: number; to: number; move: -1 | 0 | 1;
  pointsRank: number; bestRank: number; points: number; best: number; earned: Pay[]; total: number;
}

// Is there a finished week to settle? (a group joined in a week before `now`, not claimed yet)
export const claimable = (p: Pick<Profile, 'league'>, now: number) => {
  const l = p.league;
  return !!(l && l.last && l.last.week < weekId(now) && l.claimed !== l.last.week);
};

// Settles the last joined week. `rows` = the group's score docs as read from the server (mine among them).
// null when nothing to claim (also the second time: `claimed` holds the week). A group read that does not hold me
// marks the week claimed with nothing paid. Several weeks skipped: only the joined one counts, the tier moves once.
export function claim(profile: Profile, uid: string, rows: GroupScore[], now: number): { profile: Profile; report: LeagueReport | null } | null {
  const l = profile.league;
  if (!l || !l.last || !claimable(profile, now)) return null;
  const last = l.last;
  const from = tierOf(profile);
  const done = (p: Profile, report: LeagueReport | null) => ({ profile: { ...p, league: { ...l, tier: report ? report.to : from, claimed: last.week } }, report });
  const mine = rows.find((r) => r.uid === uid);
  if (!mine) return done(profile, null);
  const points = pointsBoard(rows).find((r) => r.row.uid === uid)!;
  const best = bestBoard(rows).find((r) => r.row.uid === uid)!;
  const bestRank = mine.best > 0 ? best.rank : 0;
  const move = leagueMove(points.rank, rows.length, from, mine.points);
  const earned = leagueRewards(mine.points > 0 ? points.rank : 0, bestRank, move > 0, rows.length);
  const total = totalPay(earned);
  const report: LeagueReport = {
    week: last.week, group: last.group, size: rows.length, from, to: clampTier(from + move), move,
    pointsRank: points.rank, bestRank, points: mine.points, best: mine.best, earned, total,
  };
  return done(total ? earn(profile, total) : profile, report);
}
