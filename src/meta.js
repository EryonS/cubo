/*
 * Gridlock — meta progression: coins, missions, skin shop. Pure, no DOM.
 * A profile is a plain JSON object; every function returns a new one.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GridlockMeta = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAILY_MISSIONS = 3;

  // price 0 = owned from the start. Visuals live in the renderer, keyed by id.
  // 'boards' are whole themes (background, board, score plate, menus); the key stays for old saves.
  // Theme order follows the Aventure world order (Plaine first, Volcan last).
  const SKINS = {
    blocks: [
      { id: 'classic', name: 'Classique', price: 0 },
      { id: 'neon', name: 'Néon', price: 200 },
      { id: 'pixel', name: 'Pixel', price: 600 },
    ],
    boards: [
      { id: 'toy', name: 'Jouet', price: 0 },
      { id: 'plain', name: 'Plaine', price: 150 },
      { id: 'sea', name: 'Sous-marin', price: 300 },
      { id: 'space', name: 'Espace', price: 450 },
      { id: 'ice', name: 'Glace', price: 600 },
      { id: 'forest', name: 'Forêt', price: 800 },
      { id: 'retro', name: 'Rétro', price: 1000 },
      { id: 'arcade', name: 'Arcade', price: 1200 },
      { id: 'volcano', name: 'Volcan', price: 1500 },
    ],
  };

  // Skins removed from the catalog, refunded at their old price (road themes, 'candy' blocks).
  const RETIRED = {
    blocks: { candy: 400 },
    boards: { night: 0, sunset: 300, desert: 500, mountain: 800, dash: 1200 },
  };
  const PROFILE_VERSION = 2;

  // stat: key in the run stats. mode 'best' = within one game, 'total' = accumulates across games.
  // tiers: [target, reward], harder tiers unlock as more missions get completed.
  const MISSIONS = [
    { key: 'lines', stat: 'lines', mode: 'total', text: (n) => `Efface ${n} lignes`, tiers: [[20, 20], [40, 30], [80, 50]] },
    { key: 'combo', stat: 'bestCombo', mode: 'best', text: (n) => `Atteins un combo ×${n}`, tiers: [[3, 20], [4, 30], [6, 50]] },
    { key: 'multi', stat: 'bestMulti', mode: 'best', text: (n) => `Efface ${n} lignes d'un coup`, tiers: [[2, 20], [3, 35], [4, 60]] },
    { key: 'score', stat: 'score', mode: 'best', text: (n) => `Fais ${n.toLocaleString('fr-FR')} points en une partie`, tiers: [[1000, 20], [2500, 35], [5000, 60]] },
    { key: 'bonus', stat: 'bonusUsed', mode: 'total', text: (n) => `Utilise ${n} bonus`, tiers: [[3, 20], [6, 30], [12, 50]] },
    { key: 'bomb', stat: 'bombCells', mode: 'total', text: (n) => `Fais sauter ${n} blocs à la bombe`, tiers: [[20, 20], [45, 35], [90, 50]] },
    { key: 'perfect', stat: 'perfects', mode: 'total', text: () => 'Vide toute la grille', tiers: [[1, 40], [1, 40], [1, 50]] },
    { key: 'games', stat: 'games', mode: 'total', text: (n) => `Joue ${n} parties`, tiers: [[3, 20], [5, 30], [8, 40]] },
    { key: 'pieces', stat: 'pieces', mode: 'total', text: (n) => `Pose ${n} pièces`, tiers: [[80, 20], [150, 30], [300, 50]] },
  ];
  const TEMPLATE = Object.fromEntries(MISSIONS.map((m) => [m.key, m]));

  // Deterministic RNG from a string (the day), so a given day always offers the same missions.
  function dayRandom(day) {
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
  function dailyMissions(day, missionsDone) {
    const rnd = dayRandom(day);
    const pool = MISSIONS.slice();
    const tier = Math.floor(missionsDone / 6);
    const out = [];
    for (let i = 0; i < DAILY_MISSIONS; i++) {
      const tpl = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const [target, reward] = tpl.tiers[Math.min(tpl.tiers.length - 1, tier)];
      out.push({ id: `${day}-${i}`, key: tpl.key, target, reward, progress: 0, done: false });
    }
    return out;
  }

  // Rolls the missions over when the day changed. `day` is a local 'YYYY-MM-DD' string.
  function ensureDay(prev, day) {
    if (prev.day === day) return prev;
    return { ...prev, day, missions: dailyMissions(day, prev.missionsDone || 0) };
  }

  function createProfile(day) {
    return ensureDay({
      version: PROFILE_VERSION,
      coins: 0,
      owned: { blocks: ['classic'], boards: ['toy'] },
      equipped: { blocks: 'classic', boards: 'toy' },
      day: null,
      missions: [],
      missionsDone: 0,
      games: 0,
    }, day);
  }

  // Brings an old save up to date: retired skins leave the inventory and are refunded, anything
  // equipped that no longer exists falls back to the free skin. Returns { profile, refund }.
  function migrate(prev) {
    if ((prev.version || 1) >= PROFILE_VERSION) return { profile: prev, refund: 0 };
    let refund = 0;
    const owned = {};
    const equipped = { ...prev.equipped };
    for (const kind of Object.keys(SKINS)) {
      const list = (prev.owned && prev.owned[kind]) || [];
      for (const id of list) refund += (RETIRED[kind] && RETIRED[kind][id]) || 0;
      owned[kind] = SKINS[kind].filter((s) => s.price === 0 || list.includes(s.id)).map((s) => s.id);
      if (!findSkin(kind, equipped[kind])) equipped[kind] = SKINS[kind][0].id;
    }
    return {
      profile: { ...prev, version: PROFILE_VERSION, coins: (prev.coins || 0) + refund, owned, equipped },
      refund,
    };
  }

  const missionText = (m) => TEMPLATE[m.key].text(m.target);

  // Where each mission stands if the current run ended now.
  function missionStatus(profile, run) {
    return profile.missions.map((m) => {
      const text = missionText(m);
      if (m.done) return { ...m, text, current: m.target, done: true, before: true };
      const tpl = TEMPLATE[m.key];
      const value = run[tpl.stat] || 0;
      const current = tpl.mode === 'total' ? m.progress + value : Math.max(m.progress, value);
      return { ...m, text, current: Math.min(current, m.target), done: current >= m.target, before: false };
    });
  }

  // Coins earned by a run, as display lines.
  function runCoins(run) {
    const lines = [];
    if (run.coins) lines.push({ label: 'Pièces ramassées', coins: run.coins });
    if (run.perfects) lines.push({ label: `Grille vide ×${run.perfects}`, coins: run.perfects * 10 });
    if (run.bestCombo >= 5) lines.push({ label: `Combo ×${run.bestCombo}`, coins: 5 });
    if (run.bestBomb >= 15) lines.push({ label: 'Méga explosion', coins: 5 });
    return lines;
  }

  // Close a run: pay coins and advance today's missions (finished ones stay done until tomorrow).
  function applyRun(prev, run) {
    const stats = { ...run, games: 1 };
    const earned = runCoins(stats);
    const completed = [];
    const p = { ...prev, owned: { ...prev.owned }, equipped: { ...prev.equipped } };

    p.missions = missionStatus(prev, stats).map((m) => {
      if (m.done && !m.before) {
        completed.push(m);
        earned.push({ label: 'Mission : ' + m.text, coins: m.reward });
        p.missionsDone += 1;
      }
      return { id: m.id, key: m.key, target: m.target, reward: m.reward, progress: m.current, done: m.done };
    });

    const total = earned.reduce((s, l) => s + l.coins, 0);
    p.coins += total;
    p.games += 1;
    return { profile: p, report: { earned, total, completed, coinsBefore: prev.coins } };
  }

  // ---------- Aventure ----------
  // profile.adventure.stars: { "<world>-<n>": 0..3 }. A key present = level cleared (0 = skipped).
  // A world opens when the previous boss is cleared and enough stars are collected overall.
  // Beating a world's boss gives its theme for free (it is also sold in the Boutique).
  const WORLD_ORDER = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];
  const LEVELS_PER_WORLD = 10;
  const STARS_PER_GATE = 18; // world k needs 18 x k stars
  const FIRST_CLEAR = 10;
  const BOSS_CLEAR = 50;
  const PER_NEW_STAR = 5;
  const EXTRA_MOVES = 5;
  const START_BONUS_COST = 30;
  const SKIP_COST = 250;
  const extraMovesCost = (times) => 20 * 2 ** times; // 20, 40, 80... within one attempt

  const levelKey = (world, n) => `${world}-${n}`;
  const starsOf = (profile) => (profile.adventure && profile.adventure.stars) || {};
  const levelStars = (profile, world, n) => starsOf(profile)[levelKey(world, n)];
  const levelCleared = (profile, world, n) => levelStars(profile, world, n) !== undefined;
  const totalStars = (profile) => Object.values(starsOf(profile)).reduce((a, b) => a + b, 0);
  const worldStars = (profile, world) => {
    let n = 0;
    for (let i = 1; i <= LEVELS_PER_WORLD; i++) n += levelStars(profile, world, i) || 0;
    return n;
  };
  const worldGate = (world) => WORLD_ORDER.indexOf(world) * STARS_PER_GATE;

  function worldOpen(profile, world) {
    const w = WORLD_ORDER.indexOf(world);
    if (w <= 0) return w === 0;
    return levelCleared(profile, WORLD_ORDER[w - 1], LEVELS_PER_WORLD) && totalStars(profile) >= worldGate(world);
  }
  const levelOpen = (profile, world, n) => worldOpen(profile, world) && (n === 1 || levelCleared(profile, world, n - 1));

  // Records a finished level. Returns { profile, report: { earned, total, themeUnlocked } }.
  function applyLevel(prev, world, n, stars) {
    const key = levelKey(world, n);
    const before = starsOf(prev)[key];
    const earned = [];
    if (before === undefined) earned.push({ label: n === LEVELS_PER_WORLD ? 'Boss vaincu' : 'Niveau réussi', coins: n === LEVELS_PER_WORLD ? BOSS_CLEAR : FIRST_CLEAR });
    const fresh = stars - (before || 0);
    if (fresh > 0) earned.push({ label: fresh > 1 ? `${fresh} nouvelles étoiles` : 'Nouvelle étoile', coins: fresh * PER_NEW_STAR });
    const total = earned.reduce((a, l) => a + l.coins, 0);
    const p = {
      ...prev,
      coins: prev.coins + total,
      adventure: { ...(prev.adventure || {}), stars: { ...starsOf(prev), [key]: Math.max(stars, before || 0) } },
    };
    let themeUnlocked = null;
    if (n === LEVELS_PER_WORLD && findSkin('boards', world) && !prev.owned.boards.includes(world)) {
      p.owned = { ...prev.owned, boards: [...prev.owned.boards, world] };
      themeUnlocked = world;
    }
    return { profile: p, report: { earned, total, themeUnlocked } };
  }

  // Pays to mark a (non-boss) level as passed with no star.
  function skipLevel(prev, world, n) {
    if (n === LEVELS_PER_WORLD || levelCleared(prev, world, n) || !levelOpen(prev, world, n)) return null;
    const paid = spend(prev, SKIP_COST);
    if (!paid) return null;
    return { ...paid, adventure: { ...(paid.adventure || {}), stars: { ...starsOf(paid), [levelKey(world, n)]: 0 } } };
  }

  // Rewarded ad: pays the run's coins a second time.
  const doubleRun = (prev, report) => ({ ...prev, coins: prev.coins + report.total });

  // Coins spent in a run (discarding a piece). Returns null when the wallet is short.
  const spend = (prev, amount) => (prev.coins >= amount ? { ...prev, coins: prev.coins - amount } : null);

  const findSkin = (kind, id) => (SKINS[kind] || []).find((s) => s.id === id);

  function buy(prev, kind, id) {
    const skin = findSkin(kind, id);
    if (!skin || prev.owned[kind].includes(id) || prev.coins < skin.price) return null;
    return {
      ...prev,
      coins: prev.coins - skin.price,
      owned: { ...prev.owned, [kind]: [...prev.owned[kind], id] },
      equipped: { ...prev.equipped, [kind]: id },
    };
  }

  function equip(prev, kind, id) {
    if (!prev.owned[kind] || !prev.owned[kind].includes(id)) return null;
    return { ...prev, equipped: { ...prev.equipped, [kind]: id } };
  }

  // Cheapest skin not owned yet, to dangle on the game-over screen.
  function nextGoal(profile) {
    const all = Object.entries(SKINS).flatMap(([kind, list]) =>
      list.filter((s) => !profile.owned[kind].includes(s.id)).map((s) => ({ kind, ...s })));
    all.sort((a, b) => a.price - b.price);
    return all[0] || null;
  }

  return {
    WORLD_ORDER, LEVELS_PER_WORLD, EXTRA_MOVES, START_BONUS_COST, SKIP_COST, extraMovesCost,
    levelStars, levelCleared, totalStars, worldStars, worldGate, worldOpen, levelOpen, applyLevel, skipLevel,
    SKINS, MISSIONS, createProfile, migrate, ensureDay, missionStatus, missionText, runCoins, applyRun, doubleRun, spend, buy, equip, nextGoal };
});
