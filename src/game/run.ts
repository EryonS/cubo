// Cubo Blocks — The run in progress: starting one, placing pieces, bonuses, bin, undo, the end.
// Rules come from the core; this file turns them into animation events and saves.
// (Legacy game/flow.js, game/drag.js discard / rotate, game/undo.js, screens/gameover.js newGame /
// restartRun / settleRun / dropParked / resumeParked.)
import { create } from 'zustand';
import { L, LV, M, PZ, T, WD } from '../core';
import type { Collected, MoveEvents } from '../core/logic';
import type { Earned } from '../core/meta';
import type { BonusType, Level, Lifetime, Mode, Profile, PuzzleSetup, RunState, StageDef, Stats } from '../core/types';
import { tr } from '../core/i18n';
import { paletteFor } from '../render/board-themes';
import { BOSS_LOOK, bossCenter } from '../render/boss';
import { TOY } from '../render/theme';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { cellCenter, chronoBar, hudTop, walletTarget, invCenter, type InvId, type Layout } from '../render/layout';
import { SPECIAL_COLORS } from '../render/cells';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { cuboLookFor } from '../mascot/looks';
import { cuboReact, cuboSpot, cuboTap } from '../mascot/state';
import { anim, resetAnim, WAVE_MS } from './anim';
import { planFalls } from './falls';
import { BONUS_UI } from './bonus-ui';
import { alreadyDone, celebrate, hasClock } from './hud';
import { bannerFor, comboTier, confettiCount, punchAmp, shakeFor } from './juice';
import { levelName } from '../state/progress';
import { dailyWord, triesAfter } from './daily';
import { inProgress, isFree, keepsBest } from './modes';
import { isSurprise, settlePuzzle } from './puzzle';
import { collectTips, hideTips, modeTips, stuckTip } from './tips';
import { tutActive, tutor } from './tut-state';
import { tutorialMoved, tutorialNope } from './tutorial';

export { inProgress };

const now = () => performance.now();

// Block colors of the theme being played (a world's in Aventure / Mondes), for specks and confetti.
const runPalette = () => {
  const { saved, profile } = useGame.getState();
  return paletteFor(saved.state, profile.equipped.boards);
};

// Cubo's reaction to an event (a no-op when the Mascotte setting is off).
function react(mood: string, ms: number, jump = 0) {
  if (useGame.getState().saved.settings.mascot) cuboReact(now(), mood, ms, jump, anim.calm);
}

// A tap on Cubo (the caller checked cuboHit): a face, a hop, hearts, a sound.
export function tapCubo(lay: Layout, th: string) {
  const { saved, profile } = useGame.getState();
  const kind = cuboTap(now(), cuboSpot(lay, saved.state), cuboLookFor(th, profile.equipped.cubo), anim.calm);
  if (kind === 'dizzy') sfx.fizzle(); else sfx.pop();
  haptic('tap');
}

// What the game HUD needs from the run that is not in the saved state: coins picked up this run
// and already landed in the wallet, and a counter that makes the wallet bump.
export const useRunHud = create<{ pending: number; bump: number; aiming: boolean }>(() => ({ pending: 0, bump: 0, aiming: false }));

// Bomb aiming on or off (null cell: tap mode waits for a cell).
export function setAiming(on: { drag: boolean; x: number; y: number; lift: number } | boolean) {
  anim.aiming = on ? (typeof on === 'object' ? { drag: on.drag, cell: null, x: on.x, y: on.y, lift: on.lift, sx: on.x, sy: on.y } : { drag: false, cell: null, x: 0, y: 0, lift: 0, sx: 0, sy: 0 }) : null;
  useRunHud.setState({ aiming: !!on });
}

// Free-play records live in bests, one per mode.
const recordKey = (st: RunState) => (st.mode === 'worlds' ? 'worlds-' + st.world : st.mode);
export const bestOf = (st: RunState) => useGame.getState().saved.bests[recordKey(st)] || 0;

// Saves the run (and its record) with every move; ticks only patch the store (persistRun saves).
function setState(state: RunState) {
  const { saved, setSaved } = useGame.getState();
  const key = recordKey(state);
  const bests = keepsBest(state) && state.score > (saved.bests[key] || 0) ? { ...saved.bests, [key]: state.score } : saved.bests;
  setSaved({ ...saved, state, bests });
}
function patchState(state: RunState) {
  useGame.setState((s) => ({ saved: { ...s.saved, state } }));
}
export function persistRun() {
  const { saved, setSaved } = useGame.getState();
  setSaved(saved);
}

// Coins and missions are settled once per run.
let runSettled = false;
let announced = new Set<string>();
let endHandler: ((end: RunEnd) => void) | null = null;
export const setEndHandler = (fn: ((end: RunEnd) => void) | null) => { endHandler = fn; };
// Aventure / event / daily levels end here instead (the screens that own the level result register it).
let levelHandler: ((end: LevelEnd) => void) | null = null;
export const setLevelEndHandler = (fn: ((end: LevelEnd) => void) | null) => { levelHandler = fn; };

// A solved puzzle or Puzzle surprise: the result card is the PuzzleEnd component's.
export interface PuzzleEnd { state: RunState; pz: NonNullable<RunState['puzzle']>; lines: Earned[]; total: number }
let puzzleHandler: ((end: PuzzleEnd) => void) | null = null;
export const setPuzzleEndHandler = (fn: ((end: PuzzleEnd) => void) | null) => { puzzleHandler = fn; };

