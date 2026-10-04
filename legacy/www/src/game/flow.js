// Cubo Blocks — Game flow: starting runs, placing pieces, clears, bonuses, end of run.
'use strict';

// ---------- game flow ----------
const LINE_WORDS = () => ['', '', tr('Double !'), tr('Triple !'), tr('Quadruple !'), tr('Énorme !'), tr('Délirant !')];

// Returns false when the tutorial refuses the move (the piece flies back).
function commit(idx, row, col) {
  const res = L.place(state, idx, row, col);
  if (!res) return;
  if (tut && !T.accepts(tut.step, res.events)) { tutorialNope(); return false; }
  const ev = res.events;
  const prevCombo = state.combo;
  state = res.state;
  const t = now();
  if (!ev.lines && prevCombo >= 2 && !state.combo) {
    comboBreak = { t0: t, n: prevCombo };
    cuboReact('oops', 900);
    sfx.fizzle();
  }

  ev.placed.forEach(([r, c]) => pops.push({ r, c, t0: t }));

  if (ev.lines) {
    const pr = ev.placed.reduce((s, p) => s + p[0], 0) / ev.placed.length;
    const pc = ev.placed.reduce((s, p) => s + p[1], 0) / ev.placed.length;
    const plan = ev.waves && ev.waves.length && !calm() ? planFalls(ev.waves, t) : null;
    for (const cell of ev.cleared) {
      const wave = cell.wave || 0;
      const delay = wave ? wave * WAVE_MS + cell.c * 12 : Math.hypot(cell.r - pr, cell.c - pc) * 28;
      fades.push({ ...cell, t0: t, delay, segs: plan && plan.fadeSegs.get(wave + ':' + (cell.r * SIZE + cell.c)) });
      burst(cell, t + delay, 4, 60 + ev.combo * 20);
    }
    if (plan) tracks = plan.tracks;
    const [fx, fy] = cellCenter(pr, pc);
    const margin = lay.cell * 1.6;
    const tier = comboTier(ev.combo, ev.lines);
    floaters.push({ text: '+' + ev.points + (ev.nitro ? ' ' + times(ev.nitro) : ''), x: Math.max(margin, Math.min(W - margin, fx)), y: fy, t0: t, big: true,
      scale: 1 + tier * 0.18, tier });
    if (!calm()) {
      for (const r of ev.rows) sweeps.push({ row: r, t0: t });
      for (const c of ev.cols) sweeps.push({ col: c, t0: t });
      if (tier) punch = { t0: t, amp: 0.012 + tier * 0.01 };
      if (tier >= 2 || ev.lines >= 2) confetti(t, 10 + tier * 14 + ev.lines * 6);
    }
    if (ev.combo >= 2) comboAt = t;
    if (ev.perfect || tier >= 2) cuboReact('star', 1300, 1);
    else cuboReact('happy', 900, 0.45 + 0.2 * Math.min(3, ev.lines));
    if (ev.combo >= 2 && comboTier(ev.combo) > comboTier(ev.combo - 1)) sfx.sparkle(comboTier(ev.combo));

    const words = LINE_WORDS();
    let text = words[Math.min(ev.lines, words.length - 1)];
    let sub = ev.combo >= 2 ? tr('COMBO ×') + ev.combo : '';
    if (!text && ev.combo >= 2) { text = tr('Combo ×') + ev.combo; sub = ''; }
    if (ev.perfect) { text = tr('Grille vide !'); sub = '+300'; }
    if (text) banners.push({ text, sub, tier: ev.perfect ? 3 : tier });

    launchFlyers(ev.collected, t, (b) => Math.hypot(b.r - pr, b.c - pc) * 28);
    collectTips(ev.collected);

    shake = Math.min(16, 3 + ev.lines * 3 + ev.combo * 1.5);
    sfx.clear(ev.lines, ev.combo);
    haptic('lines', ev.lines, ev.combo);
  } else {
    sfx.place();
    haptic('place');
  }

  if (ev.timeGain > 0) {
    const [bx, by] = chronoBar();
    floaters.push({ text: '+' + Math.round(ev.timeGain / 1000) + ' s', x: bx + lay.board - 30, y: by - 10, t0: t });
    sfx.time();
  }
  if (state.stage || state.world || state.obstacles) stageEffects(ev, t);
  if (state.stage) bossEffects(ev, t);
  if (tut) { tutorialMoved(idx, t); return; }
  refilled(ev.refilled, t);
  afterChange(t, ev.over);
}

