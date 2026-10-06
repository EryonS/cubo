# Cubo's wardrobe
Status: shipped (2026-10-01)

## What it does
Boutique tab Cubo: head pieces Cubo wears in every theme, instead of the theme's own one (sprout, starfish, helmet...). "Selon le thème" (free) keeps the theme's. Sold: Nœud 120, Casquette 150, Chapeau de fête 200, Lunettes 250, Haut-de-forme 350, Couronne 500. Not sold, won in season events (seasons.md): Chapeau pailleté, Serre-tête cœurs, Oreilles de lapin, Chapeau de paille, Chapeau de sorcière, Bonnet de Noël.
Cards show Cubo wearing the piece on the equipped theme's background.

## Files
- `src/core/meta.ts`: `SKINS.cubo` (bought / equipped like the other skin kinds).
- `src/mascot/looks.ts` (`cuboLookFor(theme, wear)`), `src/mascot/hats.ts` (`drawWardrobeHat`), `src/mascot/body.ts` (`drawCubo(..., pose)`: a still Cubo elsewhere), `src/render/cubo-preview.ts` (`drawCuboPreview`, the Boutique cards), `src/ui/CuboPose.tsx`, tab Cubo in `src/screens/ShopScreen.tsx`.

## Saved state
`profile.owned.cubo`, `profile.equipped.cubo` (profile v5, added by `M.migrate`).