// Today's missions with the live run's numbers (a finished run counts as nothing: it is settled).
export const liveRun = (st: RunState) => (st.over || st.stage ? {} : L.runStats(st));
const resetAnnounced = () => {
  const { profile, saved } = useGame.getState();
  announced = alreadyDone(M.missionStatus(profile, L.runStats(saved.state)));
};
export const missionStatus = () => {
  const { profile, saved } = useGame.getState();
  return M.missionStatus(profile, liveRun(saved.state));
};

// Shows the saved run as a fresh or resumed run.
export function enterRun() {
  const { saved } = useGame.getState();
  const { state, startBest } = saved;
  const before = startBest ?? bestOf(state);
  resetAnim(now(), state.score, before);
  // A resumed run that already beat the record had its announcement: not again.
  if (before > 0 && state.score > before) anim.recordAnnounced = true;
  if (state.over) anim.overAt = now() - 900;
  runSettled = false;
  useRunHud.setState({ pending: (state.stats && state.stats.coins) || 0 });
  resetAnnounced();
}

// New day while the game is open: today's missions (the run's own are counted afterwards).
export function rollMissions() {
  useGame.getState().rollDay();
  resetAnnounced();
}

// ---------- starting runs ----------
export interface StartOpts {
  mode: Mode;
  level: Level;
  stage?: StageDef; // an Aventure / event / daily level
  world?: string; // Mondes: the world of the run
  seed?: number; // a daily level's fixed seed
  puzzle?: PuzzleSetup;
  theme?: string; // free play: the run's theme (default: the equipped one)
}

// opts: mode and level of the game (legacy newGame). Free play wears its own theme (picked on the
// sheet, else the equipped one) and takes its obstacles from it.
function newGame(opts: StartOpts) {
  const store = useGame.getState();
  const fresh = M.ensureDay(store.profile, today());
  if (fresh !== store.profile) store.setProfile(fresh);
  const free = ['classic', 'chrono', 'chill'].includes(opts.mode) && !opts.stage && !opts.puzzle;
  const theme = free ? (opts.theme && fresh.owned.boards.includes(opts.theme) ? opts.theme : fresh.equipped.boards) : undefined;
  const obstacles = theme ? WD.freeObstacles(theme, opts.level) : undefined;
  const world = opts.world || null;
  startCount++;
  const state = L.createGame(opts.seed ?? Date.now(), { mode: opts.mode, level: opts.level, budget: fresh.coins, stage: opts.stage, world, upgrades: fresh.upgrades, puzzle: opts.puzzle, obstacles });
  if (theme) state.theme = theme;
  const { saved, setSaved } = useGame.getState();
  setSaved({ ...saved, state, startBest: keepsBest(state) ? bestOf(state) : 0 });
  enterRun();
  modeTips(state);
}
// A fresh run without settling the one before (the tutorial's end).
export const newRun = newGame;

// Ends the current run (coins and missions count) and starts a new free one. A free run in
// progress is parked instead when a level, a daily or a puzzle starts (later milestones).
export function restartRun(opts: StartOpts) {
  const { saved, setSaved } = useGame.getState();
  const st = saved.state;
  const park = !isFree(opts) && isFree(st) && inProgress(st);
  if (park) setSaved({ ...saved, parked: st });
  const report = st.over || park ? null : settleRun();
  const coins = (report ? report.total : 0) + (isFree(opts) ? dropParked() : 0);
  newGame(opts);
  if (coins) anim.banners.push({ icon: 'coin', text: '+' + coins, sub: tr('Pièces de la partie'), tier: 0, gold: true });
}

// A new free run replaces the parked one: its coins and missions count now. Returns the coins earned.
function dropParked(): number {
  const { saved, profile, setSaved, setProfile } = useGame.getState();
  if (!saved.parked) return 0;
  const res = M.applyRun(M.ensureDay(profile, today()), L.runStats(saved.parked));
  setSaved({ ...saved, parked: null });
  setProfile(res.profile);
  return res.report.total;
}

// Back to the parked free run; the run in progress, if any, is settled.
export function resumeParked() {
  const { saved, setSaved } = useGame.getState();
  if (!saved.parked) return;
  if (!saved.state.over) settleRun();
  const { saved: after } = useGame.getState();
  setSaved({ ...after, state: saved.parked, parked: null, startBest: undefined });
  enterRun();
}

// ---------- stage runs: Aventure, Mondes, season events ----------
// The screens call these (then navigate to the game screen). A free run in progress is parked, not dropped.

// Starts a stage (level or event level); intro = the banner announcing it.
export function startStage(stage: StageDef, opts: { seed?: number; intro?: { text: string; sub?: string; tier?: number } } = {}) {
  const prefs = useGame.getState().saved.state;
  restartRun({ mode: 'adventure', level: prefs.level, stage, seed: opts.seed });
  const intro = opts.intro || { text: levelName(stage.n), sub: LV.goalText(stage.goal) };
  anim.banners.push({ text: intro.text, sub: intro.sub || '', tier: intro.tier || 0, gold: true });
  // First level with the world's second obstacle: introduce it once.
  const { saved } = useGame.getState();
  const st = saved.state.stage;
  const tip = 'twist-' + stage.world;
  if (st && st.twist && !stage.event && !M.tipSeen(useGame.getState().profile, tip)) {
    anim.banners.push({ text: tr('Nouveau : ') + WD.WORLDS[stage.world].twist!.name, sub: LV.KIND_NAMES[st.twist.kind] + tr(' en vue'), tier: 0, gold: true });
    useGame.getState().setProfile(M.markTip(useGame.getState().profile, tip));
  }
}

