// Cubo Blocks — Bonus names and texts (legacy app/base.js BONUS_UI / COIN_UI). Getters and
// functions, so they read in the current language. lv: upgrade level 1..3 (Boutique).
import { L } from '../core';
import { tr } from '../core/i18n';
import type { BonusType } from '../core/types';

const secs = (type: BonusType, lv: number) => (L.EFFECT_BY_LEVEL as Record<string, number[]>)[type][lv - 1] / 1000;
export const times = (n: number) => '×' + String(n).replace('.', ',');

export interface BonusUi {
  name: string;
  hint(lv: number): string; // shown when fired
  desc(lv: number): string; // legend + accessibility
  levels: string[]; // what each upgrade level gives
}

export const BONUS_UI: Record<BonusType, BonusUi> = {
  rotate: {
    get name() { return tr('Toupie'); },
    hint: () => tr('Touche une forme pour la tourner'),
    desc: (lv) => tr`${secs('rotate', lv)} s : touche une forme du bac pour la faire pivoter.`,
    get levels() { return ['30 s', '45 s', '60 s']; },
  },
  nitro: {
    get name() { return tr('Étoile'); },
    hint: (lv) => tr('Points ') + times(L.NITRO_BY_LEVEL[lv - 1]),
    desc: (lv) => tr`30 s : tous les points comptent ${lv === 1 ? tr('double') : times(L.NITRO_BY_LEVEL[lv - 1])}.`,
    get levels() { return [tr('Points ×2'), tr('Points ×2,5'), tr('Points ×3')]; },
  },
  shield: {
    get name() { return tr('Bulle'); },
    hint: () => tr('Le combo ne casse plus'),
    desc: (lv) => tr`${secs('shield', lv)} s : ton combo ne peut pas retomber.`,
    get levels() { return ['30 s', '45 s', '60 s']; },
  },
  bomb: {
    get name() { return tr('Bombe'); },
    hint: () => tr('Glisse-la sur la grille'),
    desc: (lv) => tr('Glisse-la sur la grille : ') + [tr('elle fait sauter une zone de 21 cases.'), tr('elle fait sauter un carré de 25 cases.'), tr('carré de 25 cases, plus toute la ligne et la colonne.')][lv - 1],
    get levels() { return [tr('21 cases'), tr('Carré de 25'), tr('Carré + grande croix')]; },
  },
  reroll: {
    get name() { return tr('Tornade'); },
    hint: () => tr('Nouvelles formes'),
    desc: (lv) => [tr('Remplace les 3 formes du bac.'), tr('Remplace les 3 formes du bac par des formes qui rentrent.'), tr('Remplace les 3 formes du bac par des petites formes qui rentrent.')][lv - 1],
    get levels() { return [tr('Au hasard'), tr('Qui rentrent'), tr('Petites, qui rentrent')]; },
  },
};

export const COIN_UI = {
  coin: { get name() { return tr('Pièce'); }, get desc() { return tr('+1 pièce quand le bloc est effacé.'); } },
  bag: { get name() { return tr('Sac de pièces'); }, get desc() { return tr('+5 pièces quand le bloc est effacé.'); } },
};

export const BONUS_TYPES = Object.keys(BONUS_UI) as BonusType[];
