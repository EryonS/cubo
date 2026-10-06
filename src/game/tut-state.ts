// Cubo Blocks — State of the guided first game (legacy screens/tutorial.js `tut`). Tiny and import-free of
// the game modules, so the store, the renderer and the run can all read it. Logic: game/tutorial.ts.
import { create } from 'zustand';
import type { RunState } from '../core/types';

export interface Tut {
  step: number;
  saved: RunState | null; // the run that was going on when the tutorial was replayed from Paramètres
  t0: number; // when the step started (the hand waits a moment)
  doneAt: number; // when the step's last piece landed (0 = still going)
  mood: '' | 'nope' | 'yay';
  nonce: number; // bumps on each coach change, to replay its nudge
  ending: boolean; // the "Bien joué !" card shows
}

export const useTut = create<{ tut: Tut | null }>(() => ({ tut: null }));
export const tutor = () => useTut.getState().tut;
export const tutActive = () => useTut.getState().tut !== null;
