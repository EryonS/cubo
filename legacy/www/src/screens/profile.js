// Cubo Blocks — Profile screen: stickers, trophies.
'use strict';

// ----- profile screen -----
let profileTab = 'album';

function openProfile(tab) {
  unlockAudio();
  if (tab) profileTab = tab;
  if (profileTab === 'calendar') profileTab = 'album';
  menuEl.classList.remove('show');
  renderProfile();
  profileEl.classList.add('show');
}
for (const b of document.querySelectorAll('.ptab')) {
  b.addEventListener('click', () => { profileTab = b.dataset.ptab; sfx.turn(); renderProfile(); });
}

function renderProfile() {
  for (const b of document.querySelectorAll('.ptab')) b.classList.toggle('on', b.dataset.ptab === profileTab);
  const body = document.getElementById('profile-body');
  if (profileTab === 'settings') {
    // The same rows as the Réglages screen, moved here while this tab shows.
    body.replaceChildren(settingsBody);
    renderSettings();
    return;
  }
  if (profileTab === 'album') body.innerHTML = albumHtml();
  else body.innerHTML = statsHtml();
  for (const b of body.querySelectorAll('[data-sticker]')) b.addEventListener('click', () => { sfx.turn(); openSticker(b.dataset.sticker); });
  freshStickers.clear();
  for (const b of body.querySelectorAll('[data-smode]')) {
    b.addEventListener('click', () => { statsMode = b.dataset.smode; sfx.turn(); renderProfile(); });
  }
  const cap = body.querySelector('#chart-cap');
  for (const bar of body.querySelectorAll('.chart .bar')) {
    const show = () => {
      for (const o of body.querySelectorAll('.chart .bar.on')) o.classList.remove('on');
      bar.classList.add('on');
      const n = +bar.dataset.n;
      const count = body.querySelectorAll('.chart .bar').length;
      cap.textContent = tr`${n === count ? tr('Dernière partie') : tr`Partie ${n} sur ${count}`} : ${fmt(+bar.dataset.v)} points`;
    };
    bar.addEventListener('pointerenter', show);
    bar.addEventListener('click', show);
  }
}

function monthsSinceStart() {
  const out = [];
  let m = LV.DAILY_START.slice(0, 7);
  const end = today().slice(0, 7);
  while (m <= end) { out.push(m); m = M.addDays(m + '-28', 5).slice(0, 7); }
  return out;
}
const frMonth = (m) => new Date(m + '-15T12:00:00').toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
const frMonthShort = (m) => new Date(m + '-15T12:00:00').toLocaleDateString(locale(), { month: 'short' });

// Day a sticker was earned ('YYYY-MM-DD'), e.g. "Obtenu le 30 sept. 2026".
const gotOn = (day) => typeof day === 'string'
  ? tr`Obtenu le ${new Date(day + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })}`
  : tr('Obtenu');

// Sticker card: badge, name, album page, what earned it, the day, the coins it paid.
const stickerEl = document.getElementById('sticker-info');
function openSticker(id) {
  const sk = M.STICKERS.find((x) => x.id === id);
  const day = (profile.stickers || {})[id];
  if (!sk || !day) return;
  const page = M.STICKER_PAGES.find((p) => p.id === sk.page);
  const color = sk.world ? WORLD_COLORS[sk.world] : PAGE_COLORS[sk.page];
  const when = typeof day === 'string'
    ? tr('Obtenu le ') + new Date(day + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : tr('Obtenu avant que le jeu note la date');
  document.getElementById('sticker-card').innerHTML = `
      <div class="sticker big" style="--c:${color}"><span class="badge"><svg width="44" height="44" viewBox="0 0 24 24">${STICKER_GLYPHS[sk.page]}</svg></span></div>
      <h2>${sk.name}</h2>
      <div class="stage-sub">${page ? page.name : ''}${sk.secret ? tr(' · secret') : ''}</div>
      <div class="sticker-how"><small>${tr('Pour l’avoir')}</small>${sk.hint}</div>
      <div class="sticker-when">${when}</div>
      <div class="coins-total"><span>${tr('Récompense')}</span><span class="v">+${sk.reward || M.STICKER_REWARD} ${COIN}</span></div>
      <div class="actions"><button class="btn primary" data-act="ok">OK</button></div>`;
  stickerEl.querySelector('[data-act="ok"]').addEventListener('click', () => { sfx.turn(); stickerEl.classList.remove('show'); });
  stickerEl.classList.add('show');
}
stickerEl.addEventListener('click', (e) => { if (e.target === stickerEl) stickerEl.classList.remove('show'); });

function albumHtml() {
  const got = profile.stickers || {};
  const count = M.STICKERS.filter((s) => got[s.id]).length; // ignores retired stickers
  let html = `
      <div class="section-title" style="margin-top:0">${tr('Trophées du mois')}</div>
      <div class="shelf">${monthsSinceStart().map((m) => `<div class="trophy">${TROPHY_SVG(M.monthTrophy(profile, m))}${frMonthShort(m)}</div>`).join('')}</div>`;
  // Season trophies: every one won, plus the event open now (still to win), in calendar order.
  const now = M.eventsFor(today()).map((e) => e.id);
  const shelf = [];
  for (let y = 2026; y <= +today().slice(0, 4); y++) {
    for (const ev of M.EVENTS) {
      const won = M.seasonTrophy(profile, ev.id, String(y));
      if (won || (now.includes(ev.id) && String(y) === M.eventYear(today()))) shelf.push(`<div class="trophy">${TROPHY_SVG(won)}${ev.name} ${y}</div>`);
    }
  }
  if (shelf.length) html += `<div class="section-title">${tr('Trophées de saison')}</div><div class="shelf">${shelf.join('')}</div>`;
  html += `<div class="section-title">${tr`Autocollants · ${count} / ${M.STICKERS.length}`}</div>`;
  for (const page of M.STICKER_PAGES) {
    html += `<div class="section-title">${page.name}</div><div class="stickers">`;
    for (const sk of M.STICKERS.filter((x) => x.page === page.id)) {
      const on = !!got[sk.id];
      const hidden = sk.secret && !on;
      const color = sk.world ? WORLD_COLORS[sk.world] : PAGE_COLORS[page.id];
      // Earned stickers are buttons: a tap shows what it was for and the day it was won.
      const tag = on ? 'button' : 'div';
      html += `<${tag} class="sticker${on ? '' : ' off'}${freshStickers.has(sk.id) ? ' fresh' : ''}" style="--c:${color}"${on ? ` data-sticker="${sk.id}"` : ''}>
          <span class="badge"><svg width="28" height="28" viewBox="0 0 24 24">${hidden ? SECRET_GLYPH : STICKER_GLYPHS[page.id]}</svg></span>
          <b>${hidden ? tr('Secret') : sk.name}</b><span>${on ? (sk.secret ? sk.hint : gotOn(got[sk.id])) : hidden ? tr('À découvrir') : sk.hint}</span>${on && sk.secret ? `<span class="when">${gotOn(got[sk.id])}</span>` : ''}</${tag}>`;
    }
    html += '</div>';
  }
  return html;
}
