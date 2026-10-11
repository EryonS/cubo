/*
 * Cubo Blocks — Aventure levels. Pure, no DOM. level(world, n) builds the stage handed to
 * logic.createGame({ mode: 'adventure', stage }). 20 levels per world: generated ones from a
 * difficulty curve, a hand-tuned trial at 10 and a boss fight at 20.
 * Move budgets were balanced with tools/balance.js (greedy bot), with slack for human players.
 */
import * as I18N from './i18n';
import type { BossAttack, Goal, GoalType, SpawnSetup, StageDef, Twist } from './types';

const tr = I18N.tr;

const ORDER: string[] = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];
const PER_WORLD = 20;
const TRIAL = 10; // hand-tuned mid-world level (the v1 boss)
// Bonus levels 21-25 of every world, open once the Aventure is finished (the Volcan boss beaten): 21-24 go
// past the world's end (twist on, tighter budgets), 25 is the boss's rematch (REMATCH).
const BONUS = 5;

// Goals cycle through this list for the generated levels. kind: the special cell of the world, if any.
// 'crates': clear crates stacked at the bottom (worlds without a special cell of their own).
type GoalKind = GoalType | 'crates';
const WORLD_GOALS: Record<string, { kind?: string; goals: GoalKind[]; clock?: number }> = {
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
const TRIALS: Record<string, { goal: Goal; maxMoves: number; setup?: SpawnSetup; clock?: number }> = {
  plain: { goal: { type: 'lines', target: 14 }, maxMoves: 48 },
  sea: { goal: { type: 'clear', kind: 'bubble', target: 8 }, setup: { kind: 'bubble', count: 10 }, maxMoves: 60 },
  space: { goal: { type: 'clear', kind: 'asteroid', target: 8 }, setup: { kind: 'asteroid', count: 6 }, maxMoves: 66 },
  ice: { goal: { type: 'clear', kind: 'ice', target: 8 }, setup: { kind: 'ice', count: 11 }, maxMoves: 80 },
  forest: { goal: { type: 'lines', target: 18 }, setup: { kind: 'mushroom', count: 4 }, maxMoves: 62 },
  retro: { goal: { type: 'lines', target: 20 }, maxMoves: 64 },
  arcade: { goal: { type: 'score', target: 1200 }, maxMoves: 99, clock: 75000 },
  volcano: { goal: { type: 'clear', kind: 'ember', target: 6 }, setup: { kind: 'ember', count: 3 }, maxMoves: 70 },
};

// Second half of each world (levels 11-19): a second obstacle with a mind of its own (KINDS in
// logic.js). count cells at the start, one more every `every` moves (top: in the highest free row).
// Budgets stay as they are: with these the bot still wins 88-98 % of levels 11-19 (tools/balance.js).
const TWISTS: Record<string, Twist> = {
  plain: { kind: 'mole', count: 1, every: 5 },
  sea: { kind: 'jelly', count: 2, every: 9 },
  space: { kind: 'hole', count: 1, every: 7 },
  ice: { kind: 'snowman', count: 2, every: 10 },
  forest: { kind: 'vine', count: 2, every: 12 },
  retro: { kind: 'glitch', count: 2, every: 8 },
  arcade: { kind: 'token', count: 3, every: 5 },
  volcano: { kind: 'lava', count: 1, every: 5, top: true },
};

// Level 20: a 2x2 boss in the center (logic.placeBoss). hp = boss cells caught in cleared lines
// (a line through it takes 2). Every `every` moves it drops `count` cells of `kind`.
interface BossDef { name: string; hp: number; attack: Omit<BossAttack, 'name'>; maxMoves: number; setup?: SpawnSetup; clock?: number }
const BOSSES: Record<string, BossDef> = {
  plain: { name: tr('Roi Cube'), hp: 12, attack: { every: 6, count: 1, kind: 'rock' }, maxMoves: 60 },
  sea: { name: tr('Pieuvre géante'), hp: 16, attack: { every: 5, count: 1, kind: 'rock' }, setup: { kind: 'bubble', count: 4 }, maxMoves: 72 },
  space: { name: tr('Ovni'), hp: 14, attack: { every: 6, count: 1, kind: 'asteroid' }, maxMoves: 64 },
  ice: { name: tr('Yéti'), hp: 16, attack: { every: 7, count: 1, kind: 'ice' }, maxMoves: 68 },
  forest: { name: tr('Vieux Chêne'), hp: 16, attack: { every: 5, count: 1, kind: 'mushroom' }, maxMoves: 64 },
  retro: { name: tr('Méga Pixel'), hp: 12, attack: { every: 4, count: 1, kind: 'rock' }, maxMoves: 88 },
  arcade: { name: tr('Borne folle'), hp: 12, attack: { every: 4, count: 1, kind: 'rock' }, maxMoves: 99, clock: 90000 },
  volcano: { name: tr('Dragon de lave'), hp: 20, attack: { every: 6, count: 2, kind: 'ember' }, maxMoves: 70 },
};


// Bot costs measured with tools/balance.js; the slack below turns them into human budgets.
const MOVES_PER_LINE = 2.7;
const POINTS_PER_MOVE = 20;
const MOVES_PER_CLEAR: Record<string, number> = { bubble: 5.9, asteroid: 6.5, ice: 8, mushroom: 3.9, ember: 10.5 };
const MOVES_PER_COIN: Record<string, number> = { plain: 4, forest: 2.3 }; // others: 4.6
const comboMoves = (target: number) => 4 + target * target * 0.9;
const MOVES_PER_CRATE = 4.5;
const SECONDS_PER_MOVE = 3.5; // arcade: a human's pace, to size score goals to the clock

// Level 25: the world's boss again, tougher. hp and budget sized with the greedy bot (scripts/bot.ts).
const REMATCH: Record<string, { hp: number; every: number; maxMoves: number; clock?: number }> = {
  plain: { hp: 16, every: 5, maxMoves: 60 },
  sea: { hp: 18, every: 5, maxMoves: 72 },
  space: { hp: 18, every: 5, maxMoves: 64 },
  ice: { hp: 20, every: 6, maxMoves: 68 },
  forest: { hp: 18, every: 4, maxMoves: 64 },
  retro: { hp: 16, every: 3, maxMoves: 88 },
  arcade: { hp: 16, every: 3, maxMoves: 99, clock: 90000 },
  volcano: { hp: 24, every: 5, maxMoves: 70 },
};
// Budget slack of bonus levels 21-24, per world (bot checked: it still wins most of them).
const BONUS_SLACK: Record<string, number> = { plain: 1.35, sea: 1.35, space: 1.45, ice: 1.45, forest: 1.35, retro: 1.2, arcade: 1.35, volcano: 1.35 };

function level(world: string, n: number): StageDef | null {
  const w = ORDER.indexOf(world);
  if (w < 0 || n < 1 || n > PER_WORLD + BONUS) return null;
  const cfg = WORLD_GOALS[world];
  const bonus = n > PER_WORLD;
  const base = { world, n, boss: n === PER_WORLD, trial: n === TRIAL, ramp: 0.4 + w * 0.08 + (bonus ? 0.3 : 0) };
  if (n === PER_WORLD + BONUS) {
    const b = BOSSES[world];
    const re = REMATCH[world];
    const stage: StageDef = { ...base, boss: { name: b.name, ...b.attack, every: re.every }, goal: { type: 'boss', target: re.hp, name: b.name }, maxMoves: re.maxMoves };
    if (b.setup) stage.setup = b.setup;
    if (re.clock) stage.clock = re.clock;
    return stage;
  }
  if (n === TRIAL) return { ...base, ...TRIALS[world], ramp: base.ramp + 0.2 };
  if (n === PER_WORLD) {
    const b = BOSSES[world];
    const stage: StageDef = { ...base, goal: { type: 'boss', target: b.hp, name: b.name }, boss: { name: b.name, ...b.attack },
      maxMoves: b.maxMoves, ramp: base.ramp + 0.25 };
    if (b.setup) stage.setup = b.setup;
    if (b.clock) stage.clock = b.clock;
    return stage;
  }

  // Bonus levels sit a step past the world's level 19 on the map's curve.
  const d = bonus ? Math.min(1, (w * (PER_WORLD - 1) + PER_WORLD - 2) / (ORDER.length * (PER_WORLD - 1) - 1) + 0.25 + (n - PER_WORLD - 1) * 0.03)
    : (w * (PER_WORLD - 1) + n - 1) / (ORDER.length * (PER_WORLD - 1) - 1); // 0 .. 1 across the map
  const m = bonus ? 10 + (n - PER_WORLD - 1) * 0.5 : 1 + ((n - 1) * 8) / (PER_WORLD - 2); // position in the world on the v1 scale: 1 .. 9 (bonus 10+)
  const slack = bonus ? BONUS_SLACK[world] : 1.9 - d * 0.45; // generous early, tighter late
  // Generated levels are numbered around the trial: 1-9 then 11-19.
  const k = n < TRIAL ? n - 1 : n - 2;
  const type = cfg.goals[k % cfg.goals.length];
  // goal and maxMoves are set below, whatever the goal type.
  const stage = { ...base } as StageDef;
  let expected: number;
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
    stage.goal = { type: type as GoalType, kind: cfg.kind, target };
    expected = target * MOVES_PER_CLEAR[cfg.kind!];
  }
  // Worlds with a special cell start with some on the board: the goal's plus spares, or a few obstacles.
  if (cfg.kind) {
    let count = type === 'clear' ? stage.goal.target + 1 + Math.floor(m / 4) : 1 + Math.floor(m / 3);
    if (cfg.kind === 'ember') count = Math.min(3, count);
    stage.setup = { kind: cfg.kind, count };
    if (type !== 'clear') expected += count * 1.5;
  }
  const tw = n > TRIAL && TWISTS[world];
  if (tw) {
    stage.twist = { kind: tw.kind, count: tw.count, every: tw.every };
    if (tw.top) stage.twist.top = true;
  }
  if (cfg.clock) {
    stage.clock = bonus ? Math.round((cfg.clock * 0.85) / 1000) * 1000 : cfg.clock; // bonus: a shorter clock
    stage.maxMoves = 99;
  } else {
    stage.maxMoves = Math.max(10, Math.ceil(expected * slack));
  }
  return stage;
}

