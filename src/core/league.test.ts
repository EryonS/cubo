import test from 'node:test';
import assert from 'node:assert/strict';
import './worlds';
import * as G from './league';
import * as M from './meta';
import type { Profile } from './types';

const utc = (y: number, m: number, d: number, h = 12) => Date.UTC(y, m - 1, d, h);
const W41 = utc(2026, 10, 8); // 2026-W41
const W42 = utc(2026, 10, 15);
const W44 = utc(2026, 10, 29);

const rows = (n: number, step = 100): G.GroupScore[] => Array.from({ length: n }, (_, i) => ({ uid: 'u' + (i + 1), name: 'P' + String(i + 1).padStart(2, '0'), points: (n - i) * step, best: (n - i) * 10 }));
const prof = (league?: Profile['league']): Profile => ({ ...M.createProfile('2026-10-01'), coins: 100, league });
const joined = (tier: number, week = '2026-W41') => prof({ tier, last: { week, group: `${tier}-1` } });

test('moves: 15+ players five up and five down, fewer one and one, a group of one stays', () => {
  const m = (rank: number, size: number, tier = 2, pts = 10) => G.leagueMove(rank, size, tier, pts);
  assert.deepEqual([1, 5, 6, 10, 11, 15].map((r) => m(r, 15)), [1, 1, 0, 0, -1, -1]);
  assert.deepEqual([1, 2, 29, 30].map((r) => m(r, 30)), [1, 1, -1, -1]);
  assert.deepEqual([1, 2, 5, 6, 14].map((r) => m(r, 14)), [1, 0, 0, 0, -1]);
  assert.deepEqual([1, 2].map((r) => m(r, 2)), [1, -1]);
  assert.equal(m(1, 1), 0);
});

test('moves: Bronze never down, Diamant never up, 0 points never up', () => {
  assert.equal(G.leagueMove(30, 30, 0), 0);
  assert.equal(G.leagueMove(1, 30, 5), 0);
  assert.equal(G.leagueMove(30, 30, 5), -1);
  assert.equal(G.leagueMove(1, 30, 0), 1);
  assert.equal(G.leagueMove(1, 3, 2, 0), 0);
});

test('moves: ties at the cut all go up, ties at the demotion line all stay', () => {
  // 20 players: a tie over places 5-7 shares rank 5 -> all go up; a tie over places 15-17 shares rank 15 -> all stay.
  assert.equal(G.leagueMove(5, 20, 2), 1);
  assert.equal(G.leagueMove(8, 20, 2), 0);
  assert.equal(G.leagueMove(15, 20, 2), 0);
  assert.equal(G.leagueMove(16, 20, 2), -1);
  const g = [...rows(4).map((r) => ({ ...r, points: 500 })), ...rows(16).map((r) => ({ ...r, uid: 'x' + r.uid, points: 10 }))];
  const board = G.pointsBoard(g);
  assert.equal(board[3].rank, 1);
  assert.equal(board[4].rank, 5);
  assert.equal(board[19].rank, 5); // 16 tied on 10 points: nobody of them is demoted (rank 5 <= 15)
  assert.deepEqual(board.map((r) => G.leagueMove(r.rank, 20, 2, r.value)).filter((x) => x < 0), []);
});

test('rewards: points 60/40/30/15 to the tenth, best 40/25/15, promotion 20, rank 0 pays nothing', () => {
  const pay = (p: number, b: number, up = false) => G.totalPay(G.leagueRewards(p, b, up));
  assert.deepEqual([1, 2, 3, 4, 10, 11].map((r) => pay(r, 0)), [60, 40, 30, 15, 15, 0]);
  assert.deepEqual([1, 2, 3, 4].map((r) => pay(0, r)), [40, 25, 15, 0]);
  assert.equal(pay(1, 1, true), 60 + 40 + 20);
  assert.equal(pay(7, 0, true), 35);
  assert.equal(pay(0, 0), 0);
});

