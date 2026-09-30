# Puzzles
Status: shipped

## What it does
Menu row "Puzzles" opens 40 puzzles in 4 packs of 10 (Débutant, Malin, Expert, Maître), unlocked one after the other. A puzzle is a drawing (heart, house, rocket...) mostly filled with pieces already in place. The player gets a quota of pieces (3 at the start, 8 at the end), dealt in a fixed order to the tray (next piece + count in the "Ensuite" column), and must fill every empty cell of the drawing.

- Free rotation (tap a piece), no line clears, no bonuses, no bin.
- Undo is free and goes back as far as wanted.
- Indice (30 coins): puts one tray piece on a right spot. Stars: 3 without hints, one less per hint, at least 1.
- Rewards: first solve 15, +5 per new star, 60 for a finished pack.
- Stuck (nothing fits) is not a loss: undo or hint.

## Files
- `src/puzzles.js`: `DRAWINGS` (hand-made 8x8 silhouettes), `PACKS`, `quotaOf`, `puzzle(n)` (tiles the drawing with game shapes, takes out a contiguous group of pieces as the quota, turns and shuffles them), `tile`.
- `src/logic.js`: mode `'puzzle'`, kind `void` (outside the drawing), `setupPuzzle`, `placePuzzle`, `puzzleHint`, puzzle branches in `refillSlot`, `settle`, `undo`, `canTurn`, `canDiscard`, `undoCost`.
- `src/meta.js`: `applyPuzzle`, `puzzleOpen`, `puzzleStarsOf`, `puzzlesSolved`, `PUZZLE_*` constants.
- `src/main.js`: section `Puzzles` (`openPuzzles`, `startPuzzle`, hint button, `endPuzzle`, `showPuzzleEnd`), `isVoid` in `drawBoard`, puzzle plate in `drawHUD`, count in `drawNext`. `index.html`: `#menu-puzzles`, `#puzzles`, `.hint-btn`, `body.puzzle`.

## Saved state
- Profile: `puzzles: { [n]: stars }`, optional.
- Run: `state.puzzle = { n, name, total, placed, hints, won, stars, queue, sol }`; `state.undo` keeps the whole chain back to the start.

## Gotchas
- Puzzles are generated from fixed seeds: changing `DRAWINGS`, `quotaOf`, the tiling order or `L.SHAPES` changes every puzzle (stars already earned stay on their number). `tests/puzzles.test.js` checks all 40 are solvable.
- The board frame follows the drawing (`drawShapedFrame`: one padded tile per cell, one path, no frame line).
- Void cells are `SPECIAL` on the board: never run line clears in puzzle mode (a row of voids + blocks would count as full).
