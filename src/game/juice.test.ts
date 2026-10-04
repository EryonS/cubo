import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bannerFor, bannerHead, bannerLook, comboTier, confettiCount, flagFall, flagWave, hslToHex, shakeFor, tierColor, tierHex, type Banner } from './juice';

test('comboTier follows the legacy thresholds', () => {
  assert.equal(comboTier(0), 0);
  assert.equal(comboTier(1, 1), 0);
  assert.equal(comboTier(1, 2), 1);
  assert.equal(comboTier(2), 1);
  assert.equal(comboTier(3), 1);
  assert.equal(comboTier(4), 2);
  assert.equal(comboTier(1, 3), 2);
  assert.equal(comboTier(6), 3);
  assert.equal(comboTier(9, 1), 3);
});

test('tierColor: accent, orange, rainbow', () => {
  assert.equal(tierColor(0, 0, '#7c5cff'), '#7c5cff');
  assert.equal(tierColor(1, 0, '#7c5cff'), '#7c5cff');
  assert.equal(tierColor(2, 0, '#7c5cff'), '#ff8a1f');
  assert.equal(tierColor(3, 1000, '#7c5cff'), 'hsl(250 92% 58%)');
  assert.match(tierHex(3, 1000, '#7c5cff'), /^#[0-9a-f]{6}$/);
});

test('hslToHex', () => {
  assert.equal(hslToHex(0, 100, 50), '#ff0000');
  assert.equal(hslToHex(120, 100, 50), '#00ff00');
  assert.equal(hslToHex(240, 100, 50), '#0000ff');
  assert.equal(hslToHex(0, 0, 100), '#ffffff');
});

test('bannerFor: line words, combo, perfect', () => {
  assert.equal(bannerFor({ lines: 1, combo: 1 }, 0), null);
  assert.deepEqual(bannerFor({ lines: 2, combo: 1 }, 1), { text: 'Double !', sub: '', tier: 1 });
  assert.deepEqual(bannerFor({ lines: 3, combo: 2 }, 2), { text: 'Triple !', sub: 'COMBO ×2', tier: 2 });
  assert.deepEqual(bannerFor({ lines: 1, combo: 3 }, 1), { text: 'Combo ×3', sub: '', tier: 1 });
  assert.deepEqual(bannerFor({ lines: 1, combo: 1, perfect: true }, 0), { text: 'Grille vide !', sub: '+300', tier: 3 });
  assert.equal(bannerFor({ lines: 9, combo: 1 }, 2)?.text, 'Délirant !');
});

test('bannerHead plays the queue one banner after another', () => {
  const q: Banner[] = [{ text: 'a', sub: '', tier: 0 }, { text: 'b', sub: '', tier: 0 }];
  assert.equal(bannerHead(q, 100)?.banner.text, 'a');
  assert.equal(bannerHead(q, 700)?.k, 600 / 1300);
  assert.equal(bannerHead(q, 1500), null);
  assert.equal(q.length, 1);
  assert.equal(bannerHead(q, 1600)?.banner.text, 'b');
  assert.equal(bannerHead([], 0), null);
});

test('bannerLook: calm skips the pop and wobble', () => {
  const calm = bannerLook(0.1, 3, true);
  assert.equal(calm.wobble, 0);
  assert.equal(calm.sunburst, false);
  assert.ok(calm.scale > 1);
  const lively = bannerLook(0.1, 3, false);
  assert.ok(lively.sunburst);
  assert.ok(Math.abs(bannerLook(1, 0, false).alpha) < 1e-9);
  assert.equal(bannerLook(0.5, 0, false).alpha, 1);
});

test('shake and confetti amounts', () => {
  assert.equal(shakeFor(1, 1), 7.5);
  assert.equal(shakeFor(4, 9), 16);
  assert.equal(confettiCount(2, 3), 56);
});

test('record pennant', () => {
  assert.equal(flagFall(false, 0, 1000), 0);
  assert.equal(flagFall(true, 0, 1000), 1);
  assert.equal(flagFall(true, 1000, 1350), 0.5);
  assert.equal(flagFall(true, 1000, 5000), 1);
  assert.ok(Math.abs(flagWave(60, 50, 100, false, false).amp - 1.8) < 1e-9);
  assert.equal(flagWave(60, 50, 100, false, false).speed, 260);
  assert.ok(Math.abs(flagWave(60, 95, 100, false, false).amp - 3.6) < 1e-9);
  assert.equal(flagWave(60, 95, 100, false, false).speed, 110);
  assert.equal(flagWave(60, 95, 100, false, true).amp, 0);
});
