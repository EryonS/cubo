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
  boss?: BossAttack | boolean; // a boolean flag on generated levels, the attack on boss fights
  trial?: boolean;
  daily?: string; // the date of a daily level
  seed?: number;
  event?: string;
  eventDay?: string; // the event day a season level counts for
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
  // A free run's theme, picked on the Partie libre sheet (old saves: none, the equipped one).
  theme?: string;
  // Set by the app on runs it starts (daily level, season events...).
  [extra: string]: unknown;
}

// ---------- profile (meta.ts) ----------
export type SkinKind = 'blocks' | 'boards' | 'cubo';
export interface Mission { id: string; key: string; target: number; reward: number; progress: number; done: boolean }
export interface ModeStats { games: number; total: number; best: number; bestCombo: number; lines: number }
export interface DailyDay { stars?: number; attempts: number; bonus?: number; paid?: number; ad?: boolean }
export interface Streak { count: number; best: number; lastDay: string | null; freezes: number }
export interface SeasonProgress { year: string; stars: Record<string, number> }
// Lifetime totals and bests, keyed by run stat (lines, pieces, score...) plus a few of their own.
export interface Lifetime {
  games?: number;
  coinsEarned?: number;
  used?: Partial<Record<BonusType, number>>;
  bestPerfects?: number;
  cleanScore?: number;
  [stat: string]: number | Partial<Record<BonusType, number>> | undefined;
}
export interface Adventure {
  stars?: Record<string, number>;
  opened?: string[];
  fails?: Record<string, number>;
  chests?: Record<string, boolean>;
  bombs?: number;
}

export interface Profile {
  version?: number;
  coins: number;
  owned: Record<SkinKind, string[]>;
  equipped: Record<SkinKind, string>;
  day: string | null;
  missions: Mission[];
  missionsDone: number;
  games: number;
  lifetime?: Lifetime;
  modes?: Record<string, Partial<ModeStats>>;
  history?: { m: string; s: number }[];
  adventure?: Adventure;
  puzzles?: Record<string, number>;
  surprises?: number;
  upgrades?: Partial<Record<BonusType, number>>;
  seasons?: Record<string, SeasonProgress>;
  trophies?: Record<string, 'silver' | 'gold'>;
  daily?: Record<string, DailyDay>;
  streak?: Streak;
  stickers?: Record<string, string>;
  tips?: Record<string, boolean>;
  // Test mode's profile (Paramètres > Développeur): every world, level and puzzle open.
  dev?: boolean;
  halloween?: SeasonProgress; // before v6
}