// ---------- season events ----------
// 25 hand-made levels per event, each in its event's world (worlds.ts): a mini-boss at 12 (it gives the theme),
// the final boss at 25 (Cubo's outfit). Levels 1-12 are the 2026 set (its boss now the mini-boss); budgets of
// 10-25 come from the greedy bot (scripts/bot.ts): about 1.6 x the moves it needs at level 10 down to 1.35 at 24,
// 1.3-1.4 on bosses, never under its 90th percentile; it survives 75 %+ of regular levels, 60 %+ of final bosses.
// Nouvel An is timed (clock in ms, bot pace 2.5 s a move).
const C = (kind: string, target: number): Goal => ({ type: 'clear', kind, target });
const G = (type: GoalType, target: number): Goal => ({ type, target });
const boss = (name: string, hp: number, kind: string): BossAttack & { hp: number; name: string } => ({ name, hp, every: 5, count: 1, kind });
interface EventLevelDef { goal?: Goal; boss?: BossAttack & { hp: number; name: string }; setup: Partial<SpawnSetup> & { eggs?: number }; maxMoves?: number; clock?: number }
const EVENT_LEVELS: Record<string, EventLevelDef[]> = {
  newyear: [
    { goal: G('score', 600), setup: { kind: 'rocket', count: 3 }, clock: 75000 },
    { goal: G('lines', 9), setup: { kind: 'rocket', count: 2 }, clock: 75000 },
    { goal: C('rocket', 6), setup: { kind: 'rocket', count: 7 }, clock: 75000 },
    { goal: G('combo', 4), setup: { kind: 'rocket', count: 2 }, clock: 75000 },
    { goal: G('score', 650), setup: { kind: 'rocket', count: 3 }, clock: 75000 },
    { goal: G('lines', 11), setup: { kind: 'rocket', count: 2 }, clock: 75000 },
    { goal: C('rocket', 8), setup: { kind: 'rocket', count: 9 }, clock: 80000 },
    { goal: G('coins', 8), setup: { kind: 'rocket', count: 2 }, clock: 80000 },
    { goal: G('score', 1000), setup: { kind: 'rocket', count: 3 }, clock: 80000 },
    { goal: C('rocket', 10), setup: { kind: 'rocket', count: 12 }, clock: 75000 },
    { goal: G('score', 800), setup: { kind: 'rocket', count: 3 }, clock: 105000 },
    { boss: boss(tr('Horloge de minuit'), 12, 'rock'), setup: { kind: 'rocket', count: 2 }, clock: 90000 }, // mini-boss: the theme
    { goal: G('lines', 12), setup: { kind: 'rocket', count: 3 }, clock: 75000 },
    { goal: G('coins', 10), setup: { kind: 'rocket', count: 3 }, clock: 75000 },
    { goal: G('combo', 5), setup: { kind: 'rocket', count: 2 }, clock: 75000 },
    { goal: C('rocket', 12), setup: { kind: 'rocket', count: 14 }, clock: 75000 },
    { goal: G('coins', 10), setup: { kind: 'rocket', count: 4 }, clock: 75000 },
    { goal: G('score', 1100), setup: { kind: 'rocket', count: 4 }, clock: 110000 },
    { goal: G('lines', 16), setup: { kind: 'rocket', count: 4 }, clock: 85000 },
    { goal: G('coins', 12), setup: { kind: 'rocket', count: 4 }, clock: 85000 },
    { goal: G('combo', 5), setup: { kind: 'rocket', count: 3 }, clock: 75000 },
    { goal: C('rocket', 14), setup: { kind: 'rocket', count: 16 }, clock: 75000 },
    { goal: G('score', 1300), setup: { kind: 'rocket', count: 5 }, clock: 120000 },
    { goal: G('lines', 18), setup: { kind: 'rocket', count: 5 }, clock: 90000 },
    { boss: boss(tr('Bouquet final'), 16, 'rock'), setup: { kind: 'rocket', count: 4 }, clock: 90000 }, // final boss: Cubo's outfit
  ],
  lunar: [
    { goal: C('lantern', 6), setup: { kind: 'lantern', count: 4 }, maxMoves: 36 },
    { goal: G('lines', 8), setup: { kind: 'lantern', count: 2 }, maxMoves: 33 },
    { goal: G('score', 800), setup: { kind: 'lantern', count: 2 }, maxMoves: 57 },
    { goal: C('firecracker', 3), setup: { kind: 'lantern', count: 2 }, maxMoves: 72 },
    { goal: G('coins', 12), setup: { kind: 'lantern', count: 4 }, maxMoves: 37 },
    { goal: G('combo', 4), setup: { kind: 'lantern', count: 2 }, maxMoves: 30 },
    { goal: C('lantern', 12), setup: { kind: 'lantern', count: 6 }, maxMoves: 53 },
    { goal: G('lines', 14), setup: { kind: 'lantern', count: 3 }, maxMoves: 48 },
    { goal: G('score', 1500), setup: { kind: 'lantern', count: 3 }, maxMoves: 72 },
    { goal: C('lantern', 14), setup: { kind: 'lantern', count: 7 }, maxMoves: 61 },
    { goal: G('score', 1200), setup: { kind: 'lantern', count: 3 }, maxMoves: 72 },
    { boss: boss(tr('Dragon de papier'), 14, 'firecracker'), setup: { kind: 'lantern', count: 3 }, maxMoves: 49 }, // mini-boss: the theme
    { goal: G('lines', 12), setup: { kind: 'lantern', count: 3 }, maxMoves: 45 },
    { goal: C('firecracker', 3), setup: { kind: 'lantern', count: 3 }, maxMoves: 66 },
    { goal: G('combo', 5), setup: { kind: 'lantern', count: 2 }, maxMoves: 37 },
    { goal: C('lantern', 16), setup: { kind: 'lantern', count: 9 }, maxMoves: 56 },
    { goal: G('coins', 16), setup: { kind: 'lantern', count: 4 }, maxMoves: 43 },
    { goal: G('score', 1600), setup: { kind: 'lantern', count: 4 }, maxMoves: 75 },
    { goal: G('lines', 16), setup: { kind: 'lantern', count: 4 }, maxMoves: 52 },
    { goal: C('firecracker', 5), setup: { kind: 'lantern', count: 4 }, maxMoves: 87 },
    { goal: G('combo', 5), setup: { kind: 'lantern', count: 3 }, maxMoves: 34 },
    { goal: C('lantern', 18), setup: { kind: 'lantern', count: 11 }, maxMoves: 52 },
    { goal: G('score', 1800), setup: { kind: 'lantern', count: 5 }, maxMoves: 72 },
    { goal: G('lines', 18), setup: { kind: 'lantern', count: 5 }, maxMoves: 52 },
    { boss: boss(tr('Dragon impérial'), 15, 'firecracker'), setup: { kind: 'lantern', count: 4 }, maxMoves: 52 }, // final boss: Cubo's outfit
  ],
  valentine: [
    { goal: C('heart', 6), setup: { count: 4 }, maxMoves: 24 },
    { goal: G('lines', 8), setup: { count: 2 }, maxMoves: 33 },
    { goal: G('score', 700), setup: { count: 2 }, maxMoves: 59 },
    { goal: C('heart', 10), setup: { count: 6 }, maxMoves: 26 },
    { goal: G('combo', 4), setup: { count: 2 }, maxMoves: 36 },
    { goal: C('rose', 3), setup: { count: 2 }, maxMoves: 67 },
    { goal: G('lines', 13), setup: { count: 3 }, maxMoves: 46 },
    { goal: C('heart', 16), setup: { count: 9 }, maxMoves: 24 },
    { goal: G('score', 1500), setup: { count: 3 }, maxMoves: 81 },
    { goal: C('heart', 18), setup: { count: 10 }, maxMoves: 26 },
    { goal: G('score', 1200), setup: { count: 3 }, maxMoves: 84 },
    { boss: boss(tr('Cupidon'), 14, 'rose'), setup: { count: 2 }, maxMoves: 51 }, // mini-boss: the theme
    { goal: G('lines', 12), setup: { count: 3 }, maxMoves: 47 },
    { goal: C('rose', 4), setup: { count: 3 }, maxMoves: 77 },
    { goal: G('combo', 5), setup: { count: 2 }, maxMoves: 34 },
    { goal: C('heart', 24), setup: { count: 13 }, maxMoves: 26 },
    { goal: G('coins', 16), setup: { count: 4 }, maxMoves: 92 },
    { goal: G('score', 1800), setup: { count: 4 }, maxMoves: 91 },
    { goal: G('lines', 16), setup: { count: 4 }, maxMoves: 54 },
    { goal: C('rose', 5), setup: { count: 4 }, maxMoves: 79 },
    { goal: G('combo', 5), setup: { count: 3 }, maxMoves: 34 },
    { goal: C('heart', 29), setup: { count: 16 }, maxMoves: 26 },
    { goal: G('score', 2200), setup: { count: 5 }, maxMoves: 99 },
    { goal: G('lines', 18), setup: { count: 5 }, maxMoves: 54 },
    { boss: boss(tr('Reine des cœurs'), 16, 'rose'), setup: { count: 4 }, maxMoves: 53 }, // final boss: Cubo's outfit
  ],
  easter: [
    { goal: C('egg', 2), setup: { count: 6, eggs: 3 }, maxMoves: 27 },
    { goal: G('lines', 8), setup: { count: 3, eggs: 1 }, maxMoves: 33 },
    { goal: C('egg', 3), setup: { count: 8, eggs: 4 }, maxMoves: 29 },
    { goal: G('score', 800), setup: { count: 4, eggs: 2 }, maxMoves: 63 },
    { goal: G('coins', 15), setup: { count: 6, eggs: 4 }, maxMoves: 63 },
    { goal: C('egg', 5), setup: { count: 10, eggs: 6 }, maxMoves: 44 },
    { goal: G('combo', 4), setup: { count: 4, eggs: 2 }, maxMoves: 34 },
    { goal: C('egg', 7), setup: { count: 12, eggs: 8 }, maxMoves: 40 },
    { goal: G('lines', 14), setup: { count: 5, eggs: 2 }, maxMoves: 48 },
    { goal: C('egg', 9), setup: { count: 14, eggs: 10 }, maxMoves: 39 },
    { goal: G('score', 1200), setup: { count: 5, eggs: 1 }, maxMoves: 75 },
    { boss: boss(tr('Lapin géant'), 14, 'bush'), setup: { count: 5, eggs: 0 }, maxMoves: 51 }, // mini-boss: the theme
    { goal: G('lines', 12), setup: { count: 5, eggs: 1 }, maxMoves: 45 },
    { goal: G('score', 1400), setup: { count: 5, eggs: 1 }, maxMoves: 80 },
    { goal: G('combo', 5), setup: { count: 4, eggs: 1 }, maxMoves: 38 },
    { goal: C('egg', 11), setup: { count: 16, eggs: 12 }, maxMoves: 49 },
    { goal: G('coins', 18), setup: { count: 6, eggs: 1 }, maxMoves: 89 },
    { goal: G('score', 1800), setup: { count: 6, eggs: 1 }, maxMoves: 91 },
    { goal: G('lines', 16), setup: { count: 6, eggs: 1 }, maxMoves: 55 },
    { goal: G('coins', 19), setup: { count: 6, eggs: 1 }, maxMoves: 87 },
    { goal: G('combo', 5), setup: { count: 5, eggs: 1 }, maxMoves: 39 },
    { goal: C('egg', 13), setup: { count: 18, eggs: 14 }, maxMoves: 47 },
    { goal: G('score', 2200), setup: { count: 7, eggs: 1 }, maxMoves: 99 },
    { goal: G('lines', 18), setup: { count: 7, eggs: 1 }, maxMoves: 56 },
    { boss: boss(tr('Poule aux œufs d’or'), 18, 'bush'), setup: { count: 6, eggs: 0 }, maxMoves: 59 }, // final boss: Cubo's outfit
  ],
  beach: [
    { goal: C('crab', 3), setup: { kind: 'crab', count: 4 }, maxMoves: 32 },
    { goal: G('lines', 8), setup: { kind: 'crab', count: 2 }, maxMoves: 29 },
    { goal: G('score', 800), setup: { kind: 'crab', count: 2 }, maxMoves: 56 },
    { goal: C('crab', 6), setup: { kind: 'crab', count: 7 }, maxMoves: 38 },
    { goal: G('coins', 14), setup: { kind: 'crab', count: 4 }, maxMoves: 67 },
    { goal: G('combo', 4), setup: { kind: 'crab', count: 2 }, maxMoves: 34 },
    { goal: C('crab', 9), setup: { kind: 'crab', count: 10 }, maxMoves: 36 },
    { goal: G('lines', 14), setup: { kind: 'crab', count: 3 }, maxMoves: 42 },
    { goal: G('score', 1500), setup: { kind: 'crab', count: 3 }, maxMoves: 80 },
    { goal: C('crab', 11), setup: { kind: 'crab', count: 13 }, maxMoves: 28 },
    { goal: G('score', 1200), setup: { kind: 'crab', count: 3 }, maxMoves: 70 },
    { boss: boss(tr('Crabe géant'), 14, 'crab'), setup: { kind: 'crab', count: 2 }, maxMoves: 57 }, // mini-boss: the theme
    { goal: G('lines', 12), setup: { kind: 'crab', count: 3 }, maxMoves: 39 },
    { goal: G('coins', 20), setup: { kind: 'crab', count: 3 }, maxMoves: 95 },
    { goal: G('combo', 5), setup: { kind: 'crab', count: 2 }, maxMoves: 38 },
    { goal: C('crab', 14), setup: { kind: 'crab', count: 16 }, maxMoves: 32 },
    { goal: G('coins', 18), setup: { kind: 'crab', count: 4 }, maxMoves: 73 },
    { goal: G('score', 1800), setup: { kind: 'crab', count: 4 }, maxMoves: 78 },
    { goal: G('lines', 16), setup: { kind: 'crab', count: 4 }, maxMoves: 48 },
    { goal: G('coins', 22), setup: { kind: 'crab', count: 4 }, maxMoves: 89 },
    { goal: G('combo', 5), setup: { kind: 'crab', count: 3 }, maxMoves: 31 },
    { goal: C('crab', 16), setup: { kind: 'crab', count: 18 }, maxMoves: 36 },
    { goal: G('score', 2200), setup: { kind: 'crab', count: 5 }, maxMoves: 85 },
    { goal: G('lines', 18), setup: { kind: 'crab', count: 5 }, maxMoves: 48 },
    { boss: boss(tr('Roi des crabes'), 20, 'crab'), setup: { kind: 'crab', count: 4 }, maxMoves: 70 }, // final boss: Cubo's outfit
  ],
  halloween: [
    { goal: C('pumpkin', 4), setup: { kind: 'pumpkin', count: 6 }, maxMoves: 52 },
    { goal: G('lines', 8), setup: { kind: 'pumpkin', count: 2 }, maxMoves: 33 },
    { goal: G('score', 700), setup: { kind: 'pumpkin', count: 3 }, maxMoves: 54 },
    { goal: C('ghost', 3), setup: { kind: 'pumpkin', count: 2 }, maxMoves: 45 },
    { goal: G('coins', 12), setup: { kind: 'pumpkin', count: 6 }, maxMoves: 42 },
    { goal: G('combo', 4), setup: { kind: 'pumpkin', count: 2 }, maxMoves: 33 },
    { goal: C('pumpkin', 8), setup: { kind: 'pumpkin', count: 10 }, maxMoves: 65 },
    { goal: G('lines', 14), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 48 },
    { goal: G('score', 1500), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 90 },
    { goal: C('pumpkin', 9), setup: { kind: 'pumpkin', count: 13 }, maxMoves: 52 },
    { goal: G('score', 1200), setup: { kind: 'pumpkin', count: 3 }, maxMoves: 80 },
    { boss: boss(tr('Citrouille géante'), 14, 'ghost'), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 52 }, // mini-boss: the theme
    { goal: G('lines', 12), setup: { kind: 'pumpkin', count: 3 }, maxMoves: 47 },
    { goal: C('ghost', 4), setup: { kind: 'pumpkin', count: 3 }, maxMoves: 51 },
    { goal: G('combo', 5), setup: { kind: 'pumpkin', count: 2 }, maxMoves: 38 },
    { goal: C('pumpkin', 10), setup: { kind: 'pumpkin', count: 15 }, maxMoves: 44 },
    { goal: G('coins', 18), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 64 },
    { goal: G('score', 1800), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 92 },
    { goal: G('lines', 16), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 52 },
    { goal: C('ghost', 6), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 64 },
    { goal: G('combo', 5), setup: { kind: 'pumpkin', count: 3 }, maxMoves: 34 },
    { goal: C('pumpkin', 10), setup: { kind: 'pumpkin', count: 17 }, maxMoves: 40 },
    { goal: G('score', 2200), setup: { kind: 'pumpkin', count: 5 }, maxMoves: 94 },
    { goal: G('lines', 18), setup: { kind: 'pumpkin', count: 5 }, maxMoves: 54 },
    { boss: boss(tr('Grande sorcière'), 18, 'ghost'), setup: { kind: 'pumpkin', count: 4 }, maxMoves: 61 }, // final boss: Cubo's outfit
  ],
  xmas: [
    { goal: C('present', 3), setup: { kind: 'present', count: 5 }, maxMoves: 54 },
    { goal: G('lines', 8), setup: { kind: 'present', count: 2 }, maxMoves: 33 },
    { goal: G('score', 800), setup: { kind: 'present', count: 3 }, maxMoves: 60 },
    { goal: C('snowpile', 5), setup: { kind: 'present', count: 2 }, maxMoves: 54 },
    { goal: G('combo', 4), setup: { kind: 'present', count: 2 }, maxMoves: 36 },
    { goal: C('present', 6), setup: { kind: 'present', count: 8 }, maxMoves: 60 },
    { goal: G('lines', 13), setup: { kind: 'present', count: 3 }, maxMoves: 45 },
    { goal: G('coins', 12), setup: { kind: 'present', count: 3 }, maxMoves: 71 },
    { goal: G('score', 1500), setup: { kind: 'present', count: 4 }, maxMoves: 76 },
    { goal: C('present', 8), setup: { kind: 'present', count: 10 }, maxMoves: 58 },
    { goal: G('score', 1200), setup: { kind: 'present', count: 3 }, maxMoves: 73 },
    { boss: boss(tr('Renne farceur'), 14, 'snowpile'), setup: { kind: 'present', count: 3 }, maxMoves: 59 }, // mini-boss: the theme
    { goal: G('lines', 12), setup: { kind: 'present', count: 3 }, maxMoves: 45 },
    { goal: C('snowpile', 7), setup: { kind: 'present', count: 3 }, maxMoves: 71 },
    { goal: G('combo', 5), setup: { kind: 'present', count: 2 }, maxMoves: 35 },
    { goal: C('present', 9), setup: { kind: 'present', count: 11 }, maxMoves: 59 },
    { goal: G('coins', 16), setup: { kind: 'present', count: 4 }, maxMoves: 85 },
    { goal: G('score', 1800), setup: { kind: 'present', count: 4 }, maxMoves: 85 },
    { goal: G('lines', 16), setup: { kind: 'present', count: 4 }, maxMoves: 52 },
    { goal: C('snowpile', 10), setup: { kind: 'present', count: 4 }, maxMoves: 87 },
    { goal: G('combo', 5), setup: { kind: 'present', count: 3 }, maxMoves: 32 },
    { goal: C('present', 9), setup: { kind: 'present', count: 13 }, maxMoves: 45 },
    { goal: G('score', 2200), setup: { kind: 'present', count: 5 }, maxMoves: 92 },
    { goal: G('lines', 18), setup: { kind: 'present', count: 5 }, maxMoves: 54 },
    { boss: boss(tr('Bonhomme de neige géant'), 18, 'snowpile'), setup: { kind: 'present', count: 4 }, maxMoves: 73 }, // final boss: Cubo's outfit
  ],

};
// Level n (1-25) of an event: an Aventure stage in the event's world. The difficulty ramp climbs half as fast
// after level 10, so the late levels stay close to an Aventure world's end.
function eventLevel(id: string, n: number): StageDef | null {
  const def = (EVENT_LEVELS[id] || [])[n - 1];
  if (!def) return null;
  // setup.kind may be missing: the event world's own setup rule fills it in (worlds.ts).
  const base: Omit<StageDef, 'goal'> = { world: id, n, event: id, boss: !!def.boss, ramp: 0.6 + Math.min(n, 10) * 0.03 + Math.max(0, n - 10) * 0.015, setup: def.setup as SpawnSetup, maxMoves: def.clock ? 99 : def.maxMoves! };
  if (def.clock) base.clock = def.clock;
  if (!def.boss) return { ...base, goal: def.goal! };
  const { name, hp, ...attack } = def.boss;
  return { ...base, goal: { type: 'boss', target: hp, name }, boss: { name, ...attack } };
}

