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
  const BAG_SHARE = 0.1; // of coin cells
  // Coin cells ride on the same `bonus` slot as bonuses but pay coins instead of filling the inventory.
  const COIN_VALUES = { coin: 1, bag: 5 };
  // Throwing a tray piece away costs wallet coins, more each time within a run.
  const DISCARD_COST = 10;
  const DISCARD_STEP = 5;

  // Modes: 'classic' ends when nothing fits; 'chrono' also ends when the clock runs out;
  // 'chill' turns pieces freely and drops no bonuses (coins still show up);
  // 'adventure' plays one level: a goal, a move budget and the rules of its world (see worlds.js).
  // Levels scale how fast big pieces show up and, in chrono, the clock.
  const MODES = ['classic', 'chrono', 'chill', 'adventure'];
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
  // Timed bonuses last EFFECT_MS; instant ones fire once.
  const BONUSES = {
    rotate: { weight: 3, timed: true },
    nitro: { weight: 2, timed: true },
    shield: { weight: 2, timed: true },
    bomb: { weight: 3, timed: false },
    reroll: { weight: 2, timed: false },
  };
  const TIMED = Object.keys(BONUSES).filter((k) => BONUSES[k].timed);

  // Special cells (Aventure). They sit on the board with value SPECIAL so they block pieces and
  // count toward full lines; state.special[i] holds { kind, hp, age }. A line clear takes one hp;
  // at 0 the cell goes away. blast: clears its row and column when destroyed. gift: drops a bonus.
  // fuse: after that many moves the cell turns into `hardens`.
  const SPECIAL = 15;
  const KINDS = {
    ice: { hp: 2 },
    asteroid: { hp: 2 },
    rock: { hp: 2 },
    mushroom: { hp: 1 },
    ember: { hp: 1, fuse: 8, hardens: 'rock', blast: true },
    bubble: { hp: 1, gift: true },
  };

  // World rules, registered by worlds.js (logic never names a world). See defineWorlds().
  const WORLDS = {};
  const NO_RULES = {};
  function defineWorlds(map) { Object.assign(WORLDS, map); }
  const rulesOf = (state) => (state.stage && WORLDS[state.stage.world]) || NO_RULES;

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
    if (state.mode !== 'chill' && nextRandom(state) < BONUS_CHANCE) {
      const [r, c] = onCell();
      piece.bonus = { r, c, type: weightedPick(state, Object.keys(BONUSES), bonusWeight) };
    } else if (nextRandom(state) < COIN_CHANCE * (rules.coinMul || 1)) {
      const [r, c] = onCell();
      piece.bonus = { r, c, type: nextRandom(state) < BAG_SHARE ? 'bag' : 'coin' };
    }
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

  // Pieces turn in chill mode or while the rotate bonus runs.
  const canTurn = (state) => state.mode === 'chill' || state.effects.rotate > 0;

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
  const undoCost = (state) => (state.stats && state.stats.undos) || 0;
  const canUndo = (state) => !!state.undo && (state.budget || 0) >= undoCost(state);

  const discardCost = (state) => DISCARD_COST + DISCARD_STEP * ((state.stats && state.stats.discards) || 0);
  const canDiscard = (state) => (state.budget || 0) >= discardCost(state);

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
    const fits = trayFits(state);
    state.over = !fits && !canRescue(state);
    state.stuck = !fits && !state.over;
  }

  function findClears(board) {
    const rows = [];
    const cols = [];
    for (let i = 0; i < SIZE; i++) {
      let rowFull = true;
      let colFull = true;
      for (let j = 0; j < SIZE; j++) {
        if (!board[i * SIZE + j]) rowFull = false;
        if (!board[j * SIZE + i]) colFull = false;
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
  function previewClears(board, piece, row, col) {
    const b = board.slice();
    for (const [r, c] of piece.cells) b[(row + r) * SIZE + (col + c)] = piece.color;
    const { rows, cols } = findClears(b);
    return clearedIndices(rows, cols);
  }

  // Mutates `state.tray[slot]` / `state.next` (callers pass a fresh copy). The slot gets the
  // announced next piece; only if that leaves no move at all, a few retries keep the game fair
  // without making it endless.
  function refillSlot(state, slot) {
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
    discards: 0, undos: 0,
  });

  // Run stats for missions / coins (see meta.js).
  const runStats = (state) => ({ ...(state.stats || emptyStats()), score: state.score });

  // opts: { mode, level, budget, stage } — budget mirrors the wallet so the logic knows whether a
  // discard can still rescue the player (see withBudget). stage (adventure only) comes from
  // levels.js: { world, n, goal: { type: 'lines' | 'score' | 'clear', target, kind? }, maxMoves,
  // clock?, setup?, ramp? }.
  function createGame(seed, opts = {}) {
    const stage = opts.mode === 'adventure' && opts.stage ? opts.stage : null;
    const mode = stage ? 'adventure' : MODES.includes(opts.mode) && opts.mode !== 'adventure' ? opts.mode : 'classic';
    const level = LEVELS[opts.level] ? opts.level : 'normal';
    const state = {
      mode,
      level,
      stage: stage && { ...stage, movesLeft: stage.maxMoves, progress: 0, won: false, stars: 0, extra: 0 },
      special: new Array(SIZE * SIZE).fill(null),
      clock: mode === 'chrono' ? LEVELS[level].clock : (stage && stage.clock) || 0,
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
    const rules = rulesOf(state);
    if (rules.setup) rules.setup(state, WORLD_API);
    refillAll(state);
    return state;
  }

  const linePoints = (lines, combo) => ((10 * lines * (lines + 1)) / 2) * combo;

  // Returns { state, events } or null if the move is illegal.
  function place(prev, trayIndex, row, col) {
    const piece = prev.tray[trayIndex];
    if (prev.over || !piece || !canPlace(prev.board, piece, row, col)) return null;

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
    const nitro = prev.effects.nitro > 0 ? 2 : 1;
    const { rows, cols } = findClears(state.board);
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
    let chain = 0;
    let allLines = lines;
    if (lines && rules.gravity) {
      for (;;) {
        fall(state);
        const next = findClears(state.board);
        const n = next.rows.length + next.cols.length;
        if (!n) break;
        chain += 1;
        allLines += n;
        state.combo += 1;
        const more = clearCells(state, clearedIndices(next.rows, next.cols));
        points += linePoints(n, state.combo) * lineMul(rules, more);
        mergeHits(hit, more);
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
    if (allLines && (state.mode === 'chrono' || (state.stage && state.stage.clock))) {
      const lv = state.stage ? { clockMax: state.stage.clock, perLine: 3000 } : LEVELS[state.level] || LEVELS.normal;
      timeGain = Math.max(0, Math.min(lv.clockMax - state.clock, lv.perLine * allLines));
      state.clock += timeGain;
    }

    state.tray[trayIndex] = null;
    refillSlot(state, trayIndex);
    const spawned = state.stage ? stageMove(state, rules, hit, allLines, true) : [];
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
        damaged: hit.damaged,
        blasts: hit.blasts,
        spawned,
        cleared,
        collected,
        points,
        nitro: nitro > 1,
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
    const hit = { cleared: [], damaged: [], destroyed: {}, blasts: [] };
    const queue = [...indices];
    const done = new Set();
    while (queue.length) {
      const i = queue.shift();
      if (done.has(i) || !state.board[i]) continue;
      done.add(i);
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      const sp = state.special[i];
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
        const gift = kind.gift ? weightedPick(state, Object.keys(BONUSES), (k) => BONUSES[k].weight) : null;
        hit.cleared.push({ r, c, color: SPECIAL, bonus: gift, kind: sp.kind });
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
    for (const [k, n] of Object.entries(more.destroyed)) into.destroyed[k] = (into.destroyed[k] || 0) + n;
  }

  // Line points multiplier from the world (e.g. lines through ice pay double).
  const lineMul = (rules, hit) => (rules.lineMul ? rules.lineMul(hit) : 1);

  // Every column drops its cells to the bottom, keeping their order (bonus and special ride along).
  function fall(state) {
    for (let c = 0; c < SIZE; c++) {
      let write = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        const i = r * SIZE + c;
        if (!state.board[i]) continue;
        const j = write * SIZE + c;
        if (j !== i) {
          state.board[j] = state.board[i]; state.bonus[j] = state.bonus[i]; state.special[j] = state.special[i];
          state.board[i] = 0; state.bonus[i] = null; state.special[i] = null;
        }
        write -= 1;
      }
    }
  }

  // After a move in adventure: goal progress, world events, move budget, win / loss.
  // `spend`: false for bonuses (they don't cost a move). Returns the cells the world spawned.
  function stageMove(state, rules, hit, lines, spend) {
    const stage = (state.stage = { ...state.stage });
    const goal = stage.goal;
    if (goal.type === 'lines') stage.progress += lines;
    else if (goal.type === 'score') stage.progress = state.score;
    else if (goal.type === 'clear') stage.progress += hit.destroyed[goal.kind] || 0;
    let spawned = [];
    if (spend) {
      stage.movesLeft -= 1;
      for (let i = 0; i < SIZE * SIZE; i++) {
        const sp = state.special[i];
        if (!sp) continue;
        const kind = KINDS[sp.kind];
        const age = (sp.age || 0) + 1;
        state.special[i] = kind.fuse && age >= kind.fuse ? { kind: kind.hardens, hp: KINDS[kind.hardens].hp, age: 0 } : { ...sp, age };
      }
      if (rules.afterMove) spawned = rules.afterMove(state, WORLD_API) || [];
    }
    if (stage.progress >= goal.target) {
      stage.progress = Math.min(stage.progress, goal.target);
      finishStage(state, true);
    } else if (stage.movesLeft <= 0) {
      finishStage(state, false);
    }
    return spawned;
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

  // Board helpers handed to world rules.
  const WORLD_API = {
    SIZE,
    rnd: nextRandom,
    emptyCells: (state) => state.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0),
    plainCells: (state) => state.board.map((v, i) => (v && v !== SPECIAL ? i : -1)).filter((i) => i >= 0),
    pick: (state, list) => (list.length ? list[Math.floor(nextRandom(state) * list.length)] : -1),
    addSpecial(state, i, kind) {
      state.board[i] = SPECIAL;
      state.bonus[i] = null;
      state.special[i] = { kind, hp: KINDS[kind].hp, age: 0 };
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

  // 5x5 blast without its corners (21 cells).
  const bombArea = (row, col) => {
    const cells = [];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (Math.abs(dr) === 2 && Math.abs(dc) === 2) continue;
        if (r >= 0 && c >= 0 && r < SIZE && c < SIZE) cells.push([r, c]);
      }
    }
    return cells;
  };

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
      state.effects[type] = Math.min(EFFECT_MAX_MS, state.effects[type] + EFFECT_MS);
    } else if (type === 'reroll') {
      refillAll(state);
      events.refilled = [0, 1, 2];
    } else if (type === 'bomb') {
      if (!target) return null;
      const area = bombArea(target.r, target.c).map(([r, c]) => r * SIZE + c);
      if (!area.some((i) => state.board[i])) return null;
      hit = clearCells(state, area);
      events.cleared = hit.cleared;
      events.damaged = hit.damaged;
      events.blasts = hit.blasts;
      events.collected = collect(state, events.cleared);
      events.perfect = state.board.every((v) => v === 0);
      const nitro = state.effects.nitro > 0 ? 2 : 1;
      events.points = (events.cleared.length * BOMB_CELL_POINTS + (events.perfect ? PERFECT_BONUS : 0)) * nitro
        + events.collected.filter((b) => b.overflow).length * OVERFLOW_POINTS;
      state.score += events.points;
      state.stats.bombCells += events.cleared.length;
      state.stats.bestBomb = Math.max(state.stats.bestBomb, events.cleared.length);
      if (events.perfect) state.stats.perfects += 1;
    }

    state.inventory[type] -= 1;
    state.stats.bonusUsed += 1;
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
    const chrono = (prev.mode === 'chrono' || !!(prev.stage && prev.stage.clock)) && prev.clock > 0;
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
    defineWorlds,
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
