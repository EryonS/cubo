// Cubo Blocks — Aventure: world strip, level path, levels and endless runs.
'use strict';

// ---------- aventure ----------
const adventureEl = document.getElementById('adventure');
const stageEl = document.getElementById('stage');
const levelEndEl = document.getElementById('level-end');
const STAR_PATH = 'M12 2.6l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1l-5.7 3 1.1-6.3L2.8 9.3l6.4-.9z';
const starSvg = (on, size = 16) => `<svg class="star${on ? ' on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
const starsRow = (n, size) => [0, 1, 2].map((k) => starSvg(k < n, size)).join('');
const LOCK_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const worldName = (w) => WD.WORLDS[w].name;
const WORLD_MAX_STARS = M.LEVELS_PER_WORLD * 3;
// "Niveau 7", "Épreuve" (level 10) or "Boss" (level 20).
const levelName = (n) => (n === M.LEVELS_PER_WORLD ? tr('Boss') : n === M.TRIAL_LEVEL ? tr('Épreuve') : tr('Niveau ') + n);
const CHEST_SVG = '<svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true"><path d="M3 11h24v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="#c98b4a"/><path d="M3 11V8a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v3z" fill="#e0a45e"/><path d="M3 11h24" stroke="#8a5526" stroke-width="2.4"/><rect x="12" y="8.5" width="6" height="7" rx="1.6" fill="#ffd166" stroke="#8a5526" stroke-width="1.6"/></svg>';
let stageBomb = false; // "start with a Bombe" option on the level sheet
let openWorldId = null;

function hideAdventure() {
  for (const el of [adventureEl, stageEl, levelEndEl]) el.classList.remove('show');
}

// Aventure is one screen: a strip of worlds on top, the picked world below (rules, chests, levels,
// endless run). Swipe the world or use the arrows to change world; locked worlds show what opens them.
const worldIndex = (w) => M.WORLD_ORDER.indexOf(w);
function worldGateText(w) {
  const prev = M.WORLD_ORDER[worldIndex(w) - 1];
  if (prev && !M.worldOpen(profile, prev)) return tr('Ouvre d’abord ') + worldName(prev) + '.';
  return !M.levelCleared(profile, prev, M.LEVELS_PER_WORLD)
    ? tr`Bats le boss de ${worldName(prev)} pour ouvrir ce monde.`
    : tr`Il te faut ${M.worldGate(w)} étoiles pour ouvrir ce monde.`;
}

function renderWorldStrip() {
  const list = document.getElementById('worlds');
  if (list.childElementCount !== M.WORLD_ORDER.length) {
    list.innerHTML = '';
    for (const w of M.WORLD_ORDER) {
      const tile = document.createElement('button');
      tile.dataset.w = w;
      tile.setAttribute('role', 'tab');
      const cv = document.createElement('canvas');
      cv.width = 120; cv.height = 90;
      tile.appendChild(cv);
      tile.insertAdjacentHTML('beforeend', `<span class="name">${worldName(w)}</span><span class="meta"></span>`);
      tile.addEventListener('click', () => { if (openWorldId !== w) { sfx.turn(); showWorld(w); } });
      list.appendChild(tile);
    }
  }
  for (const tile of list.children) {
    const w = tile.dataset.w;
    const open = M.worldOpen(profile, w);
    tile.className = 'world-tile' + (open ? '' : ' locked') + (w === openWorldId ? ' pick' : '') + (M.worldMastered(profile, w) ? ' mastered' : '');
    tile.setAttribute('aria-selected', w === openWorldId);
    drawPreview(tile.querySelector('canvas'), profile.equipped.blocks, w);
    tile.querySelector('.meta').innerHTML = open ? starSvg(true, 11) + M.worldStars(profile, w) : LOCK_SVG;
    // Every star won: a gold crown on the tile (and the "<world> maîtrisé" sticker).
    if (M.worldMastered(profile, w) && !tile.querySelector('.crown')) tile.insertAdjacentHTML('beforeend', `<span class="crown" aria-label="${tr('Monde maîtrisé')}"><svg width="18" height="18" viewBox="0 0 24 24">${CROWN_PATH}</svg></span>`);
  }
}

// Opens Aventure on the world of the next level to play.
function openAdventure() {
  const next = nextAdventure();
  openWorld(next ? next[0] : lastOpenWorld());
}

function openWorld(w) {
  unlockAudio();
  hideAdventure();
  menuEl.classList.remove('show');
  overEl.classList.remove('show');
  document.getElementById('adventure-stars').innerHTML = starSvg(true, 18) + fmt(M.totalStars(profile));
  showWorld(w);
  adventureEl.classList.add('show');
  requestAnimationFrame(() => {
    const tile = document.querySelector(`#worlds [data-w="${w}"]`);
    if (tile) tile.scrollIntoView({ block: 'nearest', inline: 'center' });
    drawLevelPath();
  });
}

