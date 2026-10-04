import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSfx, semis, type Synth } from './sfx';
import { hz, SONGS, stepPlan, stepSeconds } from './songs';

function recorder() {
  const calls: [string, ...unknown[]][] = [];
  const synth: Synth = {
    pluck: (...a) => { calls.push(['pluck', ...a]); },
    glide: (...a) => { calls.push(['glide', ...a]); },
    noise: (...a) => { calls.push(['noise', ...a]); },
  };
  return { calls, sfx: createSfx(synth) };
}

test('a clear plays a longer run for more lines, higher with the combo', () => {
  const one = recorder(); one.sfx.clear(1, 1);
  const four = recorder(); four.sfx.clear(4, 1);
  assert.equal(one.calls.length, 4);
  assert.equal(four.calls.length, 10);
  const combo = recorder(); combo.sfx.clear(1, 3);
  assert.ok((combo.calls[0][1] as number) > (one.calls[0][1] as number));
  assert.equal(one.calls[0][1], 392);
  assert.ok(Math.abs((combo.calls[0][1] as number) - semis(392, 4)) < 1e-9);
});

test('place is a wooden knock: a bar and a click', () => {
  const r = recorder(); r.sfx.place();
  assert.deepEqual(r.calls.map((c) => c[0]), ['pluck', 'noise']);
});

test('sparkle grows with the tier and starts after the clear run', () => {
  const r = recorder(); r.sfx.sparkle(3);
  assert.equal(r.calls.length, 6);
  assert.equal(r.calls[0][4], 0.12);
});

test('every song is well formed', () => {
  for (const [id, s] of Object.entries(SONGS)) {
    assert.equal(s.arp.length, 8, id);
    assert.ok(s.chords.length === 4, id);
    for (const [, tones] of s.chords) assert.ok(tones.length >= 3, id);
    for (const a of s.arp) assert.ok(a < s.chords[0][1].length, id);
  }
  assert.ok(SONGS.toy && SONGS.xmas && SONGS.halloween);
});

test('step planner: pad on the downbeat, bass on its steps, arp thinned every 4th bar', () => {
  const toy = SONGS.toy;
  const first = stepPlan(toy, 0);
  assert.equal(first.filter((p) => p.kind === 'voice').length, 3 + 1 + 1); // 3 pad tones, bass, bell
  assert.equal((first[3] as { freq: number }).freq, hz(50));
  assert.equal(stepPlan(toy, 1).length, 1); // arp[1] = 2
  // Bar 4 of 4 (steps 24..31): odd steps rest.
  assert.equal(stepPlan(toy, 24 + 1).length, 0);
  assert.equal(stepPlan(toy, 24 + 2).length, 1);
  assert.ok(Math.abs(stepSeconds(toy) - 60 / 92 / 2) < 1e-12);
  const arcade = stepPlan(SONGS.arcade, 4);
  assert.ok(arcade.some((p) => p.kind === 'hit' && p.drum === 'kick'));
  assert.ok(arcade.some((p) => p.kind === 'hit' && p.drum === 'snare') === false);
});
