# Sticker album, trophies, profile and stats
Status: shipped (v1, 2026-09-30)

## Profile screen
Menu > Profil, three tabs:
- **Album**: month trophy shelf (the streak card and freeze moved to the Défis tab on 2026-09-30) (from `DAILY_START` to now), then 26 stickers on 4 pages. Unearned stickers are grey with their hint; newly earned ones play a peel animation the first time the album opens.
- The calendar moved to the Défis screen (see [daily.md](daily.md)); the profile has only Album and Stats.
- **Stats**: pills for Classique / Chrono / Chill, each with 4 tiles (games, record, average, best combo) and a bar chart of the last 20 scores (tap or hover a bar for its value); then lifetime counters, Aventure stars, dailies cleared, longest streak.

## Stickers
| Page | Stickers |
|---|---|
| Maître du combo | combo ×5, ×8, ×12; 4 lines at once; clear the grid; 5 000 points in a run |
| Explorateur | beat each world's boss (8, 30 coins each) |
| Fidèle | streak 7 / 30 / 100 (record); 10 and 50 dailies cleared; one full month |
| Collectionneur | use all 5 bonuses; 1 000 coins earned; 3 themes besides Jouet; 1 000 lines; 100 games; 120 Aventure stars |
| Secrets (`secret: true`, 40 coins) | a 21-block bomb; 3 000 points with no undo / discard; empty the grid twice in a run; hold 2 000 coins; play Classique, Chrono and Chill |

Secret stickers show a question mark, "Secret" and "À découvrir" until earned; then their name and what earned them.
Earned stickers show the day they were earned ("Obtenu le 30 sept. 2026", from `profile.stickers[id]`); secret ones show it under their hint.
Default reward 20 coins. Checked after every run, level, daily and Boutique purchase (`stickerLines()` in main.js adds them to the end-of-run report).

## Month trophies
`M.monthTrophy(profile, 'YYYY-MM')`: every day of the month cleared (on the day or replayed later) → silver; all with 3 stars → gold. Computed, not stored.

## Files
- `src/meta.js`: `STICKER_PAGES`, `STICKERS` (id, page, name, hint, test, reward?), `checkStickers`, `monthTrophy`, lifetime via `addLifetime` in `applyRun` and `earn()` for coins earned outside runs.
- `src/logic.js`: `stats.used` counts each bonus type per run.
- `src/main.js`: `openProfile`, `albumHtml`, `statsHtml`, SVG icons (`FLAME_SVG`, `TROPHY_SVG`, `STICKER_GLYPHS`).
- `index.html`: `#profile` overlay, `.ptab` tabs (not `.tab`: the shop binds every `.tab`).

## Saved state
`profile.stickers: { [id]: dayEarned }`, `profile.lifetime: { games, lines, pieces, perfects, bonusUsed, bombCells, coins, coinsEarned, bestCombo, bestMulti, score, bestBomb, bestPerfects, cleanScore, used: { [bonus]: n } }`.
`profile.modes: { [mode]: { games, total, best, bestCombo, lines } }` and `profile.history: [{ m, s }]` (last `M.HISTORY` runs), filled by `applyRun` from `run.mode` (`L.runStats` sets it: classic, chrono, chill, adventure; old profiles may hold `event` runs from the removed weekend event, no longer shown). The sticker count only counts stickers still in `M.STICKERS` (a retired `weekend4` may linger in `profile.stickers`). Both started on 2026-10-01; the tab's record also reads the older `bests`.

## Gotchas
- Adding a sticker: append to `STICKERS` with a pure `test(profile)`; players who already qualify get it at their next check.
- Lifetime stats started on 2026-09-30; older games are not counted.
