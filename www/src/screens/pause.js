// Cubo Blocks — Pause overlay.
'use strict';

// ---------- pause ----------
// The HUD button pauses; so does leaving the app mid-run. Timers stop under any open overlay.
const pauseEl = document.getElementById('pause');
function runLabel() {
  const st = state.stage;
  if (st) {
    const where = st.daily ? tr`Niveau du jour #${LV.dayNumber(st.daily)}` : st.event ? `${M.eventById(st.event).name} · ${eventLevelName(st.n)}` : `${worldName(st.world)} · ${levelName(st.n)}`;
    return `${where} · ${LV.goalText(st.goal)}`;
  }
  if (state.puzzle) return tr`${modeLabel()} · ${state.puzzle.placed} / ${state.puzzle.total} formes`;
  return tr`${modeLabel()} · ${fmt(state.score)} pts`;
}
function openPause() {
  if (state.over) { openMenu(); return; }
  hideTips();
  drag = null;
  showTrash(false);
  setAiming(false);
  document.getElementById('pause-sub').textContent = runLabel();
  // A daily attempt counts when dropped: restarting needs one more try left.
  document.getElementById('pause-restart').style.display = state.stage && state.stage.daily && dailyTriesAfter() <= 0 ? 'none' : '';
  pauseEl.classList.add('show');
}
const closePause = () => pauseEl.classList.remove('show');
document.getElementById('pause-resume').addEventListener('click', () => { unlockAudio(); closePause(); });
pauseEl.addEventListener('click', (e) => { if (e.target === pauseEl) closePause(); });
document.getElementById('pause-restart').addEventListener('click', async () => {
  unlockAudio();
  const daily = state.stage && state.stage.daily;
  const after = daily && dailyTriesAfter();
  const text = daily && Number.isFinite(after)
    ? tr`Cet essai compte : il t’en restera ${after}. Les pièces gagnées sont gardées.`
    : tr('La partie reprend depuis le début. Les pièces gagnées sont gardées.');
  if (inProgress() && !await ask({ title: tr('Recommencer ?'), text, ok: tr('Recommencer'), danger: true })) return;
  closePause();
  if (daily) launchDaily(daily);
  else if (state.stage && state.stage.event) launchEventLevel(state.stage.event, state.stage.n);
  else if (state.stage) startLevel(state.stage.world, state.stage.n);
  else if (state.puzzle && state.puzzle.free) launchSurprise(state.puzzle.seed);
  else if (state.puzzle) startPuzzle(state.puzzle.n);
  else restartRun({ mode: state.mode, level: state.level });
});
// Quit: a free run ends now (its score, coins and missions count), a level is lost (a daily
// attempt is used), a puzzle is dropped without a result.
document.getElementById('pause-quit').addEventListener('click', async () => {
  unlockAudio();
  const st = state.stage;
  const text = state.puzzle ? tr('Tu retournes aux puzzles. Ta progression sur ce dessin est perdue.')
    : st && st.daily ? tr('Le niveau compte comme raté et cet essai est utilisé. Les pièces gagnées sont gardées.')
      : st ? tr('Le niveau compte comme raté. Les pièces gagnées sont gardées.')
        : tr('La partie s’arrête ici : ton score compte. Les pièces gagnées sont gardées.');
  if (!await ask({ title: tr('Quitter la partie ?'), text, ok: tr('Quitter'), danger: true })) return;
  closePause();
  if (state.puzzle) {
    state = { ...state, over: true, quit: true };
    save();
    leaveBoard();
    openPuzzles();
    return;
  }
  const next = L.quit(state);
  if (!next) return;
  state = next;
  endGame(now());
  renderInventory();
});
document.getElementById('pause-settings').addEventListener('click', () => { closePause(); openSettings('pause'); });
document.getElementById('pause-menu').addEventListener('click', () => { closePause(); backToMenu(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !tut && !state.over && !pausedByUi() && (state.moves > 0 || state.clock > 0)) openPause();
});