// Aventure level n of a world (1..20); the boss is the last one.
export function startLevel(world: string, n: number): boolean {
  const stage = LV.level(world, n);
  if (!stage) return false;
  startStage(stage, { intro: { text: n === M.LEVELS_PER_WORLD ? tr('Boss !') : levelName(n), sub: LV.goalText(stage.goal), tier: n === M.LEVELS_PER_WORLD ? 2 : 0 } });
  return true;
}

// A season event level (id of the event, n 1..10); day = the event day it counts for (default today).
export function startEventLevel(id: string, n: number, day: string = today()): boolean {
  const def = LV.eventLevel(id, n);
  if (!def) return false;
  startStage({ ...def, eventDay: day }, { intro: { text: n === 10 ? tr('Boss !') : M.eventById(id)?.name || '', sub: LV.goalText(def.goal), tier: n === 10 ? 2 : 0 } });
  return true;
}

// A Mondes run: endless play in a world's rules, with its own record (bests 'worlds-<id>').
export function startWorldRun(world: string) {
  const prefs = useGame.getState().saved.state;
  restartRun({ mode: 'worlds', level: prefs.level, world });
}

// ---------- puzzles ----------
// Puzzle n (1..60): a drawing to fill with the given pieces.
export function startPuzzle(n: number): boolean {
  const def = PZ.puzzle(n);
  if (!def) return false;
  // Hints taken before on this puzzle (not solved yet) count again: restarting does not wipe them.
  restartRun({ mode: 'puzzle', level: useGame.getState().saved.state.level, puzzle: { ...def, hints: M.puzzleHintsOf(useGame.getState().profile, n) } });
  puzzleIntro(tr('Puzzle ') + n);
  return true;
}
// Puzzle surprise: a random drawing, every piece in the tray at once.
export function startSurprise(seed: number = Date.now(), hints = 0): void {
  restartRun({ mode: 'puzzle', level: useGame.getState().saved.state.level, puzzle: { ...PZ.surprise(seed), hints } });
  puzzleIntro(tr('Puzzle surprise'));
}
function puzzleIntro(text: string) {
  const pz = useGame.getState().saved.state.puzzle!;
  anim.banners.push({ text, sub: pz.name + ' · ' + pz.total + tr(' formes'), tier: 0, gold: true });
}

// Increments with every run started: a level end settles once per start (levelend.ts).
let startCount = 0;
export const startId = () => startCount;

// The daily level of a day (today, or a past day to catch up on). False when no try is left: the daily
// already going on counts as one when it gets dropped.
export function startDaily(day: string): boolean {
  const { profile, saved } = useGame.getState();
  if (triesAfter(profile, saved.state, day, today()) <= 0) return false;
  const stage = LV.daily(day);
  startStage(stage, { seed: stage.seed, intro: { text: dailyWord(day, today()), sub: LV.goalText(stage.goal) } });
  return true;
}

// Starts the current game again (pause > Recommencer, "Rejouer"): the same level, daily, event level,
// Mondes world or free game.
export function restartCurrent(): boolean {
  const st = useGame.getState().saved.state;
  const stage = st.stage;
  if (st.puzzle) { if (isSurprise(st.puzzle)) startSurprise(st.puzzle.seed, st.puzzle.hints); else startPuzzle(st.puzzle.n); return true; }
  if (stage && stage.daily) return startDaily(stage.daily);
  if (stage && stage.event) return startEventLevel(stage.event, stage.n, stage.eventDay);
  if (stage) return startLevel(stage.world, stage.n);
  if (st.mode === 'worlds' && st.world) startWorldRun(st.world);
  else restartRun({ mode: st.mode, level: st.level, theme: st.theme });
  return true;
}

// "+N coups pour finir" on a lost level: pays the price and plays on (the result card closes).
export function buyExtraMoves(lay: Layout): boolean {
  const { saved, profile } = useGame.getState();
  const st = saved.state;
  if (!st.stage) return false;
  const cost = M.extraMovesCost(st.stage.extra);
  const revived = L.addMoves(st, M.EXTRA_MOVES);
  if (!revived || profile.coins < cost) return false;
  payCoins(lay, cost);
  setState(revived);
  anim.overAt = 0;
  anim.banners.push({ text: tr`+${M.EXTRA_MOVES} coups`, sub: tr('Dernière chance !'), tier: 0, gold: true });
  sfx.buy();
  return true;
}

// Pays out coins and advances missions for the current run, once.
export function settleRun() {
  if (runSettled) return null;
  runSettled = true;
  const { saved, profile, setProfile } = useGame.getState();
  // A daily attempt counts once its run ends or is dropped after a move, never just for opening it.
  const daily = saved.state.stage && saved.state.stage.daily;
  const counted = (daily && saved.state.moves > 0 && M.countDaily(profile, daily, today())) || profile;
  const res = M.applyRun(M.ensureDay(counted, today()), L.runStats(saved.state));
  // Stickers fallen due with the run are paid and listed in its report (legacy stickerLines in settleRun).
  const st = M.checkStickers(res.profile, today());
  setProfile(st.profile);
  const report = res.report;
  for (const s of st.fresh) {
    const coins = s.reward || M.STICKER_REWARD;
    report.earned.push({ label: tr('Autocollant : ') + s.name, coins });
    report.total += coins;
  }
  return report;
}

