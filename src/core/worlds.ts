/*
 * Cubo Blocks — Aventure world rules. Pure, no DOM. Registers itself into logic.js (defineWorlds),
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
import * as L from './logic';
import * as I18N from './i18n';
import type { Hit, WorldApi, WorldEvent, WorldRules } from './logic';
import type { Obstacle, RunState, SpawnSetup } from './types';

const tr = I18N.tr;

// Scatters setup.count cells of setup.kind on empty cells (setup from the stage).
function scatter(state: RunState, api: WorldApi) {
  const setup = state.stage && state.stage.setup;
  if (!setup) return;
  for (let k = 0; k < setup.count; k++) {
    const i = api.pick(state, api.emptyCells(state));
    if (i >= 0) api.addSpecial(state, i, setup.kind);
  }
}

// Every `every` moves, drop one `kind` cell on an empty spot.
const dropEvery = (every: number, kind: string) => (state: RunState, api: WorldApi): WorldEvent[] => {
  if (state.moves % every) return [];
  const i = api.pick(state, api.emptyCells(state));
  return i >= 0 ? [api.addSpecial(state, i, kind)] : [];
};

const touches = (hit: Hit, kind: string) => hit.damaged.some((d) => d.kind === kind) || hit.cleared.some((d) => d.kind === kind);

// A world: its rules (logic.ts WorldRules) and the texts of the map and world screens.
export interface WorldDef extends WorldRules { name: string; plus: string; minus: string }
const WORLDS: Record<string, WorldDef> = {
  plain: {
    name: tr('Plaine'),
    plus: tr('Plus de pièces sur les blocs'),
    minus: tr('Aucun : le monde pour apprendre'),
    twist: { name: tr('Taupe'), text: tr("Une taupe sort de terre tous les 5 coups et repart après 4. Attrape-la dans une ligne : elle lâche une pièce.") },
    coinMul: 1.5,
  },
  sea: {
    name: tr('Sous-marin'),
    plus: tr('Les bulles donnent un bonus quand elles éclatent'),
    minus: tr('Tous les 10 coups, le courant décale une ligne'),
    twist: { name: tr('Méduse'), text: tr("Les méduses dérivent d'une case tous les 2 coups.") },
    setup: scatter,
    free: { setup: { kind: 'bubble', count: 3 }, every: 6, kind: 'bubble', note: tr('Partie sans fin : 3 bulles au départ, puis une nouvelle tous les 6 coups.') },
    afterMove(state, api) {
      if (state.moves % 10) return [];
      const rows: number[] = [];
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
    name: tr('Espace'),
    plus: tr("L'Étoile tombe deux fois plus souvent"),
    minus: tr('Tous les 7 coups, un astéroïde (2 coups pour le casser) tombe sur la grille'),
    twist: { name: tr('Trou noir'), text: tr("Aucune ligne ne se complète à travers un trou noir. Il se referme après 8 coups.") },
    bonusWeights: { nitro: 2 },
    setup: scatter,
    free: { setup: { kind: 'asteroid', count: 2 }, note: tr('Partie sans fin : 2 astéroïdes au départ, puis un tous les 7 coups.') },
    afterMove: dropEvery(7, 'asteroid'),
  },
  ice: {
    name: tr('Glace'),
    plus: tr('Une ligne qui touche de la glace rapporte double'),
    minus: tr('La glace se casse en 2 fois'),
    twist: { name: tr('Bonhomme de neige'), text: tr("Il faut 3 lignes pour faire fondre un bonhomme de neige.") },
    setup: scatter,
    free: { setup: { kind: 'ice', count: 6 }, every: 8, kind: 'ice', note: tr('Partie sans fin : 6 blocs de glace au départ, puis un nouveau tous les 8 coups.') },
    lineMul: (hit) => (touches(hit, 'ice') ? 2 : 1),
  },
  forest: {
    name: tr('Forêt'),
    plus: tr('Tous les 4 coups, une luciole dépose une pièce sur un bloc'),
    minus: tr('Tous les 8 coups, un champignon pousse sur une case vide'),
    twist: { name: tr('Liane'), text: tr("Tous les 4 coups, une liane pousse sur une case voisine.") },
    setup: scatter,
    free: { setup: { kind: 'mushroom', count: 2 }, note: tr('Partie sans fin : 2 champignons au départ, puis un tous les 8 coups.') },
    afterMove(state, api) {
      const out: WorldEvent[] = [];
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
    name: tr('Rétro'),
    plus: tr('Gravité : les blocs tombent et les lignes s’enchaînent en réaction'),
    minus: tr('Écran 4 tons : les couleurs se ressemblent'),
    twist: { name: tr('Bug'), text: tr("Les bugs se téléportent ailleurs tous les 3 coups.") },
    gravity: true,
  },
  arcade: {
    name: tr('Arcade'),
    plus: tr('Tous les points ×1,5'),
    minus: tr('Chrono permanent (les lignes rajoutent 3 s)'),
    twist: { name: tr('Jeton'), text: tr("Un jeton se casse en 2 lignes et rend 4 secondes.") },
    scoreMul: 1.5,
    free: { clock: 60000, note: tr('Partie sans fin : 60 s au départ, chaque ligne rajoute 3 s.') },
  },
  volcano: {
    name: tr('Volcan'),
    plus: tr('Une braise effacée explose en croix (ligne + colonne)'),
    minus: tr('Tous les 6 coups, une braise tombe ; pas effacée en 8 coups, elle durcit en roche'),
    twist: { name: tr('Lave'), text: tr("La lave tombe en haut de la grille et coule vers le bas.") },
    setup: scatter,
    free: { setup: { kind: 'ember', count: 1 }, note: tr('Partie sans fin : une braise au départ, puis une tous les 6 coups.') },
    afterMove: dropEvery(6, 'ember'),
  },
};

// Not on the map: the October event's levels (levels.js eventLevel).
WORLDS.halloween = {
  name: tr('Halloween'),
  plus: tr('Une citrouille cassée lâche un sac de 5 pièces'),
  minus: tr('Tous les 6 coups, un fantôme apparaît ; il change de case tous les 2 coups'),
  setup: scatter,
  afterMove: dropEvery(6, 'ghost'),
};

// Valentine: setup.count pairs of linked hearts (destroying one destroys its mate).
function pairs(state: RunState, api: WorldApi) {
  const setup = state.stage && state.stage.setup;
  if (!setup) return;
  for (let k = 0; k < setup.count; k++) {
    for (let m = 0; m < 2; m++) {
      const i = api.pick(state, api.emptyCells(state));
      if (i >= 0) api.addSpecial(state, i, 'heart', { link: k });
    }
  }
}

// Easter: setup.count bushes, setup.eggs of them hide an egg (nothing tells which).
function hideEggs(state: RunState, api: WorldApi) {
  const setup = state.stage && (state.stage.setup as SpawnSetup & { eggs: number });
  if (!setup) return;
  for (let k = 0; k < setup.count; k++) {
    const i = api.pick(state, api.emptyCells(state));
    if (i >= 0) api.addSpecial(state, i, 'bush', k < setup.eggs ? { egg: true } : undefined);
  }
}

// Beach: every 8 moves the sea floods the empty cells of the lowest row that has any (water
// leaves by itself, KINDS.water.ttl).
function tide(state: RunState, api: WorldApi): WorldEvent[] {
  if (state.moves % 8) return [];
  for (let r = api.SIZE - 1; r >= 0; r--) {
    const empty: number[] = [];
    for (let c = 0; c < api.SIZE; c++) if (!state.board[r * api.SIZE + c]) empty.push(r * api.SIZE + c);
    if (empty.length) return empty.map((i) => api.addSpecial(state, i, 'water'));
  }
  return [];
}

// Season events (levels.js EVENT_LEVELS), not on the map. One per season, each with its own cells.
Object.assign(WORLDS, <Record<string, WorldDef>>{
  newyear: {
    name: tr('Nouvel An'),
    plus: tr('Une fusée effacée explose en X sur ses diagonales'),
    minus: tr('Chrono : minuit approche (les lignes rajoutent 3 s)'),
    setup: scatter,
    afterMove: dropEvery(7, 'rocket'),
  },
  valentine: {
    name: tr('Saint-Valentin'),
    plus: tr('Les cœurs vont par deux : en casser un casse aussi son jumeau, où qu’il soit'),
    minus: tr('Tous les 6 coups, une rose épineuse pousse (2 lignes pour la couper)'),
    setup: pairs,
    afterMove: dropEvery(6, 'rose'),
  },
  easter: {
    name: tr('Pâques'),
    plus: tr('Certains buissons cachent un œuf : efface-les pour le trouver (+1 pièce)'),
    minus: tr('Tous les 6 coups, un buisson vide repousse'),
    setup: hideEggs,
    afterMove: dropEvery(6, 'bush'),
  },
  beach: {
    name: tr('Plage'),
    plus: tr('Un crabe attrapé lâche une pièce'),
    minus: tr('Marée : tous les 8 coups, la mer couvre la rangée vide la plus basse, puis se retire'),
    setup: scatter,
    afterMove: tide,
  },
  lunar: {
    name: tr('Nouvel An chinois'),
    plus: tr('Les lanternes montent d’une case à chaque coup ; attrapée, une lanterne lâche une pièce'),
    minus: tr('Tous les 6 coups, un pétard tombe ; pas effacé en 6 coups, il durcit en rocher'),
    setup: scatter,
    afterMove(state, api) {
      const out = dropEvery(6, 'firecracker')(state, api);
      // A new lantern takes off from the bottom row every 4 moves.
      if (state.moves % 4 === 0) {
        const bottom = api.emptyCells(state).filter((i) => i >= api.SIZE * (api.SIZE - 1));
        const i = api.pick(state, bottom);
        if (i >= 0) out.push(api.addSpecial(state, i, 'lantern'));
      }
      return out;
    },
  },
  xmas: {
    name: tr('Noël'),
    plus: tr('Un cadeau ouvert (2 lignes) donne un bonus au hasard'),
    minus: tr('Tous les 5 coups, un tas de neige tombe sur la grille'),
    setup: scatter,
    afterMove: dropEvery(5, 'snowpile'),
  },
});

// Free play (Classique, Chrono, Chill): Normal drops one obstacle, Difficile two, like Aventure
// levels 1-10 and 11-19. Obstacles come from the equipped theme's world (its cell, then its
// level 11-19 twist); themes without one (Jouet, season themes) use Plaine's.
const FREE_OBSTACLES: Record<string, string[]> = {
  plain: ['crate', 'mole'], sea: ['bubble', 'jelly'], space: ['asteroid', 'hole'], ice: ['ice', 'snowman'],
  forest: ['mushroom', 'vine'], retro: ['crate', 'glitch'], arcade: ['crate', 'token'], volcano: ['ember', 'lava'],
};
const FREE_EVERY: Record<string, number[]> = { normal: [8], hard: [7, 10] };
// [{ kind, every, top? }] for logic.createGame({ obstacles }); empty on Facile.
function freeObstacles(theme: string, level: string): Obstacle[] {
  const kinds = FREE_OBSTACLES[theme] || FREE_OBSTACLES.plain;
  return (FREE_EVERY[level] || []).map((every, k) => ({ kind: kinds[k], every, ...(kinds[k] === 'lava' ? { top: true } : {}) }));
}

// Map order: the Aventure path and the Boutique theme order.
const ORDER: string[] = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];

L.defineWorlds(WORLDS);
export { WORLDS, ORDER, FREE_OBSTACLES, freeObstacles };
