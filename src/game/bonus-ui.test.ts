import assert from 'node:assert/strict';
import { test } from 'node:test';
import { L } from '../core';
import { BONUS_TYPES, BONUS_UI, COIN_UI, times } from './bonus-ui';

test('every bonus has a name, a hint and a description at each upgrade level', () => {
  assert.deepEqual(BONUS_TYPES, ['rotate', 'nitro', 'shield', 'bomb', 'reroll']);
  for (const type of BONUS_TYPES) {
    const ui = BONUS_UI[type];
    assert.ok(ui.name && ui.hint(1));
    assert.equal(ui.levels.length, L.UPGRADE_MAX);
    for (let lv = 1; lv <= L.UPGRADE_MAX; lv++) assert.ok(ui.desc(lv).length > 5, `${type} ${lv}`);
  }
  assert.ok(COIN_UI.bag.desc.includes('5'));
});

test('timed bonuses state their length from the upgrade tables; Étoile its multiplier', () => {
  assert.equal(BONUS_UI.rotate.desc(2), '45 s : touche une forme du bac pour la faire pivoter.');
  assert.equal(BONUS_UI.nitro.hint(2), 'Points ×2,5');
  assert.equal(times(2), '×2');
  assert.match(BONUS_UI.nitro.desc(1), /double/);
});
