// Cubo Blocks — Daily level and streak.
'use strict';

// ---------- daily level, streak, profile ----------
const profileEl = document.getElementById('profile');
const FLAME_SVG = (size = 18, on = true) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.3.2 1.7 1 2.8 2.1 3.3-.4-3.3.3-6.3 1-9z" fill="${on ? '#ff7a1a' : 'currentColor'}" opacity="${on ? 1 : 0.35}"/><path d="M12 13.5c.9 1.4 2.6 2.2 2.6 4.2a2.6 2.6 0 0 1-5.2 0c0-1.5.9-2.6 2.6-4.2z" fill="${on ? '#ffd23f' : 'transparent'}"/></svg>`;
// Streak freeze: an ice-blue snowflake, faded when the slot is empty.
const SNOW_SVG = (size = 22, on = true) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="${on ? '#3fb7e8' : 'currentColor'}" stroke-width="2.4" stroke-linecap="round" opacity="${on ? 1 : 0.3}"><path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/></svg>`;
const TROPHY_SVG = (kind, size = 44) => {
  const fill = kind === 'gold' ? '#f5c542' : kind === 'silver' ? '#c9d2de' : 'none';
  const stroke = kind ? (kind === 'gold' ? '#b07a12' : '#8a96a8') : 'currentColor';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round" opacity="${kind ? 1 : 0.35}"><path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none"/><path d="M10 13h4v3h-4zM8 19.5h8V21H8zM9.5 16h5l1 3.5h-7z"/></svg>`;
};
// One glyph per album page, white on the sticker's colored badge.
const STICKER_GLYPHS = {
  master: CROWN_PATH,
  combo: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
  explorer: '<path d="M6 21V4M6 4h11l-2.5 4L17 12H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>',
  faithful: '<path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.3.2 1.7 1 2.8 2.1 3.3-.4-3.3.3-6.3 1-9z" fill="currentColor"/>',
  collector: '<path d="M7 4h10l4 5-9 11L3 9z M3 9h18 M9.5 4 8 9l4 11 4-11-1.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  secret: '<path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z" fill="currentColor"/><circle cx="19" cy="19" r="1.8" fill="currentColor"/><circle cx="5" cy="4.5" r="1.3" fill="currentColor"/>',
};
// Unearned secret stickers show a question mark instead of their glyph, name and hint.
const SECRET_GLYPH = '<path d="M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.8v.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18.3" r="1.5" fill="currentColor"/>';
const PAGE_COLORS = { combo: '#ff8fab', explorer: '#6fd6a0', faithful: '#ff9f43', collector: '#8b7cf6', master: '#f5b700', secret: '#3fc1b0' };
const WORLD_COLORS = { plain: '#5cc64a', sea: '#1a6aa8', space: '#6a3fd0', ice: '#5ccfe6', forest: '#2f7a4a', retro: '#306230', arcade: '#ff3fd0', volcano: '#e8501a' };
let freshStickers = new Set();

// Pays newly earned stickers; returns them as report lines and queues their peel animation.
function stickerLines() {
  const res = M.checkStickers(profile, today());
  profile = res.profile;
  for (const st of res.fresh) freshStickers.add(st.id);
  return res.fresh.map((st) => ({ label: tr('Autocollant : ') + st.name, coins: st.reward || M.STICKER_REWARD }));
}

const dailyWord = (day) => (day === today() ? tr('Niveau du jour') : tr('Jour rattrapé'));

// Menu "Défis" button: today's level status and streak.
function renderDailyButton() {
  const t = today();
  const d = M.dailyOf(profile, t);
  const left = M.dailyAttemptsLeft(profile, t, t);
  const streak = M.streakNow(profile, t);
  const world = worldName(LV.daily(t).world);
  document.getElementById('menu-daily-sub').textContent = dailyInProgress() ? (state.stage.daily === t ? tr`${world} · en cours` : tr('Jour rattrapé en cours'))
    : d.stars !== undefined ? tr`${world} · réussi`
    : left ? tr`${world} · ${left} essai${left > 1 ? 's' : ''}` : tr('Reviens demain');
  document.getElementById('menu-defis').classList.toggle('done', d.stars !== undefined);
  document.getElementById('menu-flame').innerHTML = FLAME_SVG(18, streak > 0) + streak;
  document.getElementById('menu-flame').setAttribute('aria-label', tr`Série de ${streak} jour${streak > 1 ? 's' : ''}`);
}

