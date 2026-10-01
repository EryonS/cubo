/*
 * Gridlock — Aventure levels. Pure, no DOM. level(world, n) builds the stage handed to
 * logic.createGame({ mode: 'adventure', stage }). 20 levels per world: generated ones from a
 * difficulty curve, a hand-tuned trial at 10 and a boss fight at 20.
 * Move budgets were balanced with tools/balance.js (greedy bot), with slack for human players.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GridlockLevels = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ORDER = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];
  const PER_WORLD = 20;
  const TRIAL = 10; // hand-tuned mid-world level (the v1 boss)

  // Goals cycle through this list for the generated levels. kind: the special cell of the world, if any.
  // 'crates': clear crates stacked at the bottom (worlds without a special cell of their own).
  const WORLD_GOALS = {
    plain: { goals: ['lines', 'score', 'coins', 'combo', 'crates'] },
    sea: { kind: 'bubble', goals: ['lines', 'clear', 'score', 'combo'] },
    space: { kind: 'asteroid', goals: ['clear', 'lines', 'score', 'coins'] },
    ice: { kind: 'ice', goals: ['clear', 'lines', 'clear', 'score'] },
    forest: { kind: 'mushroom', goals: ['lines', 'clear', 'coins', 'score'] },
    retro: { goals: ['lines', 'score', 'combo'] }, // no crates: gravity chains clear them for free
    arcade: { goals: ['score', 'lines', 'combo'], clock: 60000 },
    volcano: { kind: 'ember', goals: ['clear', 'lines', 'score', 'combo'] },
  };

  // Hand-tuned level 10 of each world (the v1 bosses). Specials always outnumber the goal a little.
  const TRIALS = {
    plain: { goal: { type: 'lines', target: 14 }, maxMoves: 48 },
    sea: { goal: { type: 'clear', kind: 'bubble', target: 8 }, setup: { kind: 'bubble', count: 10 }, maxMoves: 60 },
    space: { goal: { type: 'clear', kind: 'asteroid', target: 8 }, setup: { kind: 'asteroid', count: 6 }, maxMoves: 66 },
    ice: { goal: { type: 'clear', kind: 'ice', target: 8 }, setup: { kind: 'ice', count: 11 }, maxMoves: 80 },
    forest: { goal: { type: 'lines', target: 18 }, setup: { kind: 'mushroom', count: 4 }, maxMoves: 62 },
    retro: { goal: { type: 'lines', target: 20 }, maxMoves: 64 },
    arcade: { goal: { type: 'score', target: 1200 }, maxMoves: 99, clock: 75000 },
    volcano: { goal: { type: 'clear', kind: 'ember', target: 6 }, setup: { kind: 'ember', count: 3 }, maxMoves: 70 },
  };

  // Level 20: a 2x2 boss in the center (logic.placeBoss). hp = boss cells caught in cleared lines
  // (a line through it takes 2). Every `every` moves it drops `count` cells of `kind`.
  const BOSSES = {
    plain: { name: 'Roi Cube', hp: 12, attack: { every: 6, count: 1, kind: 'rock' }, maxMoves: 60 },
    sea: { name: 'Pieuvre géante', hp: 16, attack: { every: 5, count: 1, kind: 'rock' }, setup: { kind: 'bubble', count: 4 }, maxMoves: 72 },
    space: { name: 'Ovni', hp: 14, attack: { every: 6, count: 1, kind: 'asteroid' }, maxMoves: 64 },
    ice: { name: 'Yéti', hp: 16, attack: { every: 7, count: 1, kind: 'ice' }, maxMoves: 68 },
    forest: { name: 'Vieux Chêne', hp: 16, attack: { every: 5, count: 1, kind: 'mushroom' }, maxMoves: 64 },
    retro: { name: 'Méga Pixel', hp: 12, attack: { every: 4, count: 1, kind: 'rock' }, maxMoves: 88 },
    arcade: { name: 'Borne folle', hp: 12, attack: { every: 4, count: 1, kind: 'rock' }, maxMoves: 99, clock: 90000 },
    volcano: { name: 'Dragon de lave', hp: 20, attack: { every: 6, count: 2, kind: 'ember' }, maxMoves: 70 },
  };


  // Bot costs measured with tools/balance.js; the slack below turns them into human budgets.
  const MOVES_PER_LINE = 2.7;
  const POINTS_PER_MOVE = 20;
  const MOVES_PER_CLEAR = { bubble: 5.9, asteroid: 6.5, ice: 8, mushroom: 3.9, ember: 10.5 };
  const MOVES_PER_COIN = { plain: 4, forest: 2.3 }; // others: 4.6
  const comboMoves = (target) => 4 + target * target * 0.9;
  const MOVES_PER_CRATE = 4.5;
  const SECONDS_PER_MOVE = 3.5; // arcade: a human's pace, to size score goals to the clock

  function level(world, n) {
    const w = ORDER.indexOf(world);
    if (w < 0 || n < 1 || n > PER_WORLD) return null;
    const cfg = WORLD_GOALS[world];
    const base = { world, n, boss: n === PER_WORLD, trial: n === TRIAL, ramp: 0.4 + w * 0.08 };
    if (n === TRIAL) return { ...base, ...TRIALS[world], ramp: base.ramp + 0.2 };
    if (n === PER_WORLD) {
      const b = BOSSES[world];
      const stage = { ...base, goal: { type: 'boss', target: b.hp, name: b.name }, boss: { name: b.name, ...b.attack },
        maxMoves: b.maxMoves, ramp: base.ramp + 0.25 };
      if (b.setup) stage.setup = b.setup;
      if (b.clock) stage.clock = b.clock;
      return stage;
    }

    const d = (w * (PER_WORLD - 1) + n - 1) / (ORDER.length * (PER_WORLD - 1) - 1); // 0 .. 1 across the map
    const m = 1 + ((n - 1) * 8) / (PER_WORLD - 2); // position in the world on the v1 scale: 1 .. 9
    const slack = 1.9 - d * 0.45; // generous early, tighter late
    // Generated levels are numbered around the trial: 1-9 then 11-19.
    const k = n < TRIAL ? n - 1 : n - 2;
    const type = cfg.goals[k % cfg.goals.length];
    const stage = { ...base };
    let expected;
    if (type === 'lines') {
      const target = cfg.clock ? 6 + Math.round(d * 3) : 4 + Math.round(d * 9) + (m > 6 ? 1 : 0);
      stage.goal = { type, target };
      expected = target * MOVES_PER_LINE;
    } else if (type === 'score') {
      const target = cfg.clock
        ? Math.round(((cfg.clock / 1000 / SECONDS_PER_MOVE) * 20 * (0.9 + d * 0.3) + m * 25) / 50) * 50
        : Math.round((350 + d * 1300 + m * 30) / 50) * 50;
      stage.goal = { type, target };
      expected = target / POINTS_PER_MOVE;
    } else if (type === 'coins') {
      const target = 3 + Math.round(d * 5) + Math.floor(m / 4);
      stage.goal = { type, target };
      expected = target * (MOVES_PER_COIN[world] || 4.6);
    } else if (type === 'combo') {
      const target = Math.min(cfg.clock ? 5 : 6, 3 + Math.round(d * 2) + (m > 6 ? 1 : 0));
      stage.goal = { type, target };
      expected = comboMoves(target);
    } else if (type === 'crates') {
      stage.fill = 1 + Math.round(d * 2) + (m > 5 ? 1 : 0); // crates spread over 2 rows per fill (see prefill in logic.js)
      stage.goal = { type: 'clear', kind: 'crate', target: stage.fill * 4 }; // plus stage.fill spare crates
      expected = stage.goal.target * MOVES_PER_CRATE + 12; // scattered crates need a few setup moves first
    } else {
      const target = cfg.kind === 'ember' ? 2 + Math.round(d * 3) : 3 + Math.round(d * 4) + Math.floor(m / 4);
      stage.goal = { type, kind: cfg.kind, target };
      expected = target * MOVES_PER_CLEAR[cfg.kind];
    }
    // Worlds with a special cell start with some on the board: the goal's plus spares, or a few obstacles.
    if (cfg.kind) {
      let count = type === 'clear' ? stage.goal.target + 1 + Math.floor(m / 4) : 1 + Math.floor(m / 3);
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
    // A generated mid-world level: 5..14 (never the trial).
    let n = 5 + ((h >>> 8) % 9);
    if (n >= TRIAL) n += 1;
    return { ...level(world, n), daily: day, seed: hash('seed:' + day) | 0 };
  }

  const key = (world, n) => `${world}-${n}`;

  // French goal text for the HUD and level cards.
  const KIND_NAMES = { bubble: 'bulles', asteroid: 'astéroïdes', ice: 'blocs de glace', mushroom: 'champignons', ember: 'braises', crate: 'caisses', rock: 'rochers' };
  function goalText(goal) {
    if (goal.type === 'lines') return `Efface ${goal.target} lignes`;
    if (goal.type === 'score') return `Fais ${goal.target.toLocaleString('fr-FR')} points`;
    if (goal.type === 'coins') return `Ramasse ${goal.target} pièces`;
    if (goal.type === 'combo') return `Fais un combo ×${goal.target}`;
    if (goal.type === 'boss') return `Bats ${goal.name}`;
    return `Détruis ${goal.target} ${KIND_NAMES[goal.kind]}`;
  }
  // Short uppercase label next to the progress on the score plate.
  function goalLabel(goal) {
    if (goal.type === 'lines') return 'LIGNES';
    if (goal.type === 'score') return 'POINTS';
    if (goal.type === 'coins') return 'PIÈCES';
    if (goal.type === 'combo') return 'COMBO';
    if (goal.type === 'boss') return goal.name.toUpperCase();
    return KIND_NAMES[goal.kind].toUpperCase();
  }

  return { ORDER, PER_WORLD, TRIAL, BOSSES, DAILY_START, level, daily, dayNumber, key, goalText, goalLabel, KIND_NAMES };
});