// Turns the logic's gravity waves into per-block fall paths. Every block present after a wave's
// clear follows its moves; blocks cleared by a later wave hand their path to their fade.
function planFalls(waves, t) {
  let live = new Map();
  const fadeSegs = new Map();
  waves.forEach((wave, w) => {
    if (w > 0) {
      for (const i of wave.cleared) {
        if (live.has(i)) fadeSegs.set(w + ':' + i, live.get(i));
        live.delete(i);
      }
    }
    const start = t + w * WAVE_MS + FALL_AFTER;
    const moved = new Map();
    for (const [from, to] of wave.moves) {
      const rows = Math.floor(to / SIZE) - Math.floor(from / SIZE);
      moved.set(to, [...(live.get(from) || []), { t0: start, dur: fallMs(rows), from: Math.floor(from / SIZE), to: Math.floor(to / SIZE) }]);
    }
    for (const [from] of wave.moves) live.delete(from);
    for (const [to, segs] of moved) live.set(to, segs);
  });
  // One soft landing per wave that moved anything.
  waves.forEach((wave, w) => {
    if (!wave.moves.length) return;
    const longest = Math.max(...wave.moves.map(([a, b]) => Math.floor(b / SIZE) - Math.floor(a / SIZE)));
    setTimeout(() => sfx.land(), w * WAVE_MS + FALL_AFTER + fallMs(longest));
    if (w > 0) setTimeout(() => sfx.clear(1, state.combo), w * WAVE_MS);
  });
  return { tracks: live, fadeSegs };
}

// Row a falling block is drawn at: accelerating fall, then a small bounce on landing.
function segRow(segs, t, row) {
  for (const seg of segs) {
    if (t < seg.t0) return seg.from;
    const p = (t - seg.t0) / seg.dur;
    if (p < 1) return seg.from + (seg.to - seg.from) * p * p;
    const q = (t - seg.t0 - seg.dur) / 160;
    if (q < 1 && seg === segs[segs.length - 1]) return seg.to - 0.1 * Math.sin(q * Math.PI);
  }
  return row;
}
const tracksBusy = (segs, t) => { const last = segs[segs.length - 1]; return t < last.t0 + last.dur + 160; };

// Aventure feedback: cracked cells, blasts, gravity chains, and what the world dropped this turn.
function stageEffects(ev, t) {
  for (const d of ev.damaged || []) burst({ r: d.r, c: d.c, kind: d.kind }, t, 5, 80, '#ffffff');
  if ((ev.damaged || []).length) sfx.crack();
  if ((ev.cleared || []).some((c) => c.kind === 'bubble')) sfx.pop();
  const eggs = (ev.cleared || []).filter((c) => c.kind === 'egg').length;
  if (eggs) { banners.push({ text: eggs > 1 ? eggs + tr(' œufs trouvés !') : tr('Œuf trouvé !'), sub: '', gold: true }); sfx.sparkle(2); }
  if (ev.blasts && ev.blasts.length) {
    const rocket = ev.blasts.some((b) => b.kind === 'rocket');
    banners.push(rocket ? { text: tr('Feu d’artifice !'), sub: tr('Explosion en X'), gold: true } : { text: tr('Boum !'), sub: tr('Explosion en croix') });
    if (rocket && !calm()) confetti(t, 30);
    if (!calm()) shake = 18;
    sfx.bomb();
  }
  if (ev.chain) {
    const banner = { text: tr('Réaction ×') + (ev.chain + 1), sub: tr('La gravité enchaîne'), gold: true };
    if (calm()) banners.push(banner); else setTimeout(() => banners.push(banner), WAVE_MS);
  }
  for (const sp of ev.spawned || []) {
    const at = t + 250;
    if (sp.row !== undefined) {
      banners.push({ text: tr('Courant !'), sub: tr('Une ligne a glissé') });
      if (!calm()) shifts.push({ row: sp.row, t0: at });
      sfx.swoosh();
      continue;
    }
    if (sp.kind === 'firefly') {
      pops.push({ r: sp.r, c: sp.c, t0: at });
      burst({ r: sp.r, c: sp.c, kind: 'ember' }, at, 6, 50, '#fff6a0');
      setTimeout(() => sfx.coin(3), 250);
      continue;
    }
    if (sp.gone) {
      // Left by itself (mole back underground, hole closing).
      fades.push({ r: sp.r, c: sp.c, kind: sp.kind, t0: t, delay: 250 });
      setTimeout(() => sfx.swoosh(), 250);
      continue;
    }
    if (sp.from) {
      if (!calm()) drops.set(sp.r * SIZE + sp.c, { t0: at, kind: sp.kind, dur: sp.hop ? 360 : 260, from: sp.from, hop: sp.hop });
      if (sp.hop) setTimeout(() => sfx.swoosh(), 250);
      continue;
    }
    const land = sp.kind === 'mushroom' || sp.grow ? 320 : 420;
    if (!calm()) drops.set(sp.r * SIZE + sp.c, { t0: at, kind: sp.kind, dur: land, grow: sp.grow });
    setTimeout(() => {
      burst({ r: sp.r, c: sp.c, kind: sp.kind }, now(), 6, 70);
      if (sp.kind === 'mushroom' || sp.grow) sfx.grow(); else if (sp.kind === 'ember' || sp.kind === 'lava') sfx.sizzle(); else sfx.thunk();
    }, 250 + (calm() ? 0 : land));
  }
}

