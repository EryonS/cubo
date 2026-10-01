// Cubo Blocks — Settings (Réglages).
'use strict';

// ---------- settings ----------
const settingsEl = document.getElementById('settings');
const settingsBody = document.getElementById('settings-body');
if (!navigator.vibrate) document.getElementById('setting-vibrate').style.display = 'none';
function renderSettings() {
  document.getElementById('setting-privacy').hidden = !GridlockAds.privacyRequired();
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
// Language: Auto (the device's), Français or English. Many labels are built once at start-up,
// so a change saves and reloads.
const langSeg = document.getElementById('setting-lang');
function renderLang() {
  for (const b of langSeg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.lang === GridlockLang.pref());
}
renderLang();
for (const b of langSeg.querySelectorAll('button')) {
  b.addEventListener('click', () => {
    if (b.dataset.lang === GridlockLang.pref()) return;
    sfx.turn();
    GridlockLang.set(b.dataset.lang);
    save();
    saveProfile();
    location.reload();
  });
}
document.getElementById('setting-privacy').addEventListener('click', () => { sfx.turn(); GridlockAds.showPrivacyOptions(); });
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
