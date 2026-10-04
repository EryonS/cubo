// Cubo Blocks — Cloud save: the Compte block in Réglages, sign-in, sync, the choice dialog.
'use strict';

// ---------- cloud save ----------
// Rules in core/sync.js, Firebase in platform/cloud.js. cuboblocks.sync remembers the account on
// this device: { uid, provider, email, syncedAt (cloud version this device knows), dirty }.
// A cloud copy is applied by writing it into the local saves and reloading the page, so every
// screen starts again from it exactly as after a normal launch.
const SYNC_KEY = 'cuboblocks.sync';
const SYNC_DELAY = 3000;
const Cloud = CuboBlocksCloud;
const SY = CuboBlocksSync;
let syncInfo = loadJSON(SYNC_KEY);
let cloudDoc = null; // last cloud version seen, to tell local changes apart (null: not known yet)
let cloudBlocked = false; // the cloud copy comes from a newer app: hands off
let pushing = null;
let syncTimer = 0;

const signedIn = () => !!syncInfo.uid;
const localData = () => ({ profile, settings, bests, lang: CuboBlocksLang.pref() });
function saveSyncInfo() {
  if (signedIn()) CuboBlocksStore.set(SYNC_KEY, JSON.stringify(syncInfo));
  else CuboBlocksStore.remove(SYNC_KEY);
}
function forgetAccount() {
  syncInfo = {};
  cloudDoc = null;
  cloudBlocked = false;
  saveSyncInfo();
}

