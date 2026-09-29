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
  // 'boards' are whole themes (background, board, score sign, menus); the key stays for old saves.
  const SKINS = {
    blocks: [
      { id: 'classic', name: 'Classique', price: 0 },
      { id: 'neon', name: 'Néon', price: 200 },
      { id: 'candy', name: 'Bonbon', price: 400 },
      { id: 'pixel', name: 'Pixel', price: 600 },
    ],
    boards: [
      { id: 'night', name: 'Autoroute', price: 0 },
      { id: 'sunset', name: 'Coucher de soleil', price: 300 },
      { id: 'desert', name: 'Route 66', price: 500 },
      { id: 'mountain', name: 'Col de montagne', price: 800 },
      { id: 'dash', name: 'Tableau de bord', price: 1200 },
    ],
  };

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
      coins: 0,
      owned: { blocks: ['classic'], boards: ['night'] },
      equipped: { blocks: 'classic', boards: 'night' },
      day: null,
      missions: [],
      missionsDone: 0,
      games: 0,
    }, day);
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

  // Rewarded ad: pays the run's coins a second time.
  const doubleRun = (prev, report) => ({ ...prev, coins: prev.coins + report.total });

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

  return { SKINS, MISSIONS, createProfile, ensureDay, missionStatus, missionText, runCoins, applyRun, doubleRun, buy, equip, nextGoal };
});
