# Modes
Status: shipped (Classique, Chrono, Chill, Aventure). Aventure has its own file: aventure.md.

## What it does
- **Classique**: play until no piece fits.
- **Chrono**: a clock runs down; cleared lines add time.
- **Chill**: free rotation, no bonuses.
Each has Facile / Normal / Difficile, and its own record.

## Files
- `src/logic.js`: `MODES`, `LEVELS`, `createGame(seed, { mode, level, budget })`.
- `index.html`: home menu (`#menu-mode`, `#menu-level`).
- `src/main.js`: `MODE_NAMES`, `LEVEL_NAMES`, `syncMode`, `renderMenu`, `bests`.

## Saved state
`gridlock.v2`: `{ state, bests: { [mode]: n }, settings, prefs: { mode, level } }`. An unfinished run is saved on `visibilitychange` and resumed at launch.

## Gotchas
- Records must stay comparable: world rules never apply in these modes.
- Adding a mode: add it to `MODES`, the menu, `MODE_NAMES` and `bests`.
