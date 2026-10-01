# Cubo's wardrobe
Status: shipped (2026-10-01)

## What it does
Boutique tab Cubo: head pieces Cubo wears in every theme, instead of the theme's own one (sprout, starfish, helmet...). "Selon le thème" (free) keeps the theme's. Sold: Nœud 120, Casquette 150, Chapeau de fête 200, Lunettes 250, Haut-de-forme 350, Couronne 500. Not sold: Chapeau de sorcière (Halloween event reward).
Cards show Cubo wearing the piece on the equipped theme's background.

## Files
- `src/meta.js`: `SKINS.cubo` (bought / equipped like the other skin kinds).
- `src/main.js`: `cuboLookFor(theme, wear)`, `drawWardrobeHat`, `drawCuboPreview`, `drawCubo(t, pose)` (pose draws a still Cubo elsewhere).
- `index.html`: tab `data-tab="cubo"`.

## Saved state
`profile.owned.cubo`, `profile.equipped.cubo` (profile v5, added by `M.migrate`).
