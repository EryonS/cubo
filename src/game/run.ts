// Cubo Blocks — The run in progress: starting one, placing pieces, bonuses, bin, undo, the end.
// Rules come from the core; this file turns them into animation events and saves.
// (Legacy game/flow.js, game/drag.js discard / rotate, game/undo.js, screens/gameover.js newGame /
// restartRun / settleRun / dropParked / resumeParked.)
import { create } from 'zustand';
import { L, M, WD } from '../core';
import type { Collected, MoveEvents } from '../core/logic';
import type { Earned } from '../core/meta';
import type { BonusType, Level, Lifetime, Mode, RunState, Stats } from '../core/types';
import { tr } from '../core/i18n';
import { TOY } from '../render/theme';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { cellCenter, chronoBar, hudTop, walletTarget, invCenter, type InvId, type Layout } from '../render/layout';
import { SPECIAL_COLORS } from '../render/cells';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { anim, resetAnim } from './anim';
import { BONUS_UI } from './bonus-ui';
import { alreadyDone, celebrate, hasClock } from './hud';
import { bannerFor, comboTier, confettiCount, punchAmp, shakeFor } from './juice';
import { inProgress, isFree } from './modes';

export { inProgress };

const now = () => performance.now();

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
  const bests = state.score > (saved.bests[key] || 0) ? { ...saved.bests, [key]: state.score } : saved.bests;
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
export interface StartOpts { mode: Mode; level: Level; stage?: unknown; puzzle?: unknown }

// opts: mode and level of the free game (legacy newGame). Obstacles come from the equipped theme.
function newGame(opts: StartOpts) {
  const store = useGame.getState();
  const fresh = M.ensureDay(store.profile, today());
  if (fresh !== store.profile) store.setProfile(fresh);
  const obstacles = WD.freeObstacles(fresh.equipped.boards, opts.level);
  const state = L.createGame(Date.now(), { mode: opts.mode, level: opts.level, budget: fresh.coins, upgrades: fresh.upgrades, obstacles });
  const { saved, setSaved } = useGame.getState();
  setSaved({ ...saved, state, startBest: bestOf(state) });
  enterRun();
}

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

// Pays out coins and advances missions for the current run, once.
export function settleRun() {
  if (runSettled) return null;
  runSettled = true;
  const { saved, profile, setProfile } = useGame.getState();
  const res = M.applyRun(M.ensureDay(profile, today()), L.runStats(saved.state));
  setProfile(res.profile);
  return res.report;
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
}

// The run is over: coins and missions count, the record is kept.
function endGame(t: number) {
  anim.overAt = t;
  setAiming(false);
  anim.trash = null;
  const { saved, profile } = useGame.getState();
  const st = saved.state;
  const lifeBefore = { ...(profile.lifetime || {}) };
  const report = settleRun();
  setTimeout(() => { sfx.over(); haptic('lose'); }, 350);
  const best = Math.max(bestOf(st), st.score);
  const end: RunEnd = {
    score: st.score, best, record: st.score >= best && st.score > anim.bestAtStart && anim.bestAtStart > 0,
    title: st.timeUp ? 'time' : st.quit ? 'quit' : 'over', stats: st.stats || {}, lifeBefore,
    earned: report ? report.earned : [], total: report ? report.total : 0, coinsBefore: report ? report.coinsBefore : profile.coins,
  };
  setTimeout(() => endHandler?.(end), 1300);
}

