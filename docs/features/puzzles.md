# Puzzles
Status: shipped

## What it does
Menu row "Puzzles" opens 60 puzzles in 6 packs of 10 (Débutant, Malin, Expert, Maître, Virtuose, Légende; the last two added 2026-10-01), unlocked one after the other, then the Puzzle surprise card. A puzzle is a drawing (heart, house, rocket...) mostly filled with pieces already in place. The player gets a quota of pieces (3 at the start, 8 at puzzle 40, 8 to 10 in packs 5-6), dealt in a fixed order to the tray (next piece + count in the "Ensuite" column), and must fill every empty cell of the drawing.

- Free rotation (tap a piece), no line clears, no bonuses, no bin.
- Undo is free and goes back as far as wanted.
- Indice (30 coins): puts one tray piece on a right spot. Stars: 3 without hints, one less per hint, at least 1.
- Rewards: first solve 15, +5 per new star, 60 for a finished pack.
- Stuck (nothing fits) is not a loss: undo or hint.

### Puzzle surprise
Last card of the list, opens once pack Maître (puzzles 31-40) is done. Each game picks a random drawing (any of `DRAWINGS`, turned or mirrored) and takes out 8 to 10 pieces.
- Every piece is in the tray at once (two rows of pads over the board width, no Ensuite column).
- A placed piece can be grabbed again: drag it elsewhere, drop it outside to send it back to the tray, or tap it to send it back. Undo also undoes a pick-up.
- Pays 25 coins, 10 if a hint was used. No stars; `profile.surprises` counts the ones solved. "Un autre" deals a new one; Recommencer replays the same seed.

## Files
- `src/puzzles.js`: `DRAWINGS` (hand-made 8x8 silhouettes, 25), `PACKS`, `quotaOf`, `puzzle(n)`, `surprise(seed)` (tiles the drawing with game shapes, takes out a contiguous group of pieces as the quota, turns and shuffles them), `tile`.
- `src/logic.js`: mode `'puzzle'`, kind `void` (outside the drawing), `setupPuzzle`, `placePuzzle`, `puzzleHint`, `liftPuzzle` (surprise), puzzle branches in `refillSlot`, `settle`, `undo`, `canTurn`, `canDiscard`, `undoCost`.
- `src/meta.js`: `applyPuzzle`, `puzzleOpen`, `puzzleStarsOf`, `puzzlesSolved`, `PUZZLE_*` constants; `applySurprise`, `surpriseOpen`, `surprisesSolved`, `SURPRISE_*`.
- `src/main.js` (surprise): `freeTray` / `slotBox` (tray grid), `liftFromBoard`, `surpriseCard`, `launchSurprise`, `puzzleTitle`.
- `src/main.js`: section `Puzzles` (`openPuzzles`, `startPuzzle`, hint button, `endPuzzle`, `showPuzzleEnd`), `isVoid` in `drawBoard`, puzzle plate in `drawHUD`, count in `drawNext`. `index.html`: `#menu-puzzles`, `#puzzles`, `.hint-btn`, `body.puzzle`.

## Saved state
- Profile: `puzzles: { [n]: stars }`, optional; `surprises: n` (Puzzle surprise solved), optional.
- Run: `state.puzzle = { n, name, total, placed, hints, won, stars, queue, sol }` (surprise: n = 0, plus `free: true, seed, at: { [piece id]: { slot, cells, piece } }`, queue empty, the tray holds the whole quota); `state.undo` keeps the whole chain back to the start.

## Gotchas
- Puzzles 1-40 only use the first 12 `DRAWINGS` (`FIRST_DRAWINGS`) and their original quotas: append new drawings at the end, never reorder. Puzzles 41+ and surprises retile a drawing too small for the quota.
- Puzzles are generated from fixed seeds: changing `DRAWINGS`, `quotaOf`, the tiling order or `L.SHAPES` changes every puzzle (stars already earned stay on their number). `tests/puzzles.test.js` checks all 40 are solvable.
- The board frame follows the drawing (`drawShapedFrame`: one padded tile per cell, one path, no frame line).
- Void cells are `SPECIAL` on the board: never run line clears in puzzle mode (a row of voids + blocks would count as full).
