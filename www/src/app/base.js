// Cubo Blocks — Shared names: core modules, store keys, block palette, bonus labels, canvas, small helpers.
'use strict';

// Translations (core/i18n.js): tr('…') / tr`… ${x}`, French source text as the key.
const tr = window.GridlockI18n.tr;
const locale = () => window.GridlockI18n.locale();
const L = window.GridlockLogic;
const M = window.GridlockMeta;
const LV = window.GridlockLevels;
const WD = window.GridlockWorlds;
const T = window.GridlockTutorial;
const PZ = window.GridlockPuzzles;
const SIZE = L.SIZE;
const STORE_KEY = 'gridlock.v2';
const LEGACY_KEY = 'gridlock.v1';
const PROFILE_KEY = 'gridlock.profile.v1';

// One color per shape family (index = family + 1, see FAMILIES in logic.js).
const PALETTE = [
  null,
  '#e2e8f0', // 1x1
  '#ff9f43', // 2 line
  '#ffd93d', // 3 line
  '#4ade80', // 4 line
  '#22d3ee', // 5 line
  '#3b82f6', // 2x2
  '#6366f1', // 3x3
  '#c084fc', // small L
  '#f472b6', // L (both mirrors)
  '#a3e635', // T
  '#ff5d73', // S / Z
  '#14b8a6', // big L
  '#94a3b8', // 2x3
  '#d6a86b', // diagonal
];
// hint(lv): shown when fired. desc(lv): legend + hover tooltip. lv: upgrade level 1..3 (Boutique).
// levels: what each upgrade level gives, shown in the Boutique.
const secs = (type, lv) => L.EFFECT_BY_LEVEL[type][lv - 1] / 1000;
const times = (n) => '×' + String(n).replace('.', ',');
const BONUS_UI = {
  rotate: { name: tr('Toupie'), hint: () => tr('Touche une forme pour la tourner'),
    desc: (lv) => tr`${secs('rotate', lv)} s : touche une forme du bac pour la faire pivoter.`, levels: ['30 s', '45 s', '60 s'] },
  nitro: { name: tr('Étoile'), hint: (lv) => tr('Points ') + times(L.NITRO_BY_LEVEL[lv - 1]),
    desc: (lv) => tr`30 s : tous les points comptent ${lv === 1 ? tr('double') : times(L.NITRO_BY_LEVEL[lv - 1])}.`, levels: [tr('Points ×2'), tr('Points ×2,5'), tr('Points ×3')] },
  shield: { name: tr('Bulle'), hint: () => tr('Le combo ne casse plus'),
    desc: (lv) => tr`${secs('shield', lv)} s : ton combo ne peut pas retomber.`, levels: ['30 s', '45 s', '60 s'] },
  bomb: { name: tr('Bombe'), hint: () => tr('Glisse-la sur la grille'),
    desc: (lv) => tr('Glisse-la sur la grille : ') + [tr('elle fait sauter une zone de 21 cases.'), tr('elle fait sauter un carré de 25 cases.'), tr('carré de 25 cases, plus toute la ligne et la colonne.')][lv - 1],
    levels: [tr('21 cases'), tr('Carré de 25'), tr('Carré + grande croix')] },
  reroll: { name: tr('Tornade'), hint: () => tr('Nouvelles formes'),
    desc: (lv) => [tr('Remplace les 3 formes du bac.'), tr('Remplace les 3 formes du bac par des formes qui rentrent.'), tr('Remplace les 3 formes du bac par des petites formes qui rentrent.')][lv - 1],
    levels: [tr('Au hasard'), tr('Qui rentrent'), tr('Petites, qui rentrent')] },
};
// Upgrade level of a bonus in the current run (bought levels apply to the run in progress too).
const bonusLv = (type) => L.upLevel(state, type);
const COIN_UI = {
  coin: { name: tr('Pièce'), desc: tr('+1 pièce quand le bloc est effacé.') },
  bag: { name: tr('Sac de pièces'), desc: tr('+5 pièces quand le bloc est effacé.') },
};
const FONT = '"Baloo 2", ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';
const PIXEL_FONT = '"Press Start 2P", ui-monospace, monospace';

const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d'); // swapped temporarily to draw shop previews
const now = () => performance.now();

// Tiny seeded RNG so decorative stars and peaks don't jump on resize.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
