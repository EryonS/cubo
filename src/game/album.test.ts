import test from 'node:test';
import assert from 'node:assert/strict';
import { M } from '../core';
import { albumPages, barPath, chartBars, lifetimeRows, modeTiles, monthsSinceStart, seasonShelf, CHART_H } from './album';

const day = '2026-10-04';
const p0 = M.createProfile(day);
const fmt = (n: number) => String(n);

test('months run from the first daily level to today', () => {
  assert.deepEqual(monthsSinceStart(day), ['2026-09', '2026-10']);
  assert.deepEqual(monthsSinceStart('2027-01-10').length, 5);
});

test('mode tiles use the record of the older bests too', () => {
  const t = modeTiles({ ...p0, modes: { classic: { games: 2, total: 300, best: 200, bestCombo: 4, lines: 9 } } }, 'classic', { classic: 250 }, fmt);
  assert.deepEqual(t.map((x) => x.value), ['2', '250', '150', '×4']);
  assert.deepEqual(modeTiles(p0, 'chill', {}, fmt).map((x) => x.value), ['0', '0', '–', '–']);
});

test('lifetime rows read the counters', () => {
  const rows = lifetimeRows({ ...p0, lifetime: { games: 7, lines: 40, bestCombo: 6 } as never }, fmt);
  assert.equal(rows[0][1], '7');
  assert.equal(rows[2][1], '×6');
  assert.equal(rows[3][1], '40');
});

test('chart bars scale to the best, the peak is found, a path is closed', () => {
  assert.deepEqual(chartBars([]), { bars: [], peak: -1 });
  const { bars, peak } = chartBars([100, 400, 200]);
  assert.equal(peak, 1);
  assert.equal(bars[1].y, CHART_H - (CHART_H - 16));
  assert.ok(bars[0].h < bars[1].h && bars[0].h >= 3);
  assert.ok(barPath(bars[0]).endsWith('Z'));
});

test('album: earned, secret hidden until earned, count ignores nothing else', () => {
  const a = albumPages({ ...p0, stickers: { combo5: '2026-10-01', bomb21: '2026-10-02' } });
  assert.equal(a.count, 2);
  assert.equal(a.total, M.STICKERS.length);
  const all = a.pages.flatMap((p) => p.stickers);
  assert.equal(all.length, M.STICKERS.length);
  assert.equal(all.find((s) => s.id === 'bomb21')!.hidden, false);
  assert.equal(all.find((s) => s.id === 'perfect2')!.hidden, true);
  assert.equal(all.find((s) => s.id === 'world-sea')!.color, '#1a6aa8');
});

test('season shelf shows won trophies only (plus the open event)', () => {
  const s = seasonShelf({ ...p0, trophies: { 'xmas-2026': 'gold' } } as never, '2026-10-04');
  assert.ok(s.some((x) => x.kind === 'gold' && x.label.endsWith('2026')));
  assert.ok(s.some((x) => x.kind === null)); // Halloween, open in October
});