function accountToast(text) {
  const el = document.createElement('div');
  el.className = 'ad-toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
const offlineToast = () => accountToast(tr('Connexion impossible, réessaie plus tard.'));
const updateToast = () => accountToast(tr('Mets à jour Cubo Blocks pour synchroniser.'));

// ----- sending
// After any save: once things settle, send if the synced parts differ from the cloud copy.
onSaved = () => {
  if (!signedIn() || cloudBlocked) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(checkChanges, SYNC_DELAY);
};
function checkChanges() {
  syncTimer = 0;
  if (!cloudDoc || SY.same(SY.payload(localData(), 0), cloudDoc)) return;
  syncInfo.dirty = true;
  saveSyncInfo();
  pushNow();
}
let pushAgain = false;
async function pushNow() {
  if (pushing) { pushAgain = true; return pushing; }
  const doc = SY.payload(localData(), Math.max(Date.now(), (syncInfo.syncedAt || 0) + 1));
  pushing = (async () => {
    try {
      await Cloud.push(doc, syncInfo.syncedAt || 0);
      cloudDoc = doc;
      syncInfo = { ...syncInfo, syncedAt: doc.updatedAt, dirty: false };
      saveSyncInfo();
      renderAccount();
    } catch (err) {
      if (err && err.code === 'conflict') setTimeout(refreshCloud, 0); // another device wrote first
      // offline: stays dirty, sent on the next launch, return or reconnection
    } finally {
      pushing = null;
      if (pushAgain) { pushAgain = false; checkChanges(); } // changed while sending
    }
  })();
  return pushing;
}

// ----- receiving
// Writes the cloud copy into the local saves and starts the game again from them. The run in
// progress stays (it is not synced); the profile goes through M.migrate at launch like any save.
async function applyCloud(doc) {
  save();
  const local = loadJSON(STORE_KEY);
  CuboBlocksStore.set(STORE_KEY, JSON.stringify({ ...local, settings: doc.settings, bests: doc.bests }));
  CuboBlocksStore.set(PROFILE_KEY, JSON.stringify(doc.profile));
  CuboBlocksStore.set('cuboblocks.lang', doc.lang);
  syncInfo = { ...syncInfo, syncedAt: doc.updatedAt, dirty: false };
  saveSyncInfo();
  try { sessionStorage.setItem('cuboblocks.synced', '1'); } catch { /* private mode */ }
  await CuboBlocksStore.flush();
  location.reload();
}
// A cloud copy that arrives during a run waits until the player is back on a menu page.
let cloudWaiting = null;
function applyWhenIdle(doc) {
  if (currentHub()) { applyCloud(doc); return; }
  if (cloudWaiting) { cloudWaiting.doc = doc; return; }
  cloudWaiting = { doc, timer: setInterval(() => {
    if (!currentHub()) return;
    clearInterval(cloudWaiting.timer);
    const next = cloudWaiting.doc;
    cloudWaiting = null;
    applyCloud(next);
  }, 1000) };
}

// One decision of SY.decide, carried out. atSignIn: the player is linking the account now.
async function carryOut(decision, remote, atSignIn) {
  if (decision === 'push') { await pushNow(); return; }
  if (decision === 'pull') { if (atSignIn) await applyCloud(remote); else applyWhenIdle(remote); return; }
  if (decision === 'same' || decision === 'none') {
    cloudDoc = remote;
    if (decision === 'same') { syncInfo = { ...syncInfo, syncedAt: remote.updatedAt, dirty: false }; saveSyncInfo(); }
    renderAccount();
    return;
  }
  if (decision === 'ask') { await chooseSide(remote, atSignIn); return; }
  // 'keep' (unreadable cloud copy) or 'update-app' (from a newer app): nothing moves.
  cloudBlocked = true;
  if (decision === 'update-app') updateToast(); else offlineToast();
  if (atSignIn) { await Cloud.signOut().catch(() => {}); forgetAccount(); renderAccount(); }
}

let refreshing = null;
function refreshCloud() {
  if (!signedIn() || refreshing) return refreshing;
  refreshing = (async () => {
    try {
      await Cloud.load();
      if (!Cloud.user()) { forgetAccount(); renderAccount(); return; } // signed out elsewhere
      cloudBlocked = false;
      const remote = await Cloud.pull();
      await carryOut(SY.decide({ local: localData(), remote, sync: syncInfo }), remote, false);
    } catch { /* offline: next launch, return or reconnection */ } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// ----- choice dialog
const syncChoiceEl = document.getElementById('sync-choice');
function sideCard(side, title, s) {
  const day = s.day ? new Date(s.day + 'T12:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : '–';
  const row = (label, value) => `<span>${label}<b>${value}</b></span>`;
  return `<button class="sync-card" data-side="${side}"><strong>${title}</strong>
    ${row(tr('Pièces'), `${fmt(s.coins)} ${COIN}`)}${row(tr('Étoiles'), s.stars)}${row(tr('Stickers'), s.stickers)}
    <small>${tr`Dernière partie : ${day}`}</small></button>`;
}
// Resolves 'device', 'account' or null (closed).
function askSide(remote) {
  document.getElementById('sync-cards').innerHTML = sideCard('device', tr('Cet appareil'), SY.summary(profile))
    + sideCard('account', tr('Compte'), SY.summary(remote.profile));
  syncChoiceEl.classList.add('show');
  return new Promise((resolve) => {
    const done = (v) => { syncChoiceEl.classList.remove('show'); resolve(v); };
    for (const b of syncChoiceEl.querySelectorAll('[data-side]')) b.onclick = () => { sfx.turn(); done(b.dataset.side); };
    document.getElementById('sync-cancel').onclick = () => { sfx.turn(); done(null); };
    syncChoiceEl.onclick = (e) => { if (e.target === syncChoiceEl) done(null); };
  });
}
async function chooseSide(remote, atSignIn) {
  for (;;) {
    const side = await askSide(remote);
    if (!side) break;
    const sure = await ask({ title: tr('Remplacer l’autre progression ?'),
      text: side === 'device' ? tr('Tu gardes la progression de cet appareil. Celle du compte sera remplacée.')
        : tr('Tu gardes la progression du compte. Celle de cet appareil sera remplacée.'),
      ok: tr('Confirmer'), danger: true });
    if (!sure) continue;
    if (side === 'account') { await applyCloud(remote); return; }
    // Keep this device: overwrite the cloud copy we just saw.
    syncInfo = { ...syncInfo, syncedAt: remote.updatedAt, dirty: true };
    saveSyncInfo();
    cloudDoc = remote;
    await pushNow();
    return;
  }
  // Closed without picking: at sign-in nothing stays half linked; later, asked again next time.
  if (atSignIn) { await Cloud.signOut().catch(() => {}); forgetAccount(); renderAccount(); }
}

// ----- account actions
async function signInWith(provider) {
  let user;
  try { user = await Cloud.signIn(provider); } catch (err) {
    if (!err || err.code !== 'cancelled') offlineToast();
    return;
  }
  syncInfo = { uid: user.uid, provider, email: user.email || '', syncedAt: 0, dirty: false };
  saveSyncInfo();
  renderAccount();
  let remote;
  try { remote = await Cloud.pull(); } catch {
    offlineToast();
    await Cloud.signOut().catch(() => {});
    forgetAccount();
    renderAccount();
    return;
  }
  await carryOut(SY.decide({ local: localData(), remote, sync: null }), remote, true);
}
async function signOutCloud() {
  await Cloud.signOut().catch(() => {});
  forgetAccount();
  renderAccount();
  accountToast(tr('Déconnecté. Ta progression reste sur cet appareil.'));
}
async function deleteCloudAccount() {
  const sure = await ask({ title: tr('Supprimer ton compte ?'),
    text: tr('Ta sauvegarde en ligne sera effacée. Ta progression reste sur cet appareil.'), ok: tr('Supprimer'), danger: true });
  if (!sure) return;
  try { await Cloud.deleteAccount(syncInfo.provider); } catch (err) {
    if (!err || err.code !== 'cancelled') offlineToast();
    return;
  }
  forgetAccount();
  renderAccount();
  accountToast(tr('Compte supprimé.'));
}

// ----- Compte block (Profil > Réglages)
const GOOGLE_ICON = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.5-9.4 6.5-16.1z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C8 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.4C2.9 17.2 2 20.5 2 24s.9 6.8 2.4 9.8l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8 6.9 4.4 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1z"/></svg>';
const APPLE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>';
const CHEVRON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function syncedLabel() {
  if (syncInfo.dirty || !syncInfo.syncedAt) return tr('Pas encore synchronisé');
  const min = Math.round((Date.now() - syncInfo.syncedAt) / 60000);
  if (min < 1) return tr('Synchronisé à l’instant');
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const ago = min < 60 ? rtf.format(-min, 'minute') : min < 1440 ? rtf.format(-Math.round(min / 60), 'hour') : rtf.format(-Math.round(min / 1440), 'day');
  return tr`Synchronisé ${ago}`;
}
function renderAccount() {
  const box = document.getElementById('setting-account');
  box.hidden = !Cloud.available();
  if (box.hidden) return;
  const body = document.getElementById('account-body');
  if (!signedIn()) {
    body.innerHTML = `<p class="account-text">${tr('Retrouve ta progression sur tous tes appareils.')}</p>
      <div class="account-btns">
        <button class="btn account-btn" data-provider="google">${GOOGLE_ICON}<span>${tr('Continuer avec Google')}</span></button>
        <button class="btn account-btn apple" data-provider="apple">${APPLE_ICON}<span>${tr('Continuer avec Apple')}</span></button>
      </div>`;
    for (const b of body.querySelectorAll('[data-provider]')) {
      b.addEventListener('click', () => { sfx.turn(); signInWith(b.dataset.provider); });
    }
    return;
  }
  const by = syncInfo.provider === 'apple' ? tr('Connecté avec Apple') : tr('Connecté avec Google');
  const email = syncInfo.email ? escHtml(syncInfo.email) + ' · ' : '';
  body.innerHTML = `<div class="setting account-who"><div>${by}<small>${email}${syncedLabel()}</small></div></div>
    <button class="setting link" data-act="signout"><div>${tr('Se déconnecter')}</div>${CHEVRON}</button>
    <button class="setting link danger" data-act="delete"><div>${tr('Supprimer mon compte')}<small>${tr('Efface ta sauvegarde en ligne')}</small></div>${CHEVRON}</button>`;
  body.querySelector('[data-act="signout"]').addEventListener('click', () => { sfx.turn(); signOutCloud(); });
  body.querySelector('[data-act="delete"]').addEventListener('click', () => { sfx.turn(); deleteCloudAccount(); });
}

// ----- start-up (startCloud runs from boot.js)
function startCloud() {
  if (!Cloud.available()) return;
  try {
    if (sessionStorage.getItem('cuboblocks.synced')) {
      sessionStorage.removeItem('cuboblocks.synced');
      accountToast(tr('Progression synchronisée.'));
    }
  } catch { /* private mode */ }
  if (signedIn()) refreshCloud();
  document.addEventListener('visibilitychange', () => {
    if (!signedIn()) return;
    if (!document.hidden) { refreshCloud(); return; }
    if (syncTimer) { clearTimeout(syncTimer); checkChanges(); } // leaving: send now
  });
  window.addEventListener('online', () => { if (signedIn() && syncInfo.dirty) pushNow(); });
}
