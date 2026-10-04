// Cubo Blocks — Drag & snap: picking a piece up, aiming, dropping it.
'use strict';

// ---------- drag & snap ----------
function dragGeometry(d, t) {
  const piece = state.tray[d.idx];
  const k = easeOut((t - d.t0) / 110);
  const size = miniCell() + (lay.cell - miniCell()) * k;
  const cx = d.x + (d.ox || 0);
  const cy = d.y - d.lift * k + (d.oy || 0);
  const tlx = cx - (piece.w * lay.cell) / 2;
  const tly = cy - (piece.h * lay.cell) / 2;
  const col = Math.round((tlx - lay.bx) / lay.cell);
  const row = Math.round((tly - lay.by) / lay.cell);
  const valid = L.canPlace(state.board, piece, row, col);
  return { piece, size, cx, cy, row, col, valid };
}

// A piece is picked up only from its pad as drawn in drawTray (plus a few px of slack),
// never from the gap above the tray or the screen margins.
function slotAt(x, y) {
  const free = freeTray();
  const gap = free ? 3 : 6;
  const slack = 4;
  const n = free ? state.tray.length : 3;
  for (let i = 0; i < n; i++) {
    const b = slotBox(i);
    if (x >= b.x + 4 - slack && x <= b.x + b.w - 4 + slack && y >= b.y + gap - slack && y <= b.y + b.h - gap + slack) return i;
  }
  return -1;
}

function boardCellAt(x, y) {
  const c = Math.floor((x - lay.bx) / lay.cell);
  const r = Math.floor((y - lay.by) / lay.cell);
  return r >= 0 && c >= 0 && r < SIZE && c < SIZE ? [r, c] : null;
}

canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  tipShown = null;
  if (aiming) {
    const cell = boardCellAt(e.clientX, e.clientY);
    if (!cell) { setAiming(false); return; }
    canvas.setPointerCapture(e.pointerId);
    aiming.cell = cell;
    aiming.pid = e.pointerId;
    return;
  }
  if (cuboHit(e.clientX, e.clientY) && !drag) { cuboTap(); return; }
  if (state.over || drag) return;
  if (freeTray() && liftFromBoard(e)) return;
  const idx = slotAt(e.clientX, e.clientY);
  if (idx < 0 || !state.tray[idx] || returning.some((p) => p.idx === idx)) return;
  canvas.setPointerCapture(e.pointerId);
  const lift = e.pointerType === 'mouse' ? 0 : lay.cell * 2.2;
  drag = { idx, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, lift, t0: now(), pid: e.pointerId };
  showTrash(true);
  if (!L.canTurn(state)) sfx.pick();
  haptic('pick');
});
// Puzzle surprise: grabbing a placed piece picks it up where the finger holds it.
function liftFromBoard(e) {
  const cell = boardCellAt(e.clientX, e.clientY);
  if (!cell) return false;
  const i = cell[0] * SIZE + cell[1];
  const spot = Object.values(state.puzzle.at || {}).find((a) => a.cells.includes(i));
  const res = spot && L.liftPuzzle(state, cell[0], cell[1]);
  if (!res) return false;
  const row = Math.min(...spot.cells.map((j) => Math.floor(j / SIZE)));
  const col = Math.min(...spot.cells.map((j) => j % SIZE));
  state = res.state;
  canvas.setPointerCapture(e.pointerId);
  // Starts full size (t0 in the past) and keeps the grabbed cell under the finger.
  drag = { idx: res.slot, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, lift: 0, t0: now() - 200, pid: e.pointerId, fromBoard: true,
    ox: lay.bx + (col + spot.piece.w / 2) * lay.cell - e.clientX, oy: lay.by + (row + spot.piece.h / 2) * lay.cell - e.clientY };
  sfx.pick();
  haptic('lift');
  renderUndo();
  return true;
}

canvas.addEventListener('pointermove', (e) => {
  if (aiming && (aiming.pid === e.pointerId || e.pointerType === 'mouse')) {
    aiming.cell = boardCellAt(e.clientX, e.clientY);
    return;
  }
  if (!drag || e.pointerId !== drag.pid) return;
  drag.x = e.clientX;
  drag.y = e.clientY;
  const r = trashEl.getBoundingClientRect();
  const over = !tut && e.clientY > r.top && e.clientY < r.bottom + 24 && e.clientX > r.left && e.clientX < r.right;
  if (over !== drag.overTrash) armTrash(over);
});
const endDrag = (e) => {
  if (aiming && aiming.pid === e.pointerId) {
    const cell = aiming.cell;
    aiming.pid = null;
    if (e.type === 'pointerup' && cell) {
      if (useBonus('bomb', { r: cell[0], c: cell[1] })) setAiming(false);
      else nope();
    }
    return;
  }
  if (!drag || e.pointerId !== drag.pid) return;
  const t = now();
  const g = dragGeometry(drag, t);
  const idx = drag.idx;
  const isTap = t - drag.t0 < 280 && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 12;
  // Only a piece held over the bin until it armed gets thrown: a quick slip below the tray doesn't count.
  const toss = drag.overTrash && drag.trashArmed && e.type === 'pointerup';
  const drag0 = drag;
  drag = null;
  showTrash(false);
  if (toss) {
    if (!discardPiece(idx, e.clientX, e.clientY)) {
      returning.push({ idx, x: g.cx, y: g.cy, size: g.size, t0: t });
      nope();
    }
    return;
  }
  if (isTap && drag0.fromBoard) {
    returning.push({ idx, x: g.cx, y: g.cy, size: g.size, t0: t });
    save();
    return;
  }
  if (isTap && e.type === 'pointerup' && L.canTurn(state)) {
    const next = L.rotate(state, idx);
    if (next) {
      state = next;
      slotSpin[idx] = t;
      sfx.turn();
      haptic('turn');
      save();
    }
    return;
  }
  if (g.valid && e.type === 'pointerup' && commit(idx, g.row, g.col) !== false) return;
  returning.push({ idx, x: g.cx, y: g.cy, size: g.size, t0: t });
  if (e.type === 'pointerup') nope();
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// Hovering the bin fills it for TRASH_ARM_MS; releasing before it is full puts the piece back.
const TRASH_ARM_MS = 600;
let trashTimer = 0;
function armTrash(over) {
  clearTimeout(trashTimer);
  drag.overTrash = over;
  drag.trashArmed = false;
  trashEl.classList.toggle('hot', over);
  trashEl.classList.remove('armed');
  if (!trashEl.classList.contains('broke')) trashEl.querySelector('.label').textContent = tr('Maintenir pour jeter');
  if (!over || trashEl.classList.contains('broke')) return;
  const d = drag;
  trashTimer = setTimeout(() => {
    if (drag !== d || !d.overTrash) return;
    d.trashArmed = true;
    trashEl.classList.add('armed');
    trashEl.querySelector('.label').textContent = tr('Lâcher pour jeter');
    haptic('arm');
  }, TRASH_ARM_MS);
}

function showTrash(on) {
  if (state.mode === 'puzzle') on = false;
  clearTimeout(trashTimer);
  document.body.classList.toggle('dragging', on);
  trashEl.classList.toggle('show', on);
  trashEl.classList.remove('hot', 'armed');
  if (!on) return;
  const cost = L.discardCost(state);
  const broke = profile.coins < cost;
  trashEl.classList.toggle('broke', broke);
  trashEl.querySelector('.label').textContent = broke ? tr('Pas assez de pièces') : tr('Maintenir pour jeter');
  trashEl.querySelector('.cost').innerHTML = fmt(cost) + COIN;
}