// ---------- daily level ----------
// Same level for everyone on a given local date: world, goal and piece sequence come from the date.
const DAILY_START = '2026-09-01'; // daily #1
function hash(str: string) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
const dayNumber = (day: string) => Math.round((Date.parse(day + 'T00:00:00Z') - Date.parse(DAILY_START + 'T00:00:00Z')) / 86400000) + 1;
function daily(day: string): StageDef {
  const h = hash('daily:' + day);
  const world = ORDER[h % ORDER.length];
  // A generated mid-world level: 5..14 (never the trial).
  let n = 5 + ((h >>> 8) % 9);
  if (n >= TRIAL) n += 1;
  return { ...level(world, n)!, daily: day, seed: hash('seed:' + day) | 0 };
}

const key = (world: string, n: number) => `${world}-${n}`;

// French goal text for the HUD and level cards.
const KIND_NAMES: Record<string, string> = { bubble: tr('bulles'), asteroid: tr('astéroïdes'), ice: tr('blocs de glace'), mushroom: tr('champignons'), ember: tr('braises'), crate: tr('caisses'), rock: tr('rochers'),
  pumpkin: tr('citrouilles'), ghost: tr('fantômes'), present: tr('cadeaux'), snowpile: tr('tas de neige'), heart: tr('cœurs'), rose: tr('roses'),
  bush: tr('buissons'), egg: tr('œufs'), water: tr('vagues'), crab: tr('crabes'), rocket: tr('fusées'), lantern: tr('lanternes'), firecracker: tr('pétards'), mole: tr('taupes'), jelly: tr('méduses'), hole: tr('trous noirs'), snowman: tr('bonshommes de neige'), vine: tr('lianes'), glitch: tr('bugs'), token: tr('jetons'), lava: tr('coulées de lave') };
