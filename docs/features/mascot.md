# Mascot (Cubo)
Status: shipped

## What it does
Cubo, a mint jelly with a sprout, sits on the top-right corner of the board frame in every mode. It is drawn on the canvas, no image.

- Base mood (from the game): watches the dragged piece, worried when 70% of the board is full or the run is stuck (not in puzzles), asleep behind any menu, sad at a lost end, partying (hops) at a won level or puzzle.
- Event moods (short): happy jump on a clear (higher for more lines), star eyes on a big combo / empty grid / new record, "oops" when a combo breaks, wide eyes on a bonus.
- Tap: bounce + hearts; 5 taps in a row make it dizzy for 2 s.
- Setting "Mascotte" turns it off.

## Files
- `src/main.js`: section `mascot` (`CUBO` colors, `cuboReact`, `cuboBaseMood`, `drawCubo`, `cuboHit`, `cuboTap`); hooks in `commit`, `useBonus`, `afterChange` (record), pointerdown; drawn in `frame` after the board.
- `index.html`: settings toggle `data-setting="mascot"`.

## Saved state
`settings.mascot` in `gridlock.v2` (default true, merged at load).

## Gotchas
- Mood is recomputed every frame; events only override it until `cubo.until`.
- Reduced motion: no jumps, sway or spin; moods still change.
- Its spot is the board's top-right corner (`cuboSpot`): a layout change above the board must keep that corner free.
