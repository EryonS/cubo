// Cubo Blocks — Styled confirmation dialog (replaces confirm()).
'use strict';

// ---------- confirmation dialog ----------
const askEl = document.getElementById('ask');
let askDone = null;
// In-game replacement for window.confirm. Resolves true when the player agrees.
function ask({ title, text, ok, danger }) {
  if (askDone) askDone(false);
  document.getElementById('ask-title').textContent = title;
  document.getElementById('ask-text').textContent = text;
  const yes = document.getElementById('ask-yes');
  yes.textContent = ok;
  yes.classList.toggle('danger', !!danger);
  askEl.classList.add('show');
  return new Promise((resolve) => {
    askDone = (v) => { askDone = null; askEl.classList.remove('show'); resolve(v); };
  });
}
document.getElementById('ask-yes').addEventListener('click', () => { if (askDone) askDone(true); });
document.getElementById('ask-no').addEventListener('click', () => { if (askDone) { sfx.turn(); askDone(false); } });
askEl.addEventListener('click', (e) => { if (e.target === askEl && askDone) askDone(false); });
// Runs go() now, or once the player agrees to drop the run in progress (its coins are kept).
function guardRun(needed, go) {
  if (!needed) { go(); return; }
  const which = freeInProgress() || parked ? tr('Ta partie libre en cours') : tr('La partie en cours');
  ask({ title: tr('Abandonner ?'), text: which + tr(' s’arrête. Les pièces gagnées sont gardées.'), ok: tr('Abandonner'), danger: true })
    .then((yes) => { if (yes) go(); });
}
