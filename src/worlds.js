/*
 * Gridlock — Aventure world rules. Pure, no DOM. Registers itself into logic.js (defineWorlds),
 * so logic.js never names a world. Each world has one advantage and one drawback.
 *
 * Hooks (all optional, they mutate the fresh state copy they receive):
 *   setup(state, api)       level start: place the level's special cells (stage.setup = { kind, count })
 *   afterMove(state, api)   after each placement: spawn cells, shift rows... returns spawned cells
 *   lineMul(hit)            multiplier on line points for a clear (hit = cells cleared / damaged)
 *   scoreMul                multiplier on all points of a move
 *   coinMul                 multiplier on the chance a new piece carries a coin
 *   bonusWeights            { [bonus]: factor } on bonus odds
 *   gravity                 blocks fall after a clear; new full lines chain
 *   twist                   { name, text }: the second obstacle of levels 11-19 (spawn rules in levels.js
 *                           TWISTS, behavior in logic.js KINDS), shown on the world screen and level sheet
 *   free                    worlds mode (endless run): { setup: { kind, count }, every, kind, clock, note }
 *                           start cells, one `kind` cell every `every` moves, a clock (ms), note for the Mondes screen
 * The world also fixes the level's clock (levels.js) and the renderer's palette (main.js).
 */
