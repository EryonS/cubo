// Plays every Aventure level with the greedy bot and prints win rate, stars and moves used.
// Usage: npm run balance [-- runsPerLevel]   (dev only)
import { L, LV } from '../src/core';
import { play } from './bot';

const runs = +process.argv[2] || 12;
const rows: (string | number)[][] = [];
for (const world of LV.ORDER) {
  for (let n = 1; n <= LV.PER_WORLD; n++) {
    const stage = LV.level(world, n)!;
    let wins = 0, stars = 0, used = 0;
    for (let s = 1; s <= runs; s++) {
      const end = play(L.createGame(s * 7919 + n, { mode: 'adventure', stage })).stage!;
      if (end.won) { wins++; stars += end.stars; used += end.maxMoves - end.movesLeft; }
    }
    rows.push([world, n, LV.goalText(stage.goal), stage.maxMoves, Math.round((wins / runs) * 100) + '%',
      wins ? (stars / wins).toFixed(1) : '-', wins ? Math.round(used / wins) : '-']);
  }
}
console.log(['world', 'n', 'goal', 'budget', 'win', 'stars', 'used'].join('\t'));
for (const r of rows) console.log(r.join('\t'));
