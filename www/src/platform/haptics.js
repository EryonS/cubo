// Cubo Blocks — Vibrations: one pattern per kind of moment (HAPTICS), and the refused-move feedback.
'use strict';

const buzz = (p) => { if (settings.vibrate && navigator.vibrate) navigator.vibrate(p); };
// One vibration per kind of moment, from a light tick (pick, coin) to long rolls (win, game over).
// Patterns are [on, off, on...] in ms. iOS Safari has no vibration API: they play in the app build.
const HAPTICS = {
  pick: 5, lift: 7, turn: 6, place: 9, nope: [8, 45, 8], arm: 8, toss: 12, undo: 10, tap: 8,
  bonus: 15, hint: 12, bomb: [30, 20, 60], boss: [25, 15, 25], coin: 4, star: 14,
  mission: [12, 30, 12], record: [15, 30, 15, 30, 30], buy: [20, 40, 20],
  win: [20, 40, 20, 40, 50], lose: [50, 70, 90],
};
let coinBuzzAt = 0;
// haptic('lines', lines, combo): longer for more lines at once, one more pulse for a big combo.
function haptic(kind, lines = 0, combo = 0) {
  if (kind === 'coin') {
    const t = now();
    if (t - coinBuzzAt < 90) return; // a shower of coins stays a light patter
    coinBuzzAt = t;
  }
  if (kind !== 'lines') { buzz(HAPTICS[kind]); return; }
  const p = lines >= 4 ? [25, 20, 25, 20, 25, 20, 60] : lines === 3 ? [25, 25, 25, 25, 40] : lines === 2 ? [20, 30, 30] : [18];
  const tier = comboTier(combo);
  buzz(tier >= 2 ? [...p, 40, 20 + tier * 15] : p.length === 1 ? p[0] : p);
}
// Refused move: the sound and a double tick.
const nope = () => { sfx.nope(); haptic('nope'); };
