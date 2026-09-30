// Plays every Aventure level with the greedy bot and prints win rate, stars and moves used.
// Usage: node tools/balance.js [runsPerLevel]   (dev only)
const L = require('../src/logic.js');
require('../src/worlds.js');
const LV = require('../src/levels.js');
const { play } = require('./bot.js');

const runs = +process.argv[2] || 12;
const rows = [];
for (const world of LV.ORDER) {
  for (let n = 1; n <= LV.PER_WORLD; n++) {
    const stage = LV.level(world, n);
    let wins = 0, stars = 0, used = 0;
    for (let s = 1; s <= runs; s++) {
      const end = play(L.createGame(s * 7919 + n, { mode: 'adventure', stage }));
      if (end.stage.won) { wins++; stars += end.stage.stars; used += end.stage.maxMoves - end.stage.movesLeft; }
    }
    rows.push([world, n, LV.goalText(stage.goal), stage.maxMoves, Math.round((wins / runs) * 100) + '%',
      wins ? (stars / wins).toFixed(1) : '-', wins ? Math.round(used / wins) : '-']);
  }
}
console.log(['world', 'n', 'goal', 'budget', 'win', 'stars', 'used'].join('\t'));
for (const r of rows) console.log(r.join('\t'));
