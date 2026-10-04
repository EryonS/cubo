// @ts-nocheck -- ported as is from legacy/tests (loose fixtures); run by tsx, not type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from './sync';
import * as M from './meta';

const fresh = () => M.createProfile('2026-10-04');
const played = (over) => ({ ...fresh(), coins: 120, games: 4, ...over });
const local = (profile = played(), over) => ({ profile, settings: { sfx: true }, bests: { classic: 900 }, lang: 'auto', ...over });
const doc = (data = local(), updatedAt = 1000) => S.payload(data, updatedAt);

test('payload keeps the synced parts and stamps the format and time', () => {
  const d = S.payload({ ...local(), state: { score: 5 }, parked: null }, 42);
  assert.deepEqual(Object.keys(d).sort(), ['bests', 'lang', 'profile', 'settings', 'updatedAt', 'v']);
  assert.equal(d.v, S.SYNC_VERSION);
  assert.equal(d.updatedAt, 42);
});

test('validate accepts a payload and refuses broken documents', () => {
  assert.ok(S.validate(doc()));
  assert.equal(S.validate(null), false);
  assert.equal(S.validate({ ...doc(), profile: null }), false);
  assert.equal(S.validate({ ...doc(), profile: { ...played(), coins: 'lots' } }), false);
  assert.equal(S.validate({ ...doc(), settings: [] }), false);
  assert.equal(S.validate({ ...doc(), bests: 3 }), false);
  assert.equal(S.validate({ ...doc(), lang: 'de' }), false);
  assert.equal(S.validate({ ...doc(), updatedAt: '1000' }), false);
  assert.equal(S.validate({ ...doc(), v: 1.5 }), false);
});

test('tooNew spots a document written by a newer app', () => {
  assert.equal(S.tooNew(doc()), false);
  assert.equal(S.tooNew({ ...doc(), v: S.SYNC_VERSION + 1 }), true);
  assert.equal(S.tooNew(doc(local(played({ version: M.PROFILE_VERSION + 1 })))), true);
});

test('isFresh: a profile with no progression yet', () => {
  assert.equal(S.isFresh(fresh()), true);
  assert.equal(S.isFresh(played()), false);
  assert.equal(S.isFresh({ ...fresh(), stickers: { first: '2026-10-04' } }), false);
  assert.equal(S.isFresh({ ...fresh(), adventure: { stars: { 'plaine-1': 2 } } }), false);
});

test('summary shows coins, stars, stickers and last day', () => {
  const s = S.summary(played({ stickers: { a: 'x', b: 'y' }, adventure: { stars: { 'plaine-1': 3, 'plaine-2': 1 } } }));
  assert.deepEqual(s, { coins: 120, stars: 4, stickers: 2, day: '2026-10-04' });
});

test('decide at sign-in', () => {
  const at = (l, r) => S.decide({ local: l, remote: r, sync: null });
  assert.equal(at(local(), null), 'push');
  assert.equal(at(local(), { broken: true }), 'keep');
  assert.equal(at(local(), { ...doc(), v: 99 }), 'update-app');
  assert.equal(at(local(), doc(local(), 5)), 'same');
  assert.equal(at(local(fresh()), doc()), 'pull');
  assert.equal(at(local(), doc(local(played({ coins: 999 })))), 'ask');
});

test('decide while signed in', () => {
  const at = (r, sync) => S.decide({ local: local(), remote: r, sync });
  const mine = doc(local(), 1000);
  const theirs = doc(local(played({ coins: 5 })), 2000);
  assert.equal(at(mine, { syncedAt: 1000, dirty: false }), 'none');
  assert.equal(at(mine, { syncedAt: 1000, dirty: true }), 'push');
  assert.equal(at(theirs, { syncedAt: 1000, dirty: false }), 'pull');
  assert.equal(at(theirs, { syncedAt: 1000, dirty: true }), 'ask');
  assert.equal(at(doc(local(), 2000), { syncedAt: 1000, dirty: true }), 'same');
  assert.equal(at(null, { syncedAt: 1000, dirty: false }), 'push');
  assert.equal(at({ ...theirs, v: 99 }, { syncedAt: 1000, dirty: true }), 'update-app');
});

test('same compares content, not the time stamp', () => {
  assert.equal(S.same(doc(local(), 1), doc(local(), 2)), true);
  const reordered = { lang: 'auto', bests: { classic: 900 }, settings: { sfx: true }, profile: played() };
  assert.equal(S.same(doc(), S.payload(reordered, 3)), true);
  assert.equal(S.same(doc(), doc(local(played({ coins: 1 })))), false);
});
