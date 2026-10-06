# Mascot (Cubo)
Status: shipped

## What it does
Cubo, a mint jelly with a sprout, sits on the top-right corner of the board frame in every mode. It is drawn with Skia through `G`, no image.

- Base mood (from the game): watches the dragged piece, worried when 70% of the board is full or the run is stuck (not in puzzles), asleep behind any menu, sad at a lost end, partying (hops) at a won level or puzzle.
- Event moods (short): happy jump on a clear (higher for more lines), star eyes on a big combo / empty grid / new record, "oops" when a combo breaks, wide eyes on a bonus.
- Tap: bounce + a burst; 5 taps in a row make it dizzy for 2 s. Faces and burst follow the theme (`taps` / `burst` in `CUBO_LOOKS`): Jouet hearts and heart eyes, Plaine petals and a wink, Sous-marin bubbles and puffed cheeks, Espace stars, Glace snowflakes and shivers, Forêt leaves, Rétro pixel hearts, Arcade notes and shades, Volcan sparks and steam.
- Looks per theme played (`CUBO_LOOKS`, the world's theme in Aventure): colors plus a head piece (sprout, daisy, starfish, astronaut helmet, beanie, mushroom cap, pixel sprout, neon headphones, flame), drawn by `drawCuboHat` (`src/mascot/hats.ts`) behind or over the body.
- Wardrobe: a head piece bought in the Boutique (tab Cubo) replaces the theme's own; see wardrobe.md. Each season event theme has its own look and head piece (seasons.md).
- Setting "Mascotte" turns it off.

## Files
- `src/mascot/`: `looks.ts` (`CUBO` colors, `CUBO_LOOKS`, `cuboLookFor`), `state.ts` (`cuboReact`, `cuboBaseMood`, `cuboHit`, `cuboTap`, `cuboSpot`), `body.ts` (`drawCubo`), `hats.ts`, `fx.ts`, `say.ts` (line of the day); tests `src/mascot/mascot.test.ts`.
- `src/render/draw.ts` (`drawMascot`, drawn after the board), hooks in `src/game/run.ts` (`commit`, bonus use, record), tap in `src/screens/GameScreen.tsx` (`tapCubo`). Still poses (home, game over, Boutique): `src/ui/CuboPose.tsx`, `src/render/cubo-preview.ts`.
- `src/screens/SettingsScreen.tsx`: the "Mascotte" row.

## Saved state
`settings.mascot` in `cuboblocks.v2` (MMKV, default true, merged at load: `src/state/persist.ts`).

## Gotchas
- Mood is recomputed every frame; events only override it until `cubo.until`.
- Reduced motion (the phone's accessibility setting, `anim.calm`): no jumps, sway or spin; moods still change.
- In puzzles it stands on the top cell of the drawing's rightmost column, so it never floats over void cells or covers the score sign.
- Its spot is the board's top-right corner (`cuboSpot`): a layout change above the board must keep that corner free.