function goalText(goal: Goal) {
  if (goal.type === 'lines') return tr`Efface ${goal.target} lignes`;
  if (goal.type === 'score') return tr`Fais ${goal.target.toLocaleString(I18N.locale())} points`;
  if (goal.type === 'coins') return tr`Ramasse ${goal.target} pièces`;
  if (goal.type === 'combo') return tr`Fais un combo ×${goal.target}`;
  if (goal.type === 'boss') return tr`Bats ${goal.name}`;
  if (goal.kind === 'egg') return tr`Trouve ${goal.target} œufs`;
  return tr`Détruis ${goal.target} ${KIND_NAMES[goal.kind!]}`;
}
// Short uppercase label next to the progress on the score plate.
function goalLabel(goal: Goal) {
  if (goal.type === 'lines') return tr('LIGNES');
  if (goal.type === 'score') return tr('POINTS');
  if (goal.type === 'coins') return tr('PIÈCES');
  if (goal.type === 'combo') return tr('COMBO');
  if (goal.type === 'boss') return goal.name!.toUpperCase();
  return KIND_NAMES[goal.kind!].toUpperCase();
}

export { ORDER, PER_WORLD, TRIAL, BONUS, REMATCH, BONUS_SLACK, BOSSES, TWISTS, EVENT_LEVELS, eventLevel, DAILY_START, level, daily, dayNumber, key, goalText, goalLabel, KIND_NAMES };
