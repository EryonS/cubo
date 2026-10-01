# Modes
Status: shipped (Classique, Chrono, Chill, Aventure, Mondes). Aventure and Mondes have their own files: aventure.md, worlds-mode.md.

## What it does
- **Classique**: play until no piece fits.
- **Chrono**: a clock runs down; cleared lines add time.
- **Chill**: free rotation, no bonuses.
Each has Facile / Normal / Difficile, and its own record.

**Difficulty obstacles** (2026-10-01, user's request): like Aventure levels, Facile has no obstacle, Normal drops one obstacle kind (every 8 moves), Difficile two (every 7 and 10 moves). The kinds come from the equipped theme's world: its own cell, then its level 11-19 twist (Volcan: braises, lave; Glace: glace, bonshommes de neige...). Jouet and the season themes use Plaine's (caisses, taupes). The run's coins get a bonus at the end: +20 % on Normal, +50 % on Difficile (grid coins, perfects, combos, bombs; missions excluded). The Partie libre sheet shows the obstacles (pictures and names) and the bonus for the picked level.

## Files
- `www/src/core/logic.js`: `MODES`, `LEVELS`, `createGame(seed, { mode, level, budget, obstacles })`, `obstacleSpawn`; `runStats` reports `obstacles` (count).
- `www/src/core/worlds.js`: `FREE_OBSTACLES`, `freeObstacles(theme, level)`.
- `www/src/core/meta.js`: `DIFFICULTY_BONUS`, bonus line in `runCoins`.
- `www/index.html`: Partie libre sheet `#free` (`#menu-mode`, `#menu-level`), opened from the home row.
- `www/src/screens/home.js`, `www/src/game/undo.js`, `www/src/platform/storage.js`: `MODE_NAMES`, `LEVEL_NAMES`, `syncMode`, `renderMenu`, `bests`.

## Saved state
`gridlock.v2`: `{ state, bests: { [mode]: n }, settings, prefs: { mode, level } }`. An unfinished run is saved on `visibilitychange` and resumed at launch.

## Gotchas
- World rules never apply in these modes: only the obstacle cells (their KINDS behaviors: embers harden, vines spread...).
- Records stay per mode (not per level), as before; the obstacles make Difficile harder to score in.
- Runs saved before 2026-10-01 have no `state.obstacles` and get no bonus.
- Adding a mode: add it to `MODES`, the menu, `MODE_NAMES` and `bests`.
