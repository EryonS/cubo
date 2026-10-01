# Pause, block marks, dark menus
Status: shipped (2026-10-01)

## Pause
The top-right HUD button (pause icon) opens `#pause`: Reprendre, Recommencer (hidden during a daily: attempts are counted at the start), Réglages (closing them returns to the pause), Menu.
Going to the background mid-run opens it too (`visibilitychange`). Timers already stop under any open overlay (`pausedByUi`).
The home menu is reached from the pause; its "Continuer" resumes.

## Block marks (color-blind aid)
Réglages > Motifs sur les blocs (`settings.patterns`, off by default). `MARKS` in `src/main.js`: one small symbol per shape family (index = palette index), drawn by `drawBlock(..., fam)` over the skin, dark translucent (the block color on the Néon skin). Blocks carrying a bonus or coin icon show the icon instead.
Every `drawBlock` call that knows the family passes it; a new caller should too.

## Dark menus (removed)
Réglages > Menus sombres was removed on 2026-10-01 at the user's request: with the world themes it made too many color changes. Menus always wear the equipped theme. Don't bring it back.

## Record flag
Free runs with a record (Classique, Chrono, Chill, Mondes): a pennant planted on the board frame's top-left corner carries the record the run started with, in the theme's combo-tag colors; the score plate then reads SCORE. It waves harder in the last 10 %, and topples over when the record falls (with the "Nouveau record" banner, confetti and Cubo's star eyes). `drawRecordFlag`, `flagDownAt`. A bar inside the score plate was tried first and dropped (user didn't like it).

## Files
- `index.html`: `#pause`, settings rows, `.ui` classes.
- `src/main.js`: sections `pause` and `settings`, `MARKS` / `drawMark`, `applyThemeCss`.
- iPhone status bar: `syncStatusBar` sets `theme-color` to the shown menu screen's card color, else to the played world's `base`. Called from `applyThemeCss` and on every overlay change (`syncTabbar`).