export interface RunEnd {
  score: number;
  best: number;
  record: boolean;
  title: 'over' | 'time' | 'quit';
  stats: Partial<Stats>;
  lifeBefore: Lifetime; // personal bests before this run, for the summary
  earned: Earned[];
  total: number;
  coinsBefore: number;
  revive: boolean; // Seconde chance on offer (reviveRun)
}

// A level is over (won, out of moves, out of room, time up, quit). The run's grid coins and missions are
// paid (settleRun); stars, level rewards, fails and the result card are the receiver's (M.applyLevel,
// M.applyEvent, M.applyDaily, M.recordFail). Fires ~0.9 s (won) / ~1.3 s (lost) after the last move.
export interface LevelEnd {
  state: RunState;
  stage: NonNullable<RunState['stage']>;
  won: boolean;
  timeUp: boolean;
  quit: boolean;
  outOfMoves: boolean;
  run: { earned: Earned[]; total: number; coinsBefore: number } | null; // the run's own coins, null if already paid
}

// The profile as it was before the game over settled the run (Seconde chance undoes the settlement).
let settledFrom: Profile | null = null;

// The run is over: coins and missions count, the record is kept.
function endGame(t: number, lay?: Layout) {
  hideTips();
  if (useGame.getState().saved.state.puzzle) { endPuzzle(t, lay); return; }
  anim.overAt = t;
  setAiming(false);
  anim.trash = null;
  const { saved, profile } = useGame.getState();
  const st = saved.state;
  if (st.stage) {
    const stage = st.stage;
    const run = settleRun();
    setTimeout(() => { if (stage.won) { sfx.mission(); haptic('win'); } else { sfx.over(); haptic('lose'); } }, 350);
    setTimeout(() => levelHandler?.({
      state: useGame.getState().saved.state, stage: useGame.getState().saved.state.stage || stage, won: stage.won, timeUp: !!st.timeUp, quit: !!st.quit,
      outOfMoves: !stage.won && !st.timeUp && stage.movesLeft <= 0, run,
    }), stage.won ? 900 : 1300);
    return;
  }
  const lifeBefore = { ...(profile.lifetime || {}) };
  const report = settleRun();
  // The run is settled now; a Seconde chance takes the profile back to here and settles at the real end.
  settledFrom = report && L.canRevive(st) ? profile : null;
  setTimeout(() => { sfx.over(); haptic('lose'); }, 350);
  const best = Math.max(bestOf(st), st.score);
  const end: RunEnd = {
    score: st.score, best, record: st.score >= best && st.score > anim.bestAtStart && anim.bestAtStart > 0,
    title: st.timeUp ? 'time' : st.quit ? 'quit' : 'over', stats: st.stats || {}, lifeBefore,
    earned: report ? report.earned : [], total: report ? report.total : 0, coinsBefore: report ? report.coinsBefore : profile.coins,
    revive: !!settledFrom,
  };
  setTimeout(() => endHandler?.(end), 1300);
}

// Seconde chance, once the ad is earned: the settlement of the game over is undone (the run settles again at its real
// end), a big bomb falls on the middle and the run goes on. Returns false when the run cannot be revived.
export function reviveRun(lay: Layout): boolean {
  const { saved, setProfile } = useGame.getState();
  const res = L.revive(saved.state);
  if (!res || !settledFrom) return false;
  setProfile(settledFrom);
  settledFrom = null;
  runSettled = false;
  const ev = res.events;
  const t = now();
  react('wow', 1200, 1);
  const mid = (L.SIZE - 1) / 2;
  for (const cell of ev.cleared || []) {
    const delay = Math.hypot(cell.r - mid, cell.c - mid) * 60;
    anim.fades.push({ ...cell, t0: t + 350, delay });
    burst(lay, cell, t + 350 + delay, 5, 200, '#ffb347');
  }
  anim.floaters.push({ text: tr('Seconde chance !'), x: lay.bx + lay.board / 2, y: lay.by + lay.board / 2, t0: t, big: true });
  launchFlyers(lay, ev.collected || [], t + 350, (b) => Math.hypot(b.r - mid, b.c - mid) * 60);
  anim.banners.push({ icon: 'bomb', text: tr('Seconde chance !'), sub: tr('Une bombe géante tombe au milieu'), tier: 0, gold: true });
  if (!anim.calm) { confetti(lay, t + 350, 40); anim.shake = 34; }
  anim.overAt = 0;
  setTimeout(() => { sfx.bomb(); haptic('bomb'); }, 350);
  setTimeout(() => { sfx.bomb(); sfx.sparkle(3); haptic('bomb'); }, 700);
  setState(res.state);
  return true;
}

// Puzzle solved: pay, record the stars, celebrate, then the result card (legacy flow.js endPuzzle).
let puzzleSettled = -1;
function endPuzzle(t: number, lay?: Layout) {
  setAiming(false);
  const st = useGame.getState().saved.state;
  const pz = st.puzzle!;
  const run = settleRun();
  const lines: Earned[] = run ? [...run.earned] : [];
  if (puzzleSettled !== startCount) {
    puzzleSettled = startCount;
    const { profile, setProfile } = useGame.getState();
    const res = settlePuzzle(profile, pz, today());
    setProfile(res.profile);
    lines.push(...res.lines);
  }
  anim.banners.length = 0;
  anim.banners.push({ text: tr('Bravo !'), sub: pz.name + tr(' complété'), tier: 3 });
  if (!anim.calm) {
    if (lay) confetti(lay, t, 70);
    anim.shake = 10;
  }
  setTimeout(() => { sfx.mission(); haptic('win'); }, 350);
  const total = lines.reduce((a, l) => a + l.coins, 0);
  setTimeout(() => puzzleHandler?.({ state: useGame.getState().saved.state, pz, lines, total }), 1300);
}

