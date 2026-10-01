// Cubo Blocks — Home menu (Jouer tab).
'use strict';

// ---------- home menu (Jouer tab) ----------
// Continue, the next Aventure level, the daily level and Puzzles, free play, missions.
const menuEl = document.getElementById('menu');
const freePickEl = document.getElementById('free');
const MODE_NAMES = { classic: tr('Classique'), chrono: tr('Chrono'), chill: tr('Chill') };
const LEVEL_NAMES = { easy: tr('Facile'), normal: tr('Normal'), hard: tr('Difficile') };
const MODE_NOTES = {
  classic: tr('Pose des formes sans limite de temps, jusqu’à ce que plus rien ne rentre.'),
  chrono: tr('La partie tourne contre la montre : chaque ligne effacée rajoute du temps.'),
  chill: tr('Touche une forme pour la tourner. Pas de bonus, pas de pression.'),
};
// "Classique · Normal", or "Mondes · Glace".
const modeLabel = (st = state) => (st.puzzle ? `${puzzleTitle(st.puzzle)} · ${st.puzzle.name}` : st.mode === 'worlds' ? tr('Mondes · ') + WD.WORLDS[st.world].name : `${MODE_NAMES[st.mode]} · ${LEVEL_NAMES[st.level]}`);
const heroArt = document.getElementById('menu-adventure-art');

// Next Aventure level to play: the first open level not cleared yet, in map order.
function nextAdventure() {
  for (const w of M.WORLD_ORDER) {
    if (!M.worldOpen(profile, w)) return null;
    for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) if (M.levelOpen(profile, w, n) && !M.levelCleared(profile, w, n)) return [w, n];
  }
  return null;
}
const lastOpenWorld = () => M.WORLD_ORDER.filter((w) => M.worldOpen(profile, w)).pop() || M.WORLD_ORDER[0];

// What is in progress, so each home entry offers to resume its own run: the Continuer button is
// for a free run only; a level resumes from the Aventure card, a daily from Défis, a puzzle from its tile.
const levelInProgress = () => inProgress() && state.stage && !state.stage.daily && !state.stage.event;
const dailyInProgress = () => inProgress() && !!(state.stage && state.stage.daily);
const puzzleInProgress = () => inProgress() && !!state.puzzle;

function renderMenu() {
  const playing = freeInProgress();
  const cont = document.getElementById('menu-continue');
  cont.style.display = playing ? '' : 'none';
  document.getElementById('menu-continue-sub').textContent = tr`${modeLabel()} · ${fmt(state.score)} pts`;
  const level = levelInProgress() ? [state.stage.world, state.stage.n] : null;
  const next = level || nextAdventure();
  document.getElementById('menu-hero').classList.toggle('quiet', playing);
  drawPreview(heroArt, profile.equipped.blocks, next ? next[0] : lastOpenWorld());
  document.getElementById('menu-adventure-title').textContent = next ? `${worldName(next[0])} · ${levelName(next[1])}` : tr('Carte des mondes');
  document.getElementById('menu-adventure-sub').innerHTML = level ? LV.goalText(state.stage.goal)
    : starSvg(true, 14) + `${M.totalStars(profile)} / ${M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3}`;
  document.getElementById('menu-adventure-go').textContent = level ? tr('Reprendre') : next ? tr('Jouer') : tr('Voir');
  document.getElementById('menu-adventure').setAttribute('aria-label', level ? tr`Aventure : reprendre ${worldName(level[0])}, ${levelName(level[1])}`
    : next ? tr`Aventure : jouer ${worldName(next[0])}, ${levelName(next[1])}` : tr('Aventure : carte des mondes'));
  renderDailyButton();
  renderEventRow();
  renderMissionBadges();
  document.getElementById('menu-puzzles-sub').textContent = puzzleInProgress() ? tr`${puzzleTitle(state.puzzle)} en cours`
    : tr`${M.puzzlesSolved(profile)} / ${PZ.COUNT} résolus`;
  // A parked free run shows here, ready to resume; the chevron still picks a new one.
  document.getElementById('menu-free-tag').textContent = parked ? tr('Partie en cours') : tr('Partie libre');
  document.getElementById('menu-free-label').textContent = parked ? modeLabel(parked) : `${MODE_NAMES[prefs.mode]} · ${LEVEL_NAMES[prefs.level]}`;
  document.getElementById('menu-free-sub').textContent = parked ? tr`${fmt(parked.score)} pts`
    : { classic: tr('Sans limite'), chrono: tr('Contre la montre'), chill: tr('Rotation libre') }[prefs.mode];
  const play = document.getElementById('menu-play');
  play.textContent = parked ? tr('Reprendre') : tr('Jouer');
  play.classList.toggle('primary', !!parked && !playing);
  document.getElementById('menu-free').classList.toggle('parked', !!parked);
  document.getElementById('menu-coins').textContent = fmt(profile.coins);
  renderFreePick();
  renderCuboSay();
}
function renderFreePick() {
  for (const b of document.querySelectorAll('#menu-mode button')) b.classList.toggle('on', b.dataset.mode === prefs.mode);
  for (const b of document.querySelectorAll('#menu-level button')) b.classList.toggle('on', b.dataset.level === prefs.level);
  document.getElementById('free-note').textContent = MODE_NOTES[prefs.mode];
  // What the difficulty adds: the equipped theme's obstacles and the coin bonus.
  const obs = WD.freeObstacles(profile.equipped.boards, prefs.level);
  const pct = Math.round(M.DIFFICULTY_BONUS[obs.length] * 100);
  const names = obs.map((o) => LV.KIND_NAMES[o.kind]);
  document.getElementById('free-level').innerHTML = obs.length
    ? `<span class="icons">${obs.map((o) => kindIcon(o.kind, 26)).join('')}</span><span>${tr`${names.join(tr(' et ')).replace(/^./, (c) => c.toUpperCase())} sur la grille (selon ton thème). <b>+${pct} % de pièces</b> en fin de partie.`}</span>`
    : tr('<span>Aucun obstacle sur la grille. Normal en ajoute un (+20 % de pièces), Difficile deux (+50 %).</span>');
  document.getElementById('free-play').textContent = parked ? tr('Nouvelle partie') : tr('Jouer');
}