// Out of tries on today's level (not won): an ad gives the tries back once, coins buy one more.
function refillHtml(day) {
  const t = today();
  if (!M.canRefillDaily(profile, day, t)) return '';
  return (M.dailyAdReady(profile, day, t)
    ? tr`<button class="opt" data-act="ad-refill"><span>Regarde une pub : ${M.DAILY_ATTEMPTS} essais de plus</span><span class="price">Pub</span></button>` : '')
    + tr`<button class="opt" data-act="buy-try"><span>Un essai de plus pour sauver ta série</span><span class="price">${M.dailyTryCost(profile, day)}${COIN}</span></button>`;
}
function bindRefill(root, day, after) {
  const buy = root.querySelector('[data-act="buy-try"]');
  if (buy) {
    buy.disabled = profile.coins < M.dailyTryCost(profile, day);
    buy.addEventListener('click', () => {
      const next = M.buyDailyTry(profile, day, today());
      if (!next) { nope(); return; }
      profile = next; saveProfile(); renderWallet(); sfx.buy(); after();
    });
  }
  const ad = root.querySelector('[data-act="ad-refill"]');
  if (ad) {
    ad.addEventListener('click', async () => {
      ad.disabled = true;
      const ok = await window.CuboBlocksAds.showRewarded();
      const next = ok && M.adDailyRefill(profile, day, today());
      if (!next) { ad.disabled = false; return; }
      profile = next; saveProfile(); sfx.buy(); after();
    });
  }
}
const triesText = (left) => tr`${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`;

// Tries left on the daily being played once this attempt counts (Infinity for a past day).
const dailyTriesAfter = () => M.dailyAttemptsLeft(profile, state.stage.daily, today()) - (inProgress() ? 1 : 0);

function startDaily(day) {
  unlockAudio();
  launchDaily(day); // a free run in progress is parked, not dropped
}
function launchDaily(day) {
  // The same daily already going on will count as an attempt when it gets dropped.
  const going = state.stage && state.stage.daily === day && inProgress() ? 1 : 0;
  if (M.dailyAttemptsLeft(profile, day, today()) - going <= 0) { nope(); return; }
  hideAdventure();
  menuEl.classList.remove('show');
  const stage = LV.daily(day);
  restartRun({ mode: 'adventure', stage, seed: stage.seed });
  banners.push({ text: dailyWord(day), sub: LV.goalText(stage.goal), gold: true });
}

const frDate = (day) => new Date(day + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' });

function showDailyEnd(title, lines, total, outOfMoves, report) {
  const stage = state.stage;
  const day = stage.daily;
  const card = document.getElementById('level-end-card');
  const left = M.dailyAttemptsLeft(profile, day, today());
  const moreCost = M.extraMovesCost(stage.extra);
  const streak = report && report.streak;
  card.innerHTML = `
      <h2>${title}</h2>
      <div class="stage-sub">${dailyWord(day)} #${LV.dayNumber(day)} · ${worldName(stage.world)}</div>
      <div class="stage-stars">${starsRow(stage.stars, 44)}</div>
      <div class="stage-sub">${LV.goalText(stage.goal)} · ${fmt(Math.min(stage.goal.type === 'score' ? state.score : stage.progress, stage.goal.target))} / ${fmt(stage.goal.target)}</div>
      ${streak ? `<div class="unlock flame">${FLAME_SVG(20)} ${tr`Série : ${streak.count} jour${streak.count > 1 ? 's' : ''}`}</div>` : ''}
      ${report && report.unlocked ? `<div class="unlock">${tr('Skin de blocs « Or » débloqué ! Équipe-le dans la Boutique, onglet Blocs.')}</div>` : ''}
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>${tr('Pièces')}</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      ${refillHtml(day)}
      ${outOfMoves ? `<button class="opt" data-act="more"><span>${tr`+${M.EXTRA_MOVES} coups pour finir (1 étoile max)`}</span><span class="price">${moreCost}${COIN}</span></button>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="menu">Menu</button>
        ${left && !(stage.won && stage.stars >= 3)
        ? `<button class="btn primary" data-act="retry">${stage.won ? tr('Rejouer') : tr('Réessayer')}${Number.isFinite(left) ? ` (${left})` : ''}</button>` : ''}
      </div>`;
  endCubo(card, stageMood(stage));
  card.querySelector('[data-act="menu"]').addEventListener('click', () => { hideAdventure(); backToMenu(); });
  const retry = card.querySelector('[data-act="retry"]');
  if (retry) retry.addEventListener('click', () => startDaily(day));
  bindRefill(card, day, () => showDailyEnd(title, lines, total, outOfMoves, report));
  bindMoreMoves(card, moreCost);
  levelEndEl.classList.add('show');
  starChimes(stage.stars);
}
