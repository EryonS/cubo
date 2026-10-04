// Cubo Blocks — Bonus inventory bar.
'use strict';

// ---------- inventory bar ----------
const invButtons = {};
for (const type of Object.keys(BONUS_UI)) {
  const btn = document.createElement('button');
  btn.className = 'inv-btn';
  btn.innerHTML = '<canvas class="icon"></canvas><span class="count"></span>';
  const cv = btn.querySelector('canvas');
  const px = Math.round(32 * Math.min(window.devicePixelRatio || 1, 3));
  cv.width = px; cv.height = px;
  drawIcon(type, px / 2, px / 2, px * 0.94, cv.getContext('2d'));
  if (type === 'bomb') bindBombDrag(btn);
  else {
    btn.addEventListener('click', () => {
      unlockAudio();
      if (state.over || !(state.inventory[type] > 0)) return;
      setAiming(false);
      useBonus(type);
    });
  }
  btn.addEventListener('animationend', () => btn.classList.remove('bump'));
  invEl.appendChild(btn);
  invButtons[type] = btn;
}

// The bomb is dragged from its button onto the grid like a piece. A plain tap falls back
// to aim mode (tap a cell on the grid), tapping the button again cancels.
function bindBombDrag(btn) {
  btn.addEventListener('pointerdown', (e) => {
    unlockAudio();
    if (state.over || !(state.inventory.bomb > 0)) return;
    if (aiming && !aiming.drag) { setAiming(false); return; }
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    const lift = e.pointerType === 'mouse' ? 0 : lay.cell * 1.8;
    aiming = { drag: true, pid: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, lift, cell: null };
    renderInventory();
    sfx.pick();
  });
  btn.addEventListener('pointermove', (e) => {
    if (!aiming || !aiming.drag || aiming.pid !== e.pointerId) return;
    aiming.x = e.clientX;
    aiming.y = e.clientY;
    aiming.cell = boardCellAt(e.clientX, e.clientY - aiming.lift);
  });
  const release = (e) => {
    if (!aiming || !aiming.drag || aiming.pid !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - aiming.sx, e.clientY - aiming.sy) > 12;
    if (!moved && e.type === 'pointerup') {
      aiming = { cell: null, pid: null };
      renderInventory();
      return;
    }
    const cell = aiming.cell;
    setAiming(false);
    if (e.type !== 'pointerup' || !cell) return;
    if (!useBonus('bomb', { r: cell[0], c: cell[1] })) nope();
  };
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
}

// Legend: what every icon does (mobile has no hover).
const legendEl = document.getElementById('legend');
const legendBtn = document.createElement('button');
legendBtn.className = 'inv-btn legend-btn';
legendBtn.textContent = '?';
invEl.appendChild(legendBtn);
const legendList = document.getElementById('legend-list');
const legendTexts = {};
const legendNames = {};
const coinTexts = {};
for (const [type, ui] of [...Object.entries(BONUS_UI), ...Object.entries(COIN_UI)]) {
  const row = document.createElement('div');
  row.className = 'legend-row';
  const cv = document.createElement('canvas');
  const px = Math.round(40 * Math.min(window.devicePixelRatio || 1, 3));
  cv.width = px; cv.height = px;
  drawIcon(type, px / 2, px / 2, px * 0.94, cv.getContext('2d'));
  const text = document.createElement('div');
  text.innerHTML = '<b></b><span></span>';
  legendNames[type] = text.firstChild;
  if (BONUS_UI[type]) legendTexts[type] = text.lastChild;
  else coinTexts[type] = text.lastChild;
  row.append(cv, text);
  legendList.appendChild(row);
}
// Bonus texts follow the upgrade levels and the language: labels, tooltips and legend lines.
function refreshBonusTexts() {
  legendBtn.setAttribute('aria-label', tr('Légende des bonus'));
  for (const [type, ui] of Object.entries(BONUS_UI)) {
    const d = ui.desc(bonusLv(type));
    invButtons[type].setAttribute('aria-label', ui.name);
    invButtons[type].dataset.tip = ui.name + ' — ' + d;
    legendNames[type].textContent = ui.name;
    legendTexts[type].textContent = d;
  }
  for (const [type, ui] of Object.entries(COIN_UI)) {
    legendNames[type].textContent = ui.name;
    coinTexts[type].textContent = ui.desc;
  }
}
refreshBonusTexts();
legendBtn.addEventListener('click', () => { setAiming(false); refreshBonusTexts(); legendEl.classList.add('show'); });
document.getElementById('legend-close').addEventListener('click', () => legendEl.classList.remove('show'));
legendEl.addEventListener('click', (e) => { if (e.target === legendEl) legendEl.classList.remove('show'); });

function setAiming(on) {
  aiming = on ? { cell: null, pid: null } : null;
  renderInventory();
}

const giveUpBtn = document.getElementById('give-up');
giveUpBtn.addEventListener('click', () => {
  const next = L.giveUp(state);
  if (!next) return;
  state = next;
  endGame(now());
  renderInventory();
});

let invKey = '';
function renderInventory() {
  renderUndo();
  giveUpBtn.classList.toggle('show', !!state.stuck && !state.over && !aiming);
  giveUpBtn.style.top = Math.round(lay.ty + lay.trayH / 2) + 'px';
  const key = JSON.stringify([state.inventory, !!aiming, state.stuck, state.over,
    Object.keys(state.effects).filter((k) => state.effects[k] > 0)]);
  if (key === invKey) return;
  invKey = key;
  for (const [type, btn] of Object.entries(invButtons)) {
    const n = state.inventory[type] || 0;
    btn.querySelector('.count').textContent = n;
    btn.classList.toggle('empty', n === 0 || state.over);
    btn.classList.toggle('active', state.effects[type] > 0);
    btn.classList.toggle('aiming', type === 'bomb' && !!aiming);
    const helps = type === 'bomb' || type === 'reroll' || type === 'rotate';
    btn.classList.toggle('help', state.stuck && n > 0 && helps && !aiming);
  }
}
renderInventory();
