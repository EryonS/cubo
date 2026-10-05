// Cubo Blocks — One-time tips (legacy ui/tips.js). A tip is queued when something happens for the first
// time, shown once nothing covers the game, and marked seen the moment it shows (a dropped one comes back
// later). Seen ids live in profile.tips. The bubble itself is ui/TipBubble.tsx.
import { create } from 'zustand';
import { M } from '../core';
import { tr } from '../core/i18n';
import type { Collected } from '../core/logic';
import type { BonusType, RunState } from '../core/types';
import { useGame } from '../state/store';
import { BONUS_UI } from './bonus-ui';
import type { Anchor } from './tip-place';
import { tutActive } from './tut-state';

export interface Tip { id: string; title: string; text: string; anchor: Anchor }

export const useTips = create<{ queue: Tip[]; shown: Tip | null; covered: boolean }>(() => ({ queue: [], shown: null, covered: false }));

export function tip(id: string, title: string, text: string, anchor: Anchor) {
  const s = useTips.getState();
  if (tutActive() || M.tipSeen(useGame.getState().profile, id) || s.queue.some((q) => q.id === id) || s.shown?.id === id) return;
  useTips.setState({ queue: [...s.queue, { id, title, text, anchor }] });
}

export function hideTips() {
  const s = useTips.getState();
  if (s.queue.length || s.shown) useTips.setState({ queue: [], shown: null });
}
export const dismissTip = () => { if (useTips.getState().shown) useTips.setState({ shown: null }); };

// Called each frame by the game screen: shows the next tip once no sheet or card covers the game.
export function pumpTips(covered: boolean, over: boolean) {
  const s = useTips.getState();
  if (!s.shown && s.queue.length && !covered && !over && !tutActive()) {
    const [next, ...rest] = s.queue;
    const { profile, setProfile } = useGame.getState();
    setProfile(M.markTip(profile, next.id));
    useTips.setState({ queue: rest, shown: next, covered: false });
    return;
  }
  if (s.covered !== covered) useTips.setState({ covered });
}

export function collectTips(collected: Collected[]) {
  const bonus = collected.find((b) => !b.coins);
  if (bonus) {
    const type = bonus.type as BonusType;
    tip('bonus', tr('Bonus gagné !'), tr`${BONUS_UI[type].name} : touche-le en bas pour l'utiliser. Le bouton « ? » explique chaque bonus.`, { inv: type });
  }
  if (collected.some((b) => b.coins)) {
    tip('coins', tr('Des pièces !'), tr('Dépense-les en Boutique, ou pour jeter une forme et annuler un coup.'), 'wallet');
  }
}

// A new game of a mode that has something to explain.
export function modeTips(state: RunState) {
  if (state.mode === 'chrono') {
    tip('chrono', tr('Chrono'), tr('Le temps file ! Chaque ligne effacée te rend quelques secondes.'), 'chrono');
  } else if (state.mode === 'chill') {
    tip('chill', tr('Chill'), tr('Touche une forme pour la tourner. Pas de bonus, pas de pression.'), 'tray');
  } else if (state.puzzle && state.puzzle.free) {
    tip('surprise', tr('Puzzle surprise'), tr('Toutes les formes sont là. Touche une forme pour la tourner, et reprends une forme déjà posée pour la déplacer.'), 'trayWide');
  } else if (state.mode === 'puzzle') {
    tip('puzzle', tr('Puzzle'), tr('Remplis tout le dessin avec les formes données. Touche une forme pour la tourner.'), 'tray');
  } else if (state.mode === 'worlds') {
    tip('worlds', tr('Mondes'), tr('Partie sans fin avec les règles du monde. Plus tu marques, plus la prime en pièces grossit.'), 'plate');
  } else if (state.stage && state.stage.daily) {
    tip('daily', tr('Niveau du jour'), tr('Le même niveau pour tout le monde aujourd’hui. Atteins l’objectif affiché en haut.'), 'plate');
  } else if (state.stage) {
    tip('adventure', tr('Aventure'), tr('Atteins l’objectif affiché en haut avant d’avoir joué tous tes coups.'), 'plate');
  }
}

// The player is stuck and a rescue exists (legacy afterChange).
export function stuckTip(state: RunState) {
  if (!state.stuck || state.over) return;
  if (state.mode === 'puzzle') tip('stuck-puzzle', tr('Ça ne rentre plus'), tr('Annule tes derniers coups (gratuit), ou prends un indice.'), 'undo');
  else if (state.mode === 'chill') tip('stuck-chill', tr('Coincé ?'), tr('Annule ton dernier coup, ou maintiens une forme tout en bas pour la jeter.'), 'undo');
  else tip('stuck', tr('Coincé ?'), tr('Utilise un bonus, annule ton dernier coup, ou maintiens une forme tout en bas pour la jeter.'), 'undo');
}
