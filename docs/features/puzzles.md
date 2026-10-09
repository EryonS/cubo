# Puzzles
Status: shipped

## What it does
The Puzzles tile on Jouer (`src/screens/PuzzlesScreen.tsx`, stack route `Puzzles`) opens 120 puzzles in 8 packs of 15 (Débutant, Malin, Expert, Maître, Virtuose, Légende, Mythique, Absolu), unlocked one after the other, then the Puzzle surprise card. A puzzle is a drawing (heart, house, rocket...) mostly filled with pieces already in place. The player gets a quota of pieces (3 at the start, 8 at puzzle 40, 8 to 10 in packs 5-6, 9 or 10 in Mythique, 11 or 12 in Absolu), all shown in the tray at once (two rows of pads, no Suivant column), and must fill every empty cell of the drawing. Placed pieces can be grabbed again: drag them elsewhere, drop outside to send them back to the tray, or tap one to send it back. Undo also undoes a pick-up.
- Mythique (pack 7) is hard: the drawing is almost empty, only 2 or 3 pieces are already in place (picked at random among the tiling), 9 or 10 are to place.
- Absolu (pack 8) is the hardest: an empty drawing (36-42 cells, `EMPTY_POOL`), 11 or 12 pieces to place, nothing in place. The list shows "· dessin vide" on its pack line.
- Ids and play order: ids never move (stars are saved by id). Each pack plays its 10 first (ids pack × 10 + 1..) then the 5 added on 2026-10-09 (ids 81 + pack × 5..). `ORDER` / `packIds` / `prevOf` / `nextOf` give that order and `rankOf` the number shown ("Puzzle 11" is id 81). A puzzle opens when the one before it in `ORDER` is solved; one already solved stays open.

- Free rotation (tap a piece), no line clears, no bonuses, no bin.
- Undo is free and goes back as far as wanted.
- Indice (30 coins): puts one tray piece on a right spot. Stars: 3 without hints, one less per hint, at least 1. Hints taken on a numbered puzzle not solved yet are remembered (`profile.puzzleHints`): Recommencer, leaving and coming back start with that count, so the stars stay capped. Cleared when the puzzle is solved; a puzzle solved before and replayed for more stars starts clean and keeps nothing.
- Rewards: first solve 15, +5 per new star, 60 for a finished pack.
- Stuck (nothing fits) is not a loss: undo or hint.

### Puzzle surprise
Same tray and pick-up as above (every numbered puzzle now works like this; `free` = free tray / movable pieces, a surprise is `n === 0`, see `isSurprise`).
Last card of the list, opens once pack Maître (its 15 puzzles) is done. Each game picks a random drawing (any of `DRAWINGS` of 26+ cells, turned or mirrored) and takes out 8 to 10 pieces.
- Pays 25 coins, 10 if a hint was used. No stars; `profile.surprises` counts the ones solved. "Un autre" deals a new one; Recommencer replays the same seed and keeps the hints already taken (the pay stays the lower one).

## Files
- `src/core/puzzles.ts`: `DRAWINGS` (hand-made 8x8 silhouettes, 32), `PACKS`, `ORDER` / `packIds` / `rankOf`, `quotaOf`, `puzzle(n)` (free: true, Mythique via `HARD_POOL` and `build(..., 'hard')`, Absolu via `EMPTY_POOL` and `build(..., 'empty')`), `surprise(seed)` (tiles the drawing with game shapes, takes out a contiguous group of pieces as the quota, turns and shuffles them), `tile`.
- `src/core/logic.ts`: mode `'puzzle'`, kind `void` (outside the drawing), `setupPuzzle`, `placePuzzle`, `puzzleHint`, `liftPuzzle` (free puzzles), puzzle branches in `refillSlot`, `settle`, `undo`, `canTurn`, `canDiscard`, `undoCost`.
- `src/core/meta.ts`: `applyPuzzle` (clears `puzzleHints[n]`), `notePuzzleHints` / `puzzleHintsOf`, `puzzleOpen`, `puzzleStarsOf`, `puzzlesSolved`, `PUZZLE_*` constants; `applySurprise`, `surpriseOpen`, `surprisesSolved`, `SURPRISE_*`.
- `src/game/puzzle.ts` (pure, `puzzle.test.ts`): `freeTray`, `isSurprise`, `isVoid`, `puzzleTitle` / `puzzleLabel`, pack rows, `settlePuzzle`. `src/game/run.ts`: `startPuzzle`, `startSurprise`, `hintPuzzle`, `liftPuzzlePiece`, `endPuzzle`. `src/game/drag.ts`: the `DragState.ox/oy` of a piece lifted from the board.
- `src/screens/PuzzlesScreen.tsx` (packs, drawing thumbnails, stars, Puzzle surprise card), `src/screens/PuzzleEnd.tsx` (result card), hint button in `src/screens/GameScreen.tsx`.
- `src/render/layout.ts` (`slotBox` and friends take a `free` argument: the surprise tray's two rows), `src/render/draw.ts` (void cells, `drawShapedFrame`, puzzle plate in `drawHUD`, count in the Suivant column).

## Saved state
- Profile: `puzzles: { [n]: stars }`, optional; `puzzleHints: { [n]: hints }` (numbered puzzles not solved yet), optional, no migration (absent = none); `surprises: n` (Puzzle surprise solved), optional.
- Run: `state.puzzle = { n, name, total, placed, hints, won, stars, queue, sol }` (free puzzles, i.e. the surprise (n = 0) and every numbered puzzle started since 2026-10-09: plus `free: true, seed, at: { [piece id]: { slot, cells, piece } }`, queue empty, the tray holds the whole quota; a numbered puzzle saved before has no `free` and keeps its 3 slots + queue until it ends, both paths stay); `state.undo` keeps the whole chain back to the start.

## Gotchas
- Puzzles 1-40 only use the first 12 `DRAWINGS` (`FIRST_DRAWINGS`), 41-70 the first 25 (`V2_DRAWINGS`): append new drawings at the end, never reorder. Puzzles 41+ and surprises retile a drawing too small for the quota; an added puzzle (81+) skips a drawing under 3.5 cells a piece or already used by its pack's added ones.
- Puzzles are generated from fixed seeds: changing `DRAWINGS`, `quotaOf`, the tiling order or `L.SHAPES` changes every puzzle (stars already earned stay on their number). `src/core/puzzles.test.ts` checks all 120 are well formed, that Mythique has 2 or 3 pieces in place and Absolu none (and solvable), and fingerprints puzzles 1-70 so they never change (71-80 became empty drawings on 2026-10-09). Puzzles 41-60 keep their quotas (`quotaOf` no longer reads `COUNT`). Mythique only uses `HARD_POOL` (drawings of 34-40 cells, which tile into 11 to 13 pieces often enough); Absolu's tray holds 11-12 pads on two rows of 6.
- The board frame follows the drawing (`drawShapedFrame`: one padded tile per cell, one path, no frame line).
- Void cells are `SPECIAL` on the board: never run line clears in puzzle mode (a row of voids + blocks would count as full).
