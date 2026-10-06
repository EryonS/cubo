/*
 * Cubo Blocks — meta progression: coins, missions, skin shop. Pure, no DOM.
 * A profile is a plain JSON object; every function returns a new one.
 */
import * as I18N from './i18n';
import type { RunStats } from './logic';
import type { BonusType, DailyDay, Lifetime, Mission, ModeStats, Profile, SeasonProgress, SkinKind, Streak } from './types';

export interface Skin { id: string; name: string; price: number | null; exclusive?: string }
// A line of coins on a result screen.
export interface Earned { label: string; coins: number }
export interface MissionView extends Mission { text: string; current: number; before: boolean }
// Run stats as missions read them (games: 1 added when a run closes).
type MissionStats = Partial<RunStats> & { games?: number; score?: number };

const tr = I18N.tr;

const DAILY_MISSIONS = 3;

// price 0 = owned from the start. Visuals live in the renderer, keyed by id.
// 'boards' are whole themes (background, board, score plate, menus); the key stays for old saves.
// Theme order follows the Aventure world order (Plaine first, Volcan last).
const SKINS: Record<SkinKind, Skin[]> = {
  blocks: [
    { id: 'classic', name: tr('Classique'), price: 0 },
    { id: 'neon', name: tr('Néon'), price: 200 },
    { id: 'pixel', name: tr('Pixel'), price: 600 },
    // Not sold: the 30-day streak reward.
    { id: 'gold', name: tr('Or'), price: null, exclusive: tr('Série de 30 jours') },
  ],
  boards: [
    { id: 'toy', name: tr('Jouet'), price: 0 },
    { id: 'plain', name: tr('Plaine'), price: 150 },
    { id: 'sea', name: tr('Sous-marin'), price: 300 },
    { id: 'space', name: tr('Espace'), price: 450 },
    { id: 'ice', name: tr('Glace'), price: 600 },
    { id: 'forest', name: tr('Forêt'), price: 800 },
    { id: 'retro', name: tr('Rétro'), price: 1000 },
    { id: 'arcade', name: tr('Arcade'), price: 1200 },
    { id: 'volcano', name: tr('Volcan'), price: 1500 },
    // Not sold: season event rewards (EVENTS).
    { id: 'newyear', name: tr('Nouvel An'), price: null, exclusive: tr('Nouvel An') },
    { id: 'lunar', name: tr('Nouvel An chinois'), price: null, exclusive: tr('Nouvel An chinois') },
    { id: 'valentine', name: tr('Saint-Valentin'), price: null, exclusive: tr('Saint-Valentin') },
    { id: 'easter', name: tr('Pâques'), price: null, exclusive: tr('Pâques') },
    { id: 'beach', name: tr('Plage'), price: null, exclusive: tr('Plage') },
    { id: 'halloween', name: tr('Halloween'), price: null, exclusive: tr('Halloween') },
    { id: 'xmas', name: tr('Noël'), price: null, exclusive: tr('Noël') },
  ],
  // Cubo's wardrobe: a head piece worn in every theme. 'auto' keeps the theme's own (sprout,
  // starfish, helmet...). Drawn in the renderer (drawCuboHat), keyed by id.
  cubo: [
    { id: 'auto', name: tr('Selon le thème'), price: 0 },
    { id: 'bow', name: tr('Nœud'), price: 120 },
    { id: 'cap', name: tr('Casquette'), price: 150 },
    { id: 'party', name: tr('Chapeau de fête'), price: 200 },
    { id: 'glasses', name: tr('Lunettes'), price: 250 },
    { id: 'tophat', name: tr('Haut-de-forme'), price: 350 },
    { id: 'crown', name: tr('Couronne'), price: 500 },
    // Not sold: season event rewards (EVENTS).
    { id: 'sequin', name: tr('Chapeau pailleté'), price: null, exclusive: tr('Nouvel An') },
    { id: 'dragon', name: tr('Cornes de dragon'), price: null, exclusive: tr('Nouvel An chinois') },
    { id: 'hearts', name: tr('Serre-tête cœurs'), price: null, exclusive: tr('Saint-Valentin') },
    { id: 'bunny', name: tr('Oreilles de lapin'), price: null, exclusive: tr('Pâques') },
    { id: 'straw', name: tr('Chapeau de paille'), price: null, exclusive: tr('Plage') },
    { id: 'witch', name: tr('Chapeau de sorcière'), price: null, exclusive: tr('Halloween') },
    { id: 'santa', name: tr('Bonnet de Noël'), price: null, exclusive: tr('Noël') },
  ],
};

// Skins removed from the catalog, refunded at their old price (road themes, 'candy' blocks).
const RETIRED: Record<string, Record<string, number>> = {
  blocks: { candy: 400 },
  boards: { night: 0, sunset: 300, desert: 500, mountain: 800, dash: 1200 },
};
const PROFILE_VERSION = 6;

// stat: key in the run stats. mode 'best' = within one game, 'total' = accumulates across games.
// tiers: [target, reward], harder tiers unlock as more missions get completed.
const MISSIONS: { key: string; stat: string; mode: 'total' | 'best'; text: (n: number) => string; tiers: [number, number][] }[] = [
  { key: 'lines', stat: 'lines', mode: 'total', text: (n) => tr`Efface ${n} lignes`, tiers: [[20, 20], [40, 30], [80, 50]] },
  { key: 'combo', stat: 'bestCombo', mode: 'best', text: (n) => tr`Atteins un combo ×${n}`, tiers: [[3, 20], [4, 30], [6, 50]] },
  { key: 'multi', stat: 'bestMulti', mode: 'best', text: (n) => tr`Efface ${n} lignes d'un coup`, tiers: [[2, 20], [3, 35], [4, 60]] },
  { key: 'score', stat: 'score', mode: 'best', text: (n) => tr`Fais ${n.toLocaleString(I18N.locale())} points en une partie`, tiers: [[1000, 20], [2500, 35], [5000, 60]] },
  { key: 'bonus', stat: 'bonusUsed', mode: 'total', text: (n) => tr`Utilise ${n} bonus`, tiers: [[3, 20], [6, 30], [12, 50]] },
  { key: 'bomb', stat: 'bombCells', mode: 'total', text: (n) => tr`Fais sauter ${n} blocs à la bombe`, tiers: [[20, 20], [45, 35], [90, 50]] },
  { key: 'perfect', stat: 'perfects', mode: 'total', text: () => tr('Vide toute la grille'), tiers: [[1, 40], [1, 40], [1, 50]] },
  { key: 'games', stat: 'games', mode: 'total', text: (n) => tr`Joue ${n} parties`, tiers: [[3, 20], [5, 30], [8, 40]] },
  { key: 'pieces', stat: 'pieces', mode: 'total', text: (n) => tr`Pose ${n} formes`, tiers: [[80, 20], [150, 30], [300, 50]] },
];
const TEMPLATE = Object.fromEntries(MISSIONS.map((m) => [m.key, m]));

