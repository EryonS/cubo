# Mondes (endless world runs)
Status: shipped

## What it does
Each Aventure world screen ends with a "Partie sans fin" card (`renderEndless`): record, prime rate and Play. It opens once its Aventure trial (level 10) is cleared. A run is endless like Classique, under the world's rules (advantage + drawback, special cells, gravity, clock). Each world keeps its own record.

Coins: on top of normal run coins, a prime on the score: 1 coin per 200 points × (1 + 0.25 × world index), so Plaine 5 and Volcan about 14 coins per 1,000 points.

Worlds whose special cells only came from level setups get `free` settings in `worlds.js`: Sous-marin 3 bubbles at start + one every 6 moves, Glace 6 ice + one every 8 moves, Espace / Forêt / Volcan a few start cells, Arcade a 60 s clock (lines add 3 s). Each `free.note` is shown on that card.

## Files
- `www/src/core/logic.js`: mode `'worlds'`, `state.world`, `rulesOf` / `worldId`, `clockOf`, `freeSpawn`, `scatterKind`.
- `www/src/core/worlds.js`: `free` per world.
- `www/src/core/meta.js`: `worldFreeOpen`, `worldPrimeRate`, `worldPrime` (line "Prime <monde>" in `runCoins`), `WORLD_NAMES`.
- `www/src/screens/aventure.js`, `www/src/platform/storage.js`, `www/src/screens/home.js`: `renderEndless` (aventure section), `recordKey`, `modeLabel`; `www/index.html`: `#world-endless`. The separate Mondes screen and menu row were removed in the 2026-09-30 audit.

## Saved state
- Run: `state.mode = 'worlds'`, `state.world`.
- Records: `bests['worlds-<world>']` in `cuboblocks.v2`. Profile stats: `modes.worlds` (all worlds together).

## Gotchas
- Classique / Chrono / Chill records stay free of world rules; this mode has its own records.
- Missions and stickers count these runs like any free run.
