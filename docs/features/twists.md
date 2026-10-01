# Second obstacles (Aventure levels 11-19)
Status: shipped (2026-10-01)

## What it does
After each world's Épreuve (level 10), levels 11-19 add a second obstacle with a mind of its own, on top of the world's usual cells. Aventure only: endless world runs and the free modes never get them. Daily levels drawn from levels 11-14 have them too (they are Aventure levels).

| World | Kind | Behavior (KINDS flag) | Spawn (levels.js TWISTS) |
|---|---|---|---|
| Plaine | Taupe `mole` | leaves after 4 moves (`ttl`), drops a coin when caught (`loot`) | 1, then 1 every 5 moves |
| Sous-marin | Méduse `jelly` | drifts to an empty neighbor every 2 moves (`wander`) | 2, every 9 |
| Espace | Trou noir `hole` | no line completes through it (`hole`), closes after 8 moves | 1, every 7 |
| Glace | Bonhomme de neige `snowman` | 3 hp, drawn with one snowball per hp | 2, every 10 |
| Forêt | Liane `vine` | every 4 moves one vine grows onto an empty neighbor (`spread`) | 2, every 12 |
| Rétro | Bug `glitch` | jumps to any empty cell every 3 moves (`hop`) | 2, every 8 |
| Arcade | Jeton `token` | 2 hp, gives 4 s back when destroyed (`time`) | 3, every 5 |
| Volcan | Lave `lava` | falls one row a move while the cell below is empty (`flow`) | 1, every 5, in the highest free row (`top`) |

The world screen shows a "Dès le niveau 11" row, the level sheet a note with the cell's picture, and the first level with it plays a "Nouveau : <nom>" banner once (`tips['twist-<world>']`).

## Files
- `src/logic.js`: `KINDS` flags, `kindMoves` (ttl / wander / hop / flow / spread, called from `worldMove`), `twistSpawn`, `spawnCells`, `findClears(board, special)` (holes), token time in `place`.
- `src/levels.js`: `TWISTS`, `stage.twist = { kind, count, every, top? }` for n 11-19.
- `src/worlds.js`: `twist: { name, text }` per world.
- `src/main.js`: `drawSpecial` branches, `kindIcon` / `twistRow`, moving cells in `stageEffects` (events with `from`, `hop`, `gone`, `grow`) and the `drops` glide in the board render.
- Tests: `tests/twists.test.js`.

## Gotchas
- Budgets were not raised: with twists the bot still wins 88-98 % of levels 11-19 (it loses by filling the board, not by running out of moves). Rerun `node tools/balance.js 10` after making a twist stronger.
- `previewClears` needs `state.special` so the drop preview ignores lines blocked by a hole.
- Moving cells are animated from `drops` keyed by their new index; `from` holds the old cell.
