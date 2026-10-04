// Cubo Blocks — Tutorial (3 scripted steps). Rules in core/tutorial.js.
'use strict';

// ---------- tutorial ----------
// Guided first game: scripted steps from tutorial.js. The HUD makes room for the coach card,
// a hand shows the drag, target cells glow. Nothing here is saved or counted.
const coachEl = document.getElementById('coach');
const handEl = document.getElementById('hand');
const tutorialEndEl = document.getElementById('tutorial-end');
const touchLift = matchMedia('(pointer: coarse)');
let tut = null; // { step, saved, t0, doneAt }

function startTutorial() {
  closeMenu();
  profileEl.classList.remove('show');
  settingsEl.classList.remove('show');
  hideTips();
  tut = { step: 0, saved: inProgress() ? state : null, t0: 0, doneAt: 0 };
  document.body.classList.add('tutorial');
  loadStep(0);
}

function clearFx(t) {
  drag = null; aiming = null;
  returning = []; pops = []; fades = []; particles = []; floaters = []; banners = []; flyers = [];
  tracks = new Map(); shifts = []; drops = new Map();
  sweeps = []; punch = null; comboAt = 0; comboBreak = null;
  slotIn = new Array(MAX_SLOTS).fill(t); slotSpin = new Array(MAX_SLOTS).fill(0); nextIn = t;
  showTrash(false);
}

function loadStep(i) {
  const t = now();
  tut.step = i;
  tut.t0 = t;
  tut.doneAt = 0;
  state = T.lesson(i);
  displayScore = 0;
  clearFx(t);
  paintBackground();
  renderCoach();
}

function renderCoach(mood = '') {
  const step = T.STEPS[tut.step];
  document.getElementById('coach-step').textContent = tr`Étape ${tut.step + 1} / ${T.STEPS.length}`;
  document.getElementById('coach-title').textContent = mood === 'yay' ? tr('Bravo !') : step.title;
  document.getElementById('coach-text').textContent = mood === 'nope' ? tr('Vise les cases qui brillent.') : step.text;
  coachEl.className = '';
  void coachEl.offsetWidth; // restart the nudge animation
  coachEl.className = mood;
}

function tutorialNope() {
  renderCoach('nope');
  haptic('nope');
}

function tutorialMoved(slot, t) {
  state = T.afterMove(state, slot);
  if (!T.done(state)) return;
  tut.doneAt = t;
  const step = tut.step;
  setTimeout(() => { if (tut && tut.step === step) { renderCoach('yay'); sfx.mission(); } }, 450);
  setTimeout(() => {
    if (!tut || tut.step !== step) return;
    if (step + 1 < T.STEPS.length) loadStep(step + 1);
    else tutorialEndEl.classList.add('show');
  }, 1900);
}

function endTutorial() {
  const saved = tut.saved;
  tut = null;
  document.body.classList.remove('tutorial');
  tutorialEndEl.classList.remove('show');
  handEl.classList.remove('on');
  profile = M.markTip(profile, 'tutorial');
  saveProfile();
  if (saved) {
    // Replayed from the settings: back to the run that was going on.
    state = saved;
    displayScore = state.score;
    clearFx(now());
    paintBackground();
    syncMode();
    renderInventory();
  } else {
    newGame({ mode: prefs.mode, level: prefs.level });
  }
  openMenu();
}
document.getElementById('tutorial-play').addEventListener('click', () => { unlockAudio(); endTutorial(); });
document.getElementById('coach-skip').addEventListener('click', () => { unlockAudio(); endTutorial(); });
document.getElementById('setting-tutorial').addEventListener('click', () => { unlockAudio(); sfx.turn(); startTutorial(); });

// Where the next scripted piece should go: its center on the board, in pixels.
function tutorialTarget() {
  const [target] = T.targets(tut.step, state);
  if (!target) return null;
  const rows = target.cells.map((p) => p[0]);
  const cols = target.cells.map((p) => p[1]);
  const r = (Math.min(...rows) + Math.max(...rows)) / 2;
  const c = (Math.min(...cols) + Math.max(...cols)) / 2;
  return { slot: target.slot, x: lay.bx + (c + 0.5) * lay.cell, y: lay.by + (r + 0.5) * lay.cell };
}

function drawTutorialCells(t) {
  if (tut.doneAt) return;
  const th = theme();
  // Free placement (first step): a softer glow, it is only a suggestion.
  const strength = T.STEPS[tut.step].lines ? 1 : 0.6;
  ctx.fillStyle = withAlpha(th.accent, (0.3 + 0.2 * Math.sin(t / 220)) * strength);
  for (const target of T.targets(tut.step, state)) {
    for (const [r, c] of target.cells) {
      if (state.board[r * SIZE + c]) continue;
      ctx.beginPath();
      ctx.roundRect(lay.bx + c * lay.cell + 3, lay.by + r * lay.cell + 3, lay.cell - 6, lay.cell - 6, lay.cell * 0.2);
      ctx.fill();
    }
  }
}

// Loop: the hand picks the piece in the tray, drags it (ghost included) to the glowing cells.
const HAND_LOOP = 2200;
function drawTutorialHand(t) {
  const target = tut && !drag && !tut.doneAt && !returning.length && tutorialTarget();
  const since = tut ? t - tut.t0 - 700 : -1;
  if (!target || since < 0) { handEl.classList.remove('on'); return; }
  const p = (since % HAND_LOOP) / HAND_LOOP;
  const piece = state.tray[target.slot];
  const [sx, sy] = slotCenter(target.slot);
  const lift = touchLift.matches ? lay.cell * 2.2 : 0;
  const move = easeInOut(Math.min(1, Math.max(0, (p - 0.18) / 0.47)));
  const alpha = p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1;
  const pressed = p > 0.12 && p < 0.72;
  // The piece rides above the finger, like a real drag.
  const px = sx + (target.x - sx) * move;
  const py = sy + (target.y - sy) * move;
  const fx = px;
  const fy = py + lift * move + (lift ? 0 : lay.cell * 0.4);
  if (pressed && move > 0) {
    const size = miniCell() + (lay.cell - miniCell()) * Math.min(1, move * 3);
    drawPiece(piece, px, py, size, 0.55 * alpha);
  }
  handEl.classList.add('on');
  handEl.style.opacity = alpha.toFixed(3);
  handEl.style.transform = `translate(${fx - 17}px, ${fy - 3}px) scale(${pressed ? 0.9 : 1})`;
}
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
