// Cubo Blocks — Shapes of the pure game state. Everything here is plain JSON (saved as is).

// [row, col] inside a shape or on the board.
export type Cell = [number, number];

export type BonusType = 'rotate' | 'nitro' | 'shield' | 'bomb' | 'reroll';
export type TimedBonus = 'rotate' | 'nitro' | 'shield';
export type CoinType = 'coin' | 'bag';
export type Mode = 'classic' | 'chrono' | 'chill' | 'adventure' | 'worlds' | 'puzzle';
export type Level = 'easy' | 'normal' | 'hard';

// Bonus or coin carried by one cell of a piece (r, c inside the piece).
export interface PieceBonus { r: number; c: number; type: BonusType | CoinType }

export interface Piece {
  id: number;
  cells: Cell[];
  w: number;
  h: number;
  color: number;
  bonus: PieceBonus | null;
}

export interface Shape { cells: Cell[]; weight: number; color: number; w: number; h: number }

// A special cell on the board (see KINDS in logic.ts).
export interface Special {
  kind: string;
  hp: number;
  age?: number;
  part?: number; // boss: which of its 4 cells
  link?: number; // heart pairs
  egg?: boolean; // bush hiding an egg
  dir?: number; // crab walking direction
}

export interface KindDef {
  hp: number;
  fuse?: number;
  hardens?: string;
  blast?: boolean;
  gift?: boolean;
  boss?: boolean;
  ttl?: number;
  loot?: CoinType;
  wander?: number;
  hop?: number;
  hole?: boolean;
  spread?: number;
  time?: number;
  flow?: boolean;
  link?: boolean;
  sidestep?: boolean;
  burst?: boolean;
  hides?: boolean;
  rise?: boolean;
}

export type GoalType = 'lines' | 'score' | 'clear' | 'coins' | 'combo' | 'boss';
export interface Goal { type: GoalType; target: number; kind?: string; name?: string }

export interface SpawnSetup { kind: string; count: number }
export interface Twist { kind: string; count: number; every?: number; top?: boolean; name?: string; text?: string }
export interface BossAttack { name?: string; kind: string; every: number; count: number }

// An Aventure level as levels.ts defines it.
export interface StageDef {
  world: string;
  n: number;
  goal: Goal;
  maxMoves: number;
  clock?: number;
  setup?: SpawnSetup;
  ramp?: number;
  fill?: number;
  twist?: Twist;
  boss?: BossAttack;
  daily?: boolean;
  event?: string;
}
// The level once started (createGame) and during play.
export interface Stage extends StageDef {
  movesLeft: number;
  progress: number;
  won: boolean;
  stars: number;
  extra: number;
  dry?: number;
}

export interface Obstacle { kind: string; every: number; top?: boolean }

export interface Stats {
  lines: number;
  bestMulti: number;
  bestCombo: number;
  perfects: number;
  bonusUsed: number;
  bombCells: number;
  bestBomb: number;
  pieces: number;
  coins: number;
  discards: number;
  undos: number;
  used: Partial<Record<BonusType, number>>;
}

export interface PuzzleSetup {
  n: number;
  name: string;
  mask: boolean[];
  fixed: { cells: number[]; color: number }[];
  pieces: { cells: Cell[]; color: number; sol: number[] }[];
  free?: boolean;
  seed?: number;
}

export interface PuzzleState {
  n: number;
  name: string;
  total: number;
  placed: number;
  hints: number;
  won: boolean;
  stars: number;
  queue: Piece[];
  sol: number[][];
  free?: boolean;
  seed?: number;
  at?: Record<string, { slot: number; cells: number[]; piece: Piece }>;
}

export type Effects = Record<TimedBonus, number>;
export type Inventory = Record<BonusType, number>;

export interface RunState {
  mode: Mode;
  level: Level;
  world: string | null;
  upgrades: Partial<Record<BonusType, number>>;
  obstacles?: Obstacle[];
  stage: Stage | null;
  special: (Special | null)[];
  clock: number;
  budget: number;
  next: Piece | null;
  undo: RunState | null;
  board: number[];
  bonus: (BonusType | CoinType | null)[];
  tray: (Piece | null)[];
  effects: Effects;
  inventory: Inventory;
  score: number;
  combo: number;
  movesSinceClear: number;
  moves: number;
  seed: number;
  nextId: number;
  over: boolean;
  stuck: boolean;
  stats: Stats;
  puzzle?: PuzzleState;
  timeUp?: boolean;
  quit?: boolean;
  // Set by the app on runs it starts (daily level, season events...).
  [extra: string]: unknown;
}
