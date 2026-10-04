// Cubo Blocks — Game over / level result screen.
'use strict';

// ---------- game over screen ----------
const overEl = document.getElementById('over');
const overCard = document.getElementById('over-card');

function showGameOver(report, lifeBefore = {}) {
  document.getElementById('over-title').textContent = state.timeUp ? tr('Temps écoulé !') : state.quit ? tr('Partie terminée') : tr('Plus de place !');
  document.getElementById('over-score').textContent = fmt(state.score);
  document.getElementById('over-best').textContent = tr('Record : ') + fmt(best);
  const isRecord = state.score >= best && state.score > bestAtStart && bestAtStart > 0;
  overCard.classList.toggle('is-record', isRecord);
  endCubo(overCard, isRecord ? 'star' : state.score >= best / 2 ? 'happy' : 'oops');
  renderRunSummary(lifeBefore, isRecord);

  const earnEl = document.getElementById('over-earn');
  const coinsEl = document.getElementById('over-coins');
  earnEl.innerHTML = '';
  const lines = report ? report.earned : [];
  let shown = report ? report.coinsBefore : profile.coins;
  coinsEl.textContent = fmt(shown);
  lines.forEach((line, i) => {
    const row = document.createElement('div');
    row.className = 'earn-line';
    row.innerHTML = '<span></span><b></b>';
    row.firstChild.textContent = line.label;
    row.lastChild.innerHTML = '+' + line.coins + COIN;
    earnEl.appendChild(row);
    setTimeout(() => {
      row.classList.add('in');
      countCoins(coinsEl, shown, shown + line.coins);
      shown += line.coins;
    }, 350 + i * 420);
  });

  const linesDone = 350 + lines.length * 420;
  renderGoal(linesDone);
  lastReport = report;
  adBtn.classList.remove('show');
  adBtn.disabled = false;
  if (report && report.total > 0) {
    adBtn.innerHTML = tr`Regarder une pub · +${report.total}${COIN}`;
    setTimeout(() => adBtn.classList.add('show'), linesDone);
  }
  renderRunMissions(document.getElementById('over-missions'));
  overEl.classList.add('show');
}

// End-of-run summary: four numbers of the run, a personal best flagged, and a share button.
function runSummary(lifeBefore) {
  const st = state.stats || {};
  const best = (k) => (lifeBefore[k] || 0) > 0 && (st[k] || 0) > (lifeBefore[k] || 0);
  return [
    { label: tr('Lignes'), value: fmt(st.lines || 0) },
    { label: tr('Combo max'), value: st.bestCombo >= 2 ? times(st.bestCombo) : '–', best: st.bestCombo >= 2 && best('bestCombo') },
    { label: tr('D’un coup'), value: st.bestMulti >= 2 ? st.bestMulti + tr(' lignes') : st.bestMulti === 1 ? tr('1 ligne') : '–', best: st.bestMulti >= 2 && best('bestMulti') },
    { label: tr('Formes'), value: fmt(st.pieces || 0) },
  ];
}
function renderRunSummary(lifeBefore, isRecord) {
  const tiles = runSummary(lifeBefore);
  document.getElementById('over-stats').innerHTML = tiles.map((x) =>
    `<div${x.best ? ' class="pb"' : ''}><b>${x.value}</b><span>${x.best ? tr('Record !') : x.label}</span></div>`).join('');
  const share = document.getElementById('over-share');
  share.onclick = () => shareRun(tiles, isRecord);
}
async function shareRun(tiles, isRecord) {
  unlockAudio();
  sfx.turn();
  const text = [
    `Cubo Blocks · ${modeLabel()}`,
    tr`${fmt(state.score)} points${isRecord ? tr(' · nouveau record') : ''}`,
    tiles.filter((x) => x.value !== '–').map((x) => `${x.label} : ${x.value}`).join(' · '),
  ].join('\n');
  const nativeShare = window.Capacitor && Capacitor.isNativePlatform() && Capacitor.Plugins.Share;
  if (nativeShare) {
    // The native sheet rejects when closed without sharing: nothing to say then.
    try { await nativeShare.share({ text }); } catch (err) {
      if (!/cancel/i.test((err && err.message) || '')) flashShare(tr('Partage impossible ici'));
    }
    return;
  }
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    flashShare(tr('Résumé copié'));
  } catch (err) {
    if (err && err.name !== 'AbortError') flashShare(tr('Partage impossible ici')); // AbortError: the share sheet was closed
  }
}
// No toast in the app: the button says what happened for a moment.
function flashShare(text) {
  const btn = document.getElementById('over-share');
  const label = btn.lastChild;
  const before = label.textContent;
  label.textContent = text;
  setTimeout(() => { label.textContent = before; }, 1800);
}