// Deterministic RNG from a string (the day), so a given day always offers the same missions.
function dayRandom(day: string) {
  let seed = 2166136261;
  for (const ch of day) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  return () => {
    let t = (seed = (seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three distinct missions for `day`; difficulty grows with missions completed so far.
function dailyMissions(day: string, missionsDone: number): Mission[] {
  const rnd = dayRandom(day);
  const pool = MISSIONS.slice();
  const tier = Math.floor(missionsDone / 6);
  const out: Mission[] = [];
  for (let i = 0; i < DAILY_MISSIONS; i++) {
    const tpl = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const [target, reward] = tpl.tiers[Math.min(tpl.tiers.length - 1, tier)];
    out.push({ id: `${day}-${i}`, key: tpl.key, target, reward, progress: 0, done: false });
  }
  return out;
}

// Rolls the missions over when the day changed. `day` is a local 'YYYY-MM-DD' string.
function ensureDay(prev: Profile, day: string): Profile {
  if (prev.day === day) return prev;
  return { ...prev, day, missions: dailyMissions(day, prev.missionsDone || 0) };
}

function createProfile(day: string): Profile {
  return ensureDay({
    version: PROFILE_VERSION,
    coins: 0,
    owned: { blocks: ['classic'], boards: ['toy'], cubo: ['auto'] },
    equipped: { blocks: 'classic', boards: 'toy', cubo: 'auto' },
    day: null,
    missions: [],
    missionsDone: 0,
    games: 0,
  }, day);
}

// Brings an old save up to date. Returns { profile, refund }.
// v2: retired skins leave the inventory and are refunded, anything equipped that no longer exists
// falls back to the free skin. v3 (Aventure v2, 20 levels a world): worlds open under the v1 rule
// (boss at level 10, 18 stars a world) are recorded in adventure.opened so none closes again.
// v5 (2026-10-01): Cubo's wardrobe, owned.cubo / equipped.cubo.
// v6 (2026-10-01): season events; Halloween progress moves from profile.halloween to seasons.halloween.
function migrate(prev: Profile): { profile: Profile; refund: number } {
  const version = prev.version || 1;
  if (version >= PROFILE_VERSION) return { profile: prev, refund: 0 };
  const skins = version < 2 ? migrateSkins(prev) : { profile: prev, refund: 0 };
  const adventure = version < 3 ? migrateAdventure(skins.profile) : skins.profile;
  const dailies = version < 4 ? refundDailyAttempts(adventure) : adventure;
  const wardrobe = version < 5 ? addWardrobe(dailies) : dailies;
  return { profile: { ...moveHalloween(wardrobe), version: PROFILE_VERSION }, refund: skins.refund };
}

function moveHalloween(prev: Profile): Profile {
  if (!prev.halloween) return prev;
  const { halloween, ...rest } = prev;
  return { ...rest, seasons: { ...(prev.seasons || {}), halloween } };
}

function addWardrobe(prev: Profile) {
  const owned = prev.owned.cubo || ['auto'];
  return { ...prev, owned: { ...prev.owned, cubo: owned }, equipped: { ...prev.equipped, cubo: prev.equipped.cubo || 'auto' } };
}

// Version 4 (2026-10-01): daily attempts now count when a run ends, not when it starts. Attempts
// spent under the old rule on days not won yet are given back (some were lost to a screen bug).
function refundDailyAttempts(prev: Profile) {
  if (!prev.daily) return prev;
  const daily: Record<string, DailyDay> = {};
  for (const [day, d] of Object.entries(prev.daily)) daily[day] = d.stars === undefined ? { ...d, attempts: 0 } : d;
  return { ...prev, daily };
}

function migrateAdventure(prev: Profile) {
  const stars = starsOf(prev);
  const total = totalStars(prev);
  const opened = WORLD_ORDER.filter((w, i) => i > 0 && stars[levelKey(WORLD_ORDER[i - 1], 10)] !== undefined && total >= 18 * i);
  if (!opened.length) return prev;
  return { ...prev, adventure: { ...(prev.adventure || {}), opened } };
}

function migrateSkins(prev: Profile) {
  let refund = 0;
  const owned = {} as Profile['owned'];
  const equipped = { ...prev.equipped };
  for (const kind of Object.keys(SKINS) as SkinKind[]) {
    const list = (prev.owned && prev.owned[kind]) || [];
    for (const id of list) refund += (RETIRED[kind] && RETIRED[kind][id]) || 0;
    owned[kind] = SKINS[kind].filter((s) => s.price === 0 || list.includes(s.id)).map((s) => s.id);
    if (!findSkin(kind, equipped[kind])) equipped[kind] = SKINS[kind][0].id;
  }
  return { profile: { ...prev, coins: (prev.coins || 0) + refund, owned, equipped }, refund };
}

const missionText = (m: Mission) => TEMPLATE[m.key].text(m.target);

// Where each mission stands if the current run ended now.
function missionStatus(profile: Profile, run: MissionStats): MissionView[] {
  return profile.missions.map((m) => {
    const text = missionText(m);
    if (m.done) return { ...m, text, current: m.target, done: true, before: true };
    const tpl = TEMPLATE[m.key];
    const value = (run as Record<string, number>)[tpl.stat] || 0;
    const current = tpl.mode === 'total' ? m.progress + value : Math.max(m.progress, value);
    return { ...m, text, current: Math.min(current, m.target), done: current >= m.target, before: false };
  });
}

// Free play difficulty bonus on the run's coins, by number of obstacle kinds (Normal 1, Difficile 2).
const DIFFICULTY_BONUS = [0, 0.2, 0.5];
const DIFFICULTY_NAMES = [tr('Facile'), tr('Normal'), tr('Difficile')];

// Coins earned by a run, as display lines.
function runCoins(run: MissionStats): Earned[] {
  const lines: Earned[] = [];
  if (run.coins) lines.push({ label: tr('Pièces ramassées'), coins: run.coins });
  const prime = worldPrime(run.world!, run.score);
  if (prime) lines.push({ label: tr('Prime ') + WORLD_NAMES[run.world!], coins: prime });
  if (run.perfects) lines.push({ label: tr`Grille vide ×${run.perfects}`, coins: run.perfects * 10 });
  if ((run.bestCombo || 0) >= 5) lines.push({ label: tr`Combo ×${run.bestCombo}`, coins: 5 });
  if ((run.bestBomb || 0) >= 15) lines.push({ label: tr('Méga explosion'), coins: 5 });
  const n = Math.min(2, run.obstacles || 0);
  const bonus = Math.round(lines.reduce((a, l) => a + l.coins, 0) * DIFFICULTY_BONUS[n]);
  if (bonus) lines.push({ label: tr`Bonus ${DIFFICULTY_NAMES[n]} +${Math.round(DIFFICULTY_BONUS[n] * 100)} %`, coins: bonus });
  return lines;
}

// Close a run: pay coins and advance today's missions (finished ones stay done until tomorrow).
function applyRun(prev: Profile, run: MissionStats) {
  const stats = { ...run, games: 1 };
  const earned = runCoins(stats);
  const completed: MissionView[] = [];
  const p: Profile = { ...prev, owned: { ...prev.owned }, equipped: { ...prev.equipped } };

  p.missions = missionStatus(prev, stats).map((m) => {
    if (m.done && !m.before) {
      completed.push(m);
      earned.push({ label: tr('Mission : ') + m.text, coins: m.reward });
      p.missionsDone += 1;
    }
    return { id: m.id, key: m.key, target: m.target, reward: m.reward, progress: m.current, done: m.done };
  });

  const total = earned.reduce((s, l) => s + l.coins, 0);
  p.coins += total;
  p.games += 1;
  p.lifetime = addLifetime(prev.lifetime, stats, total);
  if (run.mode) {
    p.modes = addModeRun(prev.modes, run as MissionStats & { mode: string });
    p.history = [...(prev.history || []), { m: run.mode, s: run.score || 0 }].slice(-HISTORY);
  }
  return { profile: p, report: { earned, total, completed, coinsBefore: prev.coins } };
}

// ---------- per-mode stats ----------
// profile.modes: { [mode]: { games, total, best, bestCombo, lines } } since 2026-10-01.
// profile.history: the last HISTORY runs, oldest first, as { m: mode, s: score }.
// mode is classic, chrono, chill or adventure (levels and dailies). Old profiles may hold 'event' runs.
const HISTORY = 60;
function addModeRun(prev: Profile['modes'], run: MissionStats & { mode: string }) {
  const m: ModeStats = { games: 0, total: 0, best: 0, bestCombo: 0, lines: 0, ...((prev || {})[run.mode] || {}) };
  m.games += 1;
  m.total += run.score || 0;
  m.best = Math.max(m.best, run.score || 0);
  m.bestCombo = Math.max(m.bestCombo, run.bestCombo || 0);
  m.lines += run.lines || 0;
  return { ...(prev || {}), [run.mode]: m };
}
const modeStats = (profile: Profile, mode: string): ModeStats => ({ games: 0, total: 0, best: 0, bestCombo: 0, lines: 0, ...((profile.modes || {})[mode] || {}) });
// Scores of the last `n` runs of a mode, oldest first.
const recentScores = (profile: Profile, mode: string, n: number) => (profile.history || []).filter((h) => h.m === mode).slice(-n).map((h) => h.s);

// ---------- Aventure ----------
// profile.adventure.stars: { "<world>-<n>": 0..3 }. A key present = level cleared (0 = skipped).
// A world opens when the previous boss is cleared and enough stars are collected overall
// (adventure.opened: worlds opened before v2, see migrate). Beating a world's boss gives its theme
// for free (it is also sold in the Boutique). adventure.chests: { "<world>-<i>": true } opened star
// chests; adventure.bombs: free starting Bombes won in chests.
const WORLD_ORDER: string[] = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];
const WORLD_NAMES: Record<string, string> = { plain: tr('Plaine'), sea: tr('Sous-marin'), space: tr('Espace'), ice: tr('Glace'), forest: tr('Forêt'), retro: tr('Rétro'), arcade: tr('Arcade'), volcano: tr('Volcan') };
const LEVELS_PER_WORLD = 20;
const TRIAL_LEVEL = 10;
const STARS_PER_GATE = 36; // world k needs 36 x k stars (60% of a world's 60)
const FIRST_CLEAR = 10;
const TRIAL_CLEAR = 25;
const BOSS_CLEAR = 60;
const PER_NEW_STAR = 5;
const EXTRA_MOVES = 5;
const START_BONUS_COST = 30;
const SKIP_COST = 250;
const extraMovesCost = (times: number) => 20 * 2 ** times; // 20, 40, 80... within one attempt
// Star chests on each world screen, opened once.
const CHESTS: { stars: number; coins?: number; bombs?: number }[] = [
  { stars: 15, coins: 40 },
  { stars: 35, bombs: 2 },
  { stars: 55, coins: 150 },
];

const levelKey = (world: string, n: number) => `${world}-${n}`;
const adventureOf = (profile: Profile) => profile.adventure || {};
const starsOf = (profile: Profile): Record<string, number> => adventureOf(profile).stars || {};
const levelStars = (profile: Profile, world: string, n: number) => starsOf(profile)[levelKey(world, n)];
const levelCleared = (profile: Profile, world: string, n: number) => levelStars(profile, world, n) !== undefined;
const totalStars = (profile: Profile) => Object.values(starsOf(profile)).reduce((a, b) => a + b, 0);
const worldStars = (profile: Profile, world: string) => {
  let n = 0;
  for (let i = 1; i <= LEVELS_PER_WORLD; i++) n += levelStars(profile, world, i) || 0;
  return n;
};
// Every level of the world with 3 stars (sticker "<world> maîtrisé", gold mark on the world strip).
const worldMastered = (profile: Profile, world: string) => worldStars(profile, world) >= LEVELS_PER_WORLD * 3;
const worldGate = (world: string) => WORLD_ORDER.indexOf(world) * STARS_PER_GATE;
const bossBeaten = (profile: Profile, world: string) => levelCleared(profile, world, LEVELS_PER_WORLD);

function worldOpen(profile: Profile, world: string) {
  const w = WORLD_ORDER.indexOf(world);
  if (w <= 0) return w === 0;
  if ((adventureOf(profile).opened || []).includes(world)) return true;
  return bossBeaten(profile, WORLD_ORDER[w - 1]) && totalStars(profile) >= worldGate(world);
}
const levelOpen = (profile: Profile, world: string, n: number) => worldOpen(profile, world) && (n === 1 || levelCleared(profile, world, n - 1));

// Records a finished level. Returns { profile, report: { earned, total, themeUnlocked } }.
function applyLevel(prev: Profile, world: string, n: number, stars: number) {
  const key = levelKey(world, n);
  const before = starsOf(prev)[key];
  const earned: Earned[] = [];
  if (before === undefined) {
    if (n === LEVELS_PER_WORLD) earned.push({ label: tr('Boss vaincu'), coins: BOSS_CLEAR });
    else if (n === TRIAL_LEVEL) earned.push({ label: tr('Épreuve réussie'), coins: TRIAL_CLEAR });
    else earned.push({ label: tr('Niveau réussi'), coins: FIRST_CLEAR });
  }
  const fresh = stars - (before || 0);
  if (fresh > 0) earned.push({ label: fresh > 1 ? tr`${fresh} nouvelles étoiles` : tr('Nouvelle étoile'), coins: fresh * PER_NEW_STAR });
  const total = earned.reduce((a, l) => a + l.coins, 0);
  const p = {
    ...earn(prev, total),
    adventure: { ...adventureOf(prev), stars: { ...starsOf(prev), [key]: Math.max(stars, before || 0) } },
  };
  let themeUnlocked: string | null = null;
  let result: Profile = p;
  const theme = n === LEVELS_PER_WORLD && before === undefined && findSkin('boards', world);
  if (theme && !prev.owned.boards.includes(world)) {
    result = { ...p, owned: { ...prev.owned, boards: [...prev.owned.boards, world] } };
    themeUnlocked = world;
  } else if (theme && theme.price) {
    // The theme was bought before the boss fell: the boss pays its price back instead.
    earned.push({ label: tr`Thème ${theme.name} déjà à toi`, coins: theme.price });
    result = earn(p, theme.price);
  }
  const sum = earned.reduce((a, l) => a + l.coins, 0);
  return { profile: result, report: { earned, total: sum, themeUnlocked } };
}

// Failed attempts per level (the level sheet offers a paid skip after SKIP_AFTER of them).
const SKIP_AFTER = 2;
const levelFails = (profile: Profile, world: string, n: number) => (adventureOf(profile).fails || {})[levelKey(world, n)] || 0;
function recordFail(prev: Profile, world: string, n: number) {
  const adv = adventureOf(prev);
  const key = levelKey(world, n);
  return { ...prev, adventure: { ...adv, fails: { ...(adv.fails || {}), [key]: levelFails(prev, world, n) + 1 } } };
}
const canSkip = (profile: Profile, world: string, n: number) =>
  n < LEVELS_PER_WORLD && !levelCleared(profile, world, n) && levelFails(profile, world, n) >= SKIP_AFTER;

// Pays to mark a (non-boss) level as passed with no star.
function skipLevel(prev: Profile, world: string, n: number) {
  if (n === LEVELS_PER_WORLD || levelCleared(prev, world, n) || !levelOpen(prev, world, n)) return null;
  const paid = spend(prev, SKIP_COST);
  if (!paid) return null;
  return { ...paid, adventure: { ...adventureOf(paid), stars: { ...starsOf(paid), [levelKey(world, n)]: 0 } } };
}

// Star chests: 'open' (taken), 'ready' (enough stars) or 'locked'.
const chestOpened = (profile: Profile, world: string, i: number) => !!(adventureOf(profile).chests || {})[levelKey(world, i)];
const chestState = (profile: Profile, world: string, i: number) =>
  chestOpened(profile, world, i) ? 'open' : worldStars(profile, world) >= CHESTS[i].stars ? 'ready' : 'locked';
// Returns { profile, reward } or null if the chest can't be opened.
function openChest(prev: Profile, world: string, i: number) {
  if (!CHESTS[i] || chestState(prev, world, i) !== 'ready') return null;
  const reward = CHESTS[i];
  const adv = adventureOf(prev);
  const p = earn(prev, reward.coins || 0);
  return {
    profile: { ...p, adventure: { ...adv, chests: { ...(adv.chests || {}), [levelKey(world, i)]: true }, bombs: (adv.bombs || 0) + (reward.bombs || 0) } },
    reward,
  };
}
const freeBombs = (profile: Profile) => adventureOf(profile).bombs || 0;
// ---------- Mondes (endless runs under one world's rules) ----------
// A world opens in the Mondes mode once its trial (Aventure level 10) is cleared. Runs pay a prime
// on the score, bigger in later worlds: 1 coin per 200 points in Plaine, up to x2.75 in Volcan.
const worldFreeOpen = (profile: Profile, world: string) => WORLD_ORDER.includes(world) && levelCleared(profile, world, TRIAL_LEVEL);
const worldPrimeRate = (world: string) => 1 + 0.25 * WORLD_ORDER.indexOf(world);
const worldPrime = (world: string, score?: number) => (WORLD_ORDER.includes(world) ? Math.floor(((score || 0) / 200) * worldPrimeRate(world)) : 0);

// ---------- Puzzles ----------
// profile.puzzles: { [n]: stars 1..3 }. Puzzles open one after the other. First solve pays
// PUZZLE_FIRST, each new star PER_NEW_STAR, a finished pack PUZZLE_PACK. Hints cost PUZZLE_HINT.
const PUZZLE_FIRST = 15;
const PUZZLE_PACK = 60;
const PUZZLE_HINT = 30;
const PUZZLES_PER_PACK = 10;
const puzzleStarsOf = (profile: Profile, n: number) => (profile.puzzles || {})[n];
const puzzleOpen = (profile: Profile, n: number) => n === 1 || puzzleStarsOf(profile, n - 1) !== undefined;
const puzzlesSolved = (profile: Profile) => Object.keys(profile.puzzles || {}).length;
const packDone = (profile: Profile, pack: number) => {
  for (let n = pack * PUZZLES_PER_PACK + 1; n <= (pack + 1) * PUZZLES_PER_PACK; n++) if (puzzleStarsOf(profile, n) === undefined) return false;
  return true;
};
// Records a solved puzzle. Returns { profile, report: { earned, total } }.
function applyPuzzle(prev: Profile, n: number, stars: number) {
  const before = puzzleStarsOf(prev, n);
  const earned: Earned[] = [];
  if (before === undefined) earned.push({ label: tr('Puzzle résolu'), coins: PUZZLE_FIRST });
  const fresh = stars - (before || 0);
  if (fresh > 0) earned.push({ label: fresh > 1 ? tr`${fresh} nouvelles étoiles` : tr('Nouvelle étoile'), coins: fresh * PER_NEW_STAR });
  let p: Profile = { ...prev, puzzles: { ...(prev.puzzles || {}), [n]: Math.max(stars, before || 0) } };
  const pack = Math.floor((n - 1) / PUZZLES_PER_PACK);
  if (before === undefined && packDone(p, pack)) earned.push({ label: tr('Pack terminé'), coins: PUZZLE_PACK });
  const total = earned.reduce((a, l) => a + l.coins, 0);
  p = earn(p, total);
  return { profile: p, report: { earned, total } };
}

// Puzzle surprise: opens once pack Maître (puzzles 31-40) is done. profile.surprises counts the ones
// solved (optional, absent = 0). Each pays SURPRISE_COINS, SURPRISE_HINTED when a hint was used.
const SURPRISE_PACK = 3;
const SURPRISE_COINS = 25;
const SURPRISE_HINTED = 10;
const surpriseOpen = (profile: Profile) => packDone(profile, SURPRISE_PACK);
const surprisesSolved = (profile: Profile) => profile.surprises || 0;
function applySurprise(prev: Profile, hints: number) {
  const earned = [{ label: tr('Puzzle surprise'), coins: hints ? SURPRISE_HINTED : SURPRISE_COINS }];
  const total = earned[0].coins;
  const p = earn({ ...prev, surprises: surprisesSolved(prev) + 1 }, total);
  return { profile: p, report: { earned, total } };
}

// ---------- bonus upgrades ----------
// profile.upgrades: { [bonus]: 2 | 3 } (absent = level 1). UPGRADE_PRICES[bonus][k] buys level k + 2.
const UPGRADE_PRICES: Record<BonusType, number[]> = {
  rotate: [200, 500],
  nitro: [250, 600],
  shield: [200, 500],
  bomb: [300, 700],
  reroll: [200, 500],
};
const upgradeLevel = (profile: Profile, type: BonusType) => (profile.upgrades && profile.upgrades[type]) || 1;
// Price of the next level, or null at the top.
const upgradePrice = (profile: Profile, type: BonusType) => (UPGRADE_PRICES[type] ? UPGRADE_PRICES[type][upgradeLevel(profile, type) - 1] ?? null : null);
function buyUpgrade(prev: Profile, type: BonusType) {
  const price = upgradePrice(prev, type);
  if (price == null) return null;
  const paid = spend(prev, price);
  return paid && { ...paid, upgrades: { ...(prev.upgrades || {}), [type]: upgradeLevel(prev, type) + 1 } };
}

// Uses a free starting Bombe won in a chest. Returns the profile or null.
function useFreeBomb(prev: Profile) {
  const n = freeBombs(prev);
  return n > 0 ? { ...prev, adventure: { ...adventureOf(prev), bombs: n - 1 } } : null;
}


// ---------- season events ----------
// One event per season, each open on its months (local dates), 10 levels in its own world.
// Progress belongs to one year: profile.seasons[id] = { year, stars: { [n]: 0..3 } }, left behind
// when the event comes back the next year. Clearing the 10 levels gives the event's theme and
// Cubo head piece the first time (coins once both are owned) and the year's trophy: silver, gold
// with every star. profile.trophies: { '<id>-<year>': 'silver' | 'gold' }.
// window(year) -> ['YYYY-MM-DD' first day, last day] or null. Several events can overlap (the
// Chinese New Year falls in January or February): each gets its own home row.
const months = (first: string, last = first) => (y: number) => [`${y}-${first}-01`, monthDays(`${y}-${last}`).slice(-1)[0]];
// Easter Sunday (Gregorian, anonymous algorithm), as 'YYYY-MM-DD'.
function easterSunday(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
// Chinese New Year (lunisolar, no simple formula): first day of the year, by Gregorian year.
const LUNAR_NEW_YEAR: Record<number, string> = {
  2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03',
  2031: '2031-01-23', 2032: '2032-02-11', 2033: '2033-01-31', 2034: '2034-02-19', 2035: '2035-02-08',
  2036: '2036-01-28', 2037: '2037-02-15', 2038: '2038-02-04', 2039: '2039-01-24', 2040: '2040-02-12',
};
export interface EventDef { id: string; name: string; window: (y: number) => string[] | null; hat: string; icon: string; blurb: string; theme: string; levels: number }
const EVENTS: EventDef[] = ([
  { id: 'newyear', name: tr('Nouvel An'), window: months('01'), hat: 'sequin', icon: 'rocket', blurb: tr('une nuit de fusées contre la montre') },
  // From 3 days before the new year to the Lantern Festival (day 15).
  { id: 'lunar', name: tr('Nouvel An chinois'), window: (y: number) => (LUNAR_NEW_YEAR[y] ? [addDays(LUNAR_NEW_YEAR[y], -3), addDays(LUNAR_NEW_YEAR[y], 14)] : null),
    hat: 'dragon', icon: 'lantern', blurb: tr('des lanternes qui s’envolent et des pétards') },
  { id: 'valentine', name: tr('Saint-Valentin'), window: months('02'), hat: 'hearts', icon: 'heart', blurb: tr('des cœurs jumeaux et des roses épineuses') },
  // Two weeks before Easter Sunday to the Sunday after.
  { id: 'easter', name: tr('Pâques'), window: (y: number) => [addDays(easterSunday(y), -14), addDays(easterSunday(y), 7)], hat: 'bunny', icon: 'egg', blurb: tr('une chasse aux œufs dans les buissons') },
  { id: 'beach', name: tr('Plage'), window: months('07', '08'), hat: 'straw', icon: 'crab', blurb: tr('des crabes et la marée qui monte') },
  { id: 'halloween', name: tr('Halloween'), window: months('10'), hat: 'witch', icon: 'pumpkin', blurb: tr('des citrouilles et des fantômes') },
  { id: 'xmas', name: tr('Noël'), window: months('12'), hat: 'santa', icon: 'present', blurb: tr('des cadeaux sous la neige') },
] as Omit<EventDef, 'theme' | 'levels'>[]).map((e) => ({ ...e, theme: e.id, levels: 10 }));
const EVENT_FIRST = 15;
const EVENT_BOSS = 50;
const EVENT_DONE_COINS = 200; // the rewards are already owned (a later year)
const eventById = (id: string) => EVENTS.find((e) => e.id === id) || null;
const eventYear = (day: string) => day.slice(0, 4);
const windowOf = (ev: EventDef, day: string) => ev.window(+eventYear(day));
// The events open on `day` (usually none or one), and the first of them.
const eventsFor = (day: string) => EVENTS.filter((e) => { const w = windowOf(e, day); return !!w && day >= w[0] && day <= w[1]; });
const eventFor = (day: string) => eventsFor(day)[0] || null;
const eventActive = (day: string, id: string) => eventsFor(day).some((e) => !id || e.id === id);
// Last day the event is open this year, as 'YYYY-MM-DD'.
const eventEnd = (id: string, day: string) => windowOf(eventById(id)!, day)![1];
const eventOf = (profile: Profile, id: string, day: string): SeasonProgress => {
  const ev = (profile.seasons || {})[id];
  return ev && ev.year === eventYear(day) ? ev : { year: eventYear(day), stars: {} };
};
const eventStars = (profile: Profile, id: string, day: string, n: number) => eventOf(profile, id, day).stars[n];
const eventCleared = (profile: Profile, id: string, day: string) => Object.keys(eventOf(profile, id, day).stars).length;
const eventTotalStars = (profile: Profile, id: string, day: string) => Object.values(eventOf(profile, id, day).stars).reduce((a, b) => a + b, 0);
const eventLevelOpen = (profile: Profile, id: string, day: string, n: number) => eventActive(day, id) && n >= 1 && n <= eventById(id)!.levels
  && (n === 1 || eventStars(profile, id, day, n - 1) !== undefined);
const seasonTrophy = (profile: Profile, id: string, year: string | number) => (profile.trophies || {})[`${id}-${year}`] || null;
const eventRewardsOwned = (profile: Profile, ev: EventDef) => profile.owned.boards.includes(ev.theme) && (profile.owned.cubo || []).includes(ev.hat);

// Records a won event level. Returns { profile, report: { earned, total, unlocked: [{ kind, id }], trophy } }.
function applyEvent(prev: Profile, id: string, day: string, n: number, stars: number) {
  const evDef = eventById(id);
  if (!evDef || !eventLevelOpen(prev, id, day, n)) return { profile: prev, report: { earned: [], total: 0, unlocked: [], trophy: null } };
  const ev = eventOf(prev, id, day);
  const before = ev.stars[n];
  const earned: Earned[] = [];
  if (before === undefined) earned.push({ label: n === evDef.levels ? tr('Boss vaincu') : tr('Niveau réussi'), coins: n === evDef.levels ? EVENT_BOSS : EVENT_FIRST });
  const fresh = stars - (before || 0);
  if (fresh > 0) earned.push({ label: fresh > 1 ? tr`${fresh} nouvelles étoiles` : tr('Nouvelle étoile'), coins: fresh * PER_NEW_STAR });
  let p: Profile = { ...prev, seasons: { ...(prev.seasons || {}), [id]: { year: ev.year, stars: { ...ev.stars, [n]: Math.max(stars, before || 0) } } } };
  const unlocked: { kind: SkinKind; id: string }[] = [];
  const done = eventCleared(p, id, day) === evDef.levels;
  if (done && eventCleared(prev, id, day) < evDef.levels) {
    if (eventRewardsOwned(p, evDef)) earned.push({ label: tr('Récompense ') + evDef.name, coins: EVENT_DONE_COINS });
    const owned = { ...p.owned };
    for (const [kind, sid] of [['boards', evDef.theme], ['cubo', evDef.hat]] as [SkinKind, string][]) {
      if ((owned[kind] || []).includes(sid)) continue;
      owned[kind] = [...(owned[kind] || []), sid];
      unlocked.push({ kind, id: sid });
    }
    p = { ...p, owned };
  }
  let trophy: 'silver' | 'gold' | null = null;
  if (done) {
    const kind = eventTotalStars(p, id, day) === evDef.levels * 3 ? 'gold' : 'silver';
    const key = `${id}-${ev.year}`;
    const had = (p.trophies || {})[key];
    if (had !== kind && had !== 'gold') {
      p = { ...p, trophies: { ...(p.trophies || {}), [key]: kind } };
      trophy = kind;
    }
  }
  const total = earned.reduce((a, l) => a + l.coins, 0);
  return { profile: earn(p, total), report: { earned, total, unlocked, trophy } };
}

// ---------- dates ----------
// Days are local 'YYYY-MM-DD' strings; arithmetic goes through UTC so DST never shifts a day.
const dayMs = (day: string) => Date.parse(day + 'T00:00:00Z');
const addDays = (day: string, n: number) => new Date(dayMs(day) + n * 86400000).toISOString().slice(0, 10);
const dayDiff = (from: string, to: string) => Math.round((dayMs(to) - dayMs(from)) / 86400000);
const monthDays = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};

// ---------- lifetime stats ----------
const LIFETIME_SUM = ['lines', 'pieces', 'perfects', 'bonusUsed', 'bombCells', 'coins'];
const LIFETIME_MAX = ['bestCombo', 'bestMulti', 'score', 'bestBomb'];
function addLifetime(prev: Lifetime | undefined, run: MissionStats, coinsPaid: number): Lifetime {
  const lt = { games: 0, coinsEarned: 0, used: {}, ...(prev || {}) } as Record<string, number> & { games: number; coinsEarned: number; used: Partial<Record<BonusType, number>> };
  const r = run as Record<string, number>;
  lt.games += 1;
  lt.coinsEarned += coinsPaid || 0;
  for (const k of LIFETIME_SUM) lt[k] = (lt[k] || 0) + (r[k] || 0);
  for (const k of LIFETIME_MAX) lt[k] = Math.max(lt[k] || 0, r[k] || 0);
  // For secret stickers: most grids emptied in one run, best score with no undo and no discard.
  lt.bestPerfects = Math.max(lt.bestPerfects || 0, run.perfects || 0);
  if (!run.undos && !run.discards) lt.cleanScore = Math.max(lt.cleanScore || 0, run.score || 0);
  lt.used = { ...lt.used };
  for (const [k, n] of Object.entries(run.used || {}) as [BonusType, number][]) lt.used[k] = (lt.used[k] || 0) + n;
  return lt;
}
// Coins earned outside runs (levels, dailies, streak, stickers) also count toward the lifetime total.
const earn = (p: Profile, coins: number): Profile => ({ ...p, coins: p.coins + coins, lifetime: { ...(p.lifetime || {}), coinsEarned: ((p.lifetime && p.lifetime.coinsEarned) || 0) + coins } });

// ---------- daily level and streak ----------
// profile.daily: { [day]: { stars, attempts } }. Only today's level is limited (3 attempts) and
// only clearing it on the day feeds the streak; past days can be replayed freely for the calendar.
const DAILY_ATTEMPTS = 3;
const DAILY_FIRST = 20;
const DAILY_PAST = 10;
const FREEZE_COST = 100;
const FREEZE_MAX = 2;
const WEEK_CHEST = 50;
const STREAK_SKIN = { days: 30, kind: 'blocks' as SkinKind, id: 'gold' };
const dailyOf = (profile: Profile, day: string): DailyDay => (profile.daily && profile.daily[day]) || { attempts: 0 };
const streakOf = (profile: Profile): Streak => ({ count: 0, best: 0, lastDay: null, freezes: 0, ...(profile.streak || {}) });

function dailyAttemptsLeft(profile: Profile, day: string, today: string) {
  if (day > today) return 0;
  const d = dailyOf(profile, day);
  return day === today ? Math.max(0, DAILY_ATTEMPTS + (d.bonus || 0) - d.attempts) : Infinity;
}

// Out of attempts on today's level, not won yet: the streak can still be saved with more tries.
// A rewarded ad gives the 3 attempts back once a day; single attempts cost 30, 60, 120... coins.
// daily[day] gains bonus (attempts granted), paid (attempts bought) and ad (ad used).
const DAILY_TRY_COST = 30;
const canRefillDaily = (profile: Profile, day: string, today: string) =>
  day === today && dailyOf(profile, day).stars === undefined && dailyAttemptsLeft(profile, day, today) === 0;
const dailyTryCost = (profile: Profile, day: string) => DAILY_TRY_COST * 2 ** (dailyOf(profile, day).paid || 0);
const dailyAdReady = (profile: Profile, day: string, today: string) => canRefillDaily(profile, day, today) && !dailyOf(profile, day).ad;
function buyDailyTry(prev: Profile, day: string, today: string) {
  const cost = dailyTryCost(prev, day);
  if (!canRefillDaily(prev, day, today) || prev.coins < cost) return null;
  const d = dailyOf(prev, day);
  return { ...prev, coins: prev.coins - cost, daily: { ...(prev.daily || {}), [day]: { ...d, bonus: (d.bonus || 0) + 1, paid: (d.paid || 0) + 1 } } };
}
function adDailyRefill(prev: Profile, day: string, today: string) {
  if (!dailyAdReady(prev, day, today)) return null;
  const d = dailyOf(prev, day);
  return { ...prev, daily: { ...(prev.daily || {}), [day]: { ...d, bonus: (d.bonus || 0) + DAILY_ATTEMPTS, ad: true } } };
}

// Counts an attempt when a daily run ends (won, lost, or dropped after a move). Null if none left
// (or a future day).
function countDaily(prev: Profile, day: string, today: string) {
  if (!dailyAttemptsLeft(prev, day, today)) return null;
  const d = dailyOf(prev, day);
  return { ...prev, daily: { ...(prev.daily || {}), [day]: { ...d, attempts: d.attempts + 1 } } };
}

// Streak as the player sees it today: alive if the last cleared day is today, yesterday, or the
// gap is covered by freezes.
function streakNow(profile: Profile, today: string) {
  const st = streakOf(profile);
  if (!st.lastDay) return 0;
  const gap = dayDiff(st.lastDay, today) - 1;
  return gap <= st.freezes ? st.count : 0;
}

// Records a won daily. Returns { profile, report: { earned, total, streak, unlocked } }.
function applyDaily(prev: Profile, day: string, today: string, stars: number) {
  const before = dailyOf(prev, day);
  const earned: Earned[] = [];
  let p: Profile = { ...prev, daily: { ...(prev.daily || {}), [day]: { ...before, stars: Math.max(stars, before.stars || 0) } } };
  if (before.stars === undefined) earned.push({ label: day === today ? tr('Niveau du jour') : tr('Jour rattrapé'), coins: day === today ? DAILY_FIRST : DAILY_PAST });
  let unlocked: typeof STREAK_SKIN | null = null;
  let streak: Streak | null = null;
  const st = streakOf(prev);
  if (day === today && st.lastDay !== today) {
    const gap = st.lastDay ? dayDiff(st.lastDay, today) - 1 : 0;
    const kept = st.lastDay && gap <= st.freezes;
    const count = kept ? st.count + 1 : 1;
    const freezes = kept ? st.freezes - gap : st.freezes;
    streak = { count, best: Math.max(st.best, count), lastDay: today, freezes };
    p.streak = streak;
    earned.push({ label: tr`Série : ${count} jour${count > 1 ? 's' : ''}`, coins: Math.min(40, 5 + count * 5) });
    if (count % 7 === 0) earned.push({ label: tr('Coffre de la semaine'), coins: WEEK_CHEST });
    if (count >= STREAK_SKIN.days && !p.owned[STREAK_SKIN.kind].includes(STREAK_SKIN.id)) {
      p.owned = { ...p.owned, [STREAK_SKIN.kind]: [...p.owned[STREAK_SKIN.kind], STREAK_SKIN.id] };
      unlocked = STREAK_SKIN;
    }
  }
  const total = earned.reduce((a, l) => a + l.coins, 0);
  p = earn(p, total);
  return { profile: p, report: { earned, total, streak, unlocked } };
}

function buyFreeze(prev: Profile) {
  const st = streakOf(prev);
  if (st.freezes >= FREEZE_MAX) return null;
  const paid = spend(prev, FREEZE_COST);
  return paid && { ...paid, streak: { ...st, freezes: st.freezes + 1 } };
}

// Month trophy: every day of the month cleared (on the day or later). Gold with 3 stars everywhere.
function monthTrophy(profile: Profile, month: string) {
  const days = monthDays(month).map((d) => dailyOf(profile, d).stars);
  if (days.some((s) => s === undefined)) return null;
  return days.every((s) => s === 3) ? 'gold' : 'silver';
}

// ---------- sticker album ----------
// test(profile) reads lifetime stats and progression; rewards are paid once when first true.
const lt = (p: Profile, k: string) => ((p.lifetime && (p.lifetime[k] as number)) || 0);
const dailiesCleared = (p: Profile) => Object.values(p.daily || {}).filter((d) => d.stars !== undefined).length;
const anyTrophy = (p: Profile) => [...new Set(Object.keys(p.daily || {}).map((d) => d.slice(0, 7)))].some((m) => monthTrophy(p, m));
const STICKER_PAGES = [
  { id: 'combo', name: tr('Maître du combo') },
  { id: 'explorer', name: tr('Explorateur') },
  { id: 'faithful', name: tr('Fidèle') },
  { id: 'collector', name: tr('Collectionneur') },
  { id: 'master', name: tr('Maître des mondes') },
  { id: 'secret', name: tr('Secrets') },
];
export interface Sticker { id: string; page: string; name: string; hint: string; test: (p: Profile) => boolean; world?: string; reward?: number; secret?: boolean }
const STICKERS: Sticker[] = [
  { id: 'combo5', page: 'combo', name: tr('Combo ×5'), hint: tr('Atteins un combo ×5'), test: (p) => lt(p, 'bestCombo') >= 5 },
  { id: 'combo8', page: 'combo', name: tr('Combo ×8'), hint: tr('Atteins un combo ×8'), test: (p) => lt(p, 'bestCombo') >= 8 },
  { id: 'combo12', page: 'combo', name: tr('Combo ×12'), hint: tr('Atteins un combo ×12'), test: (p) => lt(p, 'bestCombo') >= 12 },
  { id: 'multi4', page: 'combo', name: tr('Quadruple'), hint: tr("Efface 4 lignes d'un coup"), test: (p) => lt(p, 'bestMulti') >= 4 },
  { id: 'perfect', page: 'combo', name: tr('Grille vide'), hint: tr('Vide toute la grille'), test: (p) => lt(p, 'perfects') >= 1 },
  { id: 'score5k', page: 'combo', name: tr('5 000 points'), hint: tr('Fais 5 000 points en une partie'), test: (p) => lt(p, 'score') >= 5000 },
  ...WORLD_ORDER.map((w) => ({
    id: 'world-' + w, page: 'explorer', world: w, reward: 30,
    name: WORLD_NAMES[w],
    hint: tr('Bats le boss de ce monde'), test: (p: Profile) => levelCleared(p, w, LEVELS_PER_WORLD) && levelStars(p, w, LEVELS_PER_WORLD) > 0,
  })),
  { id: 'streak7', page: 'faithful', name: tr('7 jours'), hint: tr('Tiens une série de 7 jours'), test: (p) => streakOf(p).best >= 7 },
  { id: 'streak30', page: 'faithful', name: tr('30 jours'), hint: tr('Tiens une série de 30 jours'), test: (p) => streakOf(p).best >= 30 },
  { id: 'streak100', page: 'faithful', name: tr('100 jours'), hint: tr('Tiens une série de 100 jours'), test: (p) => streakOf(p).best >= 100 },
  { id: 'daily10', page: 'faithful', name: tr('10 défis'), hint: tr('Réussis 10 niveaux du jour'), test: (p) => dailiesCleared(p) >= 10 },
  { id: 'daily50', page: 'faithful', name: tr('50 défis'), hint: tr('Réussis 50 niveaux du jour'), test: (p) => dailiesCleared(p) >= 50 },
  { id: 'month', page: 'faithful', name: tr('Mois complet'), hint: tr("Réussis tous les niveaux du jour d'un mois"), test: anyTrophy },
  { id: 'allbonus', page: 'collector', name: tr('Touche-à-tout'), hint: tr('Utilise chacun des 5 bonus'), test: (p) => (['rotate', 'nitro', 'shield', 'bomb', 'reroll'] as BonusType[]).every((k) => (((p.lifetime && p.lifetime.used) || {})[k] || 0) > 0) },
  { id: 'coins1000', page: 'collector', name: tr('Tirelire'), hint: tr('Gagne 1 000 pièces au total'), test: (p) => lt(p, 'coinsEarned') >= 1000 },
  { id: 'themes3', page: 'collector', name: tr('Décorateur'), hint: tr('Possède 3 thèmes en plus du Jouet'), test: (p) => p.owned.boards.length >= 4 },
  { id: 'lines1000', page: 'collector', name: tr('1 000 lignes'), hint: tr('Efface 1 000 lignes au total'), test: (p) => lt(p, 'lines') >= 1000 },
  { id: 'games100', page: 'collector', name: tr('100 parties'), hint: tr('Joue 100 parties'), test: (p) => lt(p, 'games') >= 100 },
  ...WORLD_ORDER.map((w) => ({
    id: 'master-' + w, page: 'master', world: w, reward: 60,
    name: WORLD_NAMES[w] + tr(' maîtrisé'),
    hint: tr`Gagne les ${LEVELS_PER_WORLD * 3} étoiles de ce monde`, test: (p: Profile) => worldMastered(p, w),
  })),
  { id: 'stars120', page: 'collector', name: tr('120 étoiles'), hint: tr("Gagne 120 étoiles en Aventure"), test: (p) => totalStars(p) >= 120 },
  // Secret: name and hint stay hidden in the album until earned.
  { id: 'bomb21', page: 'secret', secret: true, reward: 40, name: tr('Boum parfait'), hint: tr('Fais sauter 21 blocs avec une seule Bombe'), test: (p) => lt(p, 'bestBomb') >= 21 },
  { id: 'clean3k', page: 'secret', secret: true, reward: 40, name: tr('Sans filet'), hint: tr('Fais 3 000 points sans annuler ni jeter de forme'), test: (p) => lt(p, 'cleanScore') >= 3000 },
  { id: 'perfect2', page: 'secret', secret: true, reward: 40, name: tr('Place nette'), hint: tr('Vide la grille 2 fois dans la même partie'), test: (p) => lt(p, 'bestPerfects') >= 2 },
  { id: 'hoard', page: 'secret', secret: true, reward: 40, name: tr('Coffre plein'), hint: tr('Garde 2 000 pièces en poche'), test: (p) => p.coins >= 2000 },
  { id: 'allmodes', page: 'secret', secret: true, reward: 40, name: tr('Curieux'), hint: tr('Joue en Classique, Chrono et Chill'), test: (p) => ['classic', 'chrono', 'chill'].every((m) => (((p.modes || {})[m] || {}).games || 0) > 0) },
];
const STICKER_REWARD = 20;

// Pays every sticker that just became true. Returns { profile, fresh: [sticker] }.
function checkStickers(prev: Profile, today: string) {
  const got = prev.stickers || {};
  const fresh = STICKERS.filter((s) => !got[s.id] && s.test(prev));
  if (!fresh.length) return { profile: prev, fresh };
  const stickers: Record<string, string> = { ...got };
  for (const s of fresh) stickers[s.id] = today;
  const coins = fresh.reduce((a, s) => a + (s.reward || STICKER_REWARD), 0);
  return { profile: earn({ ...prev, stickers }, coins), fresh };
}

// Rewarded ad: pays the run's coins a second time.
const doubleRun = (prev: Profile, report: { total: number }) => ({ ...prev, coins: prev.coins + report.total });

// Coins spent in a run (discarding a piece). Returns null when the wallet is short.
const spend = (prev: Profile, amount: number): Profile | null => (prev.coins >= amount ? { ...prev, coins: prev.coins - amount } : null);

const findSkin = (kind: string, id: string) => (SKINS[kind as SkinKind] || []).find((s) => s.id === id);

function buy(prev: Profile, kind: SkinKind, id: string): Profile | null {
  const skin = findSkin(kind, id);
  if (!skin || skin.price == null || prev.owned[kind].includes(id) || prev.coins < skin.price) return null;
  return {
    ...prev,
    coins: prev.coins - skin.price,
    owned: { ...prev.owned, [kind]: [...prev.owned[kind], id] },
    equipped: { ...prev.equipped, [kind]: id },
  };
}

function equip(prev: Profile, kind: SkinKind, id: string): Profile | null {
  if (!prev.owned[kind] || !prev.owned[kind].includes(id)) return null;
  return { ...prev, equipped: { ...prev.equipped, [kind]: id } };
}

// Cheapest skin not owned yet, to dangle on the game-over screen.
function nextGoal(profile: Profile) {
  const all = (Object.entries(SKINS) as [SkinKind, Skin[]][]).flatMap(([kind, list]) =>
    list.filter((s) => s.price != null && !profile.owned[kind].includes(s.id)).map((s) => ({ kind, ...s })));
  all.sort((a, b) => a.price! - b.price!);
  return all[0] || null;
}

// Onboarding: the guided first game and one-time tips. profile.tips is optional ({ id: true }).
const tipSeen = (profile: Profile, id: string) => !!(profile.tips && profile.tips[id]);
const markTip = (prev: Profile, id: string) => (tipSeen(prev, id) ? prev : { ...prev, tips: { ...(prev.tips || {}), [id]: true } });
// Players who already played (before the tutorial existed) skip it.
const needsTutorial = (profile: Profile) => !tipSeen(profile, 'tutorial') && !profile.games && !totalStars(profile);

export {
  DIFFICULTY_BONUS, EVENTS, easterSunday, eventById, eventsFor, eventFor, eventActive, eventYear, eventEnd, eventOf, eventStars, eventCleared, eventTotalStars, eventLevelOpen, seasonTrophy, applyEvent,
  tipSeen, markTip, needsTutorial,
  HISTORY, modeStats, recentScores,
  addDays, dayDiff, monthDays,
  DAILY_ATTEMPTS, FREEZE_COST, FREEZE_MAX, STREAK_SKIN, dailyOf, streakOf, dailyAttemptsLeft, countDaily, canRefillDaily, dailyTryCost, dailyAdReady, buyDailyTry, adDailyRefill, streakNow,
  applyDaily, buyFreeze, monthTrophy, STICKER_PAGES, STICKERS, STICKER_REWARD, checkStickers,
  PUZZLE_FIRST, PUZZLE_PACK, PUZZLE_HINT, puzzleStarsOf, puzzleOpen, puzzlesSolved, applyPuzzle,
  SURPRISE_COINS, SURPRISE_HINTED, surpriseOpen, surprisesSolved, applySurprise,
  WORLD_NAMES, worldFreeOpen, worldPrimeRate, worldPrime, UPGRADE_PRICES, upgradeLevel, upgradePrice, buyUpgrade,
  WORLD_ORDER, LEVELS_PER_WORLD, TRIAL_LEVEL, CHESTS, chestState, openChest, freeBombs, useFreeBomb, bossBeaten, EXTRA_MOVES, START_BONUS_COST, SKIP_COST, SKIP_AFTER, levelFails, recordFail, canSkip, extraMovesCost,
  levelStars, levelCleared, totalStars, worldStars, worldMastered, worldGate, worldOpen, levelOpen, applyLevel, skipLevel,
  PROFILE_VERSION, SKINS, MISSIONS, createProfile, migrate, ensureDay, missionStatus, missionText, runCoins, applyRun, doubleRun, spend, buy, equip, nextGoal };
