/*
 * Gridlock — pure game logic. No DOM, no timers, no globals.
 * Every function takes a state and returns a new one, so it drops straight
 * into a React / React Native reducer later.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GridlockLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SIZE = 8;
  const TRAY_SIZE = 3;
  const COMBO_GRACE = 3; // placements without a clear before the combo breaks
  const PERFECT_BONUS = 300;
  const BOMB_CELL_POINTS = 5;
  const EFFECT_MS = 30000;
  const EFFECT_MAX_MS = 60000;
  const BONUS_CHANCE = 0.07; // per new piece
  const MERCY_RETRIES = 4;
  const INVENTORY_MAX = 2; // per bonus type
  const OVERFLOW_POINTS = 50; // collected with a full stack
  const COIN_CHANCE = 0.12; // per new piece without a bonus
  const BAG_SHARE = 0.1; // of coin cells (never in coin goals: a bag would pay 5 of the goal at once)
  const COIN_DRY_STEP = 0.06; // coin goals: extra coin chance per piece since the last coin piece
  const COIN_DRY_MAX = 5; // coin goals: at most 4 pieces in a row without a coin
  // Coin cells ride on the same `bonus` slot as bonuses but pay coins instead of filling the inventory.
  const COIN_VALUES = { coin: 1, bag: 5 };
  // Throwing a tray piece away costs wallet coins, more each time within a run.
  const DISCARD_COST = 10;
  const DISCARD_STEP = 5;

  // Modes: 'classic' ends when nothing fits; 'chrono' also ends when the clock runs out;
  // 'chill' turns pieces freely and drops no bonuses (coins still show up);
  // 'adventure' plays one level: a goal, a move budget and the rules of its world (see worlds.js);
  // 'worlds' is an endless Classique run under one world's rules (opts.world, see worlds.js `free`);
  // 'puzzle' fills a drawing with a fixed set of pieces (opts.puzzle from puzzles.js): no line
  // clears, no bonuses, free rotation, free undo all the way back.
  // Levels scale how fast big pieces show up and, in chrono, the clock.
  const MODES = ['classic', 'chrono', 'chill', 'adventure', 'worlds', 'puzzle'];
  const LEVELS = {
    easy: { ramp: 0.6, clock: 90000, perLine: 10000, clockMax: 120000 },
    normal: { ramp: 1, clock: 60000, perLine: 7000, clockMax: 90000 },
    hard: { ramp: 1.5, clock: 45000, perLine: 5000, clockMax: 60000 },
  };

  // Shape families: [pattern, weight]. Rows separated by '|'.
  // A family's rotations (and mirrors listed with it) share one color = family index + 1.
  const FAMILIES = [
    [['#'], 1],
    [['##'], 3],
    [['###'], 3],
    [['####'], 2],
    [['#####'], 1],
    [['##|##'], 2.5],
    [['###|###|###'], 0.8],
    [['##|#.'], 2],
    [['#..|###', '..#|###'], 3],
    [['###|.#.'], 1.5],
    [['##.|.##', '.##|##.'], 2.4],
    [['#..|#..|###'], 0.8],
    [['##|##|##'], 1],
    [['#.|.#'], 0.6],
  ];

  // Clearing a bonus cell stores it; the player fires it with use().
  // Timed bonuses last EFFECT_MS (more once upgraded, see effectMs); instant ones fire once.
  const BONUSES = {
    rotate: { weight: 3, timed: true },
    nitro: { weight: 2, timed: true },
    shield: { weight: 2, timed: true },
    bomb: { weight: 3, timed: false },
    reroll: { weight: 2, timed: false },
  };
  const TIMED = Object.keys(BONUSES).filter((k) => BONUSES[k].timed);

  // Bonus upgrades (bought in the Boutique, meta.js). state.upgrades = { [bonus]: 1..3 }, 1 = base.
  // Toupie / Bulle last longer, Étoile multiplies more, Bombe hits a bigger area,
  // Tornade deals pieces that fit (level 2), then small ones (level 3).
  const UPGRADE_MAX = 3;
  const EFFECT_BY_LEVEL = { rotate: [30000, 45000, 60000], nitro: [30000, 30000, 30000], shield: [30000, 45000, 60000] };
  const NITRO_BY_LEVEL = [2, 2.5, 3];
  const upLevel = (state, type) => Math.max(1, Math.min(UPGRADE_MAX, (state.upgrades && state.upgrades[type]) || 1));
  const effectMs = (state, type) => EFFECT_BY_LEVEL[type][upLevel(state, type) - 1];
  // A timed bonus stacks up to two uses.
  const effectMaxMs = (state, type) => 2 * effectMs(state, type);
  const nitroMul = (state) => (state.effects.nitro > 0 ? NITRO_BY_LEVEL[upLevel(state, 'nitro') - 1] : 1);

  // Special cells (Aventure). They sit on the board with value SPECIAL so they block pieces and
  // count toward full lines; state.special[i] holds { kind, hp, age }. A line clear takes one hp;
  // at 0 the cell goes away. blast: clears its row and column when destroyed. gift: drops a bonus.
  // fuse: after that many moves the cell turns into `hardens`.
  // Aventure twists (levels 11-19, stage.twist, see levels.js) add kinds that act on their own:
  // ttl: leaves by itself after that many moves. loot: drops that coin cell when destroyed.
  // wander: every n moves, drifts to an empty neighbor. hop: every n moves, jumps to any empty cell.
  // flow: falls one row each move while the cell below is empty. spread: every n moves, one of them
  // grows onto an empty neighbor. hole: no line can complete through it. time: ms added to the
  // clock when destroyed.
  const SPECIAL = 15;
  const KINDS = {
    ice: { hp: 2 },
    asteroid: { hp: 2 },
    rock: { hp: 2 },
    mushroom: { hp: 1 },
    ember: { hp: 1, fuse: 8, hardens: 'rock', blast: true },
    bubble: { hp: 1, gift: true },
    // Aventure v2 boss: 4 cells (2x2) that line clears never remove. Every boss cell inside a
    // cleared line takes one hp off stage.goal (type 'boss'); see clearCells and stageMove.
    boss: { hp: 1, boss: true },
    crate: { hp: 2 }, // wooden crates stacked at the start of some levels (stage.fill), 2 hits each
    void: { hp: 1 }, // puzzle: outside the drawing (never cleared, puzzles have no line clears)
    mole: { hp: 1, ttl: 4, loot: 'coin' },
    jelly: { hp: 1, wander: 2 },
    hole: { hp: 1, ttl: 8, hole: true },
    snowman: { hp: 3 },
    vine: { hp: 1, spread: 4 },
    glitch: { hp: 1, hop: 3 },
    token: { hp: 2, time: 4000 },
    lava: { hp: 1, flow: true },
    // Season events (levels.js EVENT_LEVELS). link: destroying one destroys the other cell with the
    // same sp.link. sidestep: walks left or right each move. burst: clears its diagonals when destroyed.
    // hides: some carry sp.egg; destroyed, they count as a found 'egg' (and drop a coin).
    pumpkin: { hp: 2, loot: 'bag' },
    ghost: { hp: 1, hop: 2 },
    present: { hp: 2, gift: true },
    snowpile: { hp: 1 },
    heart: { hp: 1, link: true },
    rose: { hp: 2 },
    bush: { hp: 1, hides: true },
    egg: { hp: 1 }, // never on the board: what a bush with an egg turns into when found
    water: { hp: 1, ttl: 6 },
    crab: { hp: 1, sidestep: true, loot: 'coin' },
    rocket: { hp: 1, burst: true },
    lantern: { hp: 1, rise: true, loot: 'coin' }, // rise: goes up one row a move while the cell above is empty
    firecracker: { hp: 1, fuse: 6, hardens: 'rock' },
  };
  const BOSS_AT = [3, 3]; // top-left cell of the 2x2 boss: the center of the board

  // World rules, registered by worlds.js (logic never names a world). See defineWorlds().
  const WORLDS = {};
  const NO_RULES = {};
  function defineWorlds(map) { Object.assign(WORLDS, map); }
  // Aventure levels carry their world in the stage; the free 'worlds' mode in state.world.
  const worldId = (state) => (state.stage ? state.stage.world : state.world) || null;
  const rulesOf = (state) => WORLDS[worldId(state)] || NO_RULES;

  function parse(pattern) {
    const cells = [];
    pattern.split('|').forEach((row, r) => {
      [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); });
    });
    return cells;
  }

  function normalize(cells) {
    const minR = Math.min(...cells.map((p) => p[0]));
    const minC = Math.min(...cells.map((p) => p[1]));
    return cells
      .map(([r, c]) => [r - minR, c - minC])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  const dims = (cells) => ({
    h: 1 + Math.max(...cells.map((p) => p[0])),
    w: 1 + Math.max(...cells.map((p) => p[1])),
  });

  // Clockwise quarter turn: (r, c) -> (c, h - 1 - r).
  const turn = (r, c, h) => [c, h - 1 - r];
  const turnCells = (cells) => {
    const { h } = dims(cells);
    return normalize(cells.map(([r, c]) => turn(r, c, h)));
  };
  const shapeKey = (cells) => cells.map((p) => p.join(',')).join(';');

  const SHAPES = [];
  FAMILIES.forEach(([patterns, weight], family) => {
    const seen = new Set();
    const variants = [];
    for (const pattern of patterns) {
      let cells = normalize(parse(pattern));
      for (let i = 0; i < 4; i++) {
        const k = shapeKey(cells);
        if (!seen.has(k)) { seen.add(k); variants.push(cells); }
        cells = turnCells(cells);
      }
    }
    for (const v of variants) {
      SHAPES.push({ cells: v, weight: weight / variants.length, color: family + 1, ...dims(v) });
    }
  });

  // mulberry32, state kept in state.seed so games are reproducible.
  function nextRandom(state) {
    let t = (state.seed = (state.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function weightedPick(state, items, weightOf) {
    const weights = items.map(weightOf);
    let x = nextRandom(state) * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < items.length; i++) {
      x -= weights[i];
      if (x <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function pickPiece(state) {
    // Difficulty ramps with score (with moves in adventure): fewer tiny pieces, more big ones.
    const d = state.stage
      ? Math.min(1, (state.moves / 40) * (state.stage.ramp || 0.5))
      : Math.min(1, (state.score / 6000) * (LEVELS[state.level] || LEVELS.normal).ramp);
    const shape = weightedPick(state, SHAPES, (s) => {
      const n = s.cells.length;
      let w = s.weight;
      if (n >= 5) w *= 1 + d;
      if (n <= 2) w *= 1 - 0.5 * d;
      return w;
    });
    const piece = { id: state.nextId++, cells: shape.cells, w: shape.w, h: shape.h, color: shape.color, bonus: null };
    const onCell = () => shape.cells[Math.floor(nextRandom(state) * shape.cells.length)];
    const rules = rulesOf(state);
    const bonusWeight = (k) => BONUSES[k].weight * ((rules.bonusWeights && rules.bonusWeights[k]) || 1);
    // Coin goals: bad-luck protection. Each piece without a coin raises the odds of the next one,
    // and the COIN_DRY_MAX-th dry piece always carries one, so the goal never hangs on luck.
    const stage = state.stage;
    const coinGoal = stage && stage.goal.type === 'coins' && !stage.won;
    const dry = coinGoal ? stage.dry || 0 : 0;
    const forced = coinGoal && dry >= COIN_DRY_MAX - 1;
    if (!forced && state.mode !== 'chill' && nextRandom(state) < BONUS_CHANCE) {
      const [r, c] = onCell();
      piece.bonus = { r, c, type: weightedPick(state, Object.keys(BONUSES), bonusWeight) };
    } else if (forced || nextRandom(state) < COIN_CHANCE * (rules.coinMul || 1) + dry * COIN_DRY_STEP) {
      const [r, c] = onCell();
      piece.bonus = { r, c, type: !coinGoal && nextRandom(state) < BAG_SHARE ? 'bag' : 'coin' };
    }
    if (coinGoal) stage.dry = piece.bonus && COIN_VALUES[piece.bonus.type] ? 0 : dry + 1;
    return piece;
  }

  function rotated(piece) {
    const cells = piece.cells.map(([r, c]) => turn(r, c, piece.h));
    const bonus = piece.bonus ? { ...piece.bonus } : null;
    if (bonus) [bonus.r, bonus.c] = turn(bonus.r, bonus.c, piece.h);
    // turn() already keeps coordinates >= 0 with the origin at the corner.
    const sorted = cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return { ...piece, cells: sorted, w: piece.h, h: piece.w, bonus };
  }

  function canPlace(board, piece, row, col) {
    for (const [r, c] of piece.cells) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) return false;
      if (board[rr * SIZE + cc]) return false;
    }
    return true;
  }

  function fitsAnywhere(board, piece) {
    for (let r = 0; r <= SIZE - piece.h; r++) {
      for (let c = 0; c <= SIZE - piece.w; c++) {
        if (canPlace(board, piece, r, c)) return true;
      }
    }
    return false;
  }

  // Clock of a timed run: { clockMax, perLine } or null. Chrono follows the level; Aventure and
  // the worlds mode follow the stage / world (lines add 3 s).
  function clockOf(state) {
    if (state.mode === 'chrono') return LEVELS[state.level] || LEVELS.normal;
    const max = state.stage ? state.stage.clock : state.mode === 'worlds' && rulesOf(state).free && rulesOf(state).free.clock;
    return max ? { clockMax: max, perLine: 3000 } : null;
  }

  // Pieces turn in chill mode or while the rotate bonus runs.
  const canTurn = (state) => state.mode === 'chill' || state.mode === 'puzzle' || state.effects.rotate > 0;

  // Does this piece have a legal spot, counting rotations when pieces can turn?
  function pieceFits(state, piece) {
    let p = piece;
    const turns = canTurn(state) ? 4 : 1;
    for (let i = 0; i < turns; i++) {
      if (fitsAnywhere(state.board, p)) return true;
      p = rotated(p);
    }
    return false;
  }

  const trayFits = (state) => state.tray.some((p) => p && pieceFits(state, p));

  // Undoing the last placement: first one free, then 1, 2, 3... coins within a run.
  const undoCost = (state) => (state.mode === 'puzzle' ? 0 : (state.stats && state.stats.undos) || 0);
  const canUndo = (state) => !!state.undo && (state.budget || 0) >= undoCost(state);

  const discardCost = (state) => DISCARD_COST + DISCARD_STEP * ((state.stats && state.stats.discards) || 0);
  const canDiscard = (state) => state.mode !== 'puzzle' && (state.budget || 0) >= discardCost(state);

  // Can a stored bonus (or a paid discard) still get the player out of a dead end?
  function canRescue(state) {
    const inv = state.inventory;
    if (canDiscard(state) || canUndo(state)) return true;
    if (inv.reroll > 0) return true;
    if (inv.bomb > 0 && state.board.some((v) => v)) return true;
    if (inv.rotate > 0 && !canTurn(state)) {
      return trayFits({ ...state, effects: { ...state.effects, rotate: 1 } });
    }
    return false;
  }

  // Sets over / stuck. Stuck = nothing fits right now but a stored bonus can help.
  function settle(state) {
    if (state.mode === 'puzzle') {
      state.over = state.puzzle.won;
      state.stuck = !state.over && !trayFits(state);
      return;
    }
    const fits = trayFits(state);
    state.over = !fits && !canRescue(state);
    state.stuck = !fits && !state.over;
  }

  // A hole special (KINDS.hole) counts as empty: no line completes through it.
  function findClears(board, special) {
    const rows = [];
    const cols = [];
    const filled = (i) => board[i] && !(special && special[i] && KINDS[special[i].kind] && KINDS[special[i].kind].hole);
    for (let i = 0; i < SIZE; i++) {
      let rowFull = true;
      let colFull = true;
      for (let j = 0; j < SIZE; j++) {
        if (!filled(i * SIZE + j)) rowFull = false;
        if (!filled(j * SIZE + i)) colFull = false;
      }
      if (rowFull) rows.push(i);
      if (colFull) cols.push(i);
    }
    return { rows, cols };
  }

  function clearedIndices(rows, cols) {
    const set = new Set();
    for (const r of rows) for (let c = 0; c < SIZE; c++) set.add(r * SIZE + c);
    for (const c of cols) for (let r = 0; r < SIZE; r++) set.add(r * SIZE + c);
    return set;
  }

  // Which cells would vanish (by line clear) if `piece` were dropped at (row, col)?
  function previewClears(board, piece, row, col, special) {
    const b = board.slice();
    for (const [r, c] of piece.cells) b[(row + r) * SIZE + (col + c)] = piece.color;
    const { rows, cols } = findClears(b, special);
    return clearedIndices(rows, cols);
  }

  // Mutates `state.tray[slot]` / `state.next` (callers pass a fresh copy). The slot gets the
  // announced next piece; only if that leaves no move at all, a few retries keep the game fair
  // without making it endless.
  function refillSlot(state, slot) {
    if (state.mode === 'puzzle') {
      const queue = (state.puzzle = { ...state.puzzle, queue: state.puzzle.queue.slice() }).queue;
      state.tray[slot] = queue.shift() || null;
      state.next = queue[0] || null;
      return;
    }
    state.tray[slot] = state.next || pickPiece(state);
    state.next = pickPiece(state);
    for (let attempt = 0; attempt < MERCY_RETRIES && !trayFits(state); attempt++) {
      state.tray[slot] = pickPiece(state);
    }
  }

  function refillAll(state) {
    state.tray = new Array(TRAY_SIZE).fill(null);
    for (let i = 0; i < TRAY_SIZE; i++) refillSlot(state, i);
  }

  const emptyStats = () => ({
    lines: 0, bestMulti: 0, bestCombo: 0, perfects: 0, bonusUsed: 0, bombCells: 0, bestBomb: 0, pieces: 0, coins: 0,
    discards: 0, undos: 0, used: {},
  });

  // Run stats for missions / coins (see meta.js).
  // obstacles: how many obstacle kinds a free run had (its difficulty bonus, meta.js runCoins).
  const runStats = (state) => ({ ...(state.stats || emptyStats()), score: state.score, mode: state.mode, ...(state.world ? { world: state.world } : {}),
    ...(state.obstacles && state.obstacles.length ? { obstacles: state.obstacles.length } : {}) });

  // opts.obstacles (Classique, Chrono, Chill): [{ kind, every, top? }] from worlds.js freeObstacles;
  // one cell of each kind every `every` moves.
  // opts: { mode, level, budget, stage, world, upgrades } — budget mirrors the wallet so the logic knows whether a
  // discard can still rescue the player (see withBudget). stage (adventure only) comes from
  // levels.js: { world, n, goal: { type: 'lines' | 'score' | 'clear', target, kind? }, maxMoves,
  // clock?, setup?, ramp? }. world: the world id of the 'worlds' mode. upgrades: { [bonus]: level }.
  function createGame(seed, opts = {}) {
    const stage = opts.mode === 'adventure' && opts.stage ? opts.stage : null;
    const world = opts.mode === 'worlds' && WORLDS[opts.world] ? opts.world : null;
    const puzzle = opts.mode === 'puzzle' && opts.puzzle ? opts.puzzle : null;
    const mode = stage ? 'adventure' : world ? 'worlds' : puzzle ? 'puzzle'
      : ['classic', 'chrono', 'chill'].includes(opts.mode) ? opts.mode : 'classic';
    const level = LEVELS[opts.level] && mode !== 'worlds' ? opts.level : 'normal';
    const upgrades = {};
    for (const k of Object.keys(BONUSES)) {
      const n = opts.upgrades && opts.upgrades[k];
      if (n > 1) upgrades[k] = Math.min(UPGRADE_MAX, n);
    }
    const state = {
      mode,
      level,
      world,
      upgrades,
      ...(['classic', 'chrono', 'chill'].includes(mode) && opts.obstacles && opts.obstacles.length ? { obstacles: opts.obstacles.map((o) => ({ ...o })) } : {}),
      stage: stage && { ...stage, movesLeft: stage.maxMoves, progress: 0, won: false, stars: 0, extra: 0 },
      special: new Array(SIZE * SIZE).fill(null),
      clock: 0,
      budget: opts.budget || 0,
      next: null,
      undo: null, // state before the last placement (without its own undo)
      board: new Array(SIZE * SIZE).fill(0),
      bonus: new Array(SIZE * SIZE).fill(null),
      tray: [],
      effects: { rotate: 0, nitro: 0, shield: 0 },
      inventory: Object.fromEntries(Object.keys(BONUSES).map((k) => [k, 0])),
      score: 0,
      combo: 0,
      movesSinceClear: 0,
      moves: 0,
      seed: (seed ?? Date.now()) | 0,
      nextId: 1,
      over: false,
      stuck: false,
      stats: emptyStats(),
    };
    const clock = clockOf(state);
    state.clock = mode === 'chrono' ? LEVELS[level].clock : clock ? clock.clockMax : 0;
    const rules = rulesOf(state);
    if (stage && stage.goal.type === 'boss') placeBoss(state);
    if (stage && stage.fill) prefill(state, stage.fill, stage.goal.target + stage.fill);
    if (stage && rules.setup) rules.setup(state, WORLD_API);
    if (stage && stage.twist) scatterKind(state, stage.twist.kind, stage.twist.count, stage.twist.top);
    if (world && rules.free && rules.free.setup) scatterKind(state, rules.free.setup.kind, rules.free.setup.count);
    if (puzzle) setupPuzzle(state, puzzle);
    refillAll(state);
    return state;
  }

  // Puzzle board: outside cells are 'void' specials, fixed pieces are plain blocks. The pieces to
  // place are dealt from state.puzzle.queue; state.puzzle.sol keeps each one's solution cells.
  function setupPuzzle(state, pz) {
    pz.mask.forEach((inside, i) => { if (!inside) WORLD_API.addSpecial(state, i, 'void'); });
    for (const f of pz.fixed) for (const i of f.cells) state.board[i] = f.color;
    const queue = pz.pieces.map((p) => {
      const d = dims(p.cells);
      return { id: state.nextId++, cells: p.cells, w: d.w, h: d.h, color: p.color, bonus: null };
    });
    state.puzzle = { n: pz.n, name: pz.name, total: queue.length, placed: 0, hints: 0, won: false, stars: 0, queue,
      sol: pz.pieces.map((p) => p.sol) };
  }

  // Stars: 3 without hints, one less per hint, at least 1.
  const puzzleStars = (hints) => Math.max(1, 3 - hints);

  function placePuzzle(prev, trayIndex, row, col) {
    const piece = prev.tray[trayIndex];
    const state = { ...prev, board: prev.board.slice(), tray: prev.tray.slice(), stats: { ...(prev.stats || emptyStats()) }, undo: prev };
    const placed = piece.cells.map(([r, c]) => [row + r, col + c]);
    for (const [r, c] of placed) state.board[r * SIZE + c] = piece.color;
    state.moves += 1;
    state.stats.pieces += 1;
    state.tray[trayIndex] = null;
    refillSlot(state, trayIndex);
    const pz = (state.puzzle = { ...state.puzzle, placed: state.puzzle.placed + 1 });
    if (state.board.every((v) => v)) { pz.won = true; pz.stars = puzzleStars(pz.hints); }
    settle(state);
    return {
      state,
      events: { placed, color: piece.color, rows: [], cols: [], lines: 0, chain: 0, waves: [], damaged: [], blasts: [], spawned: [],
        cleared: [], collected: [], points: 0, combo: 0, perfect: false, refilled: state.tray[trayIndex] ? [trayIndex] : [], timeGain: 0,
        over: state.over, stuck: state.stuck, won: pz.won },
    };
  }

  // Puzzle hint: puts a tray piece on a solution spot of the same shape that is still empty.
  // Returns { state, events: place()'s events + hint: true } or null when no such spot is free
  // (the player's pieces cover them all: undo first).
  function puzzleHint(prev) {
    if (prev.mode !== 'puzzle' || prev.over) return null;
    const empty = (i) => !prev.board[i];
    for (let slot = 0; slot < prev.tray.length; slot++) {
      const piece = prev.tray[slot];
      if (!piece) continue;
      let turnedPiece = piece;
      for (let k = 0; k < 4; k++, turnedPiece = rotated(turnedPiece)) {
        const key = shapeKey(turnedPiece.cells);
        for (const sol of prev.puzzle.sol) {
          if (!sol.every(empty)) continue;
          const cells = normalize(sol.map((i) => [Math.floor(i / SIZE), i % SIZE]));
          if (shapeKey(cells) !== key) continue;
          const row = Math.min(...sol.map((i) => Math.floor(i / SIZE)));
          const col = Math.min(...sol.map((i) => i % SIZE));
          const tray = prev.tray.slice();
          tray[slot] = turnedPiece;
          const withHint = { ...prev, tray, puzzle: { ...prev.puzzle, hints: prev.puzzle.hints + 1 } };
          // Undoing a hinted piece is allowed; the hint stays counted (see undo).
          const res = placePuzzle(withHint, slot, row, col);
          res.state.undo = prev;
          res.events.hint = true;
          res.events.slot = slot;
          return res;
        }
      }
    }
    return null;
  }

  const linePoints = (lines, combo) => ((10 * lines * (lines + 1)) / 2) * combo;

  // Returns { state, events } or null if the move is illegal.
  function place(prev, trayIndex, row, col) {
    const piece = prev.tray[trayIndex];
    if (prev.over || !piece || !canPlace(prev.board, piece, row, col)) return null;
    if (prev.mode === 'puzzle') return placePuzzle(prev, trayIndex, row, col);

    const state = {
      ...prev,
      board: prev.board.slice(),
      bonus: prev.bonus.slice(),
      special: (prev.special || new Array(SIZE * SIZE).fill(null)).slice(),
      tray: prev.tray.slice(),
      effects: { ...prev.effects },
      inventory: { ...prev.inventory },
      stats: { ...(prev.stats || emptyStats()) },
      undo: { ...prev, undo: null },
    };
    const placed = piece.cells.map(([r, c]) => [row + r, col + c]);
    for (const [r, c] of placed) state.board[r * SIZE + c] = piece.color;
    if (piece.bonus) state.bonus[(row + piece.bonus.r) * SIZE + (col + piece.bonus.c)] = piece.bonus.type;

    const rules = rulesOf(state);
    const nitro = nitroMul(prev);
    const { rows, cols } = findClears(state.board, state.special);
    const lines = rows.length + cols.length;
    const hit = clearCells(state, clearedIndices(rows, cols));
    let points = placed.length;
    if (lines) {
      state.combo += 1;
      state.movesSinceClear = 0;
      points += linePoints(lines, state.combo) * lineMul(rules, hit);
    } else if (!(prev.effects.shield > 0)) {
      state.movesSinceClear += 1;
      if (state.movesSinceClear >= COMBO_GRACE) state.combo = 0;
    }

    // Gravity worlds: blocks fall after a clear, and every new full line is a chain step.
    // waves[k] = the cells cleared in step k and the falls that follow it (for the renderer).
    let chain = 0;
    let allLines = lines;
    const waves = [];
    if (lines && rules.gravity) {
      let wave = { cleared: hit.cleared.map(({ r, c }) => r * SIZE + c), moves: fall(state) };
      waves.push(wave);
      for (;;) {
        const next = findClears(state.board, state.special);
        const n = next.rows.length + next.cols.length;
        if (!n) break;
        chain += 1;
        allLines += n;
        state.combo += 1;
        const more = clearCells(state, clearedIndices(next.rows, next.cols));
        for (const cell of more.cleared) cell.wave = chain;
        points += linePoints(n, state.combo) * lineMul(rules, more);
        mergeHits(hit, more);
        wave = { cleared: more.cleared.map(({ r, c }) => r * SIZE + c), moves: fall(state) };
        waves.push(wave);
      }
    }
    const cleared = hit.cleared;
    const collected = collect(state, cleared);

    const perfect = allLines > 0 && state.board.every((v) => v === 0);
    if (perfect) points += PERFECT_BONUS;
    points = Math.round(points * nitro * (rules.scoreMul || 1)) + collected.filter((b) => b.overflow).length * OVERFLOW_POINTS;

    state.score += points;
    state.moves += 1;
    const st = state.stats;
    st.pieces += 1;
    st.lines += allLines;
    st.bestMulti = Math.max(st.bestMulti, lines);
    st.bestCombo = Math.max(st.bestCombo, state.combo);
    if (perfect) st.perfects += 1;

    let timeGain = 0;
    const lv = clockOf(state);
    // Lines add time; so do destroyed cells of a kind with `time` (Arcade tokens).
    const kindTime = Object.entries(hit.destroyed).reduce((a, [k, n]) => a + ((KINDS[k] && KINDS[k].time) || 0) * n, 0);
    if ((allLines || kindTime) && lv) {
      timeGain = Math.max(0, Math.min(lv.clockMax - state.clock, lv.perLine * allLines + kindTime));
      state.clock += timeGain;
    }

    state.tray[trayIndex] = null;
    refillSlot(state, trayIndex);
    const spawned = state.stage ? stageMove(state, rules, hit, allLines, true)
      : state.mode === 'worlds' ? worldMove(state, rules).concat(freeSpawn(state, rules))
        : state.obstacles ? worldMove(state, rules).concat(obstacleSpawn(state)) : [];
    if (!state.over) settle(state);

    return {
      state,
      events: {
        placed,
        color: piece.color,
        rows,
        cols,
        lines: allLines,
        chain,
        waves,
        damaged: hit.damaged,
        blasts: hit.blasts,
        bossHits: hit.boss,
        spawned,
        cleared,
        collected,
        points,
        nitro: nitro > 1 ? nitro : 0,
        combo: lines ? state.combo : 0,
        perfect,
        refilled: [trayIndex],
        timeGain,
        over: state.over,
        stuck: state.stuck,
      },
    };
  }

  // Takes one hp off every special cell in `indices` and empties the others. Ember blasts extend
  // the clear to their row and column. Mutates state (callers pass fresh copies of the arrays).
  // Returns { cleared: [{ r, c, color, bonus, kind? }], damaged: [{ r, c, kind, hp }],
  //           destroyed: { [kind]: n }, blasts: [{ r, c }] }.
  function clearCells(state, indices) {
    const hit = { cleared: [], damaged: [], destroyed: {}, blasts: [], boss: [] };
    const queue = [...indices];
    const done = new Set();
    while (queue.length) {
      const i = queue.shift();
      if (done.has(i) || !state.board[i]) continue;
      done.add(i);
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      const sp = state.special[i];
      if (sp && sp.kind === 'boss') { hit.boss.push({ r, c }); continue; }
      if (sp) {
        const kind = KINDS[sp.kind] || {};
        if (sp.hp > 1) {
          state.special[i] = { ...sp, hp: sp.hp - 1 };
          hit.damaged.push({ r, c, kind: sp.kind, hp: sp.hp - 1 });
          continue;
        }
        hit.destroyed[sp.kind] = (hit.destroyed[sp.kind] || 0) + 1;
        if (kind.blast) {
          hit.blasts.push({ r, c });
          for (let k = 0; k < SIZE; k++) queue.push(r * SIZE + k, k * SIZE + c);
        }
        if (kind.burst) {
          hit.blasts.push({ r, c, kind: sp.kind });
          for (let k = -SIZE; k < SIZE; k++) {
            for (const cc of [c + k, c - k]) {
              const rr = r + k;
              if (k && rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) queue.push(rr * SIZE + cc);
            }
          }
        }
        if (kind.link) {
          // Its partner goes too, wherever it is, whatever hp it has left.
          const mate = state.special.findIndex((o, j) => j !== i && o && o.kind === sp.kind && o.link === sp.link);
          if (mate >= 0 && !done.has(mate)) { state.special[mate] = { ...state.special[mate], hp: 1 }; queue.push(mate); }
        }
        const egg = kind.hides && sp.egg;
        if (egg) hit.destroyed.egg = (hit.destroyed.egg || 0) + 1;
        const gift = kind.gift ? weightedPick(state, Object.keys(BONUSES), (k) => BONUSES[k].weight) : egg ? 'coin' : kind.loot || null;
        hit.cleared.push({ r, c, color: SPECIAL, bonus: gift, kind: egg ? 'egg' : sp.kind });
      } else {
        hit.cleared.push({ r, c, color: state.board[i], bonus: state.bonus[i] });
      }
      state.board[i] = 0;
      state.bonus[i] = null;
      state.special[i] = null;
    }
    return hit;
  }

  function mergeHits(into, more) {
    into.cleared.push(...more.cleared);
    into.damaged.push(...more.damaged);
    into.blasts.push(...more.blasts);
    into.boss.push(...more.boss);
    for (const [k, n] of Object.entries(more.destroyed)) into.destroyed[k] = (into.destroyed[k] || 0) + n;
  }

  // Line points multiplier from the world (e.g. lines through ice pay double).
  const lineMul = (rules, hit) => (rules.lineMul ? rules.lineMul(hit) : 1);

  // Every column drops its cells to the bottom, keeping their order (bonus and special ride along).
  // Returns the moves as [from, to] board indices.
  // A boss never moves: blocks above it land on it.
  function fall(state) {
    const moves = [];
    for (let c = 0; c < SIZE; c++) {
      let write = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        const i = r * SIZE + c;
        if (!state.board[i]) continue;
        if (isBoss(state, i)) { write = r - 1; continue; }
        const j = write * SIZE + c;
        if (j !== i) {
          state.board[j] = state.board[i]; state.bonus[j] = state.bonus[i]; state.special[j] = state.special[i];
          state.board[i] = 0; state.bonus[i] = null; state.special[i] = null;
          moves.push([i, j]);
        }
        write -= 1;
      }
    }
    return moves;
  }

  // After a move in adventure: goal progress, world events, move budget, win / loss.
  // `spend`: false for bonuses (they don't cost a move). Returns the cells the world spawned.
  function stageMove(state, rules, hit, lines, spend) {
    const stage = (state.stage = { ...state.stage });
    const goal = stage.goal;
    if (goal.type === 'lines') stage.progress += lines;
    else if (goal.type === 'score') stage.progress = state.score;
    else if (goal.type === 'clear') stage.progress += hit.destroyed[goal.kind] || 0;
    else if (goal.type === 'coins') stage.progress = state.stats.coins;
    else if (goal.type === 'combo') stage.progress = Math.max(stage.progress, state.combo);
    else if (goal.type === 'boss') stage.progress += (hit.boss || []).length;
    let spawned = [];
    if (spend) {
      stage.movesLeft -= 1;
      spawned = worldMove(state, rules).concat(twistSpawn(state));
      if (stage.progress < goal.target) spawned = spawned.concat(bossAttack(state));
    }
    if (stage.progress >= goal.target) {
      stage.progress = Math.min(stage.progress, goal.target);
      finishStage(state, true);
    } else if (stage.movesLeft <= 0) {
      finishStage(state, false);
    }
    return spawned;
  }

  // A placement under world rules: special cells age (embers harden), twist cells act, then the
  // world acts. Returns the cells it spawned, moved ({ from: [r, c] }) or removed ({ gone: true }).
  function worldMove(state, rules) {
    for (let i = 0; i < SIZE * SIZE; i++) {
      const sp = state.special[i];
      if (!sp || sp.kind === 'boss') continue;
      const kind = KINDS[sp.kind];
      const age = (sp.age || 0) + 1;
      state.special[i] = kind.fuse && age >= kind.fuse ? { kind: kind.hardens, hp: KINDS[kind.hardens].hp, age: 0 } : { ...sp, age };
    }
    return kindMoves(state).concat((rules.afterMove && rules.afterMove(state, WORLD_API)) || []);
  }

  const neighbors = (i) => {
    const r = Math.floor(i / SIZE), c = i % SIZE;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < SIZE && cc < SIZE).map(([rr, cc]) => rr * SIZE + cc);
  };
  const at = (i) => ({ r: Math.floor(i / SIZE), c: i % SIZE });
  function moveSpecial(state, from, to) {
    state.board[to] = SPECIAL; state.special[to] = state.special[from]; state.bonus[to] = null;
    state.board[from] = 0; state.special[from] = null; state.bonus[from] = null;
    return { ...at(to), kind: state.special[to].kind, from: [Math.floor(from / SIZE), from % SIZE] };
  }

  // Twist kinds acting on their own (see KINDS): leaving, drifting, jumping, flowing, spreading.
  function kindMoves(state) {
    const out = [];
    const cells = [];
    for (let i = 0; i < SIZE * SIZE; i++) if (state.special[i] && KINDS[state.special[i].kind]) cells.push(i);
    if (!cells.length) return out;
    // Bottom rows first, so a column of lava falls together; lanterns go up, top rows first.
    cells.sort((a, b) => b - a);
    for (const i of cells.filter((j) => KINDS[state.special[j].kind].rise).reverse()) {
      if (i >= SIZE && !state.board[i - SIZE]) out.push(moveSpecial(state, i, i - SIZE));
    }
    const empty = (i) => !state.board[i];
    const spreaders = {};
    for (const i of cells) {
      const sp = state.special[i];
      if (!sp || sp.kind === 'boss') continue;
      const kind = KINDS[sp.kind];
      if (kind.rise) continue; // moved above
      if (kind.ttl && sp.age >= kind.ttl) {
        state.board[i] = 0; state.special[i] = null;
        out.push({ ...at(i), kind: sp.kind, gone: true });
      } else if (kind.wander && sp.age % kind.wander === 0) {
        const to = WORLD_API.pick(state, neighbors(i).filter(empty));
        if (to >= 0) out.push(moveSpecial(state, i, to));
      } else if (kind.hop && sp.age % kind.hop === 0) {
        const to = WORLD_API.pick(state, WORLD_API.emptyCells(state));
        if (to >= 0) out.push({ ...moveSpecial(state, i, to), hop: true });
      } else if (kind.sidestep) {
        // Crabs walk sideways: keep going the same way, turn around at a wall or a block.
        const c = i % SIZE;
        let dir = sp.dir || 1;
        const ok = (d) => c + d >= 0 && c + d < SIZE && empty(i + d);
        if (!ok(dir)) dir = -dir;
        if (ok(dir)) { state.special[i] = { ...sp, dir }; out.push(moveSpecial(state, i, i + dir)); }
        else state.special[i] = { ...sp, dir };
      } else if (kind.flow && i + SIZE < SIZE * SIZE && empty(i + SIZE)) {
        out.push(moveSpecial(state, i, i + SIZE));
      } else if (kind.spread) {
        (spreaders[sp.kind] = spreaders[sp.kind] || []).push(i);
      }
    }
    // One cell of each spreading kind grows every `spread` moves.
    for (const [k, list] of Object.entries(spreaders)) {
      if (state.moves % KINDS[k].spread) continue;
      const from = list.filter((i) => neighbors(i).some(empty));
      const src = WORLD_API.pick(state, from);
      if (src < 0) continue;
      const to = WORLD_API.pick(state, neighbors(src).filter(empty));
      out.push({ ...WORLD_API.addSpecial(state, to, k), grow: true });
    }
    return out;
  }

  // Aventure twist (stage.twist = { kind, count, every, top? }): one more cell every `every` moves.
  // top: lands in the highest row with room (lava then flows down).
  function twistSpawn(state) {
    const tw = state.stage.twist;
    if (!tw || !tw.every || state.moves % tw.every) return [];
    const i = WORLD_API.pick(state, spawnCells(state, tw.top));
    return i >= 0 ? [WORLD_API.addSpecial(state, i, tw.kind)] : [];
  }
  function spawnCells(state, top) {
    const empty = WORLD_API.emptyCells(state);
    if (!top) return empty;
    for (let r = 0; r < SIZE; r++) {
      const row = empty.filter((i) => Math.floor(i / SIZE) === r);
      if (row.length) return row;
    }
    return [];
  }

  // Worlds mode: worlds whose special cells only come from level setups drop them over time
  // (rules.free = { setup: { kind, count }, every?, kind?, clock? }).
  function freeSpawn(state, rules) {
    const free = rules.free;
    if (!free || !free.every || state.moves % free.every) return [];
    const i = WORLD_API.pick(state, WORLD_API.emptyCells(state));
    return i >= 0 ? [WORLD_API.addSpecial(state, i, free.kind)] : [];
  }

  // Free play difficulty: each obstacle kind lands every `every` moves.
  function obstacleSpawn(state) {
    const out = [];
    for (const o of state.obstacles) {
      if (state.moves % o.every) continue;
      const i = WORLD_API.pick(state, spawnCells(state, o.top));
      if (i >= 0) out.push(WORLD_API.addSpecial(state, i, o.kind));
    }
    return out;
  }

  function scatterKind(state, kind, count, top) {
    for (let k = 0; k < count; k++) {
      const i = WORLD_API.pick(state, spawnCells(state, top));
      if (i >= 0) WORLD_API.addSpecial(state, i, kind);
    }
  }

  // Stars: 1 for the win, +1 with 15% of the move budget left, +1 with 30%. Bought moves cap it at 1.
  function finishStage(state, won) {
    const stage = state.stage;
    stage.won = won;
    // Timed levels rate the clock left, the others the move budget left.
    const left = stage.clock ? state.clock / stage.clock : stage.movesLeft / stage.maxMoves;
    stage.stars = !won ? 0 : stage.extra ? 1 : 1 + (left >= 0.15 ? 1 : 0) + (left >= 0.3 ? 1 : 0);
    state.over = true;
    state.stuck = false;
  }

  const isBoss = (state, i) => !!(state.special && state.special[i] && state.special[i].kind === 'boss');

  // Level start: the 2x2 boss in the center.
  function placeBoss(state) {
    const [r0, c0] = BOSS_AT;
    for (let k = 0; k < 4; k++) {
      const i = (r0 + (k >> 1)) * SIZE + c0 + (k & 1);
      state.board[i] = SPECIAL;
      state.special[i] = { kind: 'boss', hp: 1, part: k };
    }
  }

  // Every stage.boss.every moves, the boss drops stage.boss.count cells of its kind on empty spots.
  function bossAttack(state) {
    const boss = state.stage.boss;
    if (!boss || state.moves % boss.every) return [];
    const out = [];
    for (let k = 0; k < boss.count; k++) {
      const i = WORLD_API.pick(state, WORLD_API.emptyCells(state));
      if (i >= 0) out.push({ ...WORLD_API.addSpecial(state, i, boss.kind), attack: true });
    }
    return out;
  }

  // Crate levels start with crates scattered over the bottom of the board (two rows per stage.fill):
  // stage.goal.target crates plus a few, at most half a row each and never two side by side, so
  // no single straight piece finishes a row and clearing them takes rows and columns.
  function prefill(state, fill, count) {
    const rows = Math.min(SIZE - 3, fill * 2);
    const cells = [];
    for (let r = SIZE - rows; r < SIZE; r++) for (let c = 0; c < SIZE; c++) cells.push(r * SIZE + c);
    const perRow = new Array(SIZE).fill(0);
    const skipped = [];
    let placed = 0;
    while (placed < count && cells.length) {
      const i = cells.splice(Math.floor(nextRandom(state) * cells.length), 1)[0];
      const r = Math.floor(i / SIZE), c = i % SIZE;
      const side = (c > 0 && state.special[i - 1]) || (c < SIZE - 1 && state.special[i + 1]);
      if (perRow[r] >= SIZE / 2 || side) { skipped.push(i); continue; }
      WORLD_API.addSpecial(state, i, 'crate');
      perRow[r]++;
      placed++;
    }
    // Big fills can run out of room under those rules: the goal must stay reachable, so the
    // remaining crates go anywhere left in the area (rows still never full).
    for (const i of skipped) {
      if (placed >= count) break;
      const r = Math.floor(i / SIZE);
      if (perRow[r] >= SIZE - 2) continue;
      WORLD_API.addSpecial(state, i, 'crate');
      perRow[r]++;
      placed++;
    }
  }

  // Board helpers handed to world rules.
  const WORLD_API = {
    SIZE,
    rnd: nextRandom,
    emptyCells: (state) => state.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0),
    plainCells: (state) => state.board.map((v, i) => (v && v !== SPECIAL ? i : -1)).filter((i) => i >= 0),
    isBoss,
    pick: (state, list) => (list.length ? list[Math.floor(nextRandom(state) * list.length)] : -1),
    addSpecial(state, i, kind, extra) {
      state.board[i] = SPECIAL;
      state.bonus[i] = null;
      state.special[i] = { kind, hp: KINDS[kind].hp, age: 0, ...extra };
      return { r: Math.floor(i / SIZE), c: i % SIZE, kind };
    },
    // Shifts row r one cell to the right, wrapping around (cells keep their bonus / special).
    shiftRow(state, r) {
      const idx = Array.from({ length: SIZE }, (_, c) => r * SIZE + c);
      for (const key of ['board', 'bonus', 'special']) {
        const row = idx.map((i) => state[key][i]);
        idx.forEach((i, c) => { state[key][i] = row[(c + SIZE - 1) % SIZE]; });
      }
    },
  };

  // Stores bonuses found in cleared cells and banks coin cells. Mutates state.inventory / state.stats.
  function collect(state, cells) {
    const collected = [];
    for (const { r, c, bonus } of cells) {
      if (!bonus) continue;
      if (COIN_VALUES[bonus]) {
        state.stats.coins = (state.stats.coins || 0) + COIN_VALUES[bonus];
        collected.push({ type: bonus, r, c, coins: COIN_VALUES[bonus] });
        continue;
      }
      const overflow = state.inventory[bonus] >= INVENTORY_MAX;
      if (!overflow) state.inventory[bonus] += 1;
      collected.push({ type: bonus, r, c, overflow });
    }
    return collected;
  }

  // Level 1: 5x5 without its corners (21 cells). Level 2: the full 5x5 (25).
  // Level 3: the full 5x5 plus the whole row and column through the center.
  const bombArea = (row, col, level = 1) => {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const dr = Math.abs(r - row);
        const dc = Math.abs(c - col);
        const square = dr <= 2 && dc <= 2 && (level > 1 || dr + dc < 4);
        const cross = level > 2 && (r === row || c === col);
        if (square || cross) cells.push([r, c]);
      }
    }
    return cells;
  };

  // Tornade: level 1 deals 3 random pieces; level 2 only pieces that fit the board; level 3 pieces
  // of at most 3 blocks that fit. A few draws per slot, then the last draw stays.
  const REROLL_TRIES = 30;
  function reroll(state) {
    const lv = upLevel(state, 'reroll');
    if (lv === 1) { refillAll(state); return; }
    state.tray = new Array(TRAY_SIZE).fill(null);
    for (let i = 0; i < TRAY_SIZE; i++) {
      let p = pickPiece(state);
      for (let k = 0; k < REROLL_TRIES && !(pieceFits(state, p) && (lv < 3 || p.cells.length <= 3)); k++) p = pickPiece(state);
      state.tray[i] = p;
    }
  }

  // Fire a stored bonus. `target` = { r, c } for the bomb. Returns { state, events } or null.
  function use(prev, type, target) {
    if (prev.over || !BONUSES[type] || !(prev.inventory[type] > 0)) return null;
    const state = {
      ...prev,
      board: prev.board.slice(),
      bonus: prev.bonus.slice(),
      special: (prev.special || new Array(SIZE * SIZE).fill(null)).slice(),
      tray: prev.tray.slice(),
      effects: { ...prev.effects },
      inventory: { ...prev.inventory },
      stats: { ...(prev.stats || emptyStats()) },
      undo: null,
    };
    const events = { type, cleared: [], damaged: [], blasts: [], collected: [], points: 0, refilled: [], perfect: false };
    let hit = null;

    if (BONUSES[type].timed) {
      state.effects[type] = Math.min(effectMaxMs(state, type), state.effects[type] + effectMs(state, type));
    } else if (type === 'reroll') {
      reroll(state);
      events.refilled = [0, 1, 2];
    } else if (type === 'bomb') {
      if (!target) return null;
      const area = bombArea(target.r, target.c, upLevel(state, 'bomb')).map(([r, c]) => r * SIZE + c);
      if (!area.some((i) => state.board[i])) return null;
      hit = clearCells(state, area);
      events.cleared = hit.cleared;
      events.damaged = hit.damaged;
      events.blasts = hit.blasts;
      events.bossHits = hit.boss;
      events.collected = collect(state, events.cleared);
      events.perfect = state.board.every((v) => v === 0);
      events.points = Math.round((events.cleared.length * BOMB_CELL_POINTS + (events.perfect ? PERFECT_BONUS : 0)) * nitroMul(state))
        + events.collected.filter((b) => b.overflow).length * OVERFLOW_POINTS;
      state.score += events.points;
      state.stats.bombCells += events.cleared.length;
      state.stats.bestBomb = Math.max(state.stats.bestBomb, events.cleared.length);
      if (events.perfect) state.stats.perfects += 1;
    }

    state.inventory[type] -= 1;
    state.stats.bonusUsed += 1;
    state.stats.used = { ...(state.stats.used || {}), [type]: ((state.stats.used || {})[type] || 0) + 1 };
    if (state.stage) stageMove(state, rulesOf(state), hit || { destroyed: {} }, 0, false);
    if (!state.over) settle(state);
    events.over = state.over;
    events.stuck = state.stuck;
    return { state, events };
  }

  // Only legal while pieces can turn (chill mode or rotate bonus).
  function rotate(prev, trayIndex) {
    const piece = prev.tray[trayIndex];
    if (prev.over || !piece || !canTurn(prev)) return null;
    const tray = prev.tray.slice();
    tray[trayIndex] = rotated(piece);
    return { ...prev, tray };
  }

  // Throw a tray piece away; the announced next piece takes its slot. The caller takes
  // `events.cost` from the wallet. Returns { state, events } or null.
  function discard(prev, trayIndex) {
    const piece = prev.tray[trayIndex];
    if (prev.over || !piece || !canDiscard(prev)) return null;
    const cost = discardCost(prev);
    const state = { ...prev, tray: prev.tray.slice(), stats: { ...(prev.stats || emptyStats()) }, undo: null };
    state.budget -= cost;
    state.stats.discards = (state.stats.discards || 0) + 1;
    refillSlot(state, trayIndex);
    settle(state);
    return { state, events: { cost, piece, refilled: [trayIndex], over: state.over, stuck: state.stuck } };
  }

  // Back to the state before the last placement. Wallet, undo count and the chrono clock carry
  // over (time spent is not refunded, time won by the undone move is taken back).
  // The caller takes `events.cost` from the wallet. Returns { state, events } or null.
  function undo(prev) {
    if (prev.over || !canUndo(prev)) return null;
    const cost = undoCost(prev);
    const before = prev.undo;
    if (prev.mode === 'puzzle') {
      // Undo walks back one placement at a time; hints used stay counted.
      const state = { ...before, puzzle: { ...before.puzzle, hints: prev.puzzle.hints } };
      settle(state);
      return { state, events: { cost: 0, over: state.over, stuck: state.stuck } };
    }
    const state = {
      ...before,
      budget: prev.budget - cost,
      clock: Math.min(prev.clock, before.clock),
      effects: { ...before.effects },
      stats: { ...before.stats, undos: undoCost(prev) + 1, discards: prev.stats.discards || 0 },
      undo: null,
    };
    for (const k of TIMED) state.effects[k] = Math.min(before.effects[k], prev.effects[k]);
    settle(state);
    return { state, events: { cost, over: state.over, stuck: state.stuck } };
  }

  // Keep the wallet mirror in sync (shop purchases, coins banked elsewhere).
  function withBudget(prev, budget) {
    if (prev.budget === budget) return prev;
    const state = { ...prev, budget };
    if (!state.over && (state.stuck || !budget)) settle(state);
    return state;
  }

  // Adventure: buy more moves after running out. Only when the level ended on its move budget.
  function addMoves(prev, n) {
    const stage = prev.stage;
    if (!stage || stage.won || stage.movesLeft > 0 || prev.timeUp) return null;
    const state = { ...prev, over: false, stuck: false, stage: { ...stage, movesLeft: n, maxMoves: stage.maxMoves, extra: stage.extra + 1 } };
    settle(state);
    return state;
  }

  // Player chooses to stop instead of spending a rescue bonus.
  function giveUp(prev) {
    if (prev.over || !prev.stuck) return null;
    return { ...prev, over: true, stuck: false };
  }

  // Advance bonus timers and the chrono clock. Returns the same object when nothing runs.
  // A run lost to the clock gets `timeUp: true`.
  function tick(prev, dtMs) {
    const chrono = !!clockOf(prev) && prev.clock > 0;
    if (prev.over || (!chrono && !TIMED.some((k) => prev.effects[k] > 0))) return prev;
    const effects = { ...prev.effects };
    for (const k of TIMED) effects[k] = Math.max(0, effects[k] - dtMs);
    const state = { ...prev, effects };
    // Losing rotation can leave no legal move.
    if (prev.effects.rotate > 0 && effects.rotate === 0) settle(state);
    if (chrono) {
      state.clock = Math.max(0, prev.clock - dtMs);
      if (state.clock === 0) {
        if (state.stage) { state.stage = { ...state.stage }; finishStage(state, false); }
        state.over = true; state.stuck = false; state.timeUp = true;
      }
    }
    return state;
  }

  return {
    SIZE,
    COMBO_GRACE,
    EFFECT_MS,
    EFFECT_MAX_MS,
    INVENTORY_MAX,
    COIN_VALUES,
    MODES,
    LEVELS,
    SHAPES,
    FAMILIES,
    BONUSES,
    SPECIAL,
    KINDS,
    BOSS_AT,
    UPGRADE_MAX,
    EFFECT_BY_LEVEL,
    NITRO_BY_LEVEL,
    upLevel,
    effectMs,
    nitroMul,
    clockOf,
    defineWorlds,
    puzzleHint,
    createGame,
    addMoves,
    place,
    rotate,
    use,
    giveUp,
    discard,
    discardCost,
    undo,
    undoCost,
    canUndo,
    withBudget,
    tick,
    runStats,
    bombArea,
    canPlace,
    canTurn,
    pieceFits,
    previewClears,
  };
});
