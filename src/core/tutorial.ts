/*
 * Cubo Blocks — guided first game. Pure, no DOM. Each step is a scripted board and tray built on
 * logic.js states; main.js draws the hand, the glowing target cells and the step text.
 */
import * as L from './logic';
import * as I18N from './i18n';
import type { MoveEvents } from './logic';
import type { Cell, Piece, RunState } from './types';

const tr = I18N.tr;

const SIZE = L.SIZE;

// board: rows top to bottom, '#' = filled. pieces: pattern, tray slot, suggested spot [row, col].
// lines: each move of the step must clear at least that many lines (0 = anywhere goes).
const STEPS: { id: string; title: string; text: string; lines: number; board: string[]; pieces: { pattern: string; slot: number; at: Cell }[] }[] = [
  {
    id: 'drag',
    title: tr('Glisse la forme sur la grille'),
    text: tr('Pose-la où tu veux.'),
    lines: 0,
    board: [],
    pieces: [{ pattern: '##|##', slot: 1, at: [3, 3] }],
  },
  {
    id: 'line',
    title: tr('Remplis une colonne'),
    text: tr('Une ligne ou une colonne pleine disparaît.'),
    lines: 1,
    board: ['........', '........', '........', '..#.....', '..#.....', '..#.....', '..#.....', '..#.....'],
    pieces: [{ pattern: '#|#|#', slot: 1, at: [0, 2] }],
  },
  {
    id: 'combo',
    title: tr('Enchaîne les lignes'),
    text: tr('Efface coup après coup : ton combo grimpe.'),
    lines: 1,
    board: ['........', '........', '........', '........', '........', '....#...', '..######', '#####...'],
    pieces: [{ pattern: '###', slot: 0, at: [7, 5] }, { pattern: '##', slot: 2, at: [6, 0] }],
  },
];

function parse(pattern: string): Cell[] {
  const cells: Cell[] = [];
  pattern.split('|').forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  return cells;
}
const key = (cells: Cell[]) => cells.map((p) => p.join(',')).join(';');

// Same piece object the logic deals, with the color of its shape family.
function piece(pattern: string, id: number): Piece {
  const k = key(parse(pattern));
  const shape = L.SHAPES.find((s) => key(s.cells) === k)!;
  return { id, cells: shape.cells, w: shape.w, h: shape.h, color: shape.color, bonus: null };
}

// Filled cells take a few shape colors so the board looks like a game in progress.
const FILL = [2, 3, 6, 8, 9, 11];

function lesson(i: number) {
  const step = STEPS[i];
  const state = L.createGame(1, { mode: 'classic', level: 'easy' });
  state.board = new Array(SIZE * SIZE).fill(0);
  step.board.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '#') state.board[r * SIZE + c] = FILL[(r * 3 + c) % FILL.length];
  }));
  state.bonus = new Array(SIZE * SIZE).fill(null);
  state.tray = [null, null, null];
  step.pieces.forEach((p, k) => { state.tray[p.slot] = piece(p.pattern, 1000 + i * 10 + k); });
  state.next = null;
  return state;
}

// Is this placement what the step asks for?
const accepts = (i: number, events: MoveEvents) => (events.lines || 0) >= STEPS[i].lines;

// The logic refilled the used slot: empty it again so only the scripted pieces stay.
function afterMove(state: RunState, slot: number) {
  const tray = state.tray.slice();
  tray[slot] = null;
  return { ...state, tray, next: null, over: false, stuck: false };
}

const done = (state: RunState) => state.tray.every((p) => !p);

// Glowing cells for the pieces still in the tray: [{ slot, cells: [[r, c]] }].
function targets(i: number, state: RunState) {
  return STEPS[i].pieces
    .filter((p) => state.tray[p.slot])
    .map((p) => ({ slot: p.slot, cells: parse(p.pattern).map(([r, c]): Cell => [p.at[0] + r, p.at[1] + c]) }));
}

export { STEPS, lesson, accepts, afterMove, done, targets };
