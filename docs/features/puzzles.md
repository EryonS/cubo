# Puzzles
Status: shipped

## What it does
The Puzzles tile on Jouer (`src/screens/PuzzlesScreen.tsx`, stack route `Puzzles`) opens 80 puzzles in 8 packs of 10 (Débutant, Malin, Expert, Maître, Virtuose, Légende, Mythique, Absolu), unlocked one after the other, then the Puzzle surprise card. A puzzle is a drawing (heart, house, rocket...) mostly filled with pieces already in place. The player gets a quota of pieces (3 at the start, 8 at puzzle 40, 8 to 10 in packs 5-6, 9 or 10 in packs 7-8), all shown in the tray at once (two rows of pads, no Suivant column), and must fill every empty cell of the drawing. Placed pieces can be grabbed again: drag them elsewhere, drop outside to send them back to the tray, or tap one to send it back. Undo also undoes a pick-up.
- Packs 7-8 (Mythique, Absolu, puzzles 61-80) are the hard ones: the drawing is almost empty, only 2 or 3 pieces are already in place (picked at random among the tiling), 9 or 10 are to place.

- Free rotation (tap a piece), no line clears, no bonuses, no bin.
- Undo is free and goes back as far as wanted.
- Indice (30 coins): puts one tray piece on a right spot. Stars: 3 without hints, one less per hint, at least 1. Hints taken on a numbered puzzle not solved yet are remembered (`profile.puzzleHints`): Recommencer, leaving and coming back start with that count, so the stars stay capped. Cleared when the puzzle is solved; a puzzle solved before and replayed for more stars starts clean and keeps nothing.
- Rewards: first solve 15, +5 per new star, 60 for a finished pack.
- Stuck (nothing fits) is not a loss: undo or hint.

### Puzzle surprise
Same tray and pick-up as above (every numbered puzzle now works like this; `free` = free tray / movable pieces, a surprise is `n === 0`, see `isSurprise`).
Last card of the list, opens once pack Maître (puzzles 31-40) is done. Each game picks a random drawing (any of `DRAWINGS`, turned or mirrored) and takes out 8 to 10 pieces.
- Pays 25 coins, 10 if a hint was used. No stars; `profile.surprises` counts the ones solved. "Un autre" deals a new one; Recommencer replays the same seed and keeps the hints already taken (the pay stays the lower one).

## Files
- `src/core/puzzles.ts`: `DRAWINGS` (hand-made 8x8 silhouettes, 25), `PACKS`, `quotaOf`, `puzzle(n)` (free: true, packs 7-8 via `HARD_POOL` and `build(..., hard)`), `surprise(seed)` (tiles the drawing with game shapes, takes out a contiguous group of pieces as the quota, turns and shuffles them), `tile`.
- `src/core/logic.ts`: mode `'puzzle'`, kind `void` (outside the drawing), `setupPuzzle`, `placePuzzle`, `puzzleHint`, `liftPuzzle` (free puzzles), puzzle branches in `refillSlot`, `settle`, `undo`, `canTurn`, `canDiscard`, `undoCost`.
- `src/core/meta.ts`: `applyPuzzle` (clears `puzzleHints[n]`), `notePuzzleHints` / `puzzleHintsOf`, `puzzleOpen`, `puzzleStarsOf`, `puzzlesSolved`, `PUZZLE_*` constants; `applySurprise`, `surpriseOpen`, `surprisesSolved`, `SURPRISE_*`.
- `src/game/puzzle.ts` (pure, `puzzle.test.ts`): `freeTray`, `isSurprise`, `isVoid`, `puzzleTitle` / `puzzleLabel`, pack rows, `settlePuzzle`. `src/game/run.ts`: `startPuzzle`, `startSurprise`, `hintPuzzle`, `liftPuzzlePiece`, `endPuzzle`. `src/game/drag.ts`: the `DragState.ox/oy` of a piece lifted from the board.
- `src/screens/PuzzlesScreen.tsx` (packs, drawing thumbnails, stars, Puzzle surprise card), `src/screens/PuzzleEnd.tsx` (result card), hint button in `src/screens/GameScreen.tsx`.
- `src/render/layout.ts` (`slotBox` and friends take a `free` argument: the surprise tray's two rows), `src/render/draw.ts` (void cells, `drawShapedFrame`, puzzle plate in `drawHUD`, count in the Suivant column).

## Saved state
- Profile: `puzzles: { [n]: stars }`, optional; `puzzleHints: { [n]: hints }` (numbered puzzles not solved yet), optional, no migration (absent = none); `surprises: n` (Puzzle surprise solved), optional.
- Run: `state.puzzle = { n, name, total, placed, hints, won, stars, queue, sol }` (free puzzles, i.e. the surprise (n = 0) and every numbered puzzle started since 2026-10-09: plus `free: true, seed, at: { [piece id]: { slot, cells, piece } }`, queue empty, the tray holds the whole quota; a numbered puzzle saved before has no `free` and keeps its 3 slots + queue until it ends, both paths stay); `state.undo` keeps the whole chain back to the start.

## Gotchas
- Puzzles 1-40 only use the first 12 `DRAWINGS` (`FIRST_DRAWINGS`) and their original quotas: append new drawings at the end, never reorder. Puzzles 41+ and surprises retile a drawing too small for the quota.
- Puzzles are generated from fixed seeds: changing `DRAWINGS`, `quotaOf`, the tiling order or `L.SHAPES` changes every puzzle (stars already earned stay on their number). `src/core/puzzles.test.ts` checks all 80 are solvable and that 61-80 have 2 or 3 pieces in place. Puzzles 41-60 keep their quotas (`quotaOf` no longer reads `COUNT`). Packs 7-8 only use `HARD_POOL` (drawings of 34-40 cells, which tile into 11 to 13 pieces often enough); a tray holds at most 10 pads readably.
- The board frame follows the drawing (`drawShapedFrame`: one padded tile per cell, one path, no frame line).
- Void cells are `SPECIAL` on the board: never run line clears in puzzle mode (a row of voids + blocks would count as full).
