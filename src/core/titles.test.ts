import test from 'node:test';
import assert from 'node:assert/strict';
import './worlds';
import * as M from './meta';
import * as T from './titles';
import type { Profile } from './types';

const fresh = (): Profile => M.createProfile('2026-10-01');

test('a new profile has only the starter title; unknown ids show nothing', () => {
  assert.deepEqual(T.earnedTitles(fresh()).map((t) => t.id), ['newbie']);
  assert.equal(T.titleName('nope'), '');
  assert.equal(T.titleName(undefined), '');
  assert.equal(T.moodText('<script>'), '');
  assert.equal(T.moodFace(undefined), 'happy');
  assert.equal(T.moodFace('fire'), 'hot');
});

test('ids fit the rules regex and are unique', () => {
  for (const list of [T.TITLES, T.MOODS]) {
    assert.equal(new Set(list.map((x) => x.id)).size, list.length);
    for (const x of list) assert.match(x.id, /^[a-z0-9-]{1,24}$/);
  }
  assert.ok(T.TITLES.length >= 16 && T.TITLES.length <= 20);
  assert.equal(T.MOODS.length, 12);
});

test('league titles read the claim history; tier titles use the best tier even after a drop', () => {
  const p = { ...fresh(), league: { tier: 1, best: 3, wins: 1, ups: 2 } };
  const ids = T.earnedTitles(p).map((t) => t.id);
  for (const id of ['king', 'riser', 'gold', 'sapphire']) assert.ok(ids.includes(id), id);
  for (const id of ['topshot', 'ruby', 'diamond']) assert.ok(!ids.includes(id), id);
  assert.ok(T.earnedTitles({ ...fresh(), league: { tier: 2 } }).some((t) => t.id === 'gold')); // old profile: tier alone counts
});

test('play titles read lifetime stats and bests', () => {
  const p: Profile = { ...fresh(), lifetime: { bestCombo: 8, bestMulti: 4, coinsEarned: 5000 } };
  const ids = T.earnedTitles(p, { classic: 12000 }).map((t) => t.id);
  for (const id of ['combo', 'quad', 'piggy', 'summit']) assert.ok(ids.includes(id), id);
  assert.ok(!T.earnedTitles(p).some((t) => t.id === 'summit'));
  assert.ok(T.earnedTitles({ ...p, modes: { chrono: { games: 100 } } }).some((t) => t.id === 'chrono'));
});

test('calendar title needs every event trophy of one year', () => {
  const some = Object.fromEntries(M.EVENTS.slice(1).map((e) => [`${e.id}-2026`, 'gold']));
  assert.ok(!T.isEarned({ ...fresh(), trophies: some as Profile['trophies'] }, 'seasons'));
  const all = Object.fromEntries(M.EVENTS.map((e) => [`${e.id}-2026`, 'bronze']));
  assert.ok(T.isEarned({ ...fresh(), trophies: all as Profile['trophies'] }, 'seasons'));
});

test('freshTitles announces once and marks them seen', () => {
  const p: Profile = { ...fresh(), lifetime: { bestCombo: 9 } };
  const a = T.freshTitles(p);
  assert.deepEqual(a.fresh.map((t) => t.id), ['newbie', 'combo']);
  assert.deepEqual(a.profile.titlesSeen, ['newbie', 'combo']);
  assert.equal(T.freshTitles(a.profile).fresh.length, 0);
});
