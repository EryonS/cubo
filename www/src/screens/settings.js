// Cubo Blocks — Settings (Réglages).
'use strict';

// ---------- settings ----------
const settingsEl = document.getElementById('settings');
const settingsBody = document.getElementById('settings-body');
if (!navigator.vibrate) document.getElementById('setting-vibrate').style.display = 'none';
function renderSettings() {
  document.getElementById('setting-privacy').hidden = !CuboBlocksAds.privacyRequired();
  for (const t of document.querySelectorAll('.toggle')) t.setAttribute('aria-checked', String(!!settings[t.dataset.setting]));
}
for (const t of document.querySelectorAll('.toggle')) {
  t.addEventListener('click', () => {
    const key = t.dataset.setting;
    settings[key] = !settings[key];
    unlockAudio();
    renderSettings();
    if (key === 'sfx' && settings.sfx) sfx.turn();
    if (key === 'vibrate') buzz(20);
      save();
  });
}
// The whole row flips its switch, not just the small toggle.
for (const row of document.querySelectorAll('.setting')) {
  const toggle = row.querySelector('.toggle');
  if (toggle) row.addEventListener('click', (e) => { if (!toggle.contains(e.target)) toggle.click(); });
}
// Language: Auto (the device's), Français or English. Switches live: the static HTML and the core
// tables change language (i18n/setup.js), then whatever is on screen renders again. Settings stay open.
const langSeg = document.getElementById('setting-lang');
function renderLang() {
  for (const b of langSeg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.lang === CuboBlocksLang.pref());
}
renderLang();
async function switchLanguage(next) {
  await CuboBlocksLang.apply(next);
  renderLang();
  renderSettings();
  refreshBonusTexts();
  labelHint();
  invKey = '';
  renderInventory();
  renderMenu();
  if (defisEl.classList.contains('show')) renderDefis();
  if (shopEl.classList.contains('show')) renderShop();
  if (profileEl.classList.contains('show')) renderProfile();
  if (pauseEl.classList.contains('show')) document.getElementById('pause-sub').textContent = runLabel();
}
for (const b of langSeg.querySelectorAll('button')) {
  b.addEventListener('click', () => {
    if (b.dataset.lang === CuboBlocksLang.pref()) return;
    sfx.turn();
    switchLanguage(b.dataset.lang);
  });
}
document.getElementById('setting-privacy').addEventListener('click', () => { sfx.turn(); CuboBlocksAds.showPrivacyOptions(); });
let settingsFrom = 'menu'; // 'menu' or 'pause': where closing goes back to
function openSettings(from) {
  settingsFrom = from;
  if (from === 'menu') closeMenu();
  if (settingsBody.parentElement !== settingsEl.firstElementChild) {
    settingsEl.firstElementChild.appendChild(settingsBody);
    if (profileTab === 'settings') profileTab = 'album';
  }
  renderSettings();
  settingsEl.classList.add('show');
}
function closeSettings() {
  settingsEl.classList.remove('show');
  if (settingsFrom === 'pause') openPause(); else openMenu();
}
document.getElementById('settings-close').addEventListener('click', closeSettings);
settingsEl.addEventListener('click', (e) => { if (e.target === settingsEl) closeSettings(); });