test('claim: pays through earn, moves the tier, marks the week; twice is a no-op', () => {
  const r = G.claim(joined(1), 'u1', rows(30), W42)!;
  assert.equal(r.report!.pointsRank, 1);
  assert.equal(r.report!.bestRank, 1);
  assert.equal(r.report!.move, 1);
  assert.equal(r.report!.total, 60 + 40 + 20);
  assert.equal(r.profile.coins, 100 + 120);
  assert.equal(r.profile.lifetime!.coinsEarned, 120);
  assert.deepEqual(r.profile.league, { tier: 2, last: { week: '2026-W41', group: '1-1' }, claimed: '2026-W41' });
  assert.equal(G.claim(r.profile, 'u1', rows(30), W42), null);
});

test('claim: demotion, middle of the pack, Bronze stays Bronze', () => {
  const down = G.claim(joined(3), 'u30', rows(30), W42)!;
  assert.equal(down.report!.move, -1);
  assert.equal(down.report!.total, 0);
  assert.equal(down.profile.coins, 100);
  assert.equal(down.profile.league!.tier, 2);
  const mid = G.claim(joined(3), 'u12', rows(30), W42)!;
  assert.equal(mid.report!.move, 0);
  assert.equal(mid.report!.total, 0);
  assert.equal(mid.report!.pointsRank, 12);
  assert.equal(G.claim(joined(0), 'u30', rows(30), W42)!.profile.league!.tier, 0);
});

test('claim: best score rank is separate (best 0 pays nothing)', () => {
  const g = rows(5).map((r) => ({ ...r, best: r.uid === 'u5' ? 99999 : 0 }));
  const r = G.claim(joined(2), 'u5', g, W42)!;
  assert.equal(r.report!.pointsRank, 5);
  assert.equal(r.report!.bestRank, 1);
  assert.deepEqual(r.report!.earned.map((l) => l.coins), [15, 40]);
  const none = G.claim(joined(2), 'u4', g, W42)!;
  assert.equal(none.report!.bestRank, 0);
  assert.deepEqual(none.report!.earned.map((l) => l.coins), [15]);
});

test('claim: not yet (same week), nothing joined, a group of one, me missing', () => {
  assert.equal(G.claim(joined(1), 'u1', rows(3), W41), null);
  assert.equal(G.claim(prof(), 'u1', rows(3), W42), null);
  assert.equal(G.claim(prof({ tier: 2 }), 'u1', rows(3), W42), null);
  const solo = G.claim(joined(2), 'u1', rows(1), W42)!;
  assert.equal(solo.report!.move, 0);
  assert.equal(solo.report!.total, 60 + 40);
  const gone = G.claim(joined(2), 'zzz', rows(3), W42)!;
  assert.equal(gone.report, null);
  assert.equal(gone.profile.league!.claimed, '2026-W41');
  assert.equal(gone.profile.coins, 100);
});

test('claim: a week skipped keeps the tier, a two-week gap settles the joined week once', () => {
  // Joined in W41, nothing played in W42 (no group), claim at W44: the W41 group counts once.
  const r = G.claim(joined(2), 'u1', rows(30), W44)!;
  assert.equal(r.report!.week, '2026-W41');
  assert.equal(r.profile.league!.tier, 3);
  assert.equal(G.claim(r.profile, 'u1', rows(30), W44), null);
  // The skipped weeks are never claimed again: tier stays, nothing paid, until a new group is joined.
  assert.equal(G.claimable(r.profile, utc(2026, 11, 5)), false);
  // A year boundary compares right.
  assert.equal(G.claimable(joined(1, '2026-W53'), utc(2027, 1, 7)), true);
  assert.equal(G.claimable(joined(1, '2026-W53'), utc(2026, 12, 31)), false);
});

test('saved profile: no league field in an old profile, it survives migrate', () => {
  const old = M.createProfile('2026-10-01');
  assert.equal(old.league, undefined);
  assert.equal(G.tierOf(M.migrate(JSON.parse(JSON.stringify(old))).profile), 0);
  const kept = M.migrate(JSON.parse(JSON.stringify(joined(2)))).profile;
  assert.deepEqual(kept.league, { tier: 2, last: { week: '2026-W41', group: '2-1' } });
});

test('tier helpers', () => {
  assert.equal(G.tierOf(prof()), 0);
  assert.equal(G.tierOf(prof({ tier: 9 })), 5);
  assert.equal(G.groupTier('4-12'), 4);
  assert.equal(G.cut(14), 1);
  assert.equal(G.cut(15), 5);
  assert.equal(G.cut(1), 0);
});
