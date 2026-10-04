import test from 'node:test';
import assert from 'node:assert/strict';
import type { KV } from '../platform/kv-types';
import { loadSaved, loadProfile, saveRun, saveProfile, rollDay, today, RUN_KEY, PROFILE_KEY } from './persist';
import { L } from '../core';

const memory = (init: Record<string, string> = {}): KV & { map: Map<string, string> } => {
  const map = new Map(Object.entries(init));
  return { map, get: (k) => map.get(k), set: (k, v) => void map.set(k, v), remove: (k) => void map.delete(k) };
};

test('an empty store gives a fresh Classique run, default settings and a fresh profile', () => {
  const kv = memory();
  const saved = loadSaved(kv, 5);
  assert.equal(saved.state.mode, 'classic');
  assert.equal(saved.state.over, false);
  assert.equal(saved.parked, null);
  assert.deepEqual(saved.bests, {});
  assert.deepEqual(saved.settings, { sfx: true, music: true, vibrate: true, patterns: false, mascot: true });
  assert.deepEqual(saved.prefs, { mode: 'classic', level: 'normal' });
  const { profile } = loadProfile(kv, '2026-10-04');
  assert.equal(profile.day, '2026-10-04');
  assert.equal(profile.missions.length, 3);
  assert.equal(profile.coins, 0);
});

test('a corrupt save is set aside under <key>.broken and the app starts fresh', () => {
  const kv = memory({ [RUN_KEY]: '{nope', [PROFILE_KEY]: 'not json' });
  const saved = loadSaved(kv, 5);
  assert.equal(saved.state.mode, 'classic');
  assert.equal(kv.map.get(RUN_KEY + '.broken'), '{nope');
  const { profile } = loadProfile(kv, '2026-10-04');
  assert.equal(profile.games, 0);
  assert.equal(kv.map.get(PROFILE_KEY + '.broken'), 'not json');
});

test('a finished run is not resumed; a run in progress is, with its settings', () => {
  const live = L.createGame(9, { mode: 'chrono', level: 'hard' });
  const over = { ...live, over: true };
  assert.equal(loadSaved(memory({ [RUN_KEY]: JSON.stringify({ state: over }) }), 5).state.mode, 'classic');
  const kv = memory({ [RUN_KEY]: JSON.stringify({ state: live, settings: { music: false }, bests: { classic: 1200 } }) });
  const saved = loadSaved(kv, 5);
  assert.equal(saved.state.mode, 'chrono');
  assert.equal(saved.settings.music, false);
  assert.equal(saved.settings.sfx, true);
  assert.equal(saved.bests.classic, 1200);
});

test('saves round-trip', () => {
  const kv = memory();
  const saved = loadSaved(kv, 5);
  saveRun(kv, { ...saved, bests: { classic: 42 } });
  assert.equal(loadSaved(kv, 6).bests.classic, 42);
  const { profile } = loadProfile(kv, '2026-10-04');
  saveProfile(kv, { ...profile, coins: 77 });
  assert.equal(loadProfile(kv, '2026-10-04').profile.coins, 77);
});

test('today() is the local calendar day', () => {
  assert.equal(today(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(today(new Date(2026, 11, 31, 0, 1)), '2026-12-31');
});

test('rollDay keeps the profile on the same day and deals new missions the next day', () => {
  const { profile } = loadProfile(memory(), '2026-10-04');
  assert.equal(rollDay(profile, '2026-10-04'), null);
  const next = rollDay(profile, '2026-10-05')!;
  assert.equal(next.day, '2026-10-05');
  assert.notDeepEqual(next.missions.map((m) => m.id), profile.missions.map((m) => m.id));
});

test('the record from before the run is saved with it (a resumed run compares against it)', () => {
  const kv = memory();
  const saved = loadSaved(kv, 5);
  saveRun(kv, { ...saved, bests: { classic: 900 }, startBest: 500 });
  assert.equal(loadSaved(kv, 6).startBest, 500);
  assert.equal(loadSaved(memory(), 6).startBest, undefined);
});
