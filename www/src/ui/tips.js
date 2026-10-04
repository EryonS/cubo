// Cubo Blocks — One-time tips.
'use strict';

// ---------- tips ----------
// One-time bubbles, shown the first time something happens. Seen ids live in profile.tips.
const tipEl = document.getElementById('tip');
let tipQueue = [];
let tipShown = null; // the tip on screen: { id, title, text, anchor }

function tip(id, title, text, anchor) {
  if (tut || M.tipSeen(profile, id) || tipQueue.some((q) => q.id === id) || (tipShown && tipShown.id === id)) return;
  tipQueue.push({ id, title, text, anchor });
}
function hideTips() {
  tipQueue = [];
  tipShown = null;
  tipEl.classList.remove('show');
}
tipEl.addEventListener('click', () => { tipShown = null; });

// Called each frame: shows the next tip once no screen covers the game, hides it under overlays.
function pumpTips() {
  const covered = pausedByUi() || !!tut;
  if (!tipShown && tipQueue.length && !covered && !state.over) {
    tipShown = tipQueue.shift();
    profile = M.markTip(profile, tipShown.id);
    saveProfile();
    tipEl.innerHTML = `<b>${tipShown.title}</b>${tipShown.text}<small>${tr('Touche pour fermer')}</small>`;
    placeTip(tipShown.anchor);
  }
  tipEl.classList.toggle('show', !!tipShown && !covered);
}

// Next to its anchor (element or rect getter), above it in the lower half of the screen.
function placeTip(anchor) {
  const r = anchor && (anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor());
  tipEl.classList.remove('above', 'below', 'free');
  tipEl.style.top = tipEl.style.bottom = '';
  const w = Math.min(300, W - 32);
  if (!r || !r.width) {
    tipEl.classList.add('free');
    tipEl.style.left = (W - w) / 2 + 'px';
    tipEl.style.top = lay.by + lay.cell * 2 + 'px';
    return;
  }
  const cx = (r.left + r.right) / 2;
  const left = Math.max(16, Math.min(W - 16 - w, cx - w / 2));
  tipEl.style.left = left + 'px';
  tipEl.style.setProperty('--arrow', Math.max(18, Math.min(w - 18, cx - left)) + 'px');
  if ((r.top + r.bottom) / 2 > H / 2) {
    tipEl.classList.add('above');
    tipEl.style.bottom = H - r.top + 12 + 'px';
  } else {
    tipEl.classList.add('below');
    tipEl.style.top = r.bottom + 12 + 'px';
  }
}

const rectOf = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });

function collectTips(collected) {
  const bonus = collected.find((b) => !b.coins);
  if (bonus) {
    tip('bonus', tr('Bonus gagné !'), tr`${BONUS_UI[bonus.type].name} : touche-le en bas pour l'utiliser. Le bouton « ? » explique chaque bonus.`, invButtons[bonus.type]);
  }
  if (collected.some((b) => b.coins)) {
    tip('coins', tr('Des pièces !'), tr('Dépense-les en Boutique, ou pour jeter une forme et annuler un coup.'), walletEl);
  }
}

function modeTips() {
  const plate = () => rectOf(lay.band.x, lay.band.y, lay.band.w, lay.band.h);
  if (state.mode === 'chrono') {
    tip('chrono', tr('Chrono'), tr('Le temps file ! Chaque ligne effacée te rend quelques secondes.'), () => {
      const [x, y] = chronoBar();
      return rectOf(x, y - 6, lay.board, 12);
    });
  } else if (state.mode === 'chill') {
    tip('chill', tr('Chill'), tr('Touche une forme pour la tourner. Pas de bonus, pas de pression.'), () => rectOf(lay.bx, lay.ty, lay.nextX - lay.bx, lay.trayH));
  } else if (state.puzzle && state.puzzle.free) {
    tip('surprise', tr('Puzzle surprise'), tr('Toutes les formes sont là. Touche une forme pour la tourner, et reprends une forme déjà posée pour la déplacer.'), () => rectOf(lay.bx, lay.ty, lay.board, lay.trayH));
  } else if (state.mode === 'puzzle') {
    tip('puzzle', tr('Puzzle'), tr('Remplis tout le dessin avec les formes données. Touche une forme pour la tourner.'), () => rectOf(lay.bx, lay.ty, lay.nextX - lay.bx, lay.trayH));
  } else if (state.mode === 'worlds') {
    tip('worlds', tr('Mondes'), tr('Partie sans fin avec les règles du monde. Plus tu marques, plus la prime en pièces grossit.'), plate);
  } else if (state.stage && state.stage.daily) {
    tip('daily', tr('Niveau du jour'), tr('Le même niveau pour tout le monde aujourd’hui. Atteins l’objectif affiché en haut.'), plate);
  } else if (state.stage) {
    tip('adventure', tr('Aventure'), tr('Atteins l’objectif affiché en haut avant d’avoir joué tous tes coups.'), plate);
  }
}