// ---------- effects ----------
// Star confetti thrown up from the board on big clears, in the board's block colors (legacy flow.js confetti).
function confetti(lay: Layout, t0: number, count: number) {
  const colors = runPalette().filter(Boolean) as string[];
  for (let k = 0; k < count; k++) {
    anim.particles.push({
      x: lay.bx + Math.random() * lay.board, y: lay.by + lay.board * (0.3 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 420, vy: -320 - Math.random() * 420,
      t0: t0 + Math.random() * 120, life: 1100 + Math.random() * 600, g: 620,
      size: lay.cell * (0.22 + Math.random() * 0.18), color: colors[Math.floor(Math.random() * colors.length)],
      star: true, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
    });
  }
}

// A few specks flying out of a cleared cell (legacy flow.js burst).
function burst(lay: Layout, cell: { r: number; c: number; color?: number; kind?: string }, t0: number, count: number, speed: number, extraColor?: string) {
  const [x, y] = cellCenter(lay, cell.r, cell.c);
  for (let k = 0; k < count; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed + Math.random() * 180;
    const base = cell.kind ? SPECIAL_COLORS[cell.kind] : runPalette()[cell.color || 0];
    anim.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t0, life: 500 + Math.random() * 400,
      size: lay.cell * (0.12 + Math.random() * 0.14), color: (extraColor && k % 3 === 0 ? extraColor : base) || TOY.ink,
    });
  }
}

// Bonus icons and coins fly from their cell to the inventory button or the wallet.
function launchFlyers(lay: Layout, collected: Collected[], t: number, delayOf: (b: Collected) => number) {
  for (const b of collected) {
    const [x, y] = cellCenter(lay, b.r, b.c);
    anim.flyers.push({ ...b, x, y, t0: t + delayOf(b) });
  }
  if (collected.some((b) => !b.coins)) sfx.collect();
}

// Frame step: flyers that arrive pay their coins into the wallet's "+N" and are dropped.
export function stepFlyers(lay: Layout, t: number) {
  if (!anim.flyers.length) return;
  for (const f of anim.flyers) {
    if (f.landed || t - f.t0 < 650 * 0.95) continue;
    f.landed = true;
    const [tx, ty] = f.coins ? walletTarget(lay) : invCenter(lay, f.type as InvId);
    if (f.coins) {
      useRunHud.setState((s) => ({ pending: s.pending + f.coins!, bump: s.bump + 1 }));
      sfx.coin(2);
      haptic('coin');
    }
    if (f.overflow) anim.floaters.push({ text: '+50', x: tx, y: ty - 30, t0: t });
  }
  anim.flyers = anim.flyers.filter((f) => t - f.t0 < 650);
}

// Aventure feedback: cracked cells, blasts, gravity chains, and what the world dropped this turn (legacy stageEffects).
function stageEffects(lay: Layout, ev: MoveEvents, t: number) {
  const calm = anim.calm;
  for (const d of ev.damaged || []) burst(lay, { r: d.r, c: d.c, kind: d.kind }, t, 5, 80, '#ffffff');
  if ((ev.damaged || []).length) sfx.crack();
  if ((ev.cleared || []).some((c) => c.kind === 'bubble')) sfx.pop();
  const eggs = (ev.cleared || []).filter((c) => c.kind === 'egg').length;
  if (eggs) { anim.banners.push({ text: eggs > 1 ? eggs + tr(' œufs trouvés !') : tr('Œuf trouvé !'), sub: '', tier: 0, gold: true }); sfx.sparkle(2); }
  if (ev.blasts && ev.blasts.length) {
    const rocket = ev.blasts.some((b) => b.kind === 'rocket');
    anim.banners.push(rocket ? { text: tr('Feu d’artifice !'), sub: tr('Explosion en X'), tier: 0, gold: true } : { text: tr('Boum !'), sub: tr('Explosion en croix'), tier: 0 });
    if (rocket && !calm) confetti(lay, t, 30);
    if (!calm) anim.shake = 18;
    sfx.bomb();
  }
  if (ev.chain) {
    const banner = { text: tr('Réaction ×') + (ev.chain + 1), sub: tr('La gravité enchaîne'), tier: 0, gold: true };
    if (calm) anim.banners.push(banner); else setTimeout(() => anim.banners.push(banner), WAVE_MS);
  }
  for (const sp of ev.spawned || []) {
    const at = t + 250;
    if ('row' in sp) {
      anim.banners.push({ text: tr('Courant !'), sub: tr('Une ligne a glissé'), tier: 0 });
      if (!calm) anim.shifts.push({ row: sp.row, t0: at });
      sfx.swoosh();
      continue;
    }
    if (sp.kind === 'firefly') {
      anim.pops.push({ r: sp.r, c: sp.c, t0: at });
      burst(lay, { r: sp.r, c: sp.c, kind: 'ember' }, at, 6, 50, '#fff6a0');
      setTimeout(() => sfx.coin(3), 250);
      continue;
    }
    if (sp.gone) {
      // Left by itself (mole back underground, hole closing).
      anim.fades.push({ r: sp.r, c: sp.c, color: 0, bonus: null, kind: sp.kind, t0: t, delay: 250 });
      setTimeout(() => sfx.swoosh(), 250);
      continue;
    }
    if (sp.from) {
      if (!calm) anim.drops.set(sp.r * L.SIZE + sp.c, { t0: at, kind: sp.kind, dur: sp.hop ? 360 : 260, from: sp.from, hop: sp.hop });
      if (sp.hop) setTimeout(() => sfx.swoosh(), 250);
      continue;
    }
    const land = sp.kind === 'mushroom' || sp.grow ? 320 : 420;
    if (!calm) anim.drops.set(sp.r * L.SIZE + sp.c, { t0: at, kind: sp.kind, dur: land, grow: sp.grow });
    setTimeout(() => {
      burst(lay, { r: sp.r, c: sp.c, kind: sp.kind }, now(), 6, 70);
      if (sp.kind === 'mushroom' || sp.grow) sfx.grow(); else if (sp.kind === 'ember' || sp.kind === 'lava') sfx.sizzle(); else sfx.thunk();
    }, 250 + (calm ? 0 : land));
  }
}

