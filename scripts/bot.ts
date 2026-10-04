// Greedy bot used to balance Aventure levels (dev only, not shipped). Plays one move at a time:
// the placement with the most points, minus a penalty for empty cells it walls in.
import { L } from '../src/core';
import type { MoveResult } from '../src/core/logic';
import type { RunState } from '../src/core/types';

const SIZE = L.SIZE;

function holes(board: number[]) {
  let n = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r * SIZE + c]) continue;
      const around = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        .filter(([rr, cc]) => rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE || board[rr * SIZE + cc]).length;
      if (around >= 3) n += 1;
    }
  }
  return n;
}

export function bestMove(state: RunState): MoveResult | null {
  let best: { v: number; res: MoveResult } | null = null;
  state.tray.forEach((piece, idx) => {
    if (!piece) return;
    for (let r = 0; r <= SIZE - piece.h; r++) {
      for (let c = 0; c <= SIZE - piece.w; c++) {
        const res = L.place(state, idx, r, c);
        if (!res) continue;
        const st = res.state.stage;
        const ev = res.events;
        // Goal-aware like a player: progress on the level's goal counts most, hits on its cells help.
        const progress = st ? st.progress - state.stage!.progress : 0;
        const goalHits = st && st.goal.kind ? (ev.damaged || []).filter((d) => d.kind === st.goal.kind).length : 0;
        const goal = st && st.goal.type;
        // Combo: keep the chain alive.
        const chain = goal === 'combo' ? res.state.combo * 60 : 0;
        const v = (ev.points || 0) * (st && goal !== 'score' ? 1 : 3) + (ev.lines || 0) * 40
          - holes(res.state.board) * 6 + progress * 150 + goalHits * 80 + chain + (st && st.won ? 1e6 : 0);
        if (!best || v > best.v) best = { v, res };
      }
    }
  });
  return best && (best as { v: number; res: MoveResult }).res;
}

// Plays until the game or level ends (a timed level counts ~2.5 s per move). Returns the final state.
export function play(state: RunState, maxMoves = 400): RunState {
  for (let k = 0; k < maxMoves && !state.over; k++) {
    const res = bestMove(state);
    if (!res) break;
    state = res.state;
    if (state.stage && state.stage.clock && !state.over) state = L.tick(state, 2500);
  }
  return state;
}