const adBtn = document.getElementById('over-ad');
let lastReport = null;
adBtn.addEventListener('click', async () => {
  if (!lastReport || adBtn.disabled) return;
  adBtn.disabled = true;
  const ok = await window.CuboBlocksAds.showRewarded();
  if (!ok) { adBtn.disabled = false; return; }
  const report = lastReport;
  lastReport = null;
  const before = profile.coins;
  profile = M.doubleRun(profile, report);
  saveProfile();
  renderWallet();
  adBtn.classList.remove('show');
  const row = document.createElement('div');
  row.className = 'earn-line in';
  row.innerHTML = tr('<span>Bonus pub</span><b></b>');
  row.lastChild.innerHTML = '+' + report.total + COIN;
  document.getElementById('over-earn').appendChild(row);
  countCoins(document.getElementById('over-coins'), before, profile.coins);
  renderGoal(400);
  sfx.buy();
});

function countCoins(el, from, to) {
  const steps = Math.min(12, to - from);
  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      el.textContent = fmt(Math.round(from + ((to - from) * i) / steps));
      sfx.coin(i);
    }, i * 28);
  }
}

function renderGoal(delay) {
  const el = document.getElementById('over-goal');
  const goal = M.nextGoal(profile);
  el.classList.remove('ready');
  if (!goal) { el.textContent = tr('Toute la boutique est débloquée'); return; }
  const ready = profile.coins >= goal.price;
  const kind = goal.kind === 'blocks' ? tr('les blocs') : goal.kind === 'cubo' ? tr('l’accessoire de Cubo') : tr('le thème');
  el.innerHTML = '<span></span><div class="bar"><i></i></div>';
  el.firstChild.textContent = ready
    ? tr`« ${goal.name} » est disponible en boutique`
    : tr`Plus que ${fmt(goal.price - profile.coins)} pièces pour ${kind} « ${goal.name} »`;
  const bar = el.querySelector('.bar > i');
  setTimeout(() => {
    bar.style.width = Math.min(100, (profile.coins / goal.price) * 100) + '%';
    el.classList.toggle('ready', ready);
  }, delay);
}

// Today's missions. live: current run stats (in-game view). completed: finished by the run just ended.
function renderMissionList(el, completed, live) {
  const status = M.missionStatus(profile, live || {});
  const allDone = status.every((m) => m.done);
  el.innerHTML = '<h3></h3>';
  el.firstChild.textContent = allDone ? tr('Missions du jour · nouvelles demain') : tr('Missions du jour');
  const fresh = new Set(completed.map((m) => m.id));
  for (const m of status) {
    const div = document.createElement('div');
    div.className = 'mission' + (m.done ? ' done' : '') + (fresh.has(m.id) ? ' new' : '');
    div.innerHTML = '<div class="top"><span></span><span class="reward"></span></div><div class="bar"><i></i></div><div class="num"></div>';
    div.querySelector('.top span').textContent = m.text;
    div.querySelector('.reward').innerHTML = '+' + m.reward + COIN;
    div.querySelector('.num').textContent = m.done ? tr('Terminée') : `${fmt(m.current)} / ${fmt(m.target)}`;
    el.appendChild(div);
    const bar = div.querySelector('.bar > i');
    if (m.done) bar.parentElement.style.display = 'none';
    requestAnimationFrame(() => { bar.style.width = (m.current / m.target) * 100 + '%'; });
  }
}