// Boss fights: hits and strikes (flash, "-N", sounds); the last hit blows the boss up (legacy bossEffects).
function bossEffects(lay: Layout, ev: MoveEvents, state: RunState, t: number) {
  const stage = state.stage;
  if (!stage || stage.goal.type !== 'boss') return;
  const hits = (ev.bossHits || []).length;
  const [cx, cy] = bossCenter(lay);
  if (hits) {
    anim.bossHitAt = t;
    anim.floaters.push({ text: '-' + hits, x: cx, y: cy - lay.cell, t0: t, big: true, scale: 1.2, tier: 2 });
    for (const b of ev.bossHits!) burst(lay, { r: b.r, c: b.c, kind: 'boss' }, t, 5, 90, BOSS_LOOK[stage.world]);
    sfx.thunk();
    haptic('boss');
    if (stage.won) {
      anim.banners.length = 0;
      anim.banners.push({ text: tr('Boss vaincu !'), sub: stage.goal.name || '', tier: 3 });
      if (!anim.calm) { confetti(lay, t, 60); anim.shake = 20; }
    }
  }
  if ((ev.spawned || []).some((sp) => 'attack' in sp && sp.attack)) {
    anim.bossAttackAt = t;
    anim.banners.push({ text: tr('Riposte !'), sub: tr`${stage.goal.name} contre-attaque`, tier: 0 });
    sfx.fizzle();
  }
}

// New tray pieces slide in from the "next" column, which gets a fresh piece itself.
function refilled(slots: number[], t: number) {
  for (const i of slots) { anim.slotIn[i] = t; anim.slotSpin[i] = 0; }
  if (slots.length) anim.nextIn = t;
}

// ---------- moves ----------
// Places tray piece idx at (row, col). Returns the move's events, or null if it is not legal.
export function commit(lay: Layout, idx: number, row: number, col: number): MoveEvents | null {
  const before = useGame.getState().saved.state;
  const res = L.place(before, idx, row, col);
  if (!res) return null;
  // The tutorial only takes the move its step asks for; the piece flies back.
  if (tutActive() && !T.accepts(tutor()!.step, res.events)) { tutorialNope(); return null; }
  const ev = res.events;
  const t = now();
  const calm = anim.calm;
  if (!ev.lines && before.combo >= 2 && !res.state.combo) {
    anim.comboBreak = { t0: t, n: before.combo };
    react('oops', 900);
    sfx.fizzle();
  }
  (ev.placed || []).forEach(([r, c]) => anim.pops.push({ r, c, t0: t }));
  const placed = ev.placed || [];
  const pr = placed.reduce((s, p) => s + p[0], 0) / (placed.length || 1);
  const pc = placed.reduce((s, p) => s + p[1], 0) / (placed.length || 1);
  if (ev.lines) {
    const combo = ev.combo || 0;
    // Cleared cells go from the placed piece outwards; in gravity worlds, wave by wave, and the blocks above fall.
    const plan = ev.waves && ev.waves.length && !calm ? planFalls(ev.waves, t) : null;
    for (const cell of ev.cleared || []) {
      const wave = cell.wave || 0;
      const delay = wave ? wave * WAVE_MS + cell.c * 12 : Math.hypot(cell.r - pr, cell.c - pc) * 28;
      anim.fades.push({ ...cell, t0: t, delay, segs: plan?.fadeSegs.get(wave + ':' + (cell.r * L.SIZE + cell.c)) });
      burst(lay, cell, t + delay, 4, 60 + combo * 20);
    }
    if (plan) {
      anim.tracks = plan.tracks;
      for (const ms of plan.landings) setTimeout(() => sfx.land(), ms);
      for (const ms of plan.chimes) setTimeout(() => sfx.clear(1, useGame.getState().saved.state.combo), ms);
    }
    const [fx, fy] = cellCenter(lay, pr, pc);
    const margin = lay.cell * 1.6;
    const tier = comboTier(combo, ev.lines);
    anim.floaters.push({ text: '+' + ev.points + (ev.nitro ? ' ×' + String(ev.nitro).replace('.', ',') : ''), x: Math.max(margin, Math.min(lay.W - margin, fx)), y: fy, t0: t, big: true, scale: 1 + tier * 0.18, tier });
    if (!calm) {
      for (const r of ev.rows || []) anim.sweeps.push({ row: r, t0: t });
      for (const c of ev.cols || []) anim.sweeps.push({ col: c, t0: t });
      if (tier) anim.punch = { t0: t, amp: punchAmp(tier) };
      if (tier >= 2 || ev.lines >= 2) confetti(lay, t, confettiCount(tier, ev.lines));
    }
    if (combo >= 2) anim.comboAt = t;
    if (ev.perfect || tier >= 2) react('star', 1300, 1);
    else react('happy', 900, 0.45 + 0.2 * Math.min(3, ev.lines));
    if (combo >= 2 && comboTier(combo) > comboTier(combo - 1)) sfx.sparkle(comboTier(combo));
    const banner = bannerFor({ lines: ev.lines, combo, perfect: ev.perfect }, tier);
    if (banner) anim.banners.push(banner);
    launchFlyers(lay, ev.collected || [], t, (b) => Math.hypot(b.r - pr, b.c - pc) * 28);
    collectTips(ev.collected || []);
    anim.shake = calm ? 0 : shakeFor(ev.lines, combo);
    sfx.clear(ev.lines, combo);
    haptic('lines', ev.lines, combo);
  } else {
    sfx.place();
    haptic('place');
  }
  if ((ev.timeGain || 0) > 0) {
    const [bx, by] = chronoBar(lay);
    anim.floaters.push({ text: '+' + Math.round(ev.timeGain! / 1000) + ' s', x: bx + lay.board - 30, y: by - 10, t0: t });
    sfx.time();
  }
  if (res.state.stage || res.state.world || res.state.obstacles) stageEffects(lay, ev, t);
  if (res.state.stage) bossEffects(lay, ev, res.state, t);
  if (tutActive()) { tutorialMoved(idx, res.state); return ev; }
  refilled(ev.refilled || [], t);
  setState(res.state);
  afterChange(lay, res.state, t, !!ev.over);
  return ev;
}