// New tray pieces slide in from the "next" column, which gets a fresh piece itself.
function refilled(slots, t) {
  for (const i of slots) { slotIn[i] = t; slotSpin[i] = 0; }
  if (slots.length) nextIn = t;
}

function payCoins(cost) {
  if (!cost) return;
  profile = M.spend(profile, cost) || { ...profile, coins: Math.max(0, profile.coins - cost) };
  saveProfile();
  renderWallet();
  const r = walletEl.getBoundingClientRect();
  floaters.push({ text: '-' + cost, x: r.left + r.width / 2, y: r.bottom + 34, t0: now() });
}

function discardPiece(idx, x, y) {
  const res = L.discard(state, idx);
  if (!res) return false;
  const t = now();
  state = res.state;
  payCoins(res.events.cost);
  const color = pal()[res.events.piece.color];
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = 80 + Math.random() * 160;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, t0: t, life: 450 + Math.random() * 300,
      size: lay.cell * (0.12 + Math.random() * 0.12), color });
  }
  refilled(res.events.refilled, t);
  sfx.toss();
  haptic('toss');
  afterChange(t, res.events.over);
  return true;
}

function undoMove() {
  const res = L.undo(state);
  if (!res) { nope(); return; }
  const t = now();
  state = res.state;
  best = Math.max(bestAtStart, state.score); // an undone move doesn't keep its record
  payCoins(res.events.cost);
  refilled([0, 1, 2], t);
  pops = []; fades = []; flyers = [];
  sfx.undo();
  haptic('undo');
  afterChange(t, res.events.over);
}

// Star confetti thrown up from the board on big clears, in the board's block colors.
function confetti(t0, count) {
  const colors = pal().filter(Boolean);
  for (let k = 0; k < count; k++) {
    particles.push({
      x: lay.bx + Math.random() * lay.board, y: lay.by + lay.board * (0.3 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 420, vy: -320 - Math.random() * 420,
      t0: t0 + Math.random() * 120, life: 1100 + Math.random() * 600, g: 620,
      size: lay.cell * (0.22 + Math.random() * 0.18), color: colors[Math.floor(Math.random() * colors.length)],
      star: true, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
    });
  }
}

function burst(cell, t0, count, speed, extraColor) {
  const [x, y] = cellCenter(cell.r, cell.c);
  for (let k = 0; k < count; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed + Math.random() * 180;
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120,
      t0, life: 500 + Math.random() * 400,
      size: lay.cell * (0.12 + Math.random() * 0.14),
      color: extraColor && k % 3 === 0 ? extraColor : cell.kind ? SPECIAL_COLORS[cell.kind] : pal()[cell.color],
    });
  }
}

// Shared bookkeeping after any move: record, missions, game over, persistence.
function afterChange(t, over) {
  if (keepsBest() && state.score > best) {
    best = state.score;
    if (!recordAnnounced && bestAtStart > 0) {
      recordAnnounced = true;
      banners.push({ text: tr('Nouveau record !'), sub: '', gold: true });
      haptic('record');
      cuboReact('star', 1500, 1);
      flagDownAt = t;
      if (!calm()) confetti(t, 36);
      sfx.sparkle(3);
    }
  }
  checkMissions();
  if (state.stuck && !over) {
    if (state.mode === 'puzzle') tip('stuck-puzzle', tr('Ça ne rentre plus'), tr('Annule tes derniers coups (gratuit), ou prends un indice.'), undoEl);
    else if (state.mode === 'chill') tip('stuck-chill', tr('Coincé ?'), tr('Annule ton dernier coup, ou maintiens une forme tout en bas pour la jeter.'), undoEl);
    else tip('stuck', tr('Coincé ?'), tr('Utilise un bonus, annule ton dernier coup, ou maintiens une forme tout en bas pour la jeter.'), undoEl);
  }
  if (over) endGame(t);
  renderInventory();
  save();
}

function checkMissions() {
  for (const m of M.missionStatus(profile, L.runStats(state))) {
    if (!m.done || announced.has(m.id)) continue;
    announced.add(m.id);
    banners.push({ text: tr('Mission réussie'), sub: m.text + ' · +' + m.reward, subIcon: 'coin', gold: true });
    sfx.mission();
    haptic('mission');
  }
  renderMissionBadges();
}

