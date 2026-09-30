# Persistence and migrations
Status: shipped

## What it does
Two `localStorage` keys:
- `gridlock.v2`: current run + records + settings + menu prefs (`save()` in `src/main.js`, on `visibilitychange` and after moves).
- `gridlock.profile.v1`: meta progression (`saveProfile()`), including `adventure.stars`.

`M.migrate(profile)` runs at launch and returns `{ profile, refund }`. Version 2 (2026-09-30) removed the road themes and the Bonbon blocks and refunds them at their old price; the menu shows the refund once.

## Files
- `src/meta.js`: `PROFILE_VERSION`, `RETIRED`, `migrate`.
- `src/main.js`: `loadJSON`, `save`, `saveProfile`, launch sequence.
- `tests/meta.test.js`.

## Gotchas
- Bump `PROFILE_VERSION` and extend `migrate` for any profile shape change; add a test with an old-shape fixture.
- The installed iOS PWA has its own storage, separate from Safari.
- In React Native, swap `localStorage` for `AsyncStorage`; the JSON shapes stay the same.