// Shared bookkeeping after any move: record, missions, game over.
function afterChange(lay: Layout, state: RunState, t: number, over: boolean) {
  announceRecord(lay, state, t);
  checkMissions();
  stuckTip(state);
  if (over) endGame(t, lay);
}

// The run just beat the record it started with: a banner, once (legacy flow.js afterChange).
function announceRecord(lay: Layout, state: RunState, t: number) {
  if (anim.recordAnnounced || !(anim.bestAtStart > 0) || state.score <= anim.bestAtStart) return;
  anim.recordAnnounced = true;
  anim.banners.push({ text: tr('Nouveau record !'), sub: '', tier: 0, gold: true });
  haptic('record');
  react('star', 1500, 1);
  anim.flagDownAt = t;
  if (!anim.calm) confetti(lay, t, 36);
  sfx.sparkle(3);
}

// A mission finished by this run: celebrated once.
function checkMissions() {
  const done = celebrate(missionStatus(), announced);
  for (const m of done) {
    anim.banners.push({ text: tr('Mission réussie'), sub: m.text + ' · +' + m.reward, subIcon: 'coin', tier: 0, gold: true });
    sfx.mission();
    haptic('mission');
  }
}

// Takes coins from the wallet; the price floats up from it.
function payCoins(lay: Layout, cost: number) {
  if (!cost) return;
  const { profile, setProfile } = useGame.getState();
  setProfile(M.spend(profile, cost) || { ...profile, coins: Math.max(0, profile.coins - cost) });
  const [wx] = walletTarget(lay);
  anim.floaters.push({ text: '-' + cost, x: wx, y: hudTop(lay) + 42 + 34, t0: now() });
}

// With none of `type` left in the run, one comes out of the Boutique reserve (only once it fired).
export function fireBonus(lay: Layout, type: BonusType, target?: { r: number; c: number }): boolean {
  const run = useGame.getState().saved.state;
  const fromStock = !(run.inventory[type] > 0) && M.bonusStock(useGame.getState().profile, type) > 0;
  const before = fromStock ? { ...run, inventory: { ...run.inventory, [type]: 1 } } : run;
  const res = L.use(before, type, target);
  if (!res) return false;
  if (fromStock) {
    const { profile, setProfile } = useGame.getState();
    setProfile(M.takeStock(profile, type) || profile);
  }
  const ev = res.events;
  const t = now();
  react('wow', 900, 0.5);
  if (type === 'bomb' && target) {
    for (const cell of ev.cleared || []) {
      const delay = Math.hypot(cell.r - target.r, cell.c - target.c) * 45;
      anim.fades.push({ ...cell, t0: t, delay });
      burst(lay, cell, t + delay, 6, 120, '#ffb347');
    }
    const [fx, fy] = cellCenter(lay, target.r, target.c);
    anim.floaters.push({ text: '+' + ev.points, x: fx, y: fy, t0: t, big: true });
    launchFlyers(lay, ev.collected || [], t, (b) => Math.hypot(b.r - target.r, b.c - target.c) * 45);
    if (ev.perfect) anim.banners.push({ text: tr('Grille vide !'), sub: '+300', tier: 0 });
    bossEffects(lay, ev, res.state, t);
    anim.shake = 18;
    sfx.bomb();
    haptic('bomb');
  } else {
    const ui = BONUS_UI[type];
    anim.banners.length = 0;
    anim.banners.push({ icon: type, text: ui.name, sub: ui.hint(L.upLevel(res.state, type)), tier: 0, gold: true });
    refilled(ev.refilled || [], t);
    sfx.bonus();
    haptic('bonus');
  }
  setState(res.state);
  afterChange(lay, res.state, t, !!ev.over);
  return true;
}

