// Cubo Blocks — Start-up: one-time notes, font repaint, first screen. Loaded last.
'use strict';

// After every file is in: a restored run that is stuck without coins ends here (endGame, tips...).
renderWallet();

// One-time note after the redesign refunded retired skins.
if (migrated.refund) {
  const note = document.createElement('div');
  note.className = 'menu-note';
  note.innerHTML = tr`Nouveau look ! Tes anciens skins ont été remboursés : <b>+${fmt(migrated.refund)} ${COIN}</b>`;
  menuEl.querySelector('.brand').after(note);
}

// Canvas text does not wait for web fonts: repaint once they are in.
if (document.fonts) document.fonts.load(`800 20px "Baloo 2"`).then(() => document.fonts.ready).then(paintBackground, () => {});

// Start on the home menu; timers stay paused until the player picks something.
syncMode();
if (M.needsTutorial(profile)) startTutorial();
else { renderMenu(); menuEl.classList.add('show'); }
requestAnimationFrame(frame);
startCloud();
