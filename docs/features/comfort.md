# Pause, block marks, dark menus
Status: shipped (2026-10-01)

## Pause
The top-right HUD button (pause icon) opens `#pause`: Reprendre, Recommencer (hidden during a daily: attempts are counted at the start), Réglages (closing them returns to the pause), Menu.
Going to the background mid-run opens it too (`visibilitychange`). Timers already stop under any open overlay (`pausedByUi`).
The home menu is reached from the pause; its "Continuer" resumes.

## Block marks (color-blind aid)
Réglages > Motifs sur les blocs (`settings.patterns`, off by default). `MARKS` in `www/src/platform/storage.js`, `www/src/render/helpers.js`: one small symbol per shape family (index = palette index), drawn by `drawBlock(..., fam)` over the skin, dark translucent (the block color on the Néon skin). Blocks carrying a bonus or coin icon show the icon instead.
Every `drawBlock` call that knows the family passes it; a new caller should too.

## Dark menus (removed)
Réglages > Menus sombres was removed on 2026-10-01 at the user's request: with the world themes it made too many color changes. Menus always wear the equipped theme. Don't bring it back.

## Record flag
Free runs with a record (Classique, Chrono, Chill, Mondes): a pennant planted in the score band's left end carries the record the run started with, in the theme's combo-tag colors; the band then reads SCORE, centered in the room right of the pennant. It waves harder in the last 10 %, and topples over when the record falls (with the "Nouveau record" banner, confetti and Cubo's star eyes). Once fallen, the score slides back to the band's middle and the label reads NOUVEAU RECORD (the label never repeats the big number: RECORD x only shows while the record is above the score). In Aventure the band reads the goal label over `0 / 4`, and the moves left sit in their own COUPS column at the left end, split by a hairline (`movesW`). `recordFlag` / `drawRecordFlag`, `hudBand`, `flagDownAt`. The band replaced a floating score plate that ended up under the HUD buttons on iPhone. A bar inside the score plate was tried first and dropped (user didn't like it).

## Tray pads
Each of the three tray slots and the Suivant column sits on a pad in the theme's board color at half opacity, hairline edge, no shadow (`drawTrayPad`; fully opaque it read as a second board), so pieces read on any background (snow, sand, night skies). Tray pieces are sized `slotW / 5.8` so a 5-long piece stays inside its pad.

## Files
- `www/index.html`: `#pause`, settings rows, `.ui` classes.
- `www/src/screens/pause.js`, `www/src/screens/settings.js`, `www/src/render/helpers.js`, `www/src/render/layout.js`: sections `pause` and `settings`, `MARKS` / `drawMark`, `applyThemeCss`.
- iPhone status bar: `syncStatusBar` sets `theme-color` to the shown menu screen's card color, else to the played world's `base`. Called from `applyThemeCss` and on every overlay change (`syncTabbar`).

## Vibrations
Réglages > Vibrations (`settings.vibrate`). Every vibration goes through `haptic(kind)` and the `HAPTICS` table in `www/src/platform/haptics.js`: light ticks for pick / turn / place / coin, a double tick on a refused move (`nope()` plays the sound and the tick), longer rolls for line clears (more lines = longer, one more pulse from combo tier 2), bomb, boss hit, mission, record, win and game over. Coin ticks are throttled (90 ms) so a shower of coins stays a patter. iOS Safari has no `navigator.vibrate`: there they only play in the app build.