// dir: -1 / 1 slides the page in from that side.
function showWorld(w, dir = 0) {
  const from = openWorldId;
  openWorldId = w;
  if (!dir && from) dir = Math.sign(worldIndex(w) - worldIndex(from));
  const open = M.worldOpen(profile, w);
  renderWorldStrip();
  const page = document.getElementById('world-page');
  page.classList.toggle('locked', !open);
  document.getElementById('world-name').textContent = worldName(w);
  document.getElementById('world-stars').innerHTML = open ? starSvg(true, 16) + `${M.worldStars(profile, w)} / ${WORLD_MAX_STARS}` : LOCK_SVG;
  document.getElementById('world-lock').innerHTML = open ? '' : `<div class="pz-locked">${LOCK_SVG}<span>${worldGateText(w)}</span></div>`;
  const i = worldIndex(w);
  page.querySelector('[data-step="-1"]').disabled = i === 0;
  page.querySelector('[data-step="1"]').disabled = i === M.WORLD_ORDER.length - 1;
  if (open) renderChests(w); else document.getElementById('world-chests').innerHTML = '';
  const rules = WD.WORLDS[w];
  document.getElementById('world-rules').innerHTML =
    `<div class="plus"><b>+</b><span>${rules.plus}</span></div><div class="minus"><b>−</b><span>${rules.minus}</span></div>${twistRow(w)}`;
  const grid = document.getElementById('levels');
  grid.innerHTML = '';
  for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) {
    const open = M.levelOpen(profile, w, n);
    const stars = M.levelStars(profile, w, n);
    const boss = n === M.LEVELS_PER_WORLD;
    const trial = n === M.TRIAL_LEVEL;
    const b = document.createElement('button');
    b.className = 'lvl' + (open ? '' : ' locked') + (stars !== undefined ? ' done' : '') + (boss ? ' boss' : '') + (trial ? ' trial' : '');
    b.innerHTML = `<span class="num">${open ? n : LOCK_SVG}</span>` +
      ((boss || trial) && stars === undefined ? `<small>${boss ? tr('Boss') : tr('Épreuve')}</small>` : `<span class="stars">${starsRow(stars || 0, 12)}</span>`);
    // Winding path: rows of 5, every other row runs right to left.
    const row = Math.floor((n - 1) / 5);
    b.style.gridRow = row + 1;
    b.style.gridColumn = (row % 2 ? 4 - ((n - 1) % 5) : (n - 1) % 5) + 1;
    b.setAttribute('aria-label', levelName(n) + (trial || boss ? tr` (niveau ${n})` : '') + (open ? '' : tr(', verrouillé')));
    b.addEventListener('click', () => { if (open) { sfx.turn(); openStage(w, n); } else nope(); });
    grid.appendChild(b);
  }
  if (open) renderEndless(w); else document.getElementById('world-endless').innerHTML = '';
  if (dir && !calm()) {
    page.classList.remove('from-left', 'from-right');
    void page.offsetWidth;
    page.classList.add(dir > 0 ? 'from-right' : 'from-left');
  }
  const tile = document.querySelector(`#worlds [data-w="${w}"]`);
  if (tile && adventureEl.classList.contains('show')) tile.scrollIntoView({ block: 'nearest', inline: 'center', behavior: calm() ? 'auto' : 'smooth' });
  requestAnimationFrame(drawLevelPath);
}
const stepWorld = (d) => {
  const w = M.WORLD_ORDER[worldIndex(openWorldId) + d];
  if (!w) return false;
  sfx.turn();
  showWorld(w, d);
  return true;
};
for (const b of document.querySelectorAll('#world-page [data-step]')) b.addEventListener('click', () => stepWorld(+b.dataset.step));
onSwipe(document.getElementById('world-page'), (d) => { if (!stepWorld(d)) nope(); });
document.getElementById('world-page').addEventListener('animationend', (e) => {
  if (e.target.id === 'world-page') e.target.classList.remove('from-left', 'from-right');
});

