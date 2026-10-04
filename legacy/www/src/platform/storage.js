// Cubo Blocks — Persistence: game, records, settings and profile in localStorage (copied to the
// native backup by CuboBlocksStore, platform/store.js).
'use strict';

// ---------- persistence ----------
// The game was called Gridlock: saves from before the rename move to the new keys, once.
for (const [from, to] of [['gridlock.v2', STORE_KEY], ['gridlock.profile.v1', PROFILE_KEY]]) {
  try {
    if (localStorage.getItem(to) === null && localStorage.getItem(from) !== null) {
      localStorage.setItem(to, localStorage.getItem(from));
      localStorage.removeItem(from);
    }
  } catch { /* private mode */ }
}
function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}
// Free-play records live in `bests` (Mondes: one per world, 'worlds-<id>'); Aventure has none.
// Called after every save (the cloud save watches for changes to send, screens/account.js).
let onSaved = null;
const keepsBest = () => state.mode !== 'adventure' && state.mode !== 'puzzle';
const recordKey = (st = state) => (st.mode === 'worlds' ? 'worlds-' + st.world : st.mode);
function save() {
  if (tut) return; // the scripted tutorial board is never saved
  if (keepsBest()) bests[recordKey()] = best;
  CuboBlocksStore.set(STORE_KEY, JSON.stringify({ state, parked, bests, settings, prefs }));
  if (onSaved) onSaved();
}
function saveProfile() {
  CuboBlocksStore.set(PROFILE_KEY, JSON.stringify(profile));
  if (onSaved) onSaved();
}

const saved = loadJSON(STORE_KEY);
let state = saved.state && saved.state.effects && !saved.state.over ? saved.state : L.createGame(Date.now());
if (!state.inventory) state = { ...state, inventory: L.createGame(0).inventory, stuck: false };
if (!state.mode) state = { ...state, mode: 'classic', level: 'normal', clock: 0 };
// The weekend event was removed (2026-09-30): a saved event run goes on as plain Classique.
if (state.event) { state = { ...state }; delete state.event; }
// A free run (Classique, Chrono, Chill, Mondes) set aside while the player does a level, a daily or a puzzle.
// It waits here until resumed or until a new free run starts.
let parked = saved.parked && saved.parked.effects && !saved.parked.over ? saved.parked : null;
// Records are kept per mode; old saves only had the classic one.
const bests = saved.bests || { classic: saved.best || loadJSON(LEGACY_KEY).best || 0 };
let best = bests[recordKey()] || 0;
// patterns: a symbol per block color. (Menus sombres was removed on 2026-10-01: too many color changes.)
const settings = { sfx: !saved.muted, music: true, vibrate: true, patterns: false, mascot: true,
  ...saved.settings };
delete settings.darkMenus;
const prefs = { mode: 'classic', level: 'normal', ...saved.prefs }; // last menu choice
const storedProfile = loadJSON(PROFILE_KEY);
// Local calendar day; daily missions roll over at local midnight.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Old saves: retired road themes and the 'candy' blocks are refunded (announced once the game shows).
const migrated = M.migrate(storedProfile.owned ? storedProfile : M.createProfile(today()));
let profile = M.ensureDay(migrated.profile, today());
// The app can stay open (or asleep in the background) past midnight: roll the day over when it
// comes back, when a menu opens, and once a minute, so today's missions always show.
function rollDay() {
  const rolled = M.ensureDay(profile, today());
  if (rolled === profile) return false;
  profile = rolled;
  saveProfile();
  resetAnnounced();
  for (const [el, render] of [[menuEl, renderMenu], [defisEl, renderDefis]]) if (el.classList.contains('show')) render();
  return true;
}
saveProfile();
let bestAtStart = best;
let recordAnnounced = false;
let runSettled = false;
let levelSettled = false; // Aventure: level result recorded (stars, coins)
let failCounted = false; // Aventure: this attempt already counted as a failure (paid skip offer)
let announced = new Set(); // missions already celebrated this run
