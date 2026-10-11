# Share picture
Status: shipped

## What it does
"Partager" on the game over card of a free run and on the end card of a won daily level draws a picture
and opens the system share sheet (iOS activity sheet, Android chooser). The picture (1080 x 1350, 4:5) is
painted with the game's own Skia code on the played theme, in one centered column as wide as the board:
Cubo (outfit and mood of the end card) standing on the theme's score plate, the score (free run, with a
"NOUVEAU RECORD" tag hanging under the plate on a record) or the three stars (daily level) and the mode or
level under it, the board the run ended on, three number tags (the first three run summary tiles of a free
run; moves to spare and streak of a daily level), and "CUBO BLOCKS" at the bottom.
When nothing can be shared, the pill says "Partage impossible ici" for a moment.

## Files
- `src/render/share-card.ts`: `drawShareCard` (pure drawing, 360 x 450 logical units, scale 3).
- `src/game/share.ts`: `runShareCard` / `dailyShareCard` build what the picture shows; `wardrobe()` reads the equipped board, skin, Motifs and Cubo outfit.
- `src/platform/share.ts`: draws on a raster Skia surface, writes `cubo-blocks.png` in the cache (expo-file-system), opens the sheet (expo-sharing).
- `src/ui/ShareButton.tsx`: the pill on `GameOver.tsx` and `LevelEnd.tsx`.

## Saved state
None.

## Gotchas
- expo-sharing's config plugin is only for receiving shares (share extension): not in `app.config.ts`.
- To look at the picture without the app, render it in Node with `scripts/icons/skia-node.ts` (as `scripts/icons/app-icons.ts` does) and load the fonts from `assets/fonts/` with `Skia.Typeface.MakeFreeTypeFaceFromData`.
