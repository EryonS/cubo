// Cubo Blocks — The run in progress: starting one, placing pieces, the end of the run.
// Rules come from the core; this file turns them into animation events and saves.
// (Legacy game/flow.js commit / afterChange / endGame, screens/gameover.js newGame.)
import { L, M } from '../core';
import type { MoveEvents } from '../core/logic';
import type { Earned } from '../core/meta';
import type { RunState } from '../core/types';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { cellCenter, type Layout } from '../render/layout';
import { anim, resetAnim } from './anim';

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

// Places tray piece idx at (row, col). Returns the move's events, or null if it is not legal.
export function commit(lay: Layout, idx: number, row: number, col: number, onEnd: (end: RunEnd) => void): MoveEvents | null {
  const res = L.place(useGame.getState().saved.state, idx, row, col);
  if (!res) return null;
  const ev = res.events;
  const t = now();
  (ev.placed || []).forEach(([r, c]) => anim.pops.push({ r, c, t0: t }));
  if (ev.lines) {
    const placed = ev.placed || [];
    const pr = placed.reduce((s, p) => s + p[0], 0) / placed.length;
    const pc = placed.reduce((s, p) => s + p[1], 0) / placed.length;
    // Cleared cells go from the placed piece outwards.
    for (const cell of ev.cleared || []) anim.fades.push({ ...cell, t0: t, delay: Math.hypot(cell.r - pr, cell.c - pc) * 28 });
    const [fx, fy] = cellCenter(lay, pr, pc);
    const margin = lay.cell * 1.6;
    anim.floaters.push({ text: '+' + ev.points, x: Math.max(margin, Math.min(lay.W - margin, fx)), y: fy, t0: t, big: true });
  }
  for (const i of ev.refilled || []) anim.slotIn[i] = t;
  if ((ev.refilled || []).length) anim.nextIn = t;
  setState(res.state);
  if (ev.over) endRun(onEnd);
  return ev;
}

// The run is over: coins and missions count, the record is kept.
function endRun(onEnd: (end: RunEnd) => void) {
  const t = now();
  anim.overAt = t;
  const { saved, profile, setProfile } = useGame.getState();
  const st = saved.state;
  const res = M.applyRun(M.ensureDay(profile, today()), L.runStats(st));
  setProfile(res.profile);
  const best = bestOf(st);
  const end = { score: st.score, best, record: anim.bestAtStart > 0 && st.score > anim.bestAtStart, earned: res.report.earned, total: res.report.total };
  setTimeout(() => onEnd(end), 1300);
}

