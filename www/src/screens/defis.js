// Cubo Blocks — Défis tab: calendar and the picked day.
'use strict';

// ----- Défis tab: the calendar on top (a week, unfolds to the month), the picked day's level, the
// streak and today's missions. A daily in progress is resumed from here.
const defisEl = document.getElementById('defis');
let calMonth = null; // 'YYYY-MM' shown in the month view
let calWeek = null; // Monday of the week shown in the week view
let defisDay = null; // day picked in the calendar
let calOpen = false; // month view instead of the week strip
const CHEV = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const weekOf = (day) => M.addDays(day, -((new Date(day + 'T12:00:00').getDay() + 6) % 7));

function pickDay(day) {
  const t = today();
  defisDay = day > t ? t : day < LV.DAILY_START ? LV.DAILY_START : day;
  calMonth = defisDay.slice(0, 7);
  calWeek = weekOf(defisDay);
}

function openDefis(day) {
  unlockAudio();
  rollDay();
  // A daily in progress is what the tab is for: show its day.
  pickDay(day || (dailyInProgress() && state.stage.daily) || defisDay || today());
  menuEl.classList.remove('show');
  hideAdventure();
  renderDefis();
  defisEl.classList.add('show');
}

function renderDefis() {
  const t = today();
  const streak = M.streakNow(profile, t);
  document.getElementById('defis-flame').innerHTML = FLAME_SVG(18, streak > 0) + streak;
  document.getElementById('defis-coins').textContent = fmt(profile.coins);
  const body = document.getElementById('defis-body');
  body.innerHTML = calendarHtml() + dayHtml(defisDay) + streakHtml()
    + '<div class="missions" id="defis-missions"></div>'
    + tr('<div class="defis-note">Elles avancent dans tous les modes. Trois nouvelles chaque jour.</div>');
  renderMissionList(document.getElementById('defis-missions'), [], liveRun());
  body.querySelector('[data-act="cal"]').addEventListener('click', () => { calOpen = !calOpen; sfx.turn(); renderDefis(); });
  for (const b of body.querySelectorAll('[data-cal]')) b.addEventListener('click', () => stepCal(+b.dataset.cal));
  for (const b of body.querySelectorAll('[data-day]')) b.addEventListener('click', () => { pickDay(b.dataset.day); sfx.turn(); renderDefis(); });
  const play = body.querySelector('[data-act="play"]');
  play.addEventListener('click', () => {
    sfx.turn();
    if (dailyInProgress() && state.stage.daily === defisDay) { defisEl.classList.remove('show'); return; }
    guardRun(inProgress() && !isFree(state), () => startDaily(defisDay));
  });
  bindRefill(body, defisDay, renderDefis);
  const freeze = body.querySelector('[data-act="freeze"]');
  freeze.addEventListener('click', () => {
    const next = M.buyFreeze(profile);
    if (!next) { nope(); return; }
    profile = next; saveProfile(); renderWallet(); sfx.buy(); renderDefis();
  });
}

function streakHtml() {
  const t = today();
  const st = M.streakOf(profile);
  const now = M.streakNow(profile, t);
  return `
      <div class="section-title">${tr('Série')}</div>
      <div class="streak-card">
        ${FLAME_SVG(38, now > 0)}<span class="big">${now}</span>
        <div class="txt"><b>${CuboBlocksI18n.many(now) ? tr("jours d'affilée") : tr("jour d'affilée")}</b><br>${tr`Record : ${st.best}`}</div>
        <div class="freezes" aria-label="${tr`Gels de série : ${st.freezes} sur ${M.FREEZE_MAX}`}">
          <span class="slots">${Array.from({ length: M.FREEZE_MAX }, (_, i) => SNOW_SVG(22, i < st.freezes)).join('')}</span>
          <small>${tr`Gels ${st.freezes}/${M.FREEZE_MAX}`}</small>
        </div>
      </div>
      <button class="opt" data-act="freeze" ${st.freezes >= M.FREEZE_MAX || profile.coins < M.FREEZE_COST ? 'disabled' : ''}><span>${tr('Gel de série : protège un jour manqué')}</span><span class="price">${M.FREEZE_COST}${COIN}</span></button>`;
}

// Previous / next week (or month when unfolded): arrows, or a swipe on the calendar.
function stepCal(d) {
  const arrow = document.querySelector(`#defis-body [data-cal="${d}"]`);
  if (!arrow || arrow.disabled) { nope(); return; }
  if (calOpen) calMonth = M.addDays(calMonth + '-15', d * 30).slice(0, 7);
  else pickDay(M.addDays(defisDay, d * 7)); // same weekday, the week before / after
  sfx.turn();
  renderDefis();
}
onSwipe(document.getElementById('defis-body'), stepCal, '.cal, .cal-head');

