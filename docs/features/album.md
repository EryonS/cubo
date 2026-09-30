# Sticker album, trophies, profile and stats
Status: planned (retention lot)

## Sticker album
About 24 stickers on 4 pages, each paying coins when earned, shown as silhouettes with a hint until then. Peeling animation with a shiny edge.
- **Combo master**: combo ×5, ×8, ×12; 4 lines at once; clear the whole grid.
- **Explorer**: finish each world (8).
- **Faithful**: 7, 30, 100 day streak; 50 daily levels cleared.
- **Collector**: use every bonus; 1 000 coins earned; own 3 themes...

## Monthly trophies
A trophy shelf in the album: clear every daily level of a month (on the day or replayed later). Gold when all have 3 stars, silver otherwise.

## Profile and stats
One "Profil" screen: album, calendar of daily levels, stats (games per mode, records, best combo, lines cleared, stars, longest streak).

## Files (planned)
- `src/meta.js`: `STICKERS` table (id, page, test on lifetime stats, reward), `checkStickers(profile)`, `monthTrophy(profile, month)`, lifetime stats accumulated in `applyRun`.
- `src/main.js` + `index.html`: Profil screen with tabs (Album, Calendrier, Stats).

## Saved state (planned)
`profile.stickers: { [id]: dateEarned }`, `profile.trophies: { "<YYYY-MM>": "gold" | "silver" }`, `profile.lifetime: { games, lines, bestCombo, coinsEarned, ... }`.