// ---------- effects ----------
// Star confetti thrown up from the board on big clears, in the board's block colors (legacy flow.js confetti).
function confetti(lay: Layout, t0: number, count: number) {
  const colors = TOY.palette.filter(Boolean) as string[];
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
    const base = cell.kind ? SPECIAL_COLORS[cell.kind] : TOY.palette[cell.color || 0];
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

// Obstacles: cracked cells, and what the rules dropped, moved or removed this turn (legacy stageEffects).
function stageEffects(lay: Layout, ev: MoveEvents, t: number) {
  for (const d of ev.damaged || []) burst(lay, { r: d.r, c: d.c, kind: d.kind }, t, 5, 80, '#ffffff');
  if ((ev.damaged || []).length) sfx.crack();
  for (const sp of ev.spawned || []) {
    if ('row' in sp) continue;
    const at = t + 250;
    if (sp.gone) {
      anim.fades.push({ r: sp.r, c: sp.c, color: 0, bonus: null, kind: sp.kind, t0: t, delay: 250 });
      setTimeout(() => sfx.swoosh(), 250);
      continue;
    }
    if (sp.from) {
      if (!anim.calm) anim.drops.set(sp.r * L.SIZE + sp.c, { t0: at, kind: sp.kind, dur: sp.hop ? 360 : 260, from: sp.from, hop: sp.hop });
      if (sp.hop) setTimeout(() => sfx.swoosh(), 250);
      continue;
    }
    const land = sp.kind === 'mushroom' || sp.grow ? 320 : 420;
    if (!anim.calm) anim.drops.set(sp.r * L.SIZE + sp.c, { t0: at, kind: sp.kind, dur: land, grow: sp.grow });
    setTimeout(() => {
      burst(lay, { r: sp.r, c: sp.c, kind: sp.kind }, now(), 6, 70);
      if (sp.kind === 'mushroom' || sp.grow) sfx.grow(); else sfx.thunk();
    }, 250 + (anim.calm ? 0 : land));
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
  const ev = res.events;
  const t = now();
  const calm = anim.calm;
  if (!ev.lines && before.combo >= 2 && !res.state.combo) {
    anim.comboBreak = { t0: t, n: before.combo };
    sfx.fizzle();
  }
  (ev.placed || []).forEach(([r, c]) => anim.pops.push({ r, c, t0: t }));
  const placed = ev.placed || [];
  const pr = placed.reduce((s, p) => s + p[0], 0) / (placed.length || 1);
  const pc = placed.reduce((s, p) => s + p[1], 0) / (placed.length || 1);
  if (ev.lines) {
    const combo = ev.combo || 0;
    // Cleared cells go from the placed piece outwards.
    for (const cell of ev.cleared || []) {
      const delay = Math.hypot(cell.r - pr, cell.c - pc) * 28;
      anim.fades.push({ ...cell, t0: t, delay });
      burst(lay, cell, t + delay, 4, 60 + combo * 20);
    }
    const [fx, fy] = cellCenter(lay, pr, pc);
    const margin = lay.cell * 1.6;
    const tier = comboTier(combo, ev.lines);
    anim.floaters.push({ text: '+' + ev.points, x: Math.max(margin, Math.min(lay.W - margin, fx)), y: fy, t0: t, big: true, scale: 1 + tier * 0.18, tier });
    if (!calm) {
      for (const r of ev.rows || []) anim.sweeps.push({ row: r, t0: t });
      for (const c of ev.cols || []) anim.sweeps.push({ col: c, t0: t });
      if (tier) anim.punch = { t0: t, amp: punchAmp(tier) };
      if (tier >= 2 || ev.lines >= 2) confetti(lay, t, confettiCount(tier, ev.lines));
    }
    if (combo >= 2) anim.comboAt = t;
    if (combo >= 2 && comboTier(combo) > comboTier(combo - 1)) sfx.sparkle(comboTier(combo));
    const banner = bannerFor({ lines: ev.lines, combo, perfect: ev.perfect }, tier);
    if (banner) anim.banners.push(banner);
    launchFlyers(lay, ev.collected || [], t, (b) => Math.hypot(b.r - pr, b.c - pc) * 28);
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
  if (res.state.obstacles) stageEffects(lay, ev, t);
  refilled(ev.refilled || [], t);
  setState(res.state);
  afterChange(lay, res.state, t, !!ev.over);
  return ev;
}

// Shared bookkeeping after any move: record, missions, game over.
function afterChange(lay: Layout, state: RunState, t: number, over: boolean) {
  announceRecord(lay, state, t);
  checkMissions();
  if (over) endGame(t);
}

// The run just beat the record it started with: a banner, once (legacy flow.js afterChange).
function announceRecord(lay: Layout, state: RunState, t: number) {
  if (anim.recordAnnounced || !(anim.bestAtStart > 0) || state.score <= anim.bestAtStart) return;
  anim.recordAnnounced = true;
  anim.banners.push({ text: tr('Nouveau record !'), sub: '', tier: 0, gold: true });
  haptic('record');
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

export function fireBonus(lay: Layout, type: BonusType, target?: { r: number; c: number }): boolean {
  const before = useGame.getState().saved.state;
  const res = L.use(before, type, target);
  if (!res) return false;
  const ev = res.events;
  const t = now();
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
  const color = TOY.palette[res.events.piece!.color] || TOY.ink;
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
  const bests = { ...saved.bests, [key]: Math.max(anim.bestAtStart, res.state.score) };
  setSaved({ ...saved, state: res.state, bests });
  payCoins(lay, res.events.cost || 0);
  refilled([0, 1, 2], t);
  anim.pops = []; anim.fades = []; anim.flyers = [];
  sfx.undo();
  haptic('undo');
  afterChange(lay, res.state, t, !!res.events.over);
  return true;
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
