# Sticker album, trophies, profile and stats
Status: shipped (v1, 2026-09-30)

## Profile screen
Menu > Profil, three tabs:
- **Album**: streak card (flame, current, record, freezes + buy a freeze), month trophy shelf (from `DAILY_START` to now), then 26 stickers on 4 pages. Unearned stickers are grey with their hint; newly earned ones play a peel animation the first time the album opens.
- **Calendrier**: month grid (Monday first) with each day's stars; tap a past day or today to open its daily sheet. Months before `DAILY_START` and future days are disabled.
- **Stats**: lifetime counters, records per mode, Aventure stars, dailies cleared, longest streak.

## Stickers
| Page | Stickers |
|---|---|
| Maître du combo | combo ×5, ×8, ×12; 4 lines at once; clear the grid; 5 000 points in a run |
| Explorateur | beat each world's boss (8, 30 coins each) |
| Fidèle | streak 7 / 30 / 100 (record); 10 and 50 dailies cleared; one full month |
| Collectionneur | use all 5 bonuses; 1 000 coins earned; 3 themes besides Jouet; 1 000 lines; 100 games; 120 Aventure stars |
Default reward 20 coins. Checked after every run, level, daily and Boutique purchase (`stickerLines()` in main.js adds them to the end-of-run report).

## Month trophies
`M.monthTrophy(profile, 'YYYY-MM')`: every day of the month cleared (on the day or replayed later) → silver; all with 3 stars → gold. Computed, not stored.

## Files
- `src/meta.js`: `STICKER_PAGES`, `STICKERS` (id, page, name, hint, test, reward?), `checkStickers`, `monthTrophy`, lifetime via `addLifetime` in `applyRun` and `earn()` for coins earned outside runs.
- `src/logic.js`: `stats.used` counts each bonus type per run.
- `src/main.js`: `openProfile`, `albumHtml`, `calendarHtml`, `statsHtml`, SVG icons (`FLAME_SVG`, `TROPHY_SVG`, `STICKER_GLYPHS`).
- `index.html`: `#profile` overlay, `.ptab` tabs (not `.tab`: the shop binds every `.tab`).

## Saved state
`profile.stickers: { [id]: dayEarned }`, `profile.lifetime: { games, lines, pieces, perfects, bonusUsed, bombCells, coins, coinsEarned, bestCombo, bestMulti, score, used: { [bonus]: n } }`.

## Gotchas
- Adding a sticker: append to `STICKERS` with a pure `test(profile)`; players who already qualify get it at their next check.
- Lifetime stats started on 2026-09-30; older games are not counted.
