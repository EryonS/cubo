# World rules
Status: shipped (v1, with Aventure)

## What it does
Each Aventure world changes the rules with one advantage and one drawback. Rules never apply outside Aventure.

| World | Advantage | Drawback | Special cell |
|---|---|---|---|
| Plaine | coin chance ×1.5 | none (learning world) | - |
| Sous-marin | bubbles give a random bonus when destroyed | every 10 moves the current shifts a row one cell right (wraps) | bubble (1 hp) |
| Espace | Étoile twice as likely | every 7 moves an asteroid lands | asteroid (2 hp) |
| Glace | line points ×2 when the clear touches ice | ice needs 2 clears | ice (2 hp) |
| Forêt | every 4 moves a firefly puts a coin on a block | every 8 moves a mushroom grows on an empty cell | mushroom (1 hp) |
| Rétro | gravity: blocks fall after a clear, new full lines chain (combo +1 each) | 4-green palette (renderer) | - |
| Arcade | all points ×1.5 | clock (60 s, boss 75 s), lines add 3 s | - |
| Volcan | a destroyed ember clears its row and column | every 6 moves an ember falls; after 8 moves it hardens into rock (2 hp) | ember (1 hp) → rock |

Levels 11-19 add a second obstacle per world: see twists.md. The season events' worlds (`newyear`, `valentine`, `easter`, `beach`, `halloween`, `xmas`) live here too, off the map (see seasons.md).

## Files
- `src/core/worlds.ts`: `WORLDS` (name, plus / minus text for the world screen, hooks), `ORDER`.
- `src/core/logic.ts`: `KINDS` (hp, fuse, hardens, blast, gift), `WORLD_API` handed to hooks (`rnd`, `emptyCells`, `plainCells`, `pick`, `addSpecial`, `shiftRow`).
- `src/render/cells.ts` (`drawSpecial`: one drawing per kind, cracks at reduced hp, ember fuse dots; `SPECIAL_COLORS`), `src/render/board-themes.ts` (`RETRO4`), motion: `planFalls` / `segRow` in `src/game/falls.ts` (gravity waves from `events.waves`), `anim.shifts` (current) and `anim.drops` (spawns) fed by `stageEffects` in `src/game/run.ts`; sounds `crack`, `pop`, `thunk`, `sizzle`, `grow`, `swoosh`, `land` in `src/audio/sfx.ts`.

## Hooks
`setup(state, api)`, `afterMove(state, api)` → spawned cells, `lineMul(hit)`, `scoreMul`, `coinMul`, `bonusWeights`, `gravity`. The clock is set per level in `src/core/levels.ts`.

## Gotchas
- `src/core/logic.ts` must never name a world; add behavior through a hook or a `KINDS` flag.
- Special cells use board value `SPECIAL` (15): they block pieces and count toward full lines.
- A new kind needs: `KINDS` entry, `drawSpecial` branch, `SPECIAL_COLORS`, `KIND_NAMES` and `MOVES_PER_CLEAR` in `src/core/levels.ts` (the bot's cost per clear).
