# Persistence and migrations
Status: shipped

## What it does
Two MMKV keys (`react-native-mmkv`, store id `cuboblocks`, wrapper in `src/platform/kv.ts`; the pure save code in `src/state/persist.ts` takes a `KV`):
- `cuboblocks.v2`: current run + records + settings + menu prefs (`saveRun` in `src/state/persist.ts`, on moves and when the app goes to the background).
- `cuboblocks.profile.v1`: meta progression (`saveProfile`), including `adventure.stars`, `daily`, `streak`, `stickers`, `lifetime`, `tips`, `modes`, `history`, `upgrades`, `puzzles` (all optional, read with defaults, so no migration was needed). `settings` in `cuboblocks.v2` gained `patterns` (defaults merged at load; `darkMenus` was removed, `DEFAULT_SETTINGS` now has `sfx`, `music`, `vibrate`, `patterns`, `mascot`). Leftovers of the removed weekend event (`profile.events`, a saved run's `event`) are ignored; `event` is stripped from the run at load.

`M.migrate(profile)` runs at launch and returns `{ profile, refund }`. Version 2 (2026-09-30) removed the road themes and the Bonbon blocks and refunds them at their old price; the menu shows the refund once. Version 3 (2026-10-01, Aventure v2) records worlds opened under the v1 rules in `adventure.opened`. Version 4 refunded daily attempts. Version 5 (2026-10-01) adds Cubo's wardrobe: `owned.cubo` / `equipped.cubo` (`addWardrobe`). Version 6 moves the first Halloween's `profile.halloween` into `profile.seasons.halloween` (season events, `moveHalloween`); `seasons` and `trophies` are optional.

Signed-in players also have `cuboblocks.sync` and a cloud copy of the profile, settings, records and language (`docs/features/account.md`).

## Files
- `src/core/meta.ts`: `PROFILE_VERSION`, `RETIRED`, `migrate`.
- `src/platform/kv.ts`, `src/platform/kv-types.ts`: MMKV and the `KV` interface. `src/state/persist.ts`: `RUN_KEY`, `PROFILE_KEY`, `loadSaved`, `loadProfile`, `saveRun`, `saveProfile`, `rollDay`. `src/state/store.ts`: the store that writes through.
- Tests: `src/core/meta.test.ts`, `src/state/persist.test.ts`.

## Gotchas
- Bump `PROFILE_VERSION` and extend `migrate` for any profile shape change; add a test with an old-shape fixture.
- A value that does not parse is kept under `<key>.broken` and treated as absent (`readJSON` in `persist.ts`). MMKV is native storage, so the web build's purge-and-restore backup of its keys has no counterpart.
- Any new save key (like `cuboblocks.sync`, `cuboblocks.lang`) is written through `mmkv` directly; nothing else needs registering.
- Run state gained `world` (Mondes mode) and `upgrades` (bonus levels); both optional, old runs play as before. Mondes records live in `bests['worlds-<world>']`.
- Puzzle runs carry `state.puzzle` and a full `undo` chain (a handful of small states).