(function (root, factory) {
  const L = typeof module === 'object' && module.exports ? require('./logic.js') : root.GridlockLogic;
  const api = factory(L);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GridlockWorlds = api;
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  // Scatters setup.count cells of setup.kind on empty cells (setup from the stage).
  function scatter(state, api) {
    const setup = (state.stage || {}).setup;
    if (!setup) return;
    for (let k = 0; k < setup.count; k++) {
      const i = api.pick(state, api.emptyCells(state));
      if (i >= 0) api.addSpecial(state, i, setup.kind);
    }
  }

  // Every `every` moves, drop one `kind` cell on an empty spot.
  const dropEvery = (every, kind) => (state, api) => {
    if (state.moves % every) return [];
    const i = api.pick(state, api.emptyCells(state));
    return i >= 0 ? [api.addSpecial(state, i, kind)] : [];
  };

  const touches = (hit, kind) => hit.damaged.some((d) => d.kind === kind) || hit.cleared.some((d) => d.kind === kind);

  const WORLDS = {
    plain: {
      name: 'Plaine',
      plus: 'Plus de pièces sur les blocs',
      minus: 'Aucun : le monde pour apprendre',
      twist: { name: 'Taupe', text: "Une taupe sort de terre tous les 5 coups et repart après 4. Attrape-la dans une ligne : elle lâche une pièce." },
      coinMul: 1.5,
    },
    sea: {
      name: 'Sous-marin',
      plus: 'Les bulles donnent un bonus quand elles éclatent',
      minus: 'Tous les 10 coups, le courant décale une ligne',
      twist: { name: 'Méduse', text: "Les méduses dérivent d'une case tous les 2 coups." },
      setup: scatter,
      free: { setup: { kind: 'bubble', count: 3 }, every: 6, kind: 'bubble', note: 'Partie sans fin : 3 bulles au départ, puis une nouvelle tous les 6 coups.' },
      afterMove(state, api) {
        if (state.moves % 10) return [];
        const rows = [];
        for (let r = 0; r < api.SIZE; r++) {
          const row = state.board.slice(r * api.SIZE, (r + 1) * api.SIZE);
          const boss = row.some((_, c) => api.isBoss(state, r * api.SIZE + c)); // the boss never drifts
          if (!boss && row.some((v) => v) && row.some((v) => !v)) rows.push(r);
        }
        const r = api.pick(state, rows);
        if (r < 0) return [];
        api.shiftRow(state, r);
        return [{ row: r, kind: 'current' }];
      },
    },
    space: {
      name: 'Espace',
      plus: "L'Étoile tombe deux fois plus souvent",
      minus: 'Tous les 7 coups, un astéroïde (2 coups pour le casser) tombe sur la grille',
      twist: { name: 'Trou noir', text: "Aucune ligne ne se complète à travers un trou noir. Il se referme après 8 coups." },
      bonusWeights: { nitro: 2 },
      setup: scatter,
      free: { setup: { kind: 'asteroid', count: 2 }, note: 'Partie sans fin : 2 astéroïdes au départ, puis un tous les 7 coups.' },
      afterMove: dropEvery(7, 'asteroid'),
    },
    ice: {
      name: 'Glace',
      plus: 'Une ligne qui touche de la glace rapporte double',
      minus: 'La glace se casse en 2 fois',
      twist: { name: 'Bonhomme de neige', text: "Il faut 3 lignes pour faire fondre un bonhomme de neige." },
      setup: scatter,
      free: { setup: { kind: 'ice', count: 6 }, every: 8, kind: 'ice', note: 'Partie sans fin : 6 blocs de glace au départ, puis un nouveau tous les 8 coups.' },
      lineMul: (hit) => (touches(hit, 'ice') ? 2 : 1),
    },
    forest: {
      name: 'Forêt',
      plus: 'Tous les 4 coups, une luciole dépose une pièce sur un bloc',
      minus: 'Tous les 8 coups, un champignon pousse sur une case vide',
      twist: { name: 'Liane', text: "Tous les 4 coups, une liane pousse sur une case voisine." },
      setup: scatter,
      free: { setup: { kind: 'mushroom', count: 2 }, note: 'Partie sans fin : 2 champignons au départ, puis un tous les 8 coups.' },
      afterMove(state, api) {
        const out = [];
        if (state.moves % 4 === 0) {
          const free = api.plainCells(state).filter((i) => !state.bonus[i]);
          const i = api.pick(state, free);
          if (i >= 0) {
            state.bonus[i] = 'coin';
            out.push({ r: Math.floor(i / api.SIZE), c: i % api.SIZE, kind: 'firefly' });
          }
        }
        return out.concat(dropEvery(8, 'mushroom')(state, api));
      },
    },
    retro: {
      name: 'Rétro',
      plus: 'Gravité : les blocs tombent et les lignes s’enchaînent en réaction',
      minus: 'Écran 4 tons : les couleurs se ressemblent',
      twist: { name: 'Bug', text: "Les bugs se téléportent ailleurs tous les 3 coups." },
      gravity: true,
    },
    arcade: {
      name: 'Arcade',
      plus: 'Tous les points ×1,5',
      minus: 'Chrono permanent (les lignes rajoutent 3 s)',
      twist: { name: 'Jeton', text: "Un jeton se casse en 2 lignes et rend 4 secondes." },
      scoreMul: 1.5,
      free: { clock: 60000, note: 'Partie sans fin : 60 s au départ, chaque ligne rajoute 3 s.' },
    },
    volcano: {
      name: 'Volcan',
      plus: 'Une braise effacée explose en croix (ligne + colonne)',
      minus: 'Tous les 6 coups, une braise tombe ; pas effacée en 8 coups, elle durcit en roche',
      twist: { name: 'Lave', text: "La lave tombe en haut de la grille et coule vers le bas." },
      setup: scatter,
      free: { setup: { kind: 'ember', count: 1 }, note: 'Partie sans fin : une braise au départ, puis une tous les 6 coups.' },
      afterMove: dropEvery(6, 'ember'),
    },
  };

  // Not on the map: the October event's levels (levels.js eventLevel).
  WORLDS.halloween = {
    name: 'Halloween',
    plus: 'Une citrouille cassée lâche un sac de 5 pièces',
    minus: 'Tous les 6 coups, un fantôme apparaît ; il change de case tous les 2 coups',
    setup: scatter,
    afterMove: dropEvery(6, 'ghost'),
  };

  // Map order: the Aventure path and the Boutique theme order.
  const ORDER = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];

  L.defineWorlds(WORLDS);
  return { WORLDS, ORDER };
});
