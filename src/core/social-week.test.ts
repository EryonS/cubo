import test from 'node:test';
import assert from 'node:assert/strict';
import './worlds';
import * as C from './social';
import * as M from './meta';

const utc = (y: number, m: number, d: number, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);

test('week id: Monday 00:00 to Sunday 23:59 in Paris time', () => {
  // Summer time (UTC+2): Monday 5 October 00:00 Paris = Sunday 4 October 22:00 UTC.
  assert.equal(C.weekId(utc(2026, 10, 4, 21, 59)), '2026-W40');
  assert.equal(C.weekId(utc(2026, 10, 4, 22, 0)), '2026-W41');
  assert.equal(C.weekId(utc(2026, 10, 11, 21, 59)), '2026-W41');
  assert.equal(C.weekId(utc(2026, 10, 11, 22, 0)), '2026-W42');
  // Winter (UTC+1)
  assert.equal(C.weekId(utc(2026, 1, 11, 22, 59)), '2026-W02');
  assert.equal(C.weekId(utc(2026, 1, 11, 23, 0)), '2026-W03');
});

test('week id: year boundaries (W53 and W01)', () => {
  assert.equal(C.weekId(utc(2020, 12, 31, 12)), '2020-W53');
  assert.equal(C.weekId(utc(2021, 1, 3, 12)), '2020-W53');
  assert.equal(C.weekId(utc(2021, 1, 3, 23, 0)), '2021-W01'); // Monday 00:00 Paris
  assert.equal(C.weekId(utc(2024, 12, 29, 12)), '2024-W52');
  assert.equal(C.weekId(utc(2024, 12, 30, 12)), '2025-W01'); // Monday 30 December 2024 belongs to 2025
  assert.equal(C.weekId(utc(2026, 1, 1, 12)), '2026-W01');
  assert.equal(C.weekId(utc(2026, 12, 31, 12)), '2026-W53');
  assert.equal(C.weekId(utc(2027, 1, 3, 12)), '2026-W53');
  assert.equal(C.weekId(utc(2027, 1, 4, 12)), '2027-W01');
});

test('week id and end: the clock change weekends', () => {
  // 2026-03-29: 02:00 -> 03:00 Paris (01:00 UTC). The week of 23 March ends Monday 30 March 00:00 Paris = Sunday 22:00 UTC.
  assert.equal(C.parisOffset(utc(2026, 3, 29, 0, 59)), 3600000);
  assert.equal(C.parisOffset(utc(2026, 3, 29, 1, 0)), 7200000);
  assert.equal(C.weekEnd(utc(2026, 3, 25, 12)), utc(2026, 3, 29, 22, 0));
  assert.equal(C.weekId(utc(2026, 3, 29, 21, 59)), '2026-W13');
  assert.equal(C.weekId(utc(2026, 3, 29, 22, 0)), '2026-W14');
  // 2026-10-25: 03:00 -> 02:00 Paris (01:00 UTC). The week of 19 October ends Monday 26 October 00:00 Paris = 23:00 UTC.
  assert.equal(C.parisOffset(utc(2026, 10, 25, 0, 59)), 7200000);
  assert.equal(C.parisOffset(utc(2026, 10, 25, 1, 0)), 3600000);
  assert.equal(C.weekEnd(utc(2026, 10, 21, 12)), utc(2026, 10, 25, 23, 0));
  assert.equal(C.weekId(utc(2026, 10, 25, 22, 59)), '2026-W43');
  assert.equal(C.weekId(utc(2026, 10, 25, 23, 0)), '2026-W44');
  // A normal week ends at the next Monday 00:00 Paris, where the week id changes.
  const end = C.weekEnd(utc(2026, 10, 7, 9));
  assert.equal(end, utc(2026, 10, 11, 22, 0));
  assert.notEqual(C.weekId(end - 1), C.weekId(end));
  assert.equal(C.weekEnd(end), end + 7 * 86400000);
});

test('time left text', () => {
  assert.equal(C.weekLeftText(3 * 86400000 + 4 * 3600000 + 5 * 60000), 'Fin dans 3 j 4 h');
  assert.equal(C.weekLeftText(5 * 3600000 + 10 * 60000), 'Fin dans 5 h 10 min');
  assert.equal(C.weekLeftText(20 * 1000), 'Fin dans 1 min');
});

const NOW = utc(2026, 10, 8, 12);
const NEXT = utc(2026, 10, 13, 12);

test('weekly tally: Classique, Chrono and Mondes count, the others not', () => {
  let w = C.addWeekRun(undefined, 'classic', 1000, NOW);
  assert.deepEqual(w, { id: '2026-W41', points: 1000, best: 1000, runs: 1 });
  w = C.addWeekRun(w, 'chrono', 5000, NOW); // points, but not the best single run
  w = C.addWeekRun(w, 'worlds', 700, NOW);
  w = C.addWeekRun(w, 'classic', 400, NOW);
  assert.deepEqual(w, { id: '2026-W41', points: 7100, best: 1000, runs: 4 });
  for (const mode of ['chill', 'adventure', 'puzzle', 'event']) assert.equal(C.addWeekRun(w, mode, 9999, NOW), w);
  assert.equal(C.addWeekRun(w, 'classic', 0, NOW), w);
  assert.equal(C.addWeekRun(undefined, 'chill', 50, NOW), undefined);
});

test('weekly tally: a new week starts again, an old profile has none', () => {
  const w = C.addWeekRun({ id: '2026-W41', points: 7100, best: 1000, runs: 4 }, 'classic', 300, NEXT);
  assert.deepEqual(w, { id: '2026-W42', points: 300, best: 300, runs: 1 });
  assert.deepEqual(C.weekOf({ id: '2026-W41', points: 5, best: 5, runs: 1 }, NEXT), { id: '2026-W42', points: 0, best: 0, runs: 0 });
  const old = M.createProfile('2026-10-01'); // no week field
  assert.equal(old.week, undefined);
  assert.deepEqual(C.weekOf(old.week, NOW), { id: '2026-W41', points: 0, best: 0, runs: 0 });
  assert.equal(M.migrate(JSON.parse(JSON.stringify(old))).profile.week, undefined);
});

test('weekly tally: Seconde chance (profile restored) counts the run once, with its final score', () => {
  const before = M.createProfile('2026-10-01');
  const settled = { ...before, week: C.addWeekRun(before.week, 'classic', 1200, NOW) }; // the game over settles
  assert.equal(settled.week?.points, 1200);
  const final = C.addWeekRun(before.week, 'classic', 2000, NOW); // the profile of before is restored, the real end settles
  assert.deepEqual(final, { id: '2026-W41', points: 2000, best: 2000, runs: 1 });
});

test('ranking: highest first, ties share a rank', () => {
  const rows = [{ n: 'c', v: 10 }, { n: 'a', v: 50 }, { n: 'b', v: 50 }, { n: 'd', v: 0 }, { n: 'e', v: 0 }];
  const r = C.rankRows(rows, (x) => x.v, (a, b) => a.n.localeCompare(b.n));
  assert.deepEqual(r.map((x) => [x.row.n, x.rank]), [['a', 1], ['b', 1], ['c', 3], ['d', 4], ['e', 4]]);
  assert.deepEqual(C.rankRows([], (x: number) => x), []);
});
