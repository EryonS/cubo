// Cubo Blocks — The run in progress: starting one, placing pieces, the end of the run.
// Rules come from the core; this file turns them into animation events and saves.
// (Legacy game/flow.js commit / afterChange / endGame, screens/gameover.js newGame.)
import { L, M } from '../core';
import type { MoveEvents } from '../core/logic';
import type { Earned } from '../core/meta';
import type { RunState } from '../core/types';
import { tr } from '../core/i18n';
import { TOY } from '../render/theme';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { cellCenter, type Layout } from '../render/layout';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { anim, resetAnim } from './anim';
import { bannerFor, comboTier, confettiCount, punchAmp, shakeFor } from './juice';

const now = () => performance.now();

// Free-play records live in bests, one per mode.
const recordKey = (st: RunState) => (st.mode === 'worlds' ? 'worlds-' + st.world : st.mode);
export const bestOf = (st: RunState) => useGame.getState().saved.bests[recordKey(st)] || 0;

function setState(state: RunState) {
  const { saved, setSaved } = useGame.getState();
  const key = recordKey(state);
  const bests = state.score > (saved.bests[key] || 0) ? { ...saved.bests, [key]: state.score } : saved.bests;
  setSaved({ ...saved, state, bests });
}

// Shows the saved run as a fresh or resumed run.
export function enterRun() {
  const { state } = useGame.getState().saved;
  resetAnim(now(), state.score, bestOf(state));
  if (state.over) anim.overAt = now() - 900;
}

// A new Classique run (milestone 2: Classique, Normal, no obstacles yet).
export function newRun() {
  const { profile, setProfile } = useGame.getState();
  const fresh = M.ensureDay(profile, today());
  if (fresh !== profile) setProfile(fresh);
  setState(L.createGame(Date.now(), { mode: 'classic', level: 'normal', budget: fresh.coins, upgrades: fresh.upgrades }));
  enterRun();
}

// A run in progress worth resuming from the menu.
export const inProgress = (st: RunState) => !st.over && st.moves > 0;

export interface RunEnd { score: number; best: number; record: boolean; earned: Earned[]; total: number }

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
function burst(lay: Layout, cell: { r: number; c: number; color: number }, t0: number, count: number, speed: number) {
  const [x, y] = cellCenter(lay, cell.r, cell.c);
  for (let k = 0; k < count; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed + Math.random() * 180;
    anim.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t0, life: 500 + Math.random() * 400,
      size: lay.cell * (0.12 + Math.random() * 0.14), color: TOY.palette[cell.color] || TOY.ink,
    });
  }
}

// Places tray piece idx at (row, col). Returns the move's events, or null if it is not legal.
export function commit(lay: Layout, idx: number, row: number, col: number, onEnd: (end: RunEnd) => void): MoveEvents | null {
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
  if (ev.lines) {
    const placed = ev.placed || [];
    const combo = ev.combo || 0;
    const pr = placed.reduce((s, p) => s + p[0], 0) / placed.length;
    const pc = placed.reduce((s, p) => s + p[1], 0) / placed.length;
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
    anim.shake = calm ? 0 : shakeFor(ev.lines, combo);
    sfx.clear(ev.lines, combo);
    haptic('lines', ev.lines, combo);
  } else {
    sfx.place();
    haptic('place');
  }
  for (const i of ev.refilled || []) anim.slotIn[i] = t;
  if ((ev.refilled || []).length) anim.nextIn = t;
  setState(res.state);
  announceRecord(lay, res.state, t);
  if (ev.over) endRun(onEnd);
  return ev;
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

// The run is over: coins and missions count, the record is kept.
function endRun(onEnd: (end: RunEnd) => void) {
  const t = now();
  anim.overAt = t;
  setTimeout(() => { sfx.over(); haptic('lose'); }, 350);
  const { saved, profile, setProfile } = useGame.getState();
  const st = saved.state;
  const res = M.applyRun(M.ensureDay(profile, today()), L.runStats(st));
  setProfile(res.profile);
  const best = bestOf(st);
  const end = { score: st.score, best, record: anim.bestAtStart > 0 && st.score > anim.bestAtStart, earned: res.report.earned, total: res.report.total };
  setTimeout(() => onEnd(end), 1300);
}

