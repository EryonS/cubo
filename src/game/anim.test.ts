import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RunState } from '../core/types';
import { ambient, anim, animating, resetAnim } from './anim';

const st = (o: Partial<RunState>) => ({ combo: 0, score: 0, over: false, ...o }) as RunState;

test('the loop goes idle again once every effect has run out', () => {
  resetAnim(0, 0, 0);
  assert.equal(animating(1000), false);
  anim.sweeps.push({ row: 1, t0: 1000 });
  assert.equal(animating(1000), true);
  anim.sweeps = [];
  anim.particles.push({ x: 0, y: 0, vx: 0, vy: 0, t0: 0, life: 10, size: 1, color: '#fff' });
  assert.equal(animating(1000), true);
  anim.particles = [];
  anim.banners.push({ text: 'a', sub: '', tier: 0 });
  assert.equal(animating(1000), true);
  anim.banners = [];
  anim.shake = 0.01;
  assert.equal(animating(1000), false);
  anim.shake = 5;
  assert.equal(animating(1000), true);
  anim.shake = 0;
  anim.comboAt = 1000;
  assert.equal(animating(1200), true);
  assert.equal(animating(1500), false);
  anim.flagDownAt = 1000;
  assert.equal(animating(1500), true);
  assert.equal(animating(1800), false);
});

test('ambient waves: a running combo or a standing pennant, never when calm or over', () => {
  resetAnim(0, 0, 0);
  anim.calm = false;
  assert.equal(ambient(st({})), false);
  assert.equal(ambient(st({ combo: 2 })), true);
  resetAnim(0, 0, 500);
  assert.equal(ambient(st({ score: 100 })), true);
  assert.equal(ambient(st({ score: 600 })), false);
  assert.equal(ambient(st({ score: 100, over: true })), false);
  anim.calm = true;
  assert.equal(ambient(st({ score: 100, combo: 3 })), false);
  anim.calm = false;
});
