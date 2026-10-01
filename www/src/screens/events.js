// Cubo Blocks — Season events screen and runs.
'use strict';

// ---------- season events ----------
// Home row (only while an event is open) -> event screen: rules, the three rewards, 10 levels on a
// path. Levels play like Aventure levels in the event's world; progress is per year (meta.js EVENTS).
const eventEl = document.getElementById('event');
const eventLevelName = (n) => (n === 10 ? tr('Boss') : tr('Niveau ') + n);
const eventInProgress = () => inProgress() && !!(state.stage && state.stage.event);
const eventShown = { id: null }; // the event screen's event
const eventDayNow = () => (eventInProgress() && state.stage.eventDay) || today();
// "31 octobre" / "1er novembre" in French, "October 31" in English.
const frDay = (day) => {
  const date = new Date(day + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
  return GridlockI18n.lang() === 'fr' && day.slice(8, 10) === '01' ? date.replace(/^1 /, '1er ') : date;
};
const hatName = (id) => (M.SKINS.cubo.find((x) => x.id === id) || {}).name || '';
const CHEV_SVG = '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

// One home row per open event (two can overlap), plus the event of a level in progress.
function renderEventRow() {
  const box = document.getElementById('menu-events');
  const day = today();
  const list = M.eventsFor(day);
  const playing = eventInProgress() ? M.eventById(state.stage.event) : null;
  if (playing && !list.some((e) => e.id === playing.id)) list.unshift(playing);
  box.innerHTML = '';
  for (const ev of list) {
    const row = document.createElement('button');
    row.className = 'menu-defis event-row';
    const done = M.eventCleared(profile, ev.id, day);
    const trophy = M.seasonTrophy(profile, ev.id, M.eventYear(day));
    const sub = playing && playing.id === ev.id ? tr`${eventLevelName(state.stage.n)} en cours`
      : done >= ev.levels ? (trophy === 'gold' ? tr('Terminé · trophée en or') : tr('Terminé · trophée en argent'))
        : tr`${done} / ${ev.levels} niveaux · jusqu’au ${frDay(M.eventEnd(ev.id, day))}`;
    row.innerHTML = `<span class="ico">${kindIcon(ev.icon, 30)}</span><span class="txt"><b></b><small></small></span>${CHEV_SVG}`;
    row.querySelector('b').textContent = ev.name;
    row.querySelector('small').textContent = sub;
    row.addEventListener('click', () => {
      unlockAudio();
      sfx.turn();
      if (playing && playing.id === ev.id) { closeMenu(); return; } // back to the level in progress
      openEvent(ev.id);
    });
    box.appendChild(row);
  }
}

function openEvent(id = eventShown.id) {
  if (!id || !M.eventActive(today(), id)) { openMenu(); return; }
  eventShown.id = id;
  menuEl.classList.remove('show');
  overEl.classList.remove('show');
  hideAdventure();
  renderEvent();
  eventEl.classList.add('show');
  requestAnimationFrame(() => drawPath(document.getElementById('event-path'), '#event-levels'));
}
const closeEvent = () => { eventEl.classList.remove('show'); openMenu(); };
document.getElementById('event-close').addEventListener('click', closeEvent);

function renderEvent() {
  const day = today();
  const ev = M.eventById(eventShown.id);
  const year = M.eventYear(day);
  const rules = WD.WORLDS[ev.id];
  document.getElementById('event-title').textContent = ev.name;
  document.getElementById('event-stars').innerHTML = starSvg(true, 16) + `${M.eventTotalStars(profile, ev.id, day)} / ${ev.levels * 3}`;
  document.getElementById('event-intro').textContent = tr`Événement de saison jusqu’au ${frDay(M.eventEnd(ev.id, day))} : ${ev.levels} niveaux, ${ev.blurb}. Finis-les pour gagner le thème ${ev.name}, ${hatName(ev.hat).toLowerCase()} pour Cubo et le trophée ${year}. Tout repart à zéro l’an prochain.`;
  document.getElementById('event-rules').innerHTML =
    `<div class="plus"><b>+</b><span>${rules.plus}</span></div><div class="minus"><b>−</b><span>${rules.minus}</span></div>`;
  const trophy = M.seasonTrophy(profile, ev.id, year);
  const has = (kind, id) => (profile.owned[kind] || []).includes(id);
  const rewards = document.getElementById('event-rewards');
  rewards.innerHTML = `
      <div><canvas width="240" height="180"></canvas><span>${tr`Thème ${ev.name}`}</span>${has('boards', ev.theme) ? tr('<span class="got">Gagné</span>') : ''}</div>
      <div><canvas width="240" height="180"></canvas><span>${hatName(ev.hat)}</span>${has('cubo', ev.hat) ? tr('<span class="got">Gagné</span>') : ''}</div>
      <div>${TROPHY_SVG(trophy, 54)}<span>${tr`Trophée ${year}`}</span><span class="${trophy ? 'got' : ''}">${trophy === 'gold' ? tr('Or') : trophy === 'silver' ? tr('Argent · or avec 30 étoiles') : tr('Or avec 30 étoiles')}</span></div>`;
  const [themeCv, hatCv] = rewards.querySelectorAll('canvas');
  drawPreview(themeCv, profile.equipped.blocks, ev.theme);
  drawCuboPreview(hatCv, ev.hat, ev.theme);
  const grid = document.getElementById('event-levels');
  grid.innerHTML = '';
  for (let n = 1; n <= ev.levels; n++) {
    const open = M.eventLevelOpen(profile, ev.id, day, n);
    const stars = M.eventStars(profile, ev.id, day, n);
    const boss = n === ev.levels;
    const b = document.createElement('button');
    b.className = 'lvl' + (open ? '' : ' locked') + (stars !== undefined ? ' done' : '') + (boss ? ' boss' : '');
    b.innerHTML = `<span class="num">${open ? n : LOCK_SVG}</span>` +
      (boss && stars === undefined ? tr('<small>Boss</small>') : `<span class="stars">${starsRow(stars || 0, 12)}</span>`);
    const row = Math.floor((n - 1) / 5);
    b.style.gridRow = row + 1;
    b.style.gridColumn = (row % 2 ? 4 - ((n - 1) % 5) : (n - 1) % 5) + 1;
    b.setAttribute('aria-label', eventLevelName(n) + (open ? '' : tr(', verrouillé')));
    b.addEventListener('click', () => { if (open) { sfx.turn(); openEventStage(ev.id, n); } else nope(); });
    grid.appendChild(b);
  }
}

function openEventStage(id, n) {
  const ev = M.eventById(id);
  const stage = LV.eventLevel(id, n);
  const best = M.eventStars(profile, id, today(), n);
  const card = document.getElementById('stage-card');
  const budget = stage.clock ? tr`${Math.round(stage.clock / 1000)} secondes (les lignes rajoutent du temps)` : tr`${stage.maxMoves} coups`;
  const keep = (k) => (stage.clock ? `${Math.ceil((stage.clock / 1000) * k)} s` : tr`${Math.ceil(stage.maxMoves * k)} coups`);
  card.innerHTML = `
      <div class="shop-head">
        <button class="close" data-act="back" aria-label="${tr('Retour à l’événement')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <h2>${eventLevelName(n)}</h2>
      </div>
      <div class="stage-sub">${ev.name} · ${tr`niveau ${n}`}</div>
      <div class="stage-goal">${LV.goalText(stage.goal)}</div>
      ${stage.boss ? `<div class="stage-note">${tr`${stage.goal.target} PV : chaque ligne qui le traverse en retire 2. Tous les ${stage.boss.every} coups, il riposte avec des ${LV.KIND_NAMES[stage.boss.kind]}.`}</div>` : ''}
      <div class="stage-sub">${budget}</div>
      <div class="stage-stars">${starsRow(best || 0, 34)}</div>
      <div class="stage-note">${tr`1 étoile en réussissant, 2 s'il te reste ${keep(0.15)}, 3 s'il t'en reste ${keep(0.3)}.`}</div>
      <div class="actions"><button class="btn primary" data-act="play">${tr('Jouer')}</button></div>`;
  card.querySelector('[data-act="back"]').addEventListener('click', () => { stageEl.classList.remove('show'); openEvent(id); });
  card.querySelector('[data-act="play"]').addEventListener('click', () => { unlockAudio(); launchEventLevel(id, n); });
  eventEl.classList.remove('show');
  stageEl.classList.add('show');
}

function launchEventLevel(id, n) {
  const day = eventDayNow();
  hideAdventure();
  eventEl.classList.remove('show');
  menuEl.classList.remove('show');
  restartRun({ mode: 'adventure', stage: { ...LV.eventLevel(id, n), eventDay: day } });
  banners.push({ text: n === 10 ? tr('Boss !') : M.eventById(id).name, sub: LV.goalText(state.stage.goal), gold: true, tier: n === 10 ? 2 : 0 });
}

function showEventEnd(title, lines, total, outOfMoves, report) {
  const stage = state.stage;
  const n = stage.n;
  const ev = M.eventById(stage.event);
  const card = document.getElementById('level-end-card');
  const next = stage.won && n < ev.levels && M.eventActive(today(), ev.id) ? n + 1 : null;
  const moreCost = M.extraMovesCost(stage.extra);
  const unlocked = (report && report.unlocked) || [];
  const names = { boards: tr`Thème « ${ev.name} » débloqué !`, cubo: tr`${hatName(ev.hat)} pour Cubo !` };
  card.innerHTML = `
      <h2>${title}</h2>
      <div class="stage-sub">${ev.name} · ${eventLevelName(n)}</div>
      <div class="stage-stars">${starsRow(stage.stars, 44)}</div>
      <div class="stage-sub">${LV.goalText(stage.goal)} · ${fmt(Math.min(stage.goal.type === 'score' ? state.score : stage.progress, stage.goal.target))} / ${fmt(stage.goal.target)}</div>
      ${unlocked.map((u) => `<div class="unlock">${names[u.kind]}</div>`).join('')}
      ${unlocked.length ? tr('<button class="opt" data-act="wear"><span>Les mettre maintenant</span><span class="price">Équiper</span></button>') : ''}
      ${report && report.trophy ? `<div class="unlock">${report.trophy === 'gold' ? tr`Trophée ${ev.name} ${M.eventYear(stage.eventDay || today())} en or !` : tr`Trophée ${ev.name} ${M.eventYear(stage.eventDay || today())} en argent !`}</div>` : ''}
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>${tr('Pièces')}</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      ${outOfMoves ? `<button class="opt" data-act="more"><span>${tr`+${M.EXTRA_MOVES} coups pour finir (1 étoile max)`}</span><span class="price">${moreCost}${COIN}</span></button>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="map">${tr('Événement')}</button>
        ${stage.won && stage.stars >= 3 ? '' : `<button class="btn ${next ? 'ghost' : 'primary'}" data-act="again">${stage.won ? tr('Rejouer') : tr('Réessayer')}</button>`}
        ${next ? tr('<button class="btn primary" data-act="next">Suivant</button>') : ''}
      </div>`;
  endCubo(card, stageMood(stage));
  card.querySelector('[data-act="map"]').addEventListener('click', () => { levelEndEl.classList.remove('show'); openEvent(ev.id); });
  const again = card.querySelector('[data-act="again"]');
  if (again) again.addEventListener('click', () => { levelEndEl.classList.remove('show'); launchEventLevel(ev.id, n); });
  if (next) card.querySelector('[data-act="next"]').addEventListener('click', () => { levelEndEl.classList.remove('show'); openEventStage(ev.id, next); });
  bindMoreMoves(card, moreCost);
  const wear = card.querySelector('[data-act="wear"]');
  if (wear) wear.addEventListener('click', () => {
    for (const u of unlocked) profile = M.equip(profile, u.kind, u.id) || profile;
    saveProfile();
    paintBackground();
    sfx.buy();
    wear.disabled = true;
    wear.querySelector('.price').textContent = tr('Équipé');
  });
  levelEndEl.classList.add('show');
  starChimes(stage.stars);
}
