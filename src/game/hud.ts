// Cubo Blocks — What the in-game controls show, as pure functions of the run: hint line, undo
// badge, bin label, inventory buttons and their timer rings, mission celebration.
// (Legacy render/board.js drawHint, game/undo.js renderUndo, game/drag.js showTrash,
// ui/inventory.js renderInventory, render/loop.js syncTimers, game/flow.js checkMissions.)
import { L } from '../core';
import { tr } from '../core/i18n';
import type { MissionView } from '../core/meta';
import type { BonusType, RunState } from '../core/types';

// The bonus reserve bought in the Boutique (profile.stock), usable once a run has none of a bonus left.
export type Stock = Partial<Record<BonusType, number>> | undefined;
// Bonuses of a type the player can fire: the run's own, then the reserve's.
export const bonusLeft = (state: RunState, stock: Stock, type: BonusType) => (state.inventory[type] || 0) + ((stock && stock[type]) || 0);

// The line between board and tray: aiming instructions, or why the player is stuck.
export function hintText(state: RunState, aiming: { drag: boolean } | null, stock?: Stock): { text: string; danger: boolean } | null {
  if (aiming && aiming.drag) return { text: tr('Lâche la bombe sur la grille'), danger: true };
  if (aiming) return { text: tr('Touche la grille pour viser · ailleurs pour annuler'), danger: true };
  if (!state.stuck) return null;
  // Puzzles: no bin and no bonuses. Free puzzles let placed pieces be picked up again; undo is free.
  if (state.puzzle) {
    if (state.puzzle.free) return { text: tr('Bloqué ! Reprends une forme posée pour la déplacer'), danger: false };
    if (L.canUndo(state)) return { text: tr('Bloqué ! Annule ton coup pour essayer ailleurs'), danger: false };
    return { text: tr('Bloqué ! Recommence le puzzle depuis la pause'), danger: false };
  }
  if ((['bomb', 'reroll', 'rotate'] as const).some((k) => bonusLeft(state, stock, k) > 0)) return { text: tr('Bloqué ! Utilise un bonus ou termine la partie'), danger: false };
  if (L.canUndo(state)) return { text: tr('Bloqué ! Annule ton coup ou jette une forme'), danger: false };
  return { text: tr('Bloqué ! Maintiens une forme en bas pour la jeter'), danger: false };
}

// Undo button: disabled when nothing to undo; the badge says Gratuit or the price.
export function undoView(state: RunState): { disabled: boolean; cost: number; badge: string } {
  const cost = L.undoCost(state);
  return { disabled: !L.canUndo(state) || state.over, cost, badge: cost ? String(cost) : tr('Gratuit') };
}

// The bin under the tray while a piece is held: its price and whether the wallet covers it.
export function trashView(state: RunState, coins: number) {
  const cost = L.discardCost(state);
  return { cost, broke: coins < cost };
}
export function trashLabel(view: { broke: boolean }, armed: boolean): string {
  if (view.broke) return tr('Pas assez de pièces');
  return armed ? tr('Lâcher pour jeter') : tr('Maintenir pour jeter');
}
// How full the bin is while hovered: it fills in TRASH_ARM_MS, then is armed.
export const trashFill = (hoverMs: number, armMs: number) => Math.min(1, Math.max(0, hoverMs / armMs));

// A timed bonus drains as a ring: the fraction left, and whether it is in its last 5 seconds.
export function ringFill(state: RunState, type: BonusType): number {
  const ms = (state.effects as Record<string, number>)[type] || 0;
  return ms > 0 ? Math.min(1, ms / L.effectMs(state, type)) : 0;
}
export const ringEnding = (state: RunState, type: BonusType) => {
  const ms = (state.effects as Record<string, number>)[type] || 0;
  return ms > 0 && ms < 5000;
};

// count: the run's own; reserve: the Boutique's, shown once the run has none.
export interface InvButtonView { count: number; reserve: number; empty: boolean; active: boolean; aiming: boolean; help: boolean }
export function invView(state: RunState, type: BonusType, aiming: boolean, stock?: Stock): InvButtonView {
  const count = state.inventory[type] || 0;
  const reserve = count ? 0 : (stock && stock[type]) || 0;
  const helps = type === 'bomb' || type === 'reroll' || type === 'rotate';
  return {
    count,
    reserve,
    empty: count + reserve === 0 || state.over,
    active: ((state.effects as Record<string, number>)[type] || 0) > 0,
    aiming: type === 'bomb' && aiming,
    help: state.stuck && count + reserve > 0 && helps && !aiming,
  };
}
// Chill and puzzles have no bonuses: no inventory bar.
export const hasInventory = (state: RunState) => state.mode !== 'chill' && state.mode !== 'puzzle';
// Chrono (and timed levels) show the clock bar.
export const hasClock = (state: RunState) => state.mode === 'chrono' || !!(state.stage && state.stage.clock);

// Missions finished since the last check, to celebrate once each. Mutates `announced`.
export function celebrate(status: MissionView[], announced: Set<string>): MissionView[] {
  const out: MissionView[] = [];
  for (const m of status) {
    if (!m.done || announced.has(m.id)) continue;
    announced.add(m.id);
    out.push(m);
  }
  return out;
}
export const alreadyDone = (status: MissionView[]) => new Set(status.filter((m) => m.done).map((m) => m.id));
export const missionsDone = (status: MissionView[]) => status.filter((m) => m.done).length;

// Boss hit points left (the goal's target minus the progress).
export const bossLeft = (state: RunState) => (state.stage ? Math.max(0, state.stage.goal.target - state.stage.progress) : 0);