// Line joining the level buttons in order: solid up to the last cleared level, dotted after.
function drawLevelPath() {
  if (adventureEl.classList.contains('show')) drawPath(document.getElementById('levels-path'), '#levels');
}
function drawPath(svg, grid) {
  const box = svg.getBoundingClientRect();
  const pts = [...document.querySelectorAll(grid + ' .num')].map((el) => {
    const r = el.getBoundingClientRect();
    return [Math.round(r.left + r.width / 2 - box.left), Math.round(r.top + r.height / 2 - box.top)];
  });
  if (!pts.length || !box.width) return;
  const cleared = [...document.querySelectorAll(grid + ' .lvl')].filter((b) => b.classList.contains('done')).length;
  const line = (a) => a.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
  svg.setAttribute('viewBox', `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
  svg.innerHTML = `<path class="todo" d="${line(pts.slice(Math.max(0, cleared - 1)))}"/>` + (cleared > 1 ? `<path class="done" d="${line(pts.slice(0, cleared))}"/>` : '');
}
window.addEventListener('resize', () => requestAnimationFrame(drawLevelPath));

// Endless run under the world's rules (the former Mondes mode), opened by the world's trial.
function renderEndless(w) {
  const el = document.getElementById('world-endless');
  const open = M.worldFreeOpen(profile, w);
  const rules = WD.WORLDS[w];
  if (!open) {
    el.innerHTML = `<div class="endless"><h3>${tr('Partie sans fin')}</h3><p>${tr`Réussis l'épreuve (niveau ${M.TRIAL_LEVEL}) pour jouer ici sans limite de coups, avec une prime en pièces.`}</p></div>`;
    return;
  }
  const rate = M.worldPrimeRate(w);
  el.innerHTML = `<div class="endless"><h3>${tr('Partie sans fin')}</h3>
      <p>${tr`Les règles de ${worldName(w)}, sans limite de coups. Chaque point rapporte une prime en pièces.`}${rules.free && rules.free.note ? ' ' + rules.free.note : ''}</p>
      <div class="fw-facts"><div><small>${tr('Record')}</small><b>${fmt(bests['worlds-' + w] || 0)}</b></div>
      <div><small>${tr('Prime')}</small><b>${fmt(Math.round(rate * 5))}</b>${COIN}<small>${tr('par 1 000 pts')}</small></div></div>
      <button class="btn ghost" data-act="endless">${tr('Jouer sans fin')}</button></div>`;
  el.querySelector('[data-act="endless"]').addEventListener('click', () => {
    unlockAudio();
    guardRun(freeInProgress() || parked, () => {
      hideAdventure();
      restartRun({ mode: 'worlds', world: w });
    });
  });
}

// Star chests of a world: a bar of the world's stars with 3 chests on it; a ready one opens on tap.
function renderChests(w) {
  const el = document.getElementById('world-chests');
  const stars = M.worldStars(profile, w);
  const pct = (v) => Math.min(100, (v / WORLD_MAX_STARS) * 100);
  const label = (c) => [c.coins ? `${c.coins}${COIN}` : '', c.bombs ? tr`${c.bombs} Bombes offertes` : ''].filter(Boolean).join(' + ');
  el.innerHTML = `<div class="chest-bar"><i style="width:${pct(stars)}%"></i></div>` + M.CHESTS.map((c, i) => {
    const st = M.chestState(profile, w, i);
    return `<button class="chest ${st}" data-i="${i}" style="left:${pct(c.stars)}%" aria-label="${tr`Coffre ${c.stars} étoiles : ${label(c).replace(/<[^>]+>/g, tr(' pièces'))}`}">
        ${CHEST_SVG}<small>${st === 'open' ? tr('Ouvert') : st === 'ready' ? tr('Ouvrir !') : starSvg(true, 10) + c.stars}</small></button>`;
  }).join('');
  for (const btn of el.querySelectorAll('.chest')) {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.i;
      const res = M.openChest(profile, w, i);
      if (!res) {
        nope();
        const c = M.CHESTS[i];
        if (M.chestState(profile, w, i) === 'locked') btn.querySelector('small').innerHTML = label(c);
        return;
      }
      profile = res.profile;
      saveProfile();
      renderWallet();
      sfx.buy();
      haptic('buy');
      renderChests(w);
      const opened = el.querySelector(`.chest[data-i="${i}"]`);
      opened.classList.add('burst');
      opened.querySelector('small').innerHTML = '+' + label(res.reward);
    });
  }
}

// Level sheet: goal, budget, best stars, then play / skip / starting bonus.
function openStage(w, n) {
  const stage = LV.level(w, n);
  const best = M.levelStars(profile, w, n);
  const card = document.getElementById('stage-card');
  const budget = stage.clock ? tr`${Math.round(stage.clock / 1000)} secondes (les lignes rajoutent du temps)` : tr`${stage.maxMoves} coups`;
  const canSkip = M.canSkip(profile, w, n);
  // Stars: 1 for the win, 2 with 15 % of the budget left, 3 with 30 % (see finishStage in logic.js).
  const keep = (k) => (stage.clock ? `${Math.ceil((stage.clock / 1000) * k)} s` : tr`${Math.ceil(stage.maxMoves * k)} coups`);
  const starRule = tr`1 étoile en réussissant, 2 s'il te reste ${keep(0.15)}, 3 s'il t'en reste ${keep(0.3)}.`;
  card.innerHTML = `
      <div class="shop-head">
        <button class="close" data-act="back" aria-label="${tr('Retour au monde')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <h2>${levelName(n)}</h2>
      </div>
      <div class="stage-sub">${worldName(w)}${n === M.TRIAL_LEVEL || n === M.LEVELS_PER_WORLD ? tr(' · niveau ') + n : ''}</div>
      <div class="stage-goal">${LV.goalText(stage.goal)}</div>
      ${stage.boss ? `<div class="stage-note">${tr`Il a ${stage.goal.target} PV : chaque ligne qui le traverse lui en retire 2. Tous les ${stage.boss.every} coups, il riposte en posant ${stage.boss.count > 1 ? stage.boss.count + ' ' + LV.KIND_NAMES[stage.boss.kind] : tr('un obstacle')}.`}</div>` : ''}
      ${n === M.TRIAL_LEVEL ? tr('<div class="stage-note">Un niveau plus corsé au milieu du monde, mieux payé.</div>') : ''}
      ${stage.twist ? `<div class="stage-twist">${kindIcon(stage.twist.kind, 28)}<span><b>${WD.WORLDS[w].twist.name}</b> ${WD.WORLDS[w].twist.text}</span></div>` : ''}
      <div class="stage-sub">${budget}</div>
      <div class="stage-stars">${starsRow(best || 0, 34)}</div>
      <div class="stage-note">${starRule}</div>
      <button class="opt${stageBomb ? ' on' : ''}" data-act="bomb"><span>${tr('Partir avec une Bombe')}</span><span class="price">${M.freeBombs(profile) ? tr`Offerte (×${M.freeBombs(profile)})` : M.START_BONUS_COST + COIN}</span></button>
      ${canSkip ? `<button class="opt" data-act="skip"><span>${tr('Passer le niveau (sans étoile)')}</span><span class="price">${M.SKIP_COST}${COIN}</span></button>` : ''}
      <div class="actions"><button class="btn primary" data-act="play">${tr('Jouer')}</button></div>`;
  const bombBtn = card.querySelector('[data-act="bomb"]');
  bombBtn.disabled = !M.freeBombs(profile) && profile.coins < M.START_BONUS_COST;
  if (bombBtn.disabled) stageBomb = false;
  card.querySelector('[data-act="back"]').addEventListener('click', () => openWorld(w));
  bombBtn.addEventListener('click', () => { stageBomb = !stageBomb; bombBtn.classList.toggle('on', stageBomb); sfx.turn(); });
  const skipBtn = card.querySelector('[data-act="skip"]');
  if (skipBtn) {
    skipBtn.disabled = profile.coins < M.SKIP_COST;
    skipBtn.addEventListener('click', async () => {
      if (!await ask({ title: tr('Passer le niveau ?'), text: tr`Il coûte ${M.SKIP_COST} pièces et ne rapporte aucune étoile.`, ok: tr('Passer') })) return;
      const next = M.skipLevel(profile, w, n);
      if (!next) { nope(); return; }
      profile = next;
      saveProfile();
      renderWallet();
      sfx.buy();
      openWorld(w);
    });
  }
  card.querySelector('[data-act="play"]').addEventListener('click', () => startLevel(w, n));
  hideAdventure();
  stageEl.classList.add('show');
}

function startLevel(w, n) {
  unlockAudio();
  launchLevel(w, n); // a free run in progress is parked, not dropped
}
function launchLevel(w, n) {
  const freeBomb = stageBomb && M.freeBombs(profile) > 0;
  const bomb = freeBomb || (stageBomb && profile.coins >= M.START_BONUS_COST);
  stageBomb = false;
  hideAdventure();
  menuEl.classList.remove('show');
  restartRun({ mode: 'adventure', stage: LV.level(w, n) });
  if (bomb) {
    if (freeBomb) { profile = M.useFreeBomb(profile); saveProfile(); } else payCoins(M.START_BONUS_COST);
    state = { ...state, inventory: { ...state.inventory, bomb: state.inventory.bomb + 1 } };
    renderInventory();
    save();
  }
  banners.push({ text: n === M.LEVELS_PER_WORLD ? tr('Boss !') : levelName(n), sub: LV.goalText(state.stage.goal), gold: true, tier: n === M.LEVELS_PER_WORLD ? 2 : 0 });
  // First level with the world's second obstacle: introduce it once.
  const tip = 'twist-' + w;
  if (state.stage.twist && !M.tipSeen(profile, tip)) {
    banners.push({ text: tr('Nouveau : ') + WD.WORLDS[w].twist.name, sub: LV.KIND_NAMES[state.stage.twist.kind] + tr(' en vue'), gold: true });
    profile = M.markTip(profile, tip);
    saveProfile();
  }
}

// Level over: pay the run (grid coins, missions), record stars, then show the result.
function endLevel() {
  const runReport = settleRun();
  let levelReport = null;
  const stage = state.stage;
  if (stage.won && !levelSettled) {
    levelSettled = true;
    const res = stage.daily
      ? M.applyDaily(profile, stage.daily, today(), stage.stars)
      : stage.event ? M.applyEvent(profile, stage.event, stage.eventDay || today(), stage.n, stage.stars)
        : M.applyLevel(profile, stage.world, stage.n, stage.stars);
    profile = res.profile;
    levelReport = res.report;
    levelReport.earned.push(...stickerLines());
    saveProfile();
    renderWallet();
  }
  // One failed attempt per level start, even if bought moves run out again.
  if (!stage.won && !stage.daily && !stage.event && !failCounted) {
    failCounted = true;
    profile = M.recordFail(profile, stage.world, stage.n);
    saveProfile();
  }
  setTimeout(() => { if (stage.won) { sfx.mission(); haptic('win'); } else { sfx.over(); haptic('lose'); } }, 350);
  setTimeout(() => showLevelEnd(runReport, levelReport), stage.won ? 900 : 1300);
  save();
}

function nextLevelOf(w, n) {
  if (n < M.LEVELS_PER_WORLD) return [w, n + 1];
  const next = M.WORLD_ORDER[M.WORLD_ORDER.indexOf(w) + 1];
  return next && M.worldOpen(profile, next) ? [next, 1] : null;
}

function showLevelEnd(runReport, levelReport) {
  const stage = state.stage;
  const { world: w, n } = stage;
  const card = document.getElementById('level-end-card');
  const outOfMoves = !stage.won && !state.timeUp && stage.movesLeft <= 0;
  const title = stage.won
    ? (n === M.LEVELS_PER_WORLD ? tr('Boss vaincu !') : n === M.TRIAL_LEVEL ? tr('Épreuve réussie !') : tr('Niveau réussi !'))
    : state.timeUp ? tr('Temps écoulé !') : outOfMoves ? tr('Plus de coups !') : tr('Plus de place !');
  const lines = [...(runReport ? runReport.earned : []), ...(levelReport ? levelReport.earned : [])];
  const total = lines.reduce((a, l) => a + l.coins, 0);
  if (stage.daily) { showDailyEnd(title, lines, total, outOfMoves, levelReport); return; }
  if (stage.event) { showEventEnd(stage.won ? (n === 10 ? tr('Boss vaincu !') : tr('Niveau réussi !')) : title, lines, total, outOfMoves, levelReport); return; }
  const next = stage.won ? nextLevelOf(w, n) : null;
  const moreCost = M.extraMovesCost(stage.extra);
  card.innerHTML = `
      <h2>${title}</h2>
      <div class="stage-sub">${worldName(w)} · ${levelName(n)}</div>
      <div class="stage-stars">${starsRow(stage.stars, 44)}</div>
      <div class="stage-sub">${LV.goalText(stage.goal)} · ${fmt(Math.min(stage.goal.type === 'score' ? state.score : stage.progress, stage.goal.target))} / ${fmt(stage.goal.target)}</div>
      ${levelReport && levelReport.themeUnlocked ? `<div class="unlock">${tr`Thème « ${worldName(levelReport.themeUnlocked)} » débloqué !`}</div><button class="opt" data-act="equip"><span>${tr('Mettre ce thème maintenant')}</span><span class="price">${tr('Équiper')}</span></button>` : ''}
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>${tr('Pièces')}</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      ${outOfMoves ? `<button class="opt" data-act="more"><span>${tr`+${M.EXTRA_MOVES} coups pour finir (1 étoile max)`}</span><span class="price">${moreCost}${COIN}</span></button>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="map">${tr('Carte')}</button>
        ${stage.won && stage.stars >= 3 ? '' : `<button class="btn ${next ? 'ghost' : 'primary'}" data-act="again">${stage.won ? tr('Rejouer') : tr('Réessayer')}</button>`}
        ${next ? tr('<button class="btn primary" data-act="next">Suivant</button>') : ''}
      </div>`;
  endCubo(card, stageMood(stage));
  card.querySelector('[data-act="map"]').addEventListener('click', () => openWorld(w));
  const again = card.querySelector('[data-act="again"]');
  if (again) again.addEventListener('click', () => startLevel(w, n));
  if (next) card.querySelector('[data-act="next"]').addEventListener('click', () => (next[1] === 1 && next[0] !== w ? openWorld(next[0]) : openStage(next[0], next[1])));
  bindMoreMoves(card, moreCost);
  const equip = card.querySelector('[data-act="equip"]');
  if (equip) equip.addEventListener('click', () => {
    const next = M.equip(profile, 'boards', levelReport.themeUnlocked);
    if (!next) { nope(); return; }
    profile = next;
    saveProfile();
    paintBackground();
    sfx.buy();
    equip.disabled = true;
    equip.querySelector('.price').textContent = tr('Équipé');
  });
  levelEndEl.classList.add('show');
  starChimes(stage.stars);
}

// One chime per star, in step with the stars' CSS entrance (0, 180, 360 ms).
function starChimes(n) {
  for (let k = 0; k < n; k++) setTimeout(() => { sfx.star(k); haptic('star'); }, 60 + k * 180);
}

function bindMoreMoves(card, cost) {
  const more = card.querySelector('[data-act="more"]');
  if (!more) return;
  more.disabled = profile.coins < cost;
  more.addEventListener('click', () => {
    const revived = L.addMoves(state, M.EXTRA_MOVES);
    if (!revived || profile.coins < cost) { nope(); return; }
    payCoins(cost);
    state = revived;
    overAt = 0;
    levelEndEl.classList.remove('show');
    banners.push({ text: tr`+${M.EXTRA_MOVES} coups`, sub: tr('Dernière chance !'), gold: true });
    sfx.buy();
    renderInventory();
    save();
  });
}

document.getElementById('adventure-close').addEventListener('click', () => { hideAdventure(); openMenu(); });
for (const el of [adventureEl, stageEl]) {
  el.addEventListener('click', (e) => { if (e.target === el) { hideAdventure(); openMenu(); } });
}
