// Cubo Blocks — Bottom tab bar (Jouer, Défis, Boutique, Profil).
'use strict';

// ---------- tab bar ----------
// Jouer, Défis, Boutique and Profil are the four hub screens. The bar shows while one of them is
// up and nothing else covers it (level sheets, settings, dialogs, the game itself).
const tabbarEl = document.getElementById('tabbar');
const HUBS = { menu: menuEl, defis: defisEl, shop: shopEl, profile: profileEl };
const HUB_OPEN = { menu: openMenu, defis: () => openDefis(), shop: openShop, profile: () => openProfile() };

const HUB_ORDER = Object.keys(HUBS);
const leaving = (el) => el.classList.contains('out-left') || el.classList.contains('out-right');
const currentHub = () => HUB_ORDER.find((k) => HUBS[k].classList.contains('show') && !leaving(HUBS[k]));
const SLIDE_CLASSES = ['from-left', 'from-right', 'out-left', 'out-right'];
function goTab(name) {
  unlockAudio();
  const from = currentHub();
  const dir = from ? Math.sign(HUB_ORDER.indexOf(name) - HUB_ORDER.indexOf(from)) : 0;
  for (const [k, el] of Object.entries(HUBS)) {
    if (k === name) { el.classList.remove(...SLIDE_CLASSES); void el.offsetWidth; continue; }
    // Pages side by side: the old one slides out under the new one, then hides.
    if (k === from && dir && !calm()) el.classList.add(dir > 0 ? 'out-left' : 'out-right');
    else el.classList.remove('show', ...SLIDE_CLASSES);
  }
  // Fallback when no slide animation runs (wide screens): the old page goes once the new one is in.
  setTimeout(() => { for (const el of Object.values(HUBS)) if (leaving(el)) el.classList.remove('show', ...SLIDE_CLASSES); }, 320);
  HUBS[name].classList.toggle('no-anim', !!from);
  if (dir && !calm()) HUBS[name].classList.add(dir > 0 ? 'from-right' : 'from-left');
  HUB_OPEN[name]();
  // Some open functions close the Jouer hub themselves: keep the leaving page up until it has slid out.
  for (const el of Object.values(HUBS)) if (leaving(el)) el.classList.add('show');
  HUBS[name].querySelector('.card').scrollTop = 0;
}
for (const el of Object.values(HUBS)) {
  // The incoming page keeps its from-* class while shown: removing it would replay the card's
  // default entrance animation (a visible flicker). It goes when the page hides (syncTabbar).
  const done = (e) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('card')) return;
    if (leaving(el)) el.classList.remove('show', ...SLIDE_CLASSES);
  };
  el.addEventListener('animationend', done);
}
for (const b of tabbarEl.querySelectorAll('[data-go]')) {
  b.addEventListener('click', () => {
    if (HUBS[b.dataset.go].classList.contains('show')) { HUBS[b.dataset.go].querySelector('.card').scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' }); return; }
    sfx.turn();
    goTab(b.dataset.go);
  });
}

function syncTabbar() {
  music.sync(); // leaving the run for a menu (or back) switches the song
  syncStatusBar();
  const shown = [...document.querySelectorAll('.overlay.show')];
  const hub = currentHub();
  const on = !!hub && shown.every((el) => el.classList.contains('hub'));
  document.body.classList.toggle('hub-on', on);
  for (const b of tabbarEl.querySelectorAll('[data-go]')) {
    const active = b.dataset.go === hub;
    b.classList.toggle('on', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  // Only touch the class when needed: every class write would call this observer again.
  for (const el of Object.values(HUBS)) {
    if (el.classList.contains('show')) continue;
    for (const c of ['no-anim', 'from-left', 'from-right']) if (el.classList.contains(c)) el.classList.remove(c);
  }
  // A dot on Défis while today's level can still be won.
  const t = today();
  tabbarEl.querySelector('.dot').hidden = !(M.dailyOf(profile, t).stars === undefined && M.dailyAttemptsLeft(profile, t, t) > 0);
}
const overlayWatch = new MutationObserver(syncTabbar);
for (const el of document.querySelectorAll('.overlay')) overlayWatch.observe(el, { attributes: true, attributeFilter: ['class'] });
