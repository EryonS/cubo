# Persistence and migrations
Status: shipped

## What it does
Two `localStorage` keys:
- `gridlock.v2`: current run + records + settings + menu prefs (`save()` in `src/main.js`, on `visibilitychange` and after moves).
- `gridlock.profile.v1`: meta progression (`saveProfile()`), including `adventure.stars`, `daily`, `streak`, `stickers`, `lifetime`, `tips`, `modes`, `history`, `upgrades`, `puzzles` (all optional, read with defaults, so no migration was needed). `settings` in `gridlock.v2` gained `patterns` and `darkMenus` (defaults merged at load). Leftovers of the removed weekend event (`profile.events`, a saved run's `event`) are ignored; `event` is stripped from the run at load.

`M.migrate(profile)` runs at launch and returns `{ profile, refund }`. Version 2 (2026-09-30) removed the road themes and the Bonbon blocks and refunds them at their old price; the menu shows the refund once. Version 3 (2026-10-01, Aventure v2) records worlds opened under the v1 rules in `adventure.opened`. Version 4 refunded daily attempts. Version 5 (2026-10-01) adds Cubo's wardrobe: `owned.cubo` / `equipped.cubo` (`addWardrobe`). Halloween progress (`halloween`, `trophies`) is optional and needs no migration.

## Files
- `src/meta.js`: `PROFILE_VERSION`, `RETIRED`, `migrate`.
- `src/main.js`: `loadJSON`, `save`, `saveProfile`, launch sequence.
- `tests/meta.test.js`.

## Gotchas
- Bump `PROFILE_VERSION` and extend `migrate` for any profile shape change; add a test with an old-shape fixture.
- The installed iOS PWA has its own storage, separate from Safari.
- In React Native, swap `localStorage` for `AsyncStorage`; the JSON shapes stay the same.
- Run state gained `world` (Mondes mode) and `upgrades` (bonus levels); both optional, old runs play as before. Mondes records live in `bests['worlds-<world>']`.
- Puzzle runs carry `state.puzzle` and a full `undo` chain (a handful of small states).