function leaveBoard() {
  unlockAudio();
  rollDay();
  hideTips();
  drag = null;
  showTrash(false);
  setAiming(false);
  overEl.classList.remove('show');
}
function openMenu() {
  leaveBoard();
  renderMenu();
  menuEl.classList.add('show');
}
// "Menu" from a game: a daily goes back to Défis (where it is resumed), anything else to Jouer.
function backToMenu() {
  if (!(state.stage && state.stage.daily)) { openMenu(); return; }
  leaveBoard();
  goTab('defis');
}
const closeMenu = () => menuEl.classList.remove('show');

document.getElementById('menu-open').addEventListener('click', () => { unlockAudio(); sfx.turn(); openPause(); });
document.getElementById('over-menu').addEventListener('click', openMenu);
document.getElementById('menu-continue').addEventListener('click', () => { unlockAudio(); closeMenu(); });
document.getElementById('menu-adventure').addEventListener('click', () => {
  unlockAudio();
  sfx.turn();
  closeMenu();
  if (levelInProgress()) return; // back to the level in progress
  openAdventure(); // the world of the next level, its path and its rules
});
document.getElementById('menu-map').addEventListener('click', () => { sfx.turn(); openAdventure(); });
document.getElementById('menu-defis').addEventListener('click', () => { sfx.turn(); goTab('defis'); });
document.getElementById('menu-missions').addEventListener('click', () => {
  sfx.turn();
  goTab('defis');
  document.getElementById('defis-missions').scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
});

// Free play: the picked mode and level show on the home row; the sheet changes them.
const playFree = () => guardRun(inProgress() || parked, () => {
  freePickEl.classList.remove('show');
  closeMenu();
  restartRun({ mode: prefs.mode, level: prefs.level });
});
document.getElementById('menu-play').addEventListener('click', () => {
  unlockAudio();
  if (!parked) { playFree(); return; }
  const go = () => { closeMenu(); resumeParked(); };
  if (!inProgress()) { go(); return; }
  ask({ title: tr('Reprendre ?'), text: tr('Le niveau en cours s’arrête pour reprendre ta partie libre. Les pièces gagnées sont gardées.'), ok: tr('Reprendre') })
    .then((yes) => { if (yes) go(); });
});
document.getElementById('free-play').addEventListener('click', () => { unlockAudio(); playFree(); });
document.getElementById('menu-free-pick').addEventListener('click', () => {
  unlockAudio();
  sfx.turn();
  renderFreePick();
  closeMenu();
  freePickEl.classList.add('show');
});
const closeFreePick = () => { freePickEl.classList.remove('show'); openMenu(); };
document.getElementById('free-close').addEventListener('click', closeFreePick);
freePickEl.addEventListener('click', (e) => { if (e.target === freePickEl) closeFreePick(); });
for (const b of document.querySelectorAll('#menu-mode button, #menu-level button')) {
  b.addEventListener('click', () => {
    unlockAudio();
    if (b.dataset.mode) prefs.mode = b.dataset.mode;
    if (b.dataset.level) prefs.level = b.dataset.level;
    sfx.turn();
    renderMenu();
    save();
  });
}
