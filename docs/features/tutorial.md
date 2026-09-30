# Tutorial and tips
Status: shipped

## What it does
- **Guided first game**: 3 scripted steps (drag a piece anywhere, fill a column, two clears in a row for combo x2). A hand drags a ghost of the piece to glowing target cells; a coach card replaces the HUD. Steps 2-3 refuse a move that clears nothing ("Vise les cases qui brillent."). Ends on a "Bien joué !" card, then a normal game with the last menu mode. "Passer" skips it.
- Runs at launch for new players only (`M.needsTutorial`: no games, no stars, not seen). Replay: Réglages > "Revoir le tutoriel"; a run in progress is restored afterwards.
- **One-time tips**: a dark bubble pointing at the relevant button, shown the first time: a bonus is collected (`bonus`), coins are collected (`coins`), the player is stuck with a rescue available (`stuck`), a Chrono / Chill / Aventure / daily game starts (`chrono`, `chill`, `adventure`, `daily`). Tap it (or the board) to close. Hidden under overlays, dropped on game over or when the menu opens (a dropped tip was never marked seen, so it comes back later).

## Files
- `src/tutorial.js` (pure): `STEPS`, `lesson(i)` builds the step state on `logic.createGame`, `accepts`, `afterMove` (empties the used slot, no refill), `done`, `targets`.
- `src/meta.js`: `tipSeen`, `markTip`, `needsTutorial`.
- `src/main.js`: sections `tutorial` and `tips`; hooks in `commit`, `save`, `drawHUD`, `frame`, `newGame` (`modeTips`), `afterChange` (stuck tip).
- `index.html`: `#coach`, `#coach-skip`, `#hand`, `#tip`, `#tutorial-end`, `#setting-tutorial`; `body.tutorial` hides the HUD.
- `tests/tutorial.test.js`.

## Saved state
`profile.tips = { tutorial: true, bonus: true, ... }`, optional, read with defaults (no migration). The tutorial board itself is never saved (`save()` returns early) and never counts for missions, records or stats.

## Gotchas
- Changing a step: the test plays each piece on its suggested spot and checks it clears; keep the lines of the combo step independent so both orders work.
- The hand ends `2.2 * cell` below the target on touch screens, matching the drag lift, so copying the gesture lands the piece right.