// Game over: one line for today's missions (the ones this run finished are already in the coin lines).
function renderRunMissions(el) {
  const status = M.missionStatus(profile, {});
  const done = status.filter((m) => m.done).length;
  el.className = 'missions over-missions';
  el.innerHTML = `<div class="missions-line"><span>${tr`Missions du jour · ${done}/${status.length}`}</span><span class="pips">${status.map((m) => `<i class="${m.done ? 'done' : ''}"></i>`).join('')}</span></div>`;
}

// opts: { mode, level, stage, seed }; mode and level default to the current game's.
function newGame(opts = {}) {
  profile = M.ensureDay(profile, today());
  saveProfile();
  if (keepsBest()) bests[recordKey()] = best;
  const mode = opts.mode || (state.mode === 'adventure' ? prefs.mode : state.mode);
  const world = opts.world || (mode === 'worlds' ? state.world : null);
  const level = opts.level || state.level;
  // Free play difficulty: obstacles from the equipped theme (worlds.js freeObstacles).
  const obstacles = ['classic', 'chrono', 'chill'].includes(mode) && !opts.stage && !opts.puzzle ? WD.freeObstacles(profile.equipped.boards, level) : undefined;
  state = L.createGame(opts.seed ?? Date.now(), { mode, level, budget: profile.coins, stage: opts.stage,
    world, upgrades: profile.upgrades, puzzle: opts.puzzle, obstacles });
  enterRun();
}
// Shows `state` as a fresh or resumed run: run flags, wallet, effects, HUD.
function enterRun() {
  music.sync(); // each world has its own song
  levelSettled = false;
  failCounted = false;
  paintBackground();
  best = bests[recordKey()] || 0;
  bestAtStart = best;
  recordAnnounced = false;
  flagDownAt = 0;
  runSettled = false;
  runCoinsShown = (state.stats && state.stats.coins) || 0;
  renderWallet();
  displayScore = state.score;
  drag = null;
  returning = []; pops = []; fades = []; particles = []; floaters = [];
  banners = []; overAt = 0; slotIn = new Array(MAX_SLOTS).fill(now()); slotSpin = new Array(MAX_SLOTS).fill(0); nextIn = now();
  aiming = null; flyers = [];
  tracks = new Map(); shifts = []; drops = new Map();
  sweeps = []; punch = null; comboAt = 0; comboBreak = null;
  showTrash(false);
  syncMode();
  overEl.classList.remove('show');
  // The game shows: no menu screen (Défis, Aventure, sheets...) may stay on top of it.
  for (const el of document.querySelectorAll('.overlay.ui.show')) el.classList.remove('show');
  resetAnnounced();
  renderInventory();
  refreshBonusTexts();
  save();
  modeTips();
}

document.getElementById('again').addEventListener('click', () => { unlockAudio(); newGame(); });

// Ends the current run (coins and missions count) and starts a new one.
// A free run in progress is parked instead when a level, a daily or a puzzle starts.
function restartRun(opts) {
  const park = !isFree(opts) && freeInProgress();
  if (park) parked = state;
  const report = state.over || park ? null : settleRun();
  const coins = ((report && report.total) || 0) + (isFree(opts) ? dropParked() : 0);
  newGame(opts);
  if (coins) banners.push({ icon: 'coin', text: '+' + coins, sub: tr('Pièces de la partie'), gold: true });
}

const inProgress = () => !state.over && state.moves > 0;
const isFree = (st) => !st.stage && !st.puzzle;
const freeInProgress = () => isFree(state) && inProgress();
// A new free run replaces the parked one: its coins and missions count now. Returns the coins earned.
function dropParked() {
  if (!parked) return 0;
  const res = M.applyRun(M.ensureDay(profile, today()), L.runStats(parked));
  parked = null;
  profile = res.profile;
  saveProfile();
  renderWallet();
  return res.report.total;
}
// Back to the parked free run; the level or puzzle in progress, if any, is dropped.
function resumeParked() {
  if (!parked) return;
  if (!state.over) settleRun();
  state = parked;
  parked = null;
  enterRun();
}
