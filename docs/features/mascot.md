# Mascot (Cubo)
Status: shipped

## What it does
Cubo, a mint jelly with a sprout, sits on the top-right corner of the board frame in every mode. It is drawn on the canvas, no image.

- Base mood (from the game): watches the dragged piece, worried when 70% of the board is full or the run is stuck (not in puzzles), asleep behind any menu, sad at a lost end, partying (hops) at a won level or puzzle.
- Event moods (short): happy jump on a clear (higher for more lines), star eyes on a big combo / empty grid / new record, "oops" when a combo breaks, wide eyes on a bonus.
- Tap: bounce + a burst; 5 taps in a row make it dizzy for 2 s. Faces and burst follow the theme (`taps` / `burst` in `CUBO_LOOKS`): Jouet hearts and heart eyes, Plaine petals and a wink, Sous-marin bubbles and puffed cheeks, Espace stars, Glace snowflakes and shivers, Forêt leaves, Rétro pixel hearts, Arcade notes and shades, Volcan sparks and steam.
- Looks per theme played (`CUBO_LOOKS`, the world's theme in Aventure): colors plus a head piece (sprout, daisy, starfish, astronaut helmet, beanie, mushroom cap, pixel sprout, neon headphones, flame), drawn by `drawCuboHat` behind or over the body.
- Wardrobe: a head piece bought in the Boutique (tab Cubo) replaces the theme's own; see wardrobe.md. Each season event theme has its own look and head piece (seasons.md).
- Setting "Mascotte" turns it off.

## Files
- `www/src/mascot/`, `www/src/mascot/cubo.js`, `www/src/mascot/body.js`, `www/src/game/flow.js`, `www/src/render/loop.js`: section `mascot` (`CUBO` colors, `cuboReact`, `cuboBaseMood`, `drawCubo`, `cuboHit`, `cuboTap`); hooks in `commit`, `useBonus`, `afterChange` (record), pointerdown; drawn in `frame` after the board.
- `www/index.html`: settings toggle `data-setting="mascot"`.

## Saved state
`settings.mascot` in `gridlock.v2` (default true, merged at load).

## Gotchas
- Mood is recomputed every frame; events only override it until `cubo.until`.
- Reduced motion: no jumps, sway or spin; moods still change.
- In puzzles it stands on the top cell of the drawing's rightmost column, so it never floats over void cells or covers the score sign.
- Its spot is the board's top-right corner (`cuboSpot`): a layout change above the board must keep that corner free.
