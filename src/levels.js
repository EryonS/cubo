/*
 * Gridlock — Aventure levels. Pure, no DOM. level(world, n) builds the stage handed to
 * logic.createGame({ mode: 'adventure', stage }). Levels 1-9 of a world are generated from a
 * difficulty curve; level 10 is the world's hand-tuned boss.
 * Move budgets were balanced with tools/balance.js (greedy bot), with slack for human players.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GridlockLevels = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ORDER = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];
  const PER_WORLD = 10;

  // Goals cycle through this list for levels 1-9. kind: the special cell of the world, if any.
  const WORLD_GOALS = {
    plain: { goals: ['lines', 'score'] },
    sea: { kind: 'bubble', goals: ['lines', 'clear', 'score'] },
    space: { kind: 'asteroid', goals: ['clear', 'lines', 'score'] },
    ice: { kind: 'ice', goals: ['clear', 'clear', 'lines'] },
    forest: { kind: 'mushroom', goals: ['lines', 'clear', 'score'] },
    retro: { goals: ['lines', 'score'] },
    arcade: { goals: ['score', 'lines'], clock: 60000 },
    volcano: { kind: 'ember', goals: ['clear', 'lines', 'score'] },
  };

  // Hand-tuned level 10 of each world. Specials on the board always outnumber the goal a little.
  const BOSSES = {
    plain: { goal: { type: 'lines', target: 14 }, maxMoves: 48 },
    sea: { goal: { type: 'clear', kind: 'bubble', target: 8 }, setup: { kind: 'bubble', count: 10 }, maxMoves: 60 },
    space: { goal: { type: 'clear', kind: 'asteroid', target: 8 }, setup: { kind: 'asteroid', count: 6 }, maxMoves: 66 },
    ice: { goal: { type: 'clear', kind: 'ice', target: 8 }, setup: { kind: 'ice', count: 11 }, maxMoves: 80 },
    forest: { goal: { type: 'lines', target: 18 }, setup: { kind: 'mushroom', count: 4 }, maxMoves: 62 },
    retro: { goal: { type: 'lines', target: 20 }, maxMoves: 64 },
    arcade: { goal: { type: 'score', target: 1200 }, maxMoves: 99, clock: 75000 },
    volcano: { goal: { type: 'clear', kind: 'ember', target: 6 }, setup: { kind: 'ember', count: 3 }, maxMoves: 70 },
  };

  // Bot costs measured with tools/balance.js; the slack below turns them into human budgets.
  const MOVES_PER_LINE = 2.7;
  const POINTS_PER_MOVE = 20;
  const MOVES_PER_CLEAR = { bubble: 5.9, asteroid: 6.5, ice: 8, mushroom: 3.9, ember: 9 };
  const SECONDS_PER_MOVE = 3.5; // arcade: a human's pace, to size score goals to the clock

  function level(world, n) {
    const w = ORDER.indexOf(world);
    if (w < 0 || n < 1 || n > PER_WORLD) return null;
    const cfg = WORLD_GOALS[world];
    const base = { world, n, boss: n === PER_WORLD, ramp: 0.4 + w * 0.08 };
    if (n === PER_WORLD) return { ...base, ...BOSSES[world], ramp: base.ramp + 0.2 };

    const d = (w * 9 + n - 1) / (ORDER.length * 9 - 1); // 0 .. 1 across the whole map
    const slack = 1.9 - d * 0.45; // generous early, tighter late
    const type = cfg.goals[(n - 1) % cfg.goals.length];
    const stage = { ...base };
    let expected;
    if (type === 'lines') {
      const target = cfg.clock ? 6 + Math.round(d * 3) : 4 + Math.round(d * 9) + (n > 6 ? 1 : 0);
      stage.goal = { type, target };
      expected = target * MOVES_PER_LINE;
    } else if (type === 'score') {
      const target = cfg.clock
        ? Math.round(((cfg.clock / 1000 / SECONDS_PER_MOVE) * 20 * (0.9 + d * 0.3) + n * 25) / 50) * 50
        : Math.round((350 + d * 1300 + n * 30) / 50) * 50;
      stage.goal = { type, target };
      expected = target / POINTS_PER_MOVE;
    } else {
      const target = cfg.kind === 'ember' ? 2 + Math.round(d * 3) : 3 + Math.round(d * 4) + Math.floor(n / 4);
      stage.goal = { type, kind: cfg.kind, target };
      expected = target * MOVES_PER_CLEAR[cfg.kind];
    }
    // Worlds with a special cell start with some on the board: the goal's plus spares, or a few obstacles.
    if (cfg.kind) {
      let count = type === 'clear' ? stage.goal.target + 1 + Math.floor(n / 4) : 1 + Math.floor(n / 3);
      if (cfg.kind === 'ember') count = Math.min(3, count);
      stage.setup = { kind: cfg.kind, count };
      if (type !== 'clear') expected += count * 1.5;
    }
    if (cfg.clock) {
      stage.clock = cfg.clock;
      stage.maxMoves = 99;
    } else {
      stage.maxMoves = Math.max(10, Math.ceil(expected * slack));
    }
    return stage;
  }

  // ---------- daily level ----------
  // Same level for everyone on a given local date: world, goal and piece sequence come from the date.
  const DAILY_START = '2026-09-01'; // daily #1
  function hash(str) {
    let h = 2166136261;
    for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  const dayNumber = (day) => Math.round((Date.parse(day + 'T00:00:00Z') - Date.parse(DAILY_START + 'T00:00:00Z')) / 86400000) + 1;
  function daily(day) {
    const h = hash('daily:' + day);
    const world = ORDER[h % ORDER.length];
    const n = 3 + ((h >>> 8) % 5); // a mid-world level: 3..7
    return { ...level(world, n), daily: day, seed: hash('seed:' + day) | 0 };
  }

  // ---------- weekend event ----------
  // Saturday and Sunday: an endless Classique run under one world's rules, a new world each week.
  // Arcade sits out (its drawback is a clock, which an endless run doesn't have).
  const EVENT_WORLDS = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'volcano'];
  const EVENT_START = '2026-10-03'; // a Saturday: week 0
  const EVENT_SPECIALS = 3; // special cells on the board at the start, in worlds that have some
  const utcDay = (day) => Date.parse(day + 'T00:00:00Z');
  const shiftDay = (day, n) => new Date(utcDay(day) + n * 86400000).toISOString().slice(0, 10);
  // id: the event's Saturday. For a weekday, the coming weekend (active: false).
  function weekend(day) {
    const dow = new Date(utcDay(day)).getUTCDay();
    const id = shiftDay(day, dow === 0 ? -1 : 6 - dow);
    const week = Math.floor(Math.round((utcDay(id) - utcDay(EVENT_START)) / 86400000) / 7);
    const world = EVENT_WORLDS[((week % EVENT_WORLDS.length) + EVENT_WORLDS.length) % EVENT_WORLDS.length];
    const kind = WORLD_GOALS[world].kind;
    return { id, world, active: dow === 6 || dow === 0, setup: kind ? { kind, count: EVENT_SPECIALS } : null };
  }

  const key = (world, n) => `${world}-${n}`;

  // French goal text for the HUD and level cards.
  const KIND_NAMES = { bubble: 'bulles', asteroid: 'astéroïdes', ice: 'blocs de glace', mushroom: 'champignons', ember: 'braises' };
  function goalText(goal) {
    if (goal.type === 'lines') return `Efface ${goal.target} lignes`;
    if (goal.type === 'score') return `Fais ${goal.target.toLocaleString('fr-FR')} points`;
    return `Détruis ${goal.target} ${KIND_NAMES[goal.kind]}`;
  }
  // Short uppercase label next to the progress on the score plate.
  function goalLabel(goal) {
    if (goal.type === 'lines') return 'LIGNES';
    if (goal.type === 'score') return 'POINTS';
    return KIND_NAMES[goal.kind].toUpperCase();
  }

  return { ORDER, PER_WORLD, DAILY_START, level, daily, dayNumber, weekend, key, goalText, goalLabel, KIND_NAMES };
});
