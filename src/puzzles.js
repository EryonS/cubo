/*
 * Gridlock — Puzzles. Pure, no DOM. puzzle(n) builds puzzle n (1..COUNT) handed to
 * logic.createGame({ mode: 'puzzle', puzzle }).
 * A puzzle is a drawing (hand-made silhouette) tiled with game pieces. Most pieces are already
 * placed; a contiguous group of them is taken out and given back, in a shuffled order and turned,
 * as the quota: the player rotates and places them to fill the drawing. Built from a full tiling,
 * so every puzzle is solvable. The same n always gives the same puzzle.
 */
(function (root, factory) {
  const L = typeof module === 'object' && module.exports ? require('./logic.js') : root.GridlockLogic;
  const api = factory(L);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GridlockPuzzles = api;
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  const SIZE = L.SIZE;

  // 8x8 drawings: '#' is part of the puzzle, '.' is outside.
  const DRAWINGS = [
    { name: 'Cœur', rows: ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'] },
    { name: 'Maison', rows: ['...##...', '..####..', '.######.', '########', '.######.', '.##..##.', '.##..##.', '.######.'] },
    { name: 'Champignon', rows: ['..####..', '.######.', '########', '########', '..####..', '..####..', '..####..', '.######.'] },
    { name: 'Fusée', rows: ['...##...', '..####..', '..####..', '..####..', '.######.', '.######.', '##.##.##', '#..##..#'] },
    { name: 'Poisson', rows: ['........', '.###...#', '#####.##', '########', '########', '#####.##', '.###...#', '........'] },
    { name: 'Sapin', rows: ['...##...', '..####..', '.######.', '..####..', '.######.', '########', '...##...', '...##...'] },
    { name: 'Couronne', rows: ['#..##..#', '##.##.##', '########', '########', '########', '.######.', '........', '........'] },
    { name: 'Chat', rows: ['#......#', '##....##', '########', '########', '########', '.######.', '..####..', '........'] },
    { name: 'Flèche', rows: ['...#....', '...##...', '########', '########', '########', '########', '...##...', '...#....'] },
    { name: 'Tasse', rows: ['........', '######..', '########', '######.#', '######.#', '########', '######..', '.####...'] },
    { name: 'Fantôme', rows: ['..####..', '.######.', '########', '#..##..#', '########', '########', '########', '#.##.##.'] },
    { name: 'Carré', rows: ['########', '########', '########', '########', '########', '########', '########', '########'] },
  ];

  const PER_PACK = 10;
  const PACKS = [
    { name: 'Débutant' },
    { name: 'Malin' },
    { name: 'Expert' },
    { name: 'Maître' },
  ];
  const COUNT = PER_PACK * PACKS.length;
  // Pieces to place, by puzzle number: 3 at the start, 8 at the end.
  const quotaOf = (n) => [3, 3, 4, 4, 5, 5, 6, 6, 7, 8][Math.min(9, Math.floor(((n - 1) * 10) / COUNT))];

  // mulberry32 seeded from the puzzle number.
  function rng(seed) {
    let s = seed | 0;
    return () => {
      let t = (s = (s + 0x6d2b79f5) | 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const maskOf = (d) => d.rows.flatMap((row) => [...row.slice(0, SIZE).padEnd(SIZE, '.')].map((ch) => ch === '#'));

  // Tiling preference by piece size: mid-size pieces first, single blocks only when nothing else fits.
  const SIZE_PREF = { 1: 0.02, 2: 0.2, 3: 1, 4: 1.3, 5: 1, 6: 0.5, 9: 0.15 };

  // Covers every '#' of the mask with game shapes. The first free cell (reading order) is always
  // covered by the first cell of a shape, so each tiling is found once. Single blocks guarantee
  // a result. Returns [{ shape, row, col, cells: [index] }].
  function tile(mask, rnd) {
    const used = mask.map((m) => !m);
    const out = [];
    function step() {
      const at = used.indexOf(false);
      if (at < 0) return true;
      const r0 = Math.floor(at / SIZE);
      const c0 = at % SIZE;
      const order = L.SHAPES.map((s) => ({ s, k: rnd() * (SIZE_PREF[s.cells.length] || 0.1) * s.weight })).sort((a, b) => b.k - a.k);
      for (const { s } of order) {
        const row = r0 - s.cells[0][0];
        const col = c0 - s.cells[0][1];
        const cells = [];
        for (const [r, c] of s.cells) {
          const rr = row + r;
          const cc = col + c;
          if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE || used[rr * SIZE + cc]) { cells.length = 0; break; }
          cells.push(rr * SIZE + cc);
        }
        if (!cells.length) continue;
        for (const i of cells) used[i] = true;
        out.push({ shape: s, row, col, cells });
        if (step()) return true;
        out.pop();
        for (const i of cells) used[i] = false;
      }
      return false;
    }
    step();
    return out;
  }

  const touching = (a, b) => a.cells.some((i) => b.cells.some((j) => {
    const dr = Math.abs(Math.floor(i / SIZE) - Math.floor(j / SIZE));
    const dc = Math.abs((i % SIZE) - (j % SIZE));
    return dr + dc === 1;
  }));

  // Quarter turns of a normalized shape (same rule as logic's rotation).
  function turned(cells, times) {
    let out = cells;
    for (let k = 0; k < times; k++) {
      const h = 1 + Math.max(...out.map((p) => p[0]));
      out = out.map(([r, c]) => [c, h - 1 - r]);
      const minR = Math.min(...out.map((p) => p[0]));
      const minC = Math.min(...out.map((p) => p[1]));
      out = out.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }
    return out;
  }

  // Puzzle n: { n, pack, name, mask: [bool], fixed: [{ cells: [index], color }],
  //             pieces: [{ cells, color, sol: [index] }] } — pieces in the order they are dealt,
  //             cells turned from the solution, sol = the solution cells on the board.
  function puzzle(n) {
    if (!(n >= 1 && n <= COUNT)) return null;
    const rnd = rng(0x9e3779b1 ^ (n * 2654435761));
    const drawing = DRAWINGS[(n * 5 + Math.floor((n - 1) / DRAWINGS.length)) % DRAWINGS.length];
    const mask = maskOf(drawing);
    const tiles = tile(mask, rnd);
    const quota = Math.min(quotaOf(n), tiles.length - 1);

    // A contiguous group of pieces of 3+ blocks, grown from a random one.
    const big = (t) => t.cells.length >= 3;
    const pool = tiles.filter(big);
    const taken = [pool[Math.floor(rnd() * pool.length)] || tiles[0]];
    while (taken.length < quota) {
      const near = tiles.filter((t) => !taken.includes(t) && taken.some((x) => touching(x, t)));
      const pick = near.filter(big).length ? near.filter(big) : near.length ? near : tiles.filter((t) => !taken.includes(t));
      taken.push(pick[Math.floor(rnd() * pick.length)]);
    }
    for (let i = taken.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [taken[i], taken[j]] = [taken[j], taken[i]];
    }
    return {
      n,
      pack: Math.floor((n - 1) / PER_PACK),
      name: drawing.name,
      mask,
      fixed: tiles.filter((t) => !taken.includes(t)).map((t) => ({ cells: t.cells, color: t.shape.color })),
      pieces: taken.map((t) => ({ cells: turned(t.shape.cells, 1 + Math.floor(rnd() * 3)), color: t.shape.color, sol: t.cells })),
    };
  }

  return { DRAWINGS, PACKS, PER_PACK, COUNT, quotaOf, puzzle, tile };
});
