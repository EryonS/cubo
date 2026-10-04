// @ts-nocheck -- ported as is from legacy/tests (loose fixtures); run by tsx, not type-checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './meta';

const v1 = (over) => ({
  coins: 50, day: null, missions: [], missionsDone: 0, games: 3,
  owned: { blocks: ['classic', 'candy', 'neon'], boards: ['night', 'sunset', 'dash'] },
  equipped: { blocks: 'candy', boards: 'dash' },
  ...over,
});

test('migrate refunds retired skins at their old price', () => {
  const { profile, refund } = M.migrate(v1());
  assert.equal(refund, 400 + 300 + 1200);
  assert.equal(profile.coins, 50 + refund);
  assert.deepEqual(profile.owned, { blocks: ['classic', 'neon'], boards: ['toy'], cubo: ['auto'] });
});

test('migrate falls back to the free skin when the equipped one is gone', () => {
  const { profile } = M.migrate(v1());
  assert.deepEqual(profile.equipped, { blocks: 'classic', boards: 'toy', cubo: 'auto' });
});

test('migrate keeps skins that still exist', () => {
  const { profile } = M.migrate(v1({ equipped: { blocks: 'neon', boards: 'night' } }));
  assert.equal(profile.equipped.blocks, 'neon');
});

test('migrate is a no-op on an up-to-date profile', () => {
  const fresh = M.createProfile('2026-09-30');
  const { profile, refund } = M.migrate(fresh);
  assert.equal(refund, 0);
  assert.equal(profile, fresh);
  const once = M.migrate(v1()).profile;
  assert.equal(M.migrate(once).refund, 0);
});

test('catalog: one free skin first in each kind, ids unique', () => {
  for (const list of Object.values(M.SKINS)) {
    assert.equal(list[0].price, 0);
    assert.equal(new Set(list.map((s) => s.id)).size, list.length);
  }
});
