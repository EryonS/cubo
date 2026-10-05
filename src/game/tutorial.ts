// Cubo Blocks — The guided first game: 3 scripted steps from core/tutorial.ts on a board that is never
// saved nor counted (legacy screens/tutorial.js). State in tut-state.ts; the hand, the glowing cells and
// the coach card are drawn / rendered by render/tutorial.ts and ui/TutorialOverlay.tsx.
import { M, T } from '../core';
import type { RunState } from '../core/types';
import { sfx } from '../audio/engine';
import { useGame } from '../state/store';
import { resetAnim } from './anim';
import { inProgress } from './modes';
import { hideTips } from './tips';
import { tutActive, tutor, useTut, type Tut } from './tut-state';

const now = () => performance.now();
const patch = (p: Partial<Tut>) => useTut.setState((s) => (s.tut ? { tut: { ...s.tut, ...p } } : s));
const coach = (mood: Tut['mood']) => useTut.setState((s) => (s.tut ? { tut: { ...s.tut, mood, nonce: s.tut.nonce + 1 } } : s));

// The board of a step replaces the run in the store without saving (store.setSaved skips saving while it runs).
function loadStep(i: number) {
  const t = now();
  patch({ step: i, t0: t, doneAt: 0, mood: '', ending: false });
  const { saved } = useGame.getState();
  useGame.setState({ saved: { ...saved, state: T.lesson(i) } });
  resetAnim(t, 0, 0);
}

export function startTutorial() {
  if (tutActive()) return;
  const { saved } = useGame.getState();
  hideTips();
  useTut.setState({ tut: { step: 0, saved: inProgress(saved.state) ? saved.state : null, t0: 0, doneAt: 0, mood: '', nonce: 0, ending: false } });
  loadStep(0);
}

// The coach card says what to aim for (legacy tutorialNope; the game screen plays the refusal sound).
export const tutorialNope = () => coach('nope');

// A scripted piece landed: the slot stays empty; when the tray is empty the step is over.
export function tutorialMoved(slot: number, moved: RunState) {
  const tut = tutor();
  if (!tut) return;
  const state = T.afterMove(moved, slot);
  useGame.setState({ saved: { ...useGame.getState().saved, state } });
  if (!T.done(state)) return;
  const step = tut.step;
  patch({ doneAt: now() });
  setTimeout(() => { if (tutor()?.step === step) { coach('yay'); sfx.mission(); } }, 450);
  setTimeout(() => {
    if (tutor()?.step !== step) return;
    if (step + 1 < T.STEPS.length) loadStep(step + 1);
    else patch({ ending: true });
  }, 1900);
}

// Skip or "Continuer": the tutorial is seen, the run that was going on comes back (replay from Réglages),
// else a fresh game starts (fresh); the caller then shows the home menu.
export function endTutorial(fresh: () => void) {
  const tut = tutor();
  if (!tut) return;
  useTut.setState({ tut: null });
  const { profile, setProfile, saved, setSaved } = useGame.getState();
  setProfile(M.markTip(profile, 'tutorial'));
  if (tut.saved) setSaved({ ...saved, state: tut.saved });
  else fresh();
}