// Throws tray piece idx away at (x, y): the price comes out of the wallet.
export function discardPiece(lay: Layout, idx: number, x: number, y: number): boolean {
  const before = useGame.getState().saved.state;
  const res = L.discard(before, idx);
  if (!res) return false;
  const t = now();
  payCoins(lay, res.events.cost || 0);
  const color = runPalette()[res.events.piece!.color] || TOY.ink;
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = 80 + Math.random() * 160;
    anim.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, t0: t, life: 450 + Math.random() * 300, size: lay.cell * (0.12 + Math.random() * 0.12), color });
  }
  refilled(res.events.refilled || [], t);
  sfx.toss();
  haptic('toss');
  setState(res.state);
  afterChange(lay, res.state, t, !!res.events.over);
  return true;
}

export function undoMove(lay: Layout): boolean {
  const before = useGame.getState().saved.state;
  const res = L.undo(before);
  if (!res) return false;
  const t = now();
  // An undone move doesn't keep its record.
  const { saved, setSaved } = useGame.getState();
  const key = recordKey(res.state);
  const bests = keepsBest(res.state) ? { ...saved.bests, [key]: Math.max(anim.bestAtStart, res.state.score) } : saved.bests;
  setSaved({ ...saved, state: res.state, bests });
  payCoins(lay, res.events.cost || 0);
  refilled(Array.from({ length: Math.max(3, res.state.tray.length) }, (_, i) => i), t);
  anim.pops = []; anim.fades = []; anim.flyers = [];
  sfx.undo();
  haptic('undo');
  afterChange(lay, res.state, t, !!res.events.over);
  return true;
}

// Hint button (puzzle): puts one tray piece on a right spot for M.PUZZLE_HINT coins. Returns false when it
// could not (not enough coins, or no free right spot: the caller plays the "nope").
export function hintPuzzle(lay: Layout): boolean {
  const { saved, profile } = useGame.getState();
  const before = saved.state;
  if (before.mode !== 'puzzle' || before.over) return false;
  if (profile.coins < M.PUZZLE_HINT) {
    anim.banners.push({ text: tr('Pas assez de pièces'), sub: tr`Un indice coûte ${M.PUZZLE_HINT}`, tier: 0 });
    return false;
  }
  const res = L.puzzleHint(before);
  if (!res) {
    anim.banners.push({ text: tr('Pas de place juste'), sub: before.puzzle!.free ? tr('Retire une forme mal placée, puis réessaie') : tr('Annule quelques coups, puis réessaie'), tier: 0 });
    return false;
  }
  const t = now();
  payCoins(lay, M.PUZZLE_HINT);
  const pz = res.state.puzzle!;
  if (!isSurprise(pz)) useGame.getState().setProfile(M.notePuzzleHints(useGame.getState().profile, pz.n, pz.hints));
  for (const [r, c] of res.events.placed || []) {
    anim.pops.push({ r, c, t0: t });
    burst(lay, { r, c }, t, 4, 70, '#fff6a0');
  }
  refilled(res.events.refilled || [], t);
  sfx.bonus();
  haptic('hint');
  setState(res.state);
  afterChange(lay, res.state, t, !!res.events.over);
  return true;
}

// Puzzle surprise: the placed piece under (r, c) goes back to the tray; returns its tray slot.
export function liftPuzzlePiece(r: number, c: number): number | null {
  const res = L.liftPuzzle(useGame.getState().saved.state, r, c);
  if (!res) return null;
  setState(res.state);
  sfx.pick();
  haptic('lift');
  return res.slot;
}

// Tap on a tray piece while Toupie runs (or in Chill): it turns a quarter.
export function rotateTray(idx: number): boolean {
  const { saved } = useGame.getState();
  const next = L.rotate(saved.state, idx);
  if (!next) return false;
  anim.slotSpin[idx] = now();
  sfx.turn();
  haptic('turn');
  setState(next);
  return true;
}

// "Terminer la partie" when stuck.
export function giveUpRun(): boolean {
  const next = L.giveUp(useGame.getState().saved.state);
  if (!next) return false;
  setState(next);
  endGame(now());
  return true;
}
// Pause > Quitter: a free run ends now, its score counts.
export function quitRun(): boolean {
  const next = L.quit(useGame.getState().saved.state);
  if (!next) return false;
  setState(next);
  endGame(now());
  return true;
}

// ---------- frame ----------
// The wallet mirrors into the logic (a paid discard or undo can still save a stuck game).
export function syncBudget(t: number) {
  const { saved, profile } = useGame.getState();
  const next = L.withBudget(saved.state, profile.coins);
  if (next === saved.state) return;
  patchState(next);
  if (next.over && !saved.state.over) endGame(t);
}

// Timers (bonuses, chrono clock) only run while actually playing: the caller checks that.
export function tickRun(dtMs: number, t: number) {
  const { saved } = useGame.getState();
  const st = saved.state;
  const next = L.tick(st, dtMs);
  if (next === st) return;
  patchState(next);
  // Last seconds tick.
  if (hasClock(next) && next.clock < 10000 && !next.over) {
    const secs = Math.ceil(next.clock / 1000);
    if (secs !== anim.lastTickSec) { anim.lastTickSec = secs; sfx.tick(secs <= 3); }
  }
  if (next.over && !st.over) endGame(t);
}
