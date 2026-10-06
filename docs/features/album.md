# Sticker album, trophies, profile and stats
Status: shipped (v1, 2026-09-30)

## Profile screen
Profil tab (`src/screens/ProfileScreen.tsx`), one scrolling page, no tabs:
- Totals (games, stars, stickers), an **Album** row that opens the Album screen, then the **trophy shelves** (months from `DAILY_START` to now, plus season trophies; the streak card and freeze are on the Défis tab).
- **Album** (`src/screens/album/AlbumScreen.tsx`, stack route `Album`): the stickers by page (see the table). Unearned stickers are grey with their hint. The legacy peel animation for newly earned stickers is not ported; `showStickers` (`src/ui/StickerBanner.tsx`) announces fresh ones in the Boutique.
- The calendar is on the Défis screen (see [daily.md](daily.md)).
- **Stats** (`src/screens/profile/StatsBlock.tsx`): pills for Classique / Chrono / Chill, each with 4 tiles (games, record, average, best combo) and a bar chart of the last 20 scores (tap a bar for its value; no hover on a phone); then lifetime counters, Aventure stars, dailies cleared, longest streak. Réglages is a row at the bottom.

## Stickers
| Page | Stickers |
|---|---|
| Maître du combo | combo ×5, ×8, ×12; 4 lines at once; clear the grid; 5 000 points in a run |
| Explorateur | beat each world's boss (8, 30 coins each) |
| Fidèle | streak 7 / 30 / 100 (record); 10 and 50 dailies cleared; one full month |
| Maître des mondes | all 60 stars of each world (8, 60 coins each); a mastered world also gets a gold crown on its Aventure tile |
| Collectionneur | use all 5 bonuses; 1 000 coins earned; 3 themes besides Jouet; 1 000 lines; 100 games; 120 Aventure stars |
| Secrets (`secret: true`, 40 coins) | a 21-block bomb; 3 000 points with no undo / discard; empty the grid twice in a run; hold 2 000 coins; play Classique, Chrono and Chill |

Secret stickers show a question mark, "Secret" and "À découvrir" until earned; then their name and what earned them.
Earned stickers show the day they were earned ("Obtenu le 30 sept. 2026", from `profile.stickers[id]`); secret ones show it under their hint.
Default reward 20 coins. Checked after every run, level, daily and Boutique purchase (`settleRun` in `src/game/run.ts` adds them to the end-of-run report; `src/screens/ShopScreen.tsx` does the same for a purchase).

## End-of-run summary
The game over card of a free run shows four tiles under the score: lines, best combo, most lines at once, shapes placed. A tile that beats the lifetime best (read before the run is applied) gets an accent ring and "Record !". "Partager le résumé" uses the native share sheet (`Share.share`; a toast says so when sharing fails). Tiles: `runSummary` in `src/game/summary.ts` (test `summary.test.ts`); card and share text: `src/screens/GameOver.tsx`.

## Month trophies
`M.monthTrophy(profile, 'YYYY-MM')`: every day of the month cleared (on the day or replayed later) → silver; all with 3 stars → gold. Computed, not stored.

## Files
- `src/core/meta.ts`: `STICKER_PAGES`, `STICKERS` (id, page, name, hint, test, reward?), `checkStickers`, `monthTrophy`, lifetime via `addLifetime` in `applyRun` and `earn()` for coins earned outside runs.
- `src/core/logic.ts`: `stats.used` counts each bonus type per run.
- `src/game/album.ts` (pure, `album.test.ts`): `albumPages`, `monthShelf`, `seasonShelf`, `modeTiles`, `lifetimeRows`, `chartBars`, sticker colors and `STICKER_GLYPHS`.
- `src/screens/ProfileScreen.tsx`, `src/screens/album/AlbumScreen.tsx`, `src/screens/album/StickerSheet.tsx`, `src/screens/profile/StatsBlock.tsx`; badges and trophies drawn in `src/ui/StickerArt.tsx` (react-native-svg), `src/ui/StatTile.tsx`.

## Saved state
`profile.stickers: { [id]: dayEarned }`, `profile.lifetime: { games, lines, pieces, perfects, bonusUsed, bombCells, coins, coinsEarned, bestCombo, bestMulti, score, bestBomb, bestPerfects, cleanScore, used: { [bonus]: n } }`.
`profile.modes: { [mode]: { games, total, best, bestCombo, lines } }` and `profile.history: [{ m, s }]` (last `M.HISTORY` runs), filled by `applyRun` from `run.mode` (`L.runStats` sets it: classic, chrono, chill, adventure; old profiles may hold `event` runs from the removed weekend event, no longer shown). The sticker count only counts stickers still in `M.STICKERS` (a retired `weekend4` may linger in `profile.stickers`). Both started on 2026-10-01; the tab's record also reads the older `bests`.

## Gotchas
- Adding a sticker: append to `STICKERS` with a pure `test(profile)`; players who already qualify get it at their next check.
- Lifetime stats started on 2026-09-30; older games are not counted.
- Earned stickers are buttons: a tap opens the sticker sheet (`src/screens/album/StickerSheet.tsx`) with the badge, name, album page, what earned it ("Pour l'avoir"), the full date and the coins it paid. Stickers saved before dates were kept say so instead of a date.