function dayCell(day) {
  const t = today();
  const d = M.dailyOf(profile, day);
  const off = day > t || day < LV.DAILY_START;
  const going = dailyInProgress() && state.stage.daily === day;
  const cls = (d.stars !== undefined ? ' done' : '') + (day === t ? ' today' : '') + (day === defisDay ? ' pick' : '');
  const mark = d.stars !== undefined ? `<span class="stars">${starsRow(d.stars, 8)}</span>` : going ? '<span class="dot"></span>' : '';
  return `<button data-day="${day}" class="${cls.trim()}" ${off ? 'disabled' : ''} aria-label="${frDate(day)}">${Number(day.slice(8))}${mark}</button>`;
}

// Week strip (default) or the whole month; the title toggles between them.
function calendarHtml() {
  const t = today();
  const first = calOpen ? calMonth <= LV.DAILY_START.slice(0, 7) : calWeek <= weekOf(LV.DAILY_START);
  const last = calOpen ? calMonth >= t.slice(0, 7) : calWeek >= weekOf(t);
  let html = `<div class="cal-head">
        <button class="close" data-cal="-1" aria-label="${calOpen ? tr('Mois précédent') : tr('Semaine précédente')}" ${first ? 'disabled' : ''}>${CHEV('M15 5l-7 7 7 7')}</button>
        <button class="cal-title" data-act="cal" aria-expanded="${calOpen}">${frMonth(calOpen ? calMonth : defisDay.slice(0, 7))}${CHEV('M6 9l6 6 6-6')}</button>
        <button class="close" data-cal="1" aria-label="${calOpen ? tr('Mois suivant') : tr('Semaine suivante')}" ${last ? 'disabled' : ''}>${CHEV('M9 5l7 7-7 7')}</button>
      </div><div class="cal">`;
  for (let i = 0; i < 7; i++) html += `<span class="dow">${new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' })}</span>`; // 2024-01-01 is a Monday
  if (calOpen) {
    const days = M.monthDays(calMonth);
    const offset = (new Date(days[0] + 'T12:00:00').getDay() + 6) % 7; // Monday first
    for (let i = 0; i < offset; i++) html += '<span></span>';
    for (const day of days) html += dayCell(day);
  } else {
    for (let i = 0; i < 7; i++) html += dayCell(M.addDays(calWeek, i));
  }
  return html + '</div>';
}

// The picked day's level with its Play (or Continuer) button: the reason to open the tab.
function dayHtml(day) {
  const t = today();
  const stage = LV.daily(day);
  const d = M.dailyOf(profile, day);
  const left = M.dailyAttemptsLeft(profile, day, t);
  const done = d.stars !== undefined;
  const going = dailyInProgress() && state.stage.daily === day;
  const budget = stage.clock ? `${Math.round(stage.clock / 1000)} s` : tr`${stage.maxMoves} coups`;
  const tries = day === t ? triesText(left) : tr('Essais illimités');
  const status = going ? tr('Partie en cours')
    : done ? `<span class="stars">${starsRow(d.stars, 18)}</span>`
    : left ? `${budget} · ${tries}` : tr('Plus d’essai aujourd’hui');
  const label = going ? tr('Continuer') : !left ? tr('Demain') : done ? tr('Rejouer') : tr('Jouer');
  const trophy = M.monthTrophy(profile, day.slice(0, 7));
  return `
      <div class="today${done ? ' done' : ''}">
        <small>${dailyWord(day)} #${LV.dayNumber(day)} · ${worldName(stage.world)}${day === t ? '' : ' · ' + frDate(day)}</small>
        <span class="goal-line">${LV.goalText(stage.goal)}</span>
        <div class="row"><span>${status}</span>
          <button class="btn primary" data-act="play" ${left || going ? '' : 'disabled'}>${label}</button></div>
        ${going ? '' : refillHtml(day)}
      </div>
      <p class="defis-note">${day === t ? tr('Le même niveau pour tout le monde. Réussis-en un chaque jour pour garder ta série.')
      : tr('Rattrape un jour manqué : il compte pour le trophée du mois, pas pour la série.')}
        ${trophy ? (trophy === 'gold' ? tr('Trophée d’or gagné ce mois-ci.') : tr('Trophée d’argent gagné ce mois-ci.')) : ''}</p>`;
}
