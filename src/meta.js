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
      // Not sold: the 30-day streak reward.
      { id: 'gold', name: 'Or', price: null, exclusive: 'Série de 30 jours' },
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
  const PROFILE_VERSION = 3;

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
    { key: 'pieces', stat: 'pieces', mode: 'total', text: (n) => `Pose ${n} formes`, tiers: [[80, 20], [150, 30], [300, 50]] },
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

  // Brings an old save up to date. Returns { profile, refund }.
  // v2: retired skins leave the inventory and are refunded, anything equipped that no longer exists
  // falls back to the free skin. v3 (Aventure v2, 20 levels a world): worlds open under the v1 rule
  // (boss at level 10, 18 stars a world) are recorded in adventure.opened so none closes again.
  function migrate(prev) {
    const version = prev.version || 1;
    if (version >= PROFILE_VERSION) return { profile: prev, refund: 0 };
    const skins = version < 2 ? migrateSkins(prev) : { profile: prev, refund: 0 };
    return { profile: { ...migrateAdventure(skins.profile), version: PROFILE_VERSION }, refund: skins.refund };
  }

  function migrateAdventure(prev) {
    const stars = starsOf(prev);
    const total = totalStars(prev);
    const opened = WORLD_ORDER.filter((w, i) => i > 0 && stars[levelKey(WORLD_ORDER[i - 1], 10)] !== undefined && total >= 18 * i);
    if (!opened.length) return prev;
    return { ...prev, adventure: { ...(prev.adventure || {}), opened } };
  }

  function migrateSkins(prev) {
    let refund = 0;
    const owned = {};
    const equipped = { ...prev.equipped };
    for (const kind of Object.keys(SKINS)) {
      const list = (prev.owned && prev.owned[kind]) || [];
      for (const id of list) refund += (RETIRED[kind] && RETIRED[kind][id]) || 0;
      owned[kind] = SKINS[kind].filter((s) => s.price === 0 || list.includes(s.id)).map((s) => s.id);
      if (!findSkin(kind, equipped[kind])) equipped[kind] = SKINS[kind][0].id;
    }
    return { profile: { ...prev, coins: (prev.coins || 0) + refund, owned, equipped }, refund };
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
    const prime = worldPrime(run.world, run.score);
    if (prime) lines.push({ label: 'Prime ' + WORLD_NAMES[run.world], coins: prime });
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
    p.lifetime = addLifetime(prev.lifetime, stats, total);
    if (run.mode) {
      p.modes = addModeRun(prev.modes, run);
      p.history = [...(prev.history || []), { m: run.mode, s: run.score || 0 }].slice(-HISTORY);
    }
    return { profile: p, report: { earned, total, completed, coinsBefore: prev.coins } };
  }

  // ---------- per-mode stats ----------
  // profile.modes: { [mode]: { games, total, best, bestCombo, lines } } since 2026-10-01.
  // profile.history: the last HISTORY runs, oldest first, as { m: mode, s: score }.
  // mode is classic, chrono, chill or adventure (levels and dailies). Old profiles may hold 'event' runs.
  const HISTORY = 60;
  function addModeRun(prev, run) {
    const m = { games: 0, total: 0, best: 0, bestCombo: 0, lines: 0, ...((prev || {})[run.mode] || {}) };
    m.games += 1;
    m.total += run.score || 0;
    m.best = Math.max(m.best, run.score || 0);
    m.bestCombo = Math.max(m.bestCombo, run.bestCombo || 0);
    m.lines += run.lines || 0;
    return { ...(prev || {}), [run.mode]: m };
  }
  const modeStats = (profile, mode) => ({ games: 0, total: 0, best: 0, bestCombo: 0, lines: 0, ...((profile.modes || {})[mode] || {}) });
  // Scores of the last `n` runs of a mode, oldest first.
  const recentScores = (profile, mode, n) => (profile.history || []).filter((h) => h.m === mode).slice(-n).map((h) => h.s);

  // ---------- Aventure ----------
  // profile.adventure.stars: { "<world>-<n>": 0..3 }. A key present = level cleared (0 = skipped).
  // A world opens when the previous boss is cleared and enough stars are collected overall
  // (adventure.opened: worlds opened before v2, see migrate). Beating a world's boss gives its theme
  // for free (it is also sold in the Boutique). adventure.chests: { "<world>-<i>": true } opened star
  // chests; adventure.bombs: free starting Bombes won in chests.
  const WORLD_ORDER = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano'];
  const WORLD_NAMES = { plain: 'Plaine', sea: 'Sous-marin', space: 'Espace', ice: 'Glace', forest: 'Forêt', retro: 'Rétro', arcade: 'Arcade', volcano: 'Volcan' };
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
  const extraMovesCost = (times) => 20 * 2 ** times; // 20, 40, 80... within one attempt
  // Star chests on each world screen, opened once.
  const CHESTS = [
    { stars: 15, coins: 40 },
    { stars: 35, bombs: 2 },
    { stars: 55, coins: 150 },
  ];

  const levelKey = (world, n) => `${world}-${n}`;
  const adventureOf = (profile) => profile.adventure || {};
  const starsOf = (profile) => adventureOf(profile).stars || {};
  const levelStars = (profile, world, n) => starsOf(profile)[levelKey(world, n)];
  const levelCleared = (profile, world, n) => levelStars(profile, world, n) !== undefined;
  const totalStars = (profile) => Object.values(starsOf(profile)).reduce((a, b) => a + b, 0);
  const worldStars = (profile, world) => {
    let n = 0;
    for (let i = 1; i <= LEVELS_PER_WORLD; i++) n += levelStars(profile, world, i) || 0;
    return n;
  };
  const worldGate = (world) => WORLD_ORDER.indexOf(world) * STARS_PER_GATE;
  const bossBeaten = (profile, world) => levelCleared(profile, world, LEVELS_PER_WORLD);

  function worldOpen(profile, world) {
    const w = WORLD_ORDER.indexOf(world);
    if (w <= 0) return w === 0;
    if ((adventureOf(profile).opened || []).includes(world)) return true;
    return bossBeaten(profile, WORLD_ORDER[w - 1]) && totalStars(profile) >= worldGate(world);
  }
  const levelOpen = (profile, world, n) => worldOpen(profile, world) && (n === 1 || levelCleared(profile, world, n - 1));

  // Records a finished level. Returns { profile, report: { earned, total, themeUnlocked } }.
  function applyLevel(prev, world, n, stars) {
    const key = levelKey(world, n);
    const before = starsOf(prev)[key];
    const earned = [];
    if (before === undefined) {
      if (n === LEVELS_PER_WORLD) earned.push({ label: 'Boss vaincu', coins: BOSS_CLEAR });
      else if (n === TRIAL_LEVEL) earned.push({ label: 'Épreuve réussie', coins: TRIAL_CLEAR });
      else earned.push({ label: 'Niveau réussi', coins: FIRST_CLEAR });
    }
    const fresh = stars - (before || 0);
    if (fresh > 0) earned.push({ label: fresh > 1 ? `${fresh} nouvelles étoiles` : 'Nouvelle étoile', coins: fresh * PER_NEW_STAR });
    const total = earned.reduce((a, l) => a + l.coins, 0);
    const p = {
      ...earn(prev, total),
      adventure: { ...adventureOf(prev), stars: { ...starsOf(prev), [key]: Math.max(stars, before || 0) } },
    };
    let themeUnlocked = null;
    let result = p;
    const theme = n === LEVELS_PER_WORLD && before === undefined && findSkin('boards', world);
    if (theme && !prev.owned.boards.includes(world)) {
      result = { ...p, owned: { ...prev.owned, boards: [...prev.owned.boards, world] } };
      themeUnlocked = world;
    } else if (theme && theme.price) {
      // The theme was bought before the boss fell: the boss pays its price back instead.
      earned.push({ label: `Thème ${theme.name} déjà à toi`, coins: theme.price });
      result = earn(p, theme.price);
    }
    const sum = earned.reduce((a, l) => a + l.coins, 0);
    return { profile: result, report: { earned, total: sum, themeUnlocked } };
  }

  // Failed attempts per level (the level sheet offers a paid skip after SKIP_AFTER of them).
  const SKIP_AFTER = 2;
  const levelFails = (profile, world, n) => (adventureOf(profile).fails || {})[levelKey(world, n)] || 0;
  function recordFail(prev, world, n) {
    const adv = adventureOf(prev);
    const key = levelKey(world, n);
    return { ...prev, adventure: { ...adv, fails: { ...(adv.fails || {}), [key]: levelFails(prev, world, n) + 1 } } };
  }
  const canSkip = (profile, world, n) =>
    n < LEVELS_PER_WORLD && !levelCleared(profile, world, n) && levelFails(profile, world, n) >= SKIP_AFTER;

  // Pays to mark a (non-boss) level as passed with no star.
  function skipLevel(prev, world, n) {
    if (n === LEVELS_PER_WORLD || levelCleared(prev, world, n) || !levelOpen(prev, world, n)) return null;
    const paid = spend(prev, SKIP_COST);
    if (!paid) return null;
    return { ...paid, adventure: { ...adventureOf(paid), stars: { ...starsOf(paid), [levelKey(world, n)]: 0 } } };
  }

  // Star chests: 'open' (taken), 'ready' (enough stars) or 'locked'.
  const chestOpened = (profile, world, i) => !!(adventureOf(profile).chests || {})[levelKey(world, i)];
  const chestState = (profile, world, i) =>
    chestOpened(profile, world, i) ? 'open' : worldStars(profile, world) >= CHESTS[i].stars ? 'ready' : 'locked';
  // Returns { profile, reward } or null if the chest can't be opened.
  function openChest(prev, world, i) {
    if (!CHESTS[i] || chestState(prev, world, i) !== 'ready') return null;
    const reward = CHESTS[i];
    const adv = adventureOf(prev);
    const p = earn(prev, reward.coins || 0);
    return {
      profile: { ...p, adventure: { ...adv, chests: { ...(adv.chests || {}), [levelKey(world, i)]: true }, bombs: (adv.bombs || 0) + (reward.bombs || 0) } },
      reward,
    };
  }
  const freeBombs = (profile) => adventureOf(profile).bombs || 0;
  // ---------- Mondes (endless runs under one world's rules) ----------
  // A world opens in the Mondes mode once its trial (Aventure level 10) is cleared. Runs pay a prime
  // on the score, bigger in later worlds: 1 coin per 200 points in Plaine, up to x2.75 in Volcan.
  const worldFreeOpen = (profile, world) => WORLD_ORDER.includes(world) && levelCleared(profile, world, TRIAL_LEVEL);
  const worldPrimeRate = (world) => 1 + 0.25 * WORLD_ORDER.indexOf(world);
  const worldPrime = (world, score) => (WORLD_ORDER.includes(world) ? Math.floor(((score || 0) / 200) * worldPrimeRate(world)) : 0);

  // ---------- Puzzles ----------
  // profile.puzzles: { [n]: stars 1..3 }. Puzzles open one after the other. First solve pays
  // PUZZLE_FIRST, each new star PER_NEW_STAR, a finished pack PUZZLE_PACK. Hints cost PUZZLE_HINT.
  const PUZZLE_FIRST = 15;
  const PUZZLE_PACK = 60;
  const PUZZLE_HINT = 30;
  const PUZZLES_PER_PACK = 10;
  const puzzleStarsOf = (profile, n) => (profile.puzzles || {})[n];
  const puzzleOpen = (profile, n) => n === 1 || puzzleStarsOf(profile, n - 1) !== undefined;
  const puzzlesSolved = (profile) => Object.keys(profile.puzzles || {}).length;
  const packDone = (profile, pack) => {
    for (let n = pack * PUZZLES_PER_PACK + 1; n <= (pack + 1) * PUZZLES_PER_PACK; n++) if (puzzleStarsOf(profile, n) === undefined) return false;
    return true;
  };
  // Records a solved puzzle. Returns { profile, report: { earned, total } }.
  function applyPuzzle(prev, n, stars) {
    const before = puzzleStarsOf(prev, n);
    const earned = [];
    if (before === undefined) earned.push({ label: 'Puzzle résolu', coins: PUZZLE_FIRST });
    const fresh = stars - (before || 0);
    if (fresh > 0) earned.push({ label: fresh > 1 ? `${fresh} nouvelles étoiles` : 'Nouvelle étoile', coins: fresh * PER_NEW_STAR });
    let p = { ...prev, puzzles: { ...(prev.puzzles || {}), [n]: Math.max(stars, before || 0) } };
    const pack = Math.floor((n - 1) / PUZZLES_PER_PACK);
    if (before === undefined && packDone(p, pack)) earned.push({ label: 'Pack terminé', coins: PUZZLE_PACK });
    const total = earned.reduce((a, l) => a + l.coins, 0);
    p = earn(p, total);
    return { profile: p, report: { earned, total } };
  }

  // ---------- bonus upgrades ----------
  // profile.upgrades: { [bonus]: 2 | 3 } (absent = level 1). UPGRADE_PRICES[bonus][k] buys level k + 2.
  const UPGRADE_PRICES = {
    rotate: [200, 500],
    nitro: [250, 600],
    shield: [200, 500],
    bomb: [300, 700],
    reroll: [200, 500],
  };
  const upgradeLevel = (profile, type) => (profile.upgrades && profile.upgrades[type]) || 1;
  // Price of the next level, or null at the top.
  const upgradePrice = (profile, type) => (UPGRADE_PRICES[type] ? UPGRADE_PRICES[type][upgradeLevel(profile, type) - 1] ?? null : null);
  function buyUpgrade(prev, type) {
    const price = upgradePrice(prev, type);
    if (price == null) return null;
    const paid = spend(prev, price);
    return paid && { ...paid, upgrades: { ...(prev.upgrades || {}), [type]: upgradeLevel(prev, type) + 1 } };
  }

  // Uses a free starting Bombe won in a chest. Returns the profile or null.
  function useFreeBomb(prev) {
    const n = freeBombs(prev);
    return n > 0 ? { ...prev, adventure: { ...adventureOf(prev), bombs: n - 1 } } : null;
  }


  // ---------- dates ----------
  // Days are local 'YYYY-MM-DD' strings; arithmetic goes through UTC so DST never shifts a day.
  const dayMs = (day) => Date.parse(day + 'T00:00:00Z');
  const addDays = (day, n) => new Date(dayMs(day) + n * 86400000).toISOString().slice(0, 10);
  const dayDiff = (from, to) => Math.round((dayMs(to) - dayMs(from)) / 86400000);
  const monthDays = (month) => {
    const [y, m] = month.split('-').map(Number);
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  };

  // ---------- lifetime stats ----------
  const LIFETIME_SUM = ['lines', 'pieces', 'perfects', 'bonusUsed', 'bombCells', 'coins'];
  const LIFETIME_MAX = ['bestCombo', 'bestMulti', 'score', 'bestBomb'];
  function addLifetime(prev, run, coinsPaid) {
    const lt = { games: 0, coinsEarned: 0, used: {}, ...(prev || {}) };
    lt.games += 1;
    lt.coinsEarned += coinsPaid || 0;
    for (const k of LIFETIME_SUM) lt[k] = (lt[k] || 0) + (run[k] || 0);
    for (const k of LIFETIME_MAX) lt[k] = Math.max(lt[k] || 0, run[k] || 0);
    // For secret stickers: most grids emptied in one run, best score with no undo and no discard.
    lt.bestPerfects = Math.max(lt.bestPerfects || 0, run.perfects || 0);
    if (!run.undos && !run.discards) lt.cleanScore = Math.max(lt.cleanScore || 0, run.score || 0);
    lt.used = { ...lt.used };
    for (const [k, n] of Object.entries(run.used || {})) lt.used[k] = (lt.used[k] || 0) + n;
    return lt;
  }
  // Coins earned outside runs (levels, dailies, streak, stickers) also count toward the lifetime total.
  const earn = (p, coins) => ({ ...p, coins: p.coins + coins, lifetime: { ...(p.lifetime || {}), coinsEarned: ((p.lifetime && p.lifetime.coinsEarned) || 0) + coins } });

  // ---------- daily level and streak ----------
  // profile.daily: { [day]: { stars, attempts } }. Only today's level is limited (3 attempts) and
  // only clearing it on the day feeds the streak; past days can be replayed freely for the calendar.
  const DAILY_ATTEMPTS = 3;
  const DAILY_FIRST = 20;
  const DAILY_PAST = 10;
  const FREEZE_COST = 100;
  const FREEZE_MAX = 2;
  const WEEK_CHEST = 50;
  const STREAK_SKIN = { days: 30, kind: 'blocks', id: 'gold' };
  const dailyOf = (profile, day) => (profile.daily && profile.daily[day]) || { attempts: 0 };
  const streakOf = (profile) => ({ count: 0, best: 0, lastDay: null, freezes: 0, ...(profile.streak || {}) });

  function dailyAttemptsLeft(profile, day, today) {
    if (day > today) return 0;
    return day === today ? Math.max(0, DAILY_ATTEMPTS - dailyOf(profile, day).attempts) : Infinity;
  }

  // Counts an attempt when a daily run starts. Null if none left (or a future day).
  function startDaily(prev, day, today) {
    if (!dailyAttemptsLeft(prev, day, today)) return null;
    const d = dailyOf(prev, day);
    return { ...prev, daily: { ...(prev.daily || {}), [day]: { ...d, attempts: d.attempts + 1 } } };
  }

  // Streak as the player sees it today: alive if the last cleared day is today, yesterday, or the
  // gap is covered by freezes.
  function streakNow(profile, today) {
    const st = streakOf(profile);
    if (!st.lastDay) return 0;
    const gap = dayDiff(st.lastDay, today) - 1;
    return gap <= st.freezes ? st.count : 0;
  }

  // Records a won daily. Returns { profile, report: { earned, total, streak, unlocked } }.
  function applyDaily(prev, day, today, stars) {
    const before = dailyOf(prev, day);
    const earned = [];
    let p = { ...prev, daily: { ...(prev.daily || {}), [day]: { ...before, stars: Math.max(stars, before.stars || 0) } } };
    if (before.stars === undefined) earned.push({ label: day === today ? 'Niveau du jour' : 'Jour rattrapé', coins: day === today ? DAILY_FIRST : DAILY_PAST });
    let unlocked = null;
    let streak = null;
    const st = streakOf(prev);
    if (day === today && st.lastDay !== today) {
      const gap = st.lastDay ? dayDiff(st.lastDay, today) - 1 : 0;
      const kept = st.lastDay && gap <= st.freezes;
      const count = kept ? st.count + 1 : 1;
      const freezes = kept ? st.freezes - gap : st.freezes;
      streak = { count, best: Math.max(st.best, count), lastDay: today, freezes };
      p.streak = streak;
      earned.push({ label: `Série : ${count} jour${count > 1 ? 's' : ''}`, coins: Math.min(40, 5 + count * 5) });
      if (count % 7 === 0) earned.push({ label: 'Coffre de la semaine', coins: WEEK_CHEST });
      if (count >= STREAK_SKIN.days && !p.owned[STREAK_SKIN.kind].includes(STREAK_SKIN.id)) {
        p.owned = { ...p.owned, [STREAK_SKIN.kind]: [...p.owned[STREAK_SKIN.kind], STREAK_SKIN.id] };
        unlocked = STREAK_SKIN;
      }
    }
    const total = earned.reduce((a, l) => a + l.coins, 0);
    p = earn(p, total);
    return { profile: p, report: { earned, total, streak, unlocked } };
  }

  function buyFreeze(prev) {
    const st = streakOf(prev);
    if (st.freezes >= FREEZE_MAX) return null;
    const paid = spend(prev, FREEZE_COST);
    return paid && { ...paid, streak: { ...st, freezes: st.freezes + 1 } };
  }

  // Month trophy: every day of the month cleared (on the day or later). Gold with 3 stars everywhere.
  function monthTrophy(profile, month) {
    const days = monthDays(month).map((d) => dailyOf(profile, d).stars);
    if (days.some((s) => s === undefined)) return null;
    return days.every((s) => s === 3) ? 'gold' : 'silver';
  }

  // ---------- sticker album ----------
  // test(profile) reads lifetime stats and progression; rewards are paid once when first true.
  const lt = (p, k) => (p.lifetime && p.lifetime[k]) || 0;
  const dailiesCleared = (p) => Object.values(p.daily || {}).filter((d) => d.stars !== undefined).length;
  const anyTrophy = (p) => [...new Set(Object.keys(p.daily || {}).map((d) => d.slice(0, 7)))].some((m) => monthTrophy(p, m));
  const STICKER_PAGES = [
    { id: 'combo', name: 'Maître du combo' },
    { id: 'explorer', name: 'Explorateur' },
    { id: 'faithful', name: 'Fidèle' },
    { id: 'collector', name: 'Collectionneur' },
    { id: 'secret', name: 'Secrets' },
  ];
  const STICKERS = [
    { id: 'combo5', page: 'combo', name: 'Combo ×5', hint: 'Atteins un combo ×5', test: (p) => lt(p, 'bestCombo') >= 5 },
    { id: 'combo8', page: 'combo', name: 'Combo ×8', hint: 'Atteins un combo ×8', test: (p) => lt(p, 'bestCombo') >= 8 },
    { id: 'combo12', page: 'combo', name: 'Combo ×12', hint: 'Atteins un combo ×12', test: (p) => lt(p, 'bestCombo') >= 12 },
    { id: 'multi4', page: 'combo', name: 'Quadruple', hint: "Efface 4 lignes d'un coup", test: (p) => lt(p, 'bestMulti') >= 4 },
    { id: 'perfect', page: 'combo', name: 'Grille vide', hint: 'Vide toute la grille', test: (p) => lt(p, 'perfects') >= 1 },
    { id: 'score5k', page: 'combo', name: '5 000 points', hint: 'Fais 5 000 points en une partie', test: (p) => lt(p, 'score') >= 5000 },
    ...WORLD_ORDER.map((w, i) => ({
      id: 'world-' + w, page: 'explorer', world: w, reward: 30,
      name: WORLD_NAMES[w],
      hint: 'Bats le boss de ce monde', test: (p) => levelCleared(p, w, LEVELS_PER_WORLD) && levelStars(p, w, LEVELS_PER_WORLD) > 0,
    })),
    { id: 'streak7', page: 'faithful', name: '7 jours', hint: 'Tiens une série de 7 jours', test: (p) => streakOf(p).best >= 7 },
    { id: 'streak30', page: 'faithful', name: '30 jours', hint: 'Tiens une série de 30 jours', test: (p) => streakOf(p).best >= 30 },
    { id: 'streak100', page: 'faithful', name: '100 jours', hint: 'Tiens une série de 100 jours', test: (p) => streakOf(p).best >= 100 },
    { id: 'daily10', page: 'faithful', name: '10 défis', hint: 'Réussis 10 niveaux du jour', test: (p) => dailiesCleared(p) >= 10 },
    { id: 'daily50', page: 'faithful', name: '50 défis', hint: 'Réussis 50 niveaux du jour', test: (p) => dailiesCleared(p) >= 50 },
    { id: 'month', page: 'faithful', name: 'Mois complet', hint: "Réussis tous les niveaux du jour d'un mois", test: anyTrophy },
    { id: 'allbonus', page: 'collector', name: 'Touche-à-tout', hint: 'Utilise chacun des 5 bonus', test: (p) => ['rotate', 'nitro', 'shield', 'bomb', 'reroll'].every((k) => ((p.lifetime && p.lifetime.used) || {})[k] > 0) },
    { id: 'coins1000', page: 'collector', name: 'Tirelire', hint: 'Gagne 1 000 pièces au total', test: (p) => lt(p, 'coinsEarned') >= 1000 },
    { id: 'themes3', page: 'collector', name: 'Décorateur', hint: 'Possède 3 thèmes en plus du Jouet', test: (p) => p.owned.boards.length >= 4 },
    { id: 'lines1000', page: 'collector', name: '1 000 lignes', hint: 'Efface 1 000 lignes au total', test: (p) => lt(p, 'lines') >= 1000 },
    { id: 'games100', page: 'collector', name: '100 parties', hint: 'Joue 100 parties', test: (p) => lt(p, 'games') >= 100 },
    { id: 'stars120', page: 'collector', name: '120 étoiles', hint: "Gagne 120 étoiles en Aventure", test: (p) => totalStars(p) >= 120 },
    // Secret: name and hint stay hidden in the album until earned.
    { id: 'bomb21', page: 'secret', secret: true, reward: 40, name: 'Boum parfait', hint: 'Une Bombe fait sauter 21 blocs', test: (p) => lt(p, 'bestBomb') >= 21 },
    { id: 'clean3k', page: 'secret', secret: true, reward: 40, name: 'Sans filet', hint: '3 000 points sans annuler ni jeter', test: (p) => lt(p, 'cleanScore') >= 3000 },
    { id: 'perfect2', page: 'secret', secret: true, reward: 40, name: 'Place nette', hint: 'Vide la grille 2 fois dans la même partie', test: (p) => lt(p, 'bestPerfects') >= 2 },
    { id: 'hoard', page: 'secret', secret: true, reward: 40, name: 'Coffre plein', hint: 'Garde 2 000 pièces en poche', test: (p) => p.coins >= 2000 },
    { id: 'allmodes', page: 'secret', secret: true, reward: 40, name: 'Curieux', hint: 'Joue en Classique, Chrono et Chill', test: (p) => ['classic', 'chrono', 'chill'].every((m) => ((p.modes || {})[m] || {}).games > 0) },
  ];
  const STICKER_REWARD = 20;

  // Pays every sticker that just became true. Returns { profile, fresh: [sticker] }.
  function checkStickers(prev, today) {
    const got = prev.stickers || {};
    const fresh = STICKERS.filter((s) => !got[s.id] && s.test(prev));
    if (!fresh.length) return { profile: prev, fresh };
    const stickers = { ...got };
    for (const s of fresh) stickers[s.id] = today;
    const coins = fresh.reduce((a, s) => a + (s.reward || STICKER_REWARD), 0);
    return { profile: earn({ ...prev, stickers }, coins), fresh };
  }

  // Rewarded ad: pays the run's coins a second time.
  const doubleRun = (prev, report) => ({ ...prev, coins: prev.coins + report.total });

  // Coins spent in a run (discarding a piece). Returns null when the wallet is short.
  const spend = (prev, amount) => (prev.coins >= amount ? { ...prev, coins: prev.coins - amount } : null);

  const findSkin = (kind, id) => (SKINS[kind] || []).find((s) => s.id === id);

  function buy(prev, kind, id) {
    const skin = findSkin(kind, id);
    if (!skin || skin.price == null || prev.owned[kind].includes(id) || prev.coins < skin.price) return null;
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
      list.filter((s) => s.price != null && !profile.owned[kind].includes(s.id)).map((s) => ({ kind, ...s })));
    all.sort((a, b) => a.price - b.price);
    return all[0] || null;
  }

  // Onboarding: the guided first game and one-time tips. profile.tips is optional ({ id: true }).
  const tipSeen = (profile, id) => !!(profile.tips && profile.tips[id]);
  const markTip = (prev, id) => (tipSeen(prev, id) ? prev : { ...prev, tips: { ...(prev.tips || {}), [id]: true } });
  // Players who already played (before the tutorial existed) skip it.
  const needsTutorial = (profile) => !tipSeen(profile, 'tutorial') && !profile.games && !totalStars(profile);

  return {
    tipSeen, markTip, needsTutorial,
    HISTORY, modeStats, recentScores,
    addDays, dayDiff, monthDays,
    DAILY_ATTEMPTS, FREEZE_COST, FREEZE_MAX, STREAK_SKIN, dailyOf, streakOf, dailyAttemptsLeft, startDaily, streakNow,
    applyDaily, buyFreeze, monthTrophy, STICKER_PAGES, STICKERS, STICKER_REWARD, checkStickers,
    PUZZLE_FIRST, PUZZLE_PACK, PUZZLE_HINT, puzzleStarsOf, puzzleOpen, puzzlesSolved, applyPuzzle,
    WORLD_NAMES, worldFreeOpen, worldPrimeRate, worldPrime, UPGRADE_PRICES, upgradeLevel, upgradePrice, buyUpgrade,
    WORLD_ORDER, LEVELS_PER_WORLD, TRIAL_LEVEL, CHESTS, chestState, openChest, freeBombs, useFreeBomb, bossBeaten, EXTRA_MOVES, START_BONUS_COST, SKIP_COST, SKIP_AFTER, levelFails, recordFail, canSkip, extraMovesCost,
    levelStars, levelCleared, totalStars, worldStars, worldGate, worldOpen, levelOpen, applyLevel, skipLevel,
    SKINS, MISSIONS, createProfile, migrate, ensureDay, missionStatus, missionText, runCoins, applyRun, doubleRun, spend, buy, equip, nextGoal };
});
