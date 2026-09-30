# Pause, block marks, dark menus
Status: shipped (2026-10-01)

## Pause
The top-right HUD button (pause icon) opens `#pause`: Reprendre, Recommencer (hidden during a daily: attempts are counted at the start), Réglages (closing them returns to the pause), Menu.
Going to the background mid-run opens it too (`visibilitychange`). Timers already stop under any open overlay (`pausedByUi`).
The home menu is reached from the pause; its "Continuer" resumes.

## Block marks (color-blind aid)
Réglages > Motifs sur les blocs (`settings.patterns`, off by default). `MARKS` in `src/main.js`: one small symbol per shape family (index = palette index), drawn by `drawBlock(..., fam)` over the skin, dark translucent (the block color on the Néon skin). Blocks carrying a bonus or coin icon show the icon instead.
Every `drawBlock` call that knows the family passes it; a new caller should too.

## Dark menus
Réglages > Menus sombres (`settings.darkMenus`, defaults to the system dark mode). Off-game screens carry `.overlay.ui` (menu, settings, adventure, world, stage, défis, missions, profile, shop); `body.dark-menus .overlay.ui` swaps their neutrals for a night palette.
It only applies when the current theme is light (`--scheme: 'light'` from `lightCss`); dark worlds keep their own menus. The accent stays the theme's through `--menu-accent` (a theme can set `--accent-dark` / `--on-accent-dark`, as Rétro does).
In-game popups (pause, game over, level end, legend, tutorial end) keep the theme.

## Files
- `index.html`: `#pause`, settings rows, `.dark-menus` rules, `.ui` classes.
- `src/main.js`: sections `pause` and `settings`, `MARKS` / `drawMark`, `applyThemeCss`.