// Missions: menu row, HUD badge, and a sheet reachable from both (live progress during a run).
const missionsEl = document.getElementById('missions');
const missionsOpenEl = document.getElementById('missions-open');
const liveRun = () => (state.over || state.stage ? {} : L.runStats(state));
function renderMissionBadges() {
  const status = M.missionStatus(profile, liveRun());
  const done = status.filter((m) => m.done).length;
  missionsOpenEl.querySelector('.badge').textContent = done ? `${done}/${status.length}` : '';
  document.getElementById('menu-missions-sub').textContent = done === status.length ? tr('Toutes faites') : tr`${done}/${status.length} faites aujourd’hui`;
  document.getElementById('menu-missions-pips').innerHTML = status.map((m) => `<i class="${m.done ? 'done' : ''}"><b style="width:${(m.current / m.target) * 100}%"></b></i>`).join('');
}
function openMissions() {
  rollDay();
  unlockAudio();
  missionsFromMenu = menuEl.classList.contains('show');
  menuEl.classList.remove('show');
  renderMissionList(document.getElementById('missions-list'), [], liveRun());
  missionsEl.classList.add('show');
}
let missionsFromMenu = false;
function closeMissions() {
  missionsEl.classList.remove('show');
  if (missionsFromMenu) openMenu();
}
missionsOpenEl.addEventListener('click', openMissions);
document.getElementById('missions-close').addEventListener('click', closeMissions);
missionsEl.addEventListener('click', (e) => { if (e.target === missionsEl) closeMissions(); });

function resetAnnounced() {
  announced = new Set(M.missionStatus(profile, L.runStats(state)).filter((m) => m.done).map((m) => m.id));
  renderMissionBadges();
}
resetAnnounced();

// Bonus icons fly from their cell to the inventory button.
function launchFlyers(collected, t, delayOf) {
  for (const b of collected) {
    const [x, y] = cellCenter(b.r, b.c);
    flyers.push({ ...b, x, y, t0: t + delayOf(b) });
  }
  if (collected.some((b) => !b.coins)) sfx.collect();
}

function useBonus(type, target) {
  const res = L.use(state, type, target);
  if (!res) return false;
  const ev = res.events;
  state = res.state;
  const t = now();
  cuboReact('wow', 900, 0.5);

  if (type === 'bomb') {
    for (const cell of ev.cleared) {
      const delay = Math.hypot(cell.r - target.r, cell.c - target.c) * 45;
      fades.push({ ...cell, t0: t, delay });
      burst(cell, t + delay, 6, 120, '#ffb347');
    }
    const [fx, fy] = cellCenter(target.r, target.c);
    floaters.push({ text: '+' + ev.points, x: fx, y: fy, t0: t, big: true });
    launchFlyers(ev.collected, t, (b) => Math.hypot(b.r - target.r, b.c - target.c) * 45);
    if (ev.perfect) banners.push({ text: tr('Grille vide !'), sub: '+300' });
    bossEffects(ev, t);
    shake = 18;
    sfx.bomb();
    haptic('bomb');
  } else {
    const ui = BONUS_UI[type];
    banners.length = 0;
    banners.push({ icon: type, text: ui.name, sub: ui.hint(bonusLv(type)), gold: true });
    refilled(ev.refilled, t);
    sfx.bonus();
    haptic('bonus');
  }

  afterChange(t, ev.over);
  return true;
}

// Pays out coins and advances missions for the current run, once.
function settleRun() {
  if (runSettled) return null;
  runSettled = true;
  // A daily attempt counts once its run ends or is dropped after a move, never just for opening it.
  if (state.stage && state.stage.daily && state.moves > 0) {
    const next = M.countDaily(profile, state.stage.daily, today());
    if (next) profile = next;
  }
  const res = M.applyRun(M.ensureDay(profile, today()), L.runStats(state));
  profile = res.profile;
  const report = res.report;
  for (const line of stickerLines()) { report.earned.push(line); report.total += line.coins; }
  saveProfile();
  renderWallet();
  return report;
}

function endGame(t) {
  hideTips();
  drag = null;
  showTrash(false);
  aiming = null;
  if (state.puzzle) { endPuzzle(t); return; }
  overAt = t;
  if (state.stage) { endLevel(); return; }
  best = Math.max(best, state.score);
  const lifeBefore = { ...(profile.lifetime || {}) }; // personal bests before this run, for the summary
  const report = settleRun();
  setTimeout(() => { sfx.over(); haptic('lose'); }, 350);
  setTimeout(() => showGameOver(report, lifeBefore), 1300);
  save();
}
