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
  const BONUS_CHANCE = 0.1; // per new piece
  const MERCY_RETRIES = 4;
  const INVENTORY_MAX = 3; // per bonus type
  const OVERFLOW_POINTS = 50; // collected with a full stack
  const COIN_CHANCE = 0.12; // per new piece without a bonus
  const BAG_SHARE = 0.1; // of coin cells
  // Coin cells ride on the same `bonus` slot as bonuses but pay coins instead of filling the inventory.
  const COIN_VALUES = { coin: 1, bag: 5 };

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
    // Difficulty ramps with score: fewer tiny pieces, more big ones.
    const d = Math.min(1, state.score / 6000);
    const shape = weightedPick(state, SHAPES, (s) => {
      const n = s.cells.length;
      let w = s.weight;
      if (n >= 5) w *= 1 + d;
      if (n <= 2) w *= 1 - 0.5 * d;
      return w;
    });
    const piece = { id: state.nextId++, cells: shape.cells, w: shape.w, h: shape.h, color: shape.color, bonus: null };
    const onCell = () => shape.cells[Math.floor(nextRandom(state) * shape.cells.length)];
    if (nextRandom(state) < BONUS_CHANCE) {
      const [r, c] = onCell();
      piece.bonus = { r, c, type: weightedPick(state, Object.keys(BONUSES), (k) => BONUSES[k].weight) };
    } else if (nextRandom(state) < COIN_CHANCE) {
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

  // Does this piece have a legal spot, counting rotations while the rotate bonus runs?
  function pieceFits(state, piece) {
    let p = piece;
    const turns = state.effects.rotate > 0 ? 4 : 1;
    for (let i = 0; i < turns; i++) {
      if (fitsAnywhere(state.board, p)) return true;
      p = rotated(p);
    }
    return false;
  }

  const trayFits = (state) => state.tray.some((p) => p && pieceFits(state, p));

  // Can a stored bonus still get the player out of a dead end?
  function canRescue(state) {
    const inv = state.inventory;
    if (inv.reroll > 0) return true;
    if (inv.bomb > 0 && state.board.some((v) => v)) return true;
    if (inv.rotate > 0 && !(state.effects.rotate > 0)) {
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

  // Mutates `state.tray[slot]` (callers pass a fresh copy). A few retries keep the game fair
  // without making it endless.
  function refillSlot(state, slot) {
    for (let attempt = 0; attempt <= MERCY_RETRIES; attempt++) {
      state.tray[slot] = pickPiece(state);
      if (trayFits(state)) return;
    }
  }

  function refillAll(state) {
    state.tray = new Array(TRAY_SIZE).fill(null);
    for (let i = 0; i < TRAY_SIZE; i++) refillSlot(state, i);
  }

  const emptyStats = () => ({
    lines: 0, bestMulti: 0, bestCombo: 0, perfects: 0, bonusUsed: 0, bombCells: 0, bestBomb: 0, pieces: 0, coins: 0,
  });

  // Run stats for missions / coins (see meta.js).
  const runStats = (state) => ({ ...(state.stats || emptyStats()), score: state.score });

  function createGame(seed) {
    const state = {
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
      tray: prev.tray.slice(),
      effects: { ...prev.effects },
      inventory: { ...prev.inventory },
      stats: { ...(prev.stats || emptyStats()) },
    };
    const placed = piece.cells.map(([r, c]) => [row + r, col + c]);
    for (const [r, c] of placed) state.board[r * SIZE + c] = piece.color;
    if (piece.bonus) state.bonus[(row + piece.bonus.r) * SIZE + (col + piece.bonus.c)] = piece.bonus.type;

    const { rows, cols } = findClears(state.board);
    const lines = rows.length + cols.length;

    const cleared = [];
    for (const i of clearedIndices(rows, cols)) {
      cleared.push({ r: Math.floor(i / SIZE), c: i % SIZE, color: state.board[i], bonus: state.bonus[i] });
    }
    const collected = collect(state, cleared);
    for (const { r, c } of cleared) { state.board[r * SIZE + c] = 0; state.bonus[r * SIZE + c] = null; }

    const nitro = prev.effects.nitro > 0 ? 2 : 1;
    let points = placed.length;
    if (lines) {
      state.combo += 1;
      state.movesSinceClear = 0;
      points += linePoints(lines, state.combo);
    } else if (!(prev.effects.shield > 0)) {
      state.movesSinceClear += 1;
      if (state.movesSinceClear >= COMBO_GRACE) state.combo = 0;
    }

    const perfect = lines > 0 && state.board.every((v) => v === 0);
    if (perfect) points += PERFECT_BONUS;
    points = points * nitro + collected.filter((b) => b.overflow).length * OVERFLOW_POINTS;

    state.score += points;
    state.moves += 1;
    const st = state.stats;
    st.pieces += 1;
    st.lines += lines;
    st.bestMulti = Math.max(st.bestMulti, lines);
    st.bestCombo = Math.max(st.bestCombo, state.combo);
    if (perfect) st.perfects += 1;

    state.tray[trayIndex] = null;
    refillSlot(state, trayIndex);
    settle(state);

    return {
      state,
      events: {
        placed,
        color: piece.color,
        rows,
        cols,
        lines,
        cleared,
        collected,
        points,
        nitro: nitro > 1,
        combo: lines ? state.combo : 0,
        perfect,
        refilled: [trayIndex],
        over: state.over,
        stuck: state.stuck,
      },
    };
  }

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
      tray: prev.tray.slice(),
      effects: { ...prev.effects },
      inventory: { ...prev.inventory },
      stats: { ...(prev.stats || emptyStats()) },
    };
    const events = { type, cleared: [], collected: [], points: 0, refilled: [], perfect: false };

    if (BONUSES[type].timed) {
      state.effects[type] = Math.min(EFFECT_MAX_MS, state.effects[type] + EFFECT_MS);
    } else if (type === 'reroll') {
      refillAll(state);
      events.refilled = [0, 1, 2];
    } else if (type === 'bomb') {
      if (!target) return null;
      for (const [r, c] of bombArea(target.r, target.c)) {
        const i = r * SIZE + c;
        if (state.board[i]) events.cleared.push({ r, c, color: state.board[i], bonus: state.bonus[i] });
      }
      if (!events.cleared.length) return null;
      events.collected = collect(state, events.cleared);
      for (const { r, c } of events.cleared) { state.board[r * SIZE + c] = 0; state.bonus[r * SIZE + c] = null; }
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
    settle(state);
    events.over = state.over;
    events.stuck = state.stuck;
    return { state, events };
  }

  // Only legal while the rotate bonus runs.
  function rotate(prev, trayIndex) {
    const piece = prev.tray[trayIndex];
    if (prev.over || !piece || !(prev.effects.rotate > 0)) return null;
    const tray = prev.tray.slice();
    tray[trayIndex] = rotated(piece);
    return { ...prev, tray };
  }

  // Player chooses to stop instead of spending a rescue bonus.
  function giveUp(prev) {
    if (prev.over || !prev.stuck) return null;
    return { ...prev, over: true, stuck: false };
  }

  // Advance bonus timers. Returns the same object when nothing runs.
  function tick(prev, dtMs) {
    if (prev.over || !TIMED.some((k) => prev.effects[k] > 0)) return prev;
    const effects = { ...prev.effects };
    for (const k of TIMED) effects[k] = Math.max(0, effects[k] - dtMs);
    const state = { ...prev, effects };
    // Losing rotation can leave no legal move.
    if (prev.effects.rotate > 0 && effects.rotate === 0) settle(state);
    return state;
  }

  return {
    SIZE,
    COMBO_GRACE,
    EFFECT_MS,
    EFFECT_MAX_MS,
    INVENTORY_MAX,
    COIN_VALUES,
    SHAPES,
    FAMILIES,
    BONUSES,
    createGame,
    place,
    rotate,
    use,
    giveUp,
    tick,
    runStats,
    bombArea,
    canPlace,
    pieceFits,
    previewClears,
  };
});
