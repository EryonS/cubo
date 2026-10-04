/*
 * Cubo Blocks — Puzzles. Pure, no DOM. puzzle(n) builds puzzle n (1..COUNT) handed to
 * logic.createGame({ mode: 'puzzle', puzzle }).
 * A puzzle is a drawing (hand-made silhouette) tiled with game pieces. Most pieces are already
 * placed; a contiguous group of them is taken out and given back, in a shuffled order and turned,
 * as the quota: the player rotates and places them to fill the drawing. Built from a full tiling,
 * so every puzzle is solvable. The same n always gives the same puzzle.
 */
import * as L from './logic';
import * as I18N from './i18n';
import type { Cell, PuzzleSetup, Shape } from './types';

interface Drawing { name: string; rows: string[] }
interface Tile { shape: Shape; row: number; col: number; cells: number[] }

const tr = I18N.tr;

const SIZE = L.SIZE;

// 8x8 drawings: '#' is part of the puzzle, '.' is outside.
const DRAWINGS: Drawing[] = [
  { name: tr('Cœur'), rows: ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'] },
  { name: tr('Maison'), rows: ['...##...', '..####..', '.######.', '########', '.######.', '.##..##.', '.##..##.', '.######.'] },
  { name: tr('Champignon'), rows: ['..####..', '.######.', '########', '########', '..####..', '..####..', '..####..', '.######.'] },
  { name: tr('Fusée'), rows: ['...##...', '..####..', '..####..', '..####..', '.######.', '.######.', '##.##.##', '#..##..#'] },
  { name: tr('Poisson'), rows: ['........', '.###...#', '#####.##', '########', '########', '#####.##', '.###...#', '........'] },
  { name: tr('Sapin'), rows: ['...##...', '..####..', '.######.', '..####..', '.######.', '########', '...##...', '...##...'] },
  { name: tr('Couronne'), rows: ['#..##..#', '##.##.##', '########', '########', '########', '.######.', '........', '........'] },
  { name: tr('Chat'), rows: ['#......#', '##....##', '########', '########', '########', '.######.', '..####..', '........'] },
  { name: tr('Flèche'), rows: ['...#....', '...##...', '########', '########', '########', '########', '...##...', '...#....'] },
  { name: tr('Tasse'), rows: ['........', '######..', '########', '######.#', '######.#', '########', '######..', '.####...'] },
  { name: tr('Fantôme'), rows: ['..####..', '.######.', '########', '#..##..#', '########', '########', '########', '#.##.##.'] },
  { name: tr('Carré'), rows: ['########', '########', '########', '########', '########', '########', '########', '########'] },
  // Added 2026-10-01 for packs 5-6 and Puzzle surprise. Append only: the first 12 build puzzles 1-40.
  { name: tr('Étoile'), rows: ['...##...', '...##...', '########', '.######.', '..####..', '.######.', '.##..##.', '.#....#.'] },
  { name: tr('Lune'), rows: ['..####..', '.####...', '####....', '###.....', '###.....', '####....', '.####...', '..####..'] },
  { name: tr('Bateau'), rows: ['...#....', '...##...', '...###..', '...####.', '...#....', '########', '.######.', '..####..'] },
  { name: tr('Papillon'), rows: ['##....##', '###..###', '########', '.######.', '.######.', '########', '###..###', '##....##'] },
  { name: tr('Robot'), rows: ['.######.', '.#.##.#.', '.######.', '...##...', '########', '#.####.#', '..####..', '..#..#..'] },
  { name: tr('Ballon'), rows: ['..####..', '.######.', '.######.', '.######.', '..####..', '...##...', '...#....', '...#....'] },
  { name: tr('Lapin'), rows: ['.##..##.', '.##..##.', '.##..##.', '.######.', '########', '########', '.######.', '..####..'] },
  { name: tr('Glace'), rows: ['..####..', '.######.', '.######.', '########', '.######.', '..####..', '...##...', '...##...'] },
  { name: tr('Parapluie'), rows: ['..####..', '.######.', '########', '########', '...##...', '...##...', '...##.#.', '....##..'] },
  { name: tr('Pomme'), rows: ['....#...', '...#....', '.##.###.', '########', '########', '########', '.######.', '..#..#..'] },
  { name: tr('Éclair'), rows: ['....###.', '...###..', '..###...', '.######.', '...###..', '..###...', '.###....', '.##.....'] },
  { name: tr('Diamant'), rows: ['.######.', '########', '########', '.######.', '..####..', '...##...', '........', '........'] },
  { name: tr('Avion'), rows: ['...##...', '...##...', '.######.', '########', '...##...', '...##...', '..####..', '........'] },
];
const FIRST_DRAWINGS = 12; // puzzles 1-40 only pick among these (they must never change)

const PER_PACK = 10;
const PACKS = [
  { name: tr('Débutant') },
  { name: tr('Malin') },
  { name: tr('Expert') },
  { name: tr('Maître') },
  { name: tr('Virtuose') },
  { name: tr('Légende') },
];
const COUNT = PER_PACK * PACKS.length;
// Pieces to place, by puzzle number: 3 at the start, 8 at puzzle 40 (the first 4 packs keep their
// original quotas), then 8 to 10.
const quotaOf = (n: number) => (n <= 40 ? [3, 3, 4, 4, 5, 5, 6, 6, 7, 8][Math.floor(((n - 1) * 10) / 40)] : [8, 9, 9, 10][Math.min(3, Math.floor(((n - 41) * 4) / (COUNT - 40)))]);

// mulberry32 seeded from the puzzle number.
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const maskOf = (d: Drawing) => d.rows.flatMap((row) => [...row.slice(0, SIZE).padEnd(SIZE, '.')].map((ch) => ch === '#'));

// Tiling preference by piece size: mid-size pieces first, single blocks only when nothing else fits.
const SIZE_PREF: Record<number, number> = { 1: 0.02, 2: 0.2, 3: 1, 4: 1.3, 5: 1, 6: 0.5, 9: 0.15 };

// Covers every '#' of the mask with game shapes. The first free cell (reading order) is always
// covered by the first cell of a shape, so each tiling is found once. Single blocks guarantee
// a result. Returns [{ shape, row, col, cells: [index] }].
function tile(mask: boolean[], rnd: () => number): Tile[] {
  const used = mask.map((m) => !m);
  const out: Tile[] = [];
  function step() {
    const at = used.indexOf(false);
    if (at < 0) return true;
    const r0 = Math.floor(at / SIZE);
    const c0 = at % SIZE;
    const order = L.SHAPES.map((s) => ({ s, k: rnd() * (SIZE_PREF[s.cells.length] || 0.1) * s.weight })).sort((a, b) => b.k - a.k);
    for (const { s } of order) {
      const row = r0 - s.cells[0][0];
      const col = c0 - s.cells[0][1];
      const cells: number[] = [];
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

const touching = (a: Tile, b: Tile) => a.cells.some((i) => b.cells.some((j) => {
  const dr = Math.abs(Math.floor(i / SIZE) - Math.floor(j / SIZE));
  const dc = Math.abs((i % SIZE) - (j % SIZE));
  return dr + dc === 1;
}));

// Quarter turns of a normalized shape (same rule as logic's rotation).
function turned(cells: Cell[], times: number): Cell[] {
  let out = cells;
  for (let k = 0; k < times; k++) {
    const h = 1 + Math.max(...out.map((p) => p[0]));
    out = out.map(([r, c]): Cell => [c, h - 1 - r]);
    const minR = Math.min(...out.map((p) => p[0]));
    const minC = Math.min(...out.map((p) => p[1]));
    out = out.map(([r, c]): Cell => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  return out;
}

function drawingOf(n: number) {
  if (n <= 40) return DRAWINGS[(n * 5 + Math.floor((n - 1) / FIRST_DRAWINGS)) % FIRST_DRAWINGS];
  // Packs 5-6: the new drawings first, then the old ones mixed in.
  const fresh = DRAWINGS.length - FIRST_DRAWINGS;
  const k = n - 41;
  return k < fresh ? DRAWINGS[FIRST_DRAWINGS + ((k * 5) % fresh)] : DRAWINGS[(k * 7) % DRAWINGS.length];
}

// Puzzle n: { n, pack, name, mask: [bool], fixed: [{ cells: [index], color }],
//             pieces: [{ cells, color, sol: [index] }] } — pieces in the order they are dealt,
//             cells turned from the solution, sol = the solution cells on the board.
export type PuzzleDef = PuzzleSetup & { pack: number };
function puzzle(n: number): PuzzleDef | null {
  if (!(n >= 1 && n <= COUNT)) return null;
  const rnd = rng(0x9e3779b1 ^ (n * 2654435761));
  return build(rnd, drawingOf(n), quotaOf(n), { n, pack: Math.floor((n - 1) / PER_PACK) });
}

// Puzzle surprise (opens once pack Maître is done): any drawing, turned or mirrored, with 8 to 10
// pieces all shown at once (free: true). Placed pieces can be picked up and moved again.
const SURPRISE_MIN = 8;
const SURPRISE_MAX = 10;
function surprise(seed: number): PuzzleDef {
  const rnd = rng((seed | 0) ^ 0x5bd1e995);
  const drawing = DRAWINGS[Math.floor(rnd() * DRAWINGS.length)];
  const view = Math.floor(rnd() * 8); // 4 turns x mirror
  const rows = viewRows(maskOf(drawing), view);
  const quota = SURPRISE_MIN + Math.floor(rnd() * (SURPRISE_MAX - SURPRISE_MIN + 1));
  return { ...build(rnd, { name: drawing.name, rows }, quota, { n: 0, pack: -1 }), free: true, seed: seed | 0 };
}

// The mask seen turned a quarter `view & 3` times, mirrored when view >= 4.
function viewRows(mask: boolean[], view: number) {
  let at = (r: number, c: number) => mask[r * SIZE + c];
  for (let k = 0; k < (view & 3); k++) { const f = at; at = (r, c) => f(SIZE - 1 - c, r); }
  if (view >= 4) { const f = at; at = (r, c) => f(r, SIZE - 1 - c); }
  const rows: string[] = [];
  for (let r = 0; r < SIZE; r++) {
    let row = '';
    for (let c = 0; c < SIZE; c++) row += at(r, c) ? '#' : '.';
    rows.push(row);
  }
  return rows;
}

function build(rnd: () => number, drawing: Drawing, wanted: number, extra: { n: number; pack: number }): PuzzleDef {
  const mask = maskOf(drawing);
  let tiles = tile(mask, rnd);
  // Puzzles 1-40 keep their first tiling. Later ones retile a small drawing until it has
  // enough pieces for the quota (and one left in place).
  const firstTiling = extra.n >= 1 && extra.n <= 40;
  for (let k = 0; !firstTiling && tiles.length <= wanted && k < 30; k++) tiles = tile(mask, rnd);
  const quota = Math.min(wanted, tiles.length - 1);

  // A contiguous group of pieces of 3+ blocks, grown from a random one.
  const big = (t: Tile) => t.cells.length >= 3;
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
    ...extra,
    name: drawing.name,
    mask,
    fixed: tiles.filter((t) => !taken.includes(t)).map((t) => ({ cells: t.cells, color: t.shape.color })),
    pieces: taken.map((t) => ({ cells: turned(t.shape.cells, 1 + Math.floor(rnd() * 3)), color: t.shape.color, sol: t.cells })),
  };
}

export { DRAWINGS, PACKS, PER_PACK, COUNT, quotaOf, puzzle, surprise, SURPRISE_MIN, SURPRISE_MAX, tile };
