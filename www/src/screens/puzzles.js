// Cubo Blocks — Puzzles screen and puzzle runs.
'use strict';

// ---------- Puzzles ----------
const puzzlesEl = document.getElementById('puzzles');

function openPuzzles() {
  unlockAudio();
  menuEl.classList.remove('show');
  overEl.classList.remove('show');
  levelEndEl.classList.remove('show');
  const all = Object.values(profile.puzzles || {}).reduce((a, b) => a + b, 0);
  document.getElementById('puzzles-stars').innerHTML = starSvg(true, 18) + `${fmt(all)} / ${PZ.COUNT * 3}`;
  const list = document.getElementById('puzzles-list');
  list.innerHTML = '';
  PZ.PACKS.forEach((pack, k) => {
    const first = k * PZ.PER_PACK + 1;
    let solved = 0;
    for (let n = first; n < first + PZ.PER_PACK; n++) if (M.puzzleStarsOf(profile, n) !== undefined) solved += 1;
    list.insertAdjacentHTML('beforeend', `<div class="pz-pack"><h3>${pack.name}</h3><span>${tr`${solved} / ${PZ.PER_PACK} · ${PZ.quotaOf(first)} à ${PZ.quotaOf(first + PZ.PER_PACK - 1)} formes`}</span></div>`);
    // A pack not reached yet is a single line instead of ten padlocks.
    if (!M.puzzleOpen(profile, first)) {
      list.insertAdjacentHTML('beforeend', `<div class="pz-locked">${LOCK_SVG}<span>${tr`Finis le pack ${PZ.PACKS[k - 1].name} pour ouvrir ces ${PZ.PER_PACK} puzzles.`}</span></div>`);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'levels';
    for (let n = first; n < first + PZ.PER_PACK; n++) {
      const open = M.puzzleOpen(profile, n);
      const stars = M.puzzleStarsOf(profile, n);
      const b = document.createElement('button');
      b.className = 'lvl' + (open ? '' : ' locked') + (stars !== undefined ? ' done' : '');
      b.innerHTML = `<span class="num">${open ? n : LOCK_SVG}</span><span class="stars">${starsRow(stars || 0, 12)}</span>`;
      // Solved: the drawing itself replaces the number.
      if (stars !== undefined) b.querySelector('.num').replaceChildren(puzzleThumb(n));
      b.setAttribute('aria-label', tr`Puzzle ${n}` + (stars !== undefined ? ', ' + pzOf(n).name : '') + (open ? '' : tr(', verrouillé')));
      b.addEventListener('click', () => { if (open) { sfx.turn(); startPuzzle(n); } else nope(); });
      grid.appendChild(b);
    }
    list.appendChild(grid);
  });
  list.appendChild(surpriseCard());
  puzzlesEl.classList.add('show');
}

// Last row of the list: Puzzle surprise, a random drawing with every piece shown at once.
function surpriseCard() {
  const open = M.surpriseOpen(profile);
  const solved = M.surprisesSolved(profile);
  const el = document.createElement(open ? 'button' : 'div');
  el.className = 'pz-surprise' + (open ? '' : ' locked');
  el.innerHTML = `<span class="ico">${open ? `<svg width="30" height="30" viewBox="0 0 24 24">${SURPRISE_SVG}</svg>` : LOCK_SVG}</span>
      <span class="txt"><b>${tr('Puzzle surprise')}</b><span>${open
      ? tr`Un dessin au hasard, ${PZ.SURPRISE_MIN} à ${PZ.SURPRISE_MAX} formes à placer toutes ensemble. Tu peux déplacer celles déjà posées.`
      : tr`Finis le pack ${PZ.PACKS[3].name} pour l’ouvrir : un dessin au hasard, toutes les formes d’un coup.`}</span></span>
      ${open ? `<span class="meta">${solved ? tr`${fmt(solved)} réussi${solved > 1 ? 's' : ''}` : tr('Nouveau')}<b>+${M.SURPRISE_COINS}${COIN}</b></span>` : ''}`;
  if (open) el.addEventListener('click', () => { sfx.turn(); unlockAudio(); launchSurprise(); });
  return el;
}
// Building a puzzle tiles its drawing: keep the ones the list needs.
const pzCache = {};
const pzOf = (n) => (pzCache[n] = pzCache[n] || PZ.puzzle(n));
// Small silhouette of a solved puzzle's drawing, in the theme's accent.
function puzzleThumb(n) {
  const cv = document.createElement('canvas');
  const px = Math.round(32 * Math.min(window.devicePixelRatio || 1, 3));
  cv.width = px; cv.height = px;
  const g = cv.getContext('2d');
  const cell = px / SIZE;
  g.fillStyle = getComputedStyle(puzzlesEl).getPropertyValue('--accent').trim() || '#7c5cff';
  pzOf(n).mask.forEach((on, i) => {
    if (!on) return;
    g.beginPath();
    g.roundRect((i % SIZE) * cell + 0.3, Math.floor(i / SIZE) * cell + 0.3, cell - 0.6, cell - 0.6, cell * 0.2);
    g.fill();
  });
  return cv;
}
document.getElementById('menu-puzzles').addEventListener('click', () => {
  sfx.turn();
  if (puzzleInProgress()) closeMenu(); else openPuzzles();
});
document.getElementById('puzzles-close').addEventListener('click', () => { puzzlesEl.classList.remove('show'); openMenu(); });
puzzlesEl.addEventListener('click', (e) => { if (e.target === puzzlesEl) { puzzlesEl.classList.remove('show'); openMenu(); } });

function startPuzzle(n) {
  unlockAudio();
  launchPuzzle(n); // a free run in progress is parked, not dropped
}
function launchPuzzle(n) {
  puzzlesEl.classList.remove('show');
  levelEndEl.classList.remove('show');
  menuEl.classList.remove('show');
  restartRun({ mode: 'puzzle', puzzle: PZ.puzzle(n) });
  banners.push({ text: tr('Puzzle ') + n, sub: state.puzzle.name + ' · ' + state.puzzle.total + tr(' formes'), gold: true });
}

const puzzleTitle = (pz) => (pz.free ? tr('Puzzle surprise') : tr('Puzzle ') + pz.n);
function launchSurprise(seed = Date.now()) {
  puzzlesEl.classList.remove('show');
  levelEndEl.classList.remove('show');
  menuEl.classList.remove('show');
  restartRun({ mode: 'puzzle', puzzle: PZ.surprise(seed) });
  banners.push({ text: tr('Puzzle surprise'), sub: state.puzzle.name + ' · ' + state.puzzle.total + tr(' formes'), gold: true });
}

// Hint button (puzzle only): places one piece on a right spot for a few coins.
const hintBtn = document.createElement('button');
hintBtn.className = 'hint-btn';
function labelHint() {
  hintBtn.innerHTML = tr`Indice <span class="price">${M.PUZZLE_HINT}${COIN}</span>`;
  hintBtn.setAttribute('aria-label', tr`Indice pour ${M.PUZZLE_HINT} pièces`);
}
labelHint();
invEl.appendChild(hintBtn);
function renderHint() {
  hintBtn.disabled = state.mode !== 'puzzle' || state.over || profile.coins < M.PUZZLE_HINT;
}
hintBtn.addEventListener('click', () => {
  unlockAudio();
  if (state.mode !== 'puzzle' || state.over) return;
  if (profile.coins < M.PUZZLE_HINT) { nope(); banners.push({ text: tr('Pas assez de pièces'), sub: tr`Un indice coûte ${M.PUZZLE_HINT}` }); return; }
  const res = L.puzzleHint(state);
  if (!res) {
    nope();
    banners.push({ text: tr('Pas de place juste'), sub: state.puzzle.free ? tr('Retire une forme mal placée, puis réessaie') : tr('Annule quelques coups, puis réessaie') });
    return;
  }
  payCoins(M.PUZZLE_HINT);
  const t = now();
  state = res.state;
  for (const [r, c] of res.events.placed) {
    pops.push({ r, c, t0: t });
    burst({ r, c }, t, 4, 70, '#fff6a0');
  }
  refilled(res.events.refilled, t);
  sfx.bonus();
  haptic('hint');
  renderUndo();
  renderHint();
  afterChange(t, res.events.over);
});

// Puzzle solved: pay, record stars, celebrate, then the result card.
function endPuzzle(t) {
  const pz = state.puzzle;
  const runReport = settleRun();
  let report = null;
  if (!levelSettled) {
    levelSettled = true;
    const res = pz.free ? M.applySurprise(profile, pz.hints) : M.applyPuzzle(profile, pz.n, pz.stars);
    profile = res.profile;
    report = res.report;
    report.earned.push(...stickerLines());
    saveProfile();
    renderWallet();
  }
  banners.length = 0;
  banners.push({ text: tr('Bravo !'), sub: pz.name + tr(' complété'), tier: 3 });
  if (!calm()) { confetti(t, 70); shake = 10; }
  setTimeout(() => { sfx.mission(); haptic('win'); }, 350);
  setTimeout(() => showPuzzleEnd(runReport, report), 1300);
  save();
}

function showPuzzleEnd(runReport, report) {
  const pz = state.puzzle;
  const card = document.getElementById('level-end-card');
  const lines = [...(runReport ? runReport.earned : []), ...(report ? report.earned : [])];
  const total = lines.reduce((a, l) => a + l.coins, 0);
  const next = !pz.free && pz.n < PZ.COUNT ? pz.n + 1 : null;
  card.innerHTML = `
      <h2>${tr('Puzzle réussi !')}</h2>
      <div class="stage-sub">${puzzleTitle(pz)} · ${pz.name}</div>
      ${pz.free ? `<div class="stage-sub">${tr`${fmt(M.surprisesSolved(profile))} puzzle${M.surprisesSolved(profile) > 1 ? 's' : ''} surprise réussi${M.surprisesSolved(profile) > 1 ? 's' : ''}`}</div>` : `<div class="stage-stars">${starsRow(pz.stars, 44)}</div>`}
      <div class="stage-sub">${pz.hints ? tr`${pz.hints} indice${pz.hints > 1 ? 's' : ''} utilisé${pz.hints > 1 ? 's' : ''}` : tr('Sans indice')}</div>
      <div class="earn">${lines.map((l) => `<div class="earn-line in"><span>${l.label}</span><b>+${l.coins}${COIN}</b></div>`).join('')}</div>
      ${total ? `<div class="coins-total"><span>${tr('Pièces')}</span><span class="v">+${fmt(total)} ${COIN}</span></div>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="list">Puzzles</button>
        ${pz.free ? tr('<button class="btn primary" data-act="more">Un autre</button>') : ''}
        ${pz.free || pz.stars >= 3 ? '' : `<button class="btn ${next ? 'ghost' : 'primary'}" data-act="again">${tr('Rejouer')}</button>`}
        ${next ? tr('<button class="btn primary" data-act="next">Suivant</button>') : ''}
      </div>`;
  endCubo(card, 'party');
  card.querySelector('[data-act="list"]').addEventListener('click', openPuzzles);
  const more = card.querySelector('[data-act="more"]');
  if (more) more.addEventListener('click', () => launchSurprise());
  const again = card.querySelector('[data-act="again"]');
  if (again) again.addEventListener('click', () => startPuzzle(pz.n));
  if (next) card.querySelector('[data-act="next"]').addEventListener('click', () => startPuzzle(next));
  levelEndEl.classList.add('show');
  if (!pz.free) starChimes(pz.stars);
}
