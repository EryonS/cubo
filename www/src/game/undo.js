// Cubo Blocks — Undo button.
'use strict';

// ---------- undo ----------
const undoEl = document.getElementById('undo');
undoEl.addEventListener('click', () => { unlockAudio(); setAiming(false); undoMove(); });
function renderUndo() {
  const cost = L.undoCost(state);
  undoEl.disabled = !L.canUndo(state) || state.over;
  undoEl.querySelector('.badge').innerHTML = cost ? cost + COIN : tr('Gratuit');
}

// Mode-specific chrome.
function syncMode() {
  document.body.classList.toggle('chill', state.mode === 'chill');
  document.body.classList.toggle('puzzle', state.mode === 'puzzle');
  renderHint();
  renderUndo();
}
document.addEventListener('visibilitychange', save);
document.addEventListener('visibilitychange', () => { if (!document.hidden) rollDay(); });
setInterval(rollDay, 60000);
