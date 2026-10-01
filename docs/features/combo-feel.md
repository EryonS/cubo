# Combo feel
Status: shipped

## What it does
Juice on line clears, scaled by a **tier** (`comboTier(combo, lines)` in `www/src/render/helpers.js`): 1 = combo 2-3 or a double, 2 = combo 4-5 or a triple+, 3 = combo 6+ (and "Grille vide !").
- Every clear: a white light sweep along each cleared row / column (`drawSweeps`).
- Tier 1+: board zoom punch (`punch`), points floater bigger, bouncing and tier colored.
- Tier 2+ or 2+ lines: star confetti in the block colors (`confetti`, particles with `star`).
- Banner: tier color (theme accent, orange, then sliding rainbow), wobble, turning sunburst from tier 2.
- While a combo of 2+ runs: the board frame glows in the tier color, pulsing faster on the last move of grace (`drawComboGlow`).
- Combo tag under the score pops when the combo grows; when a combo of 2+ breaks it turns grey, tilts and falls (`comboBreak`), with `sfx.fizzle`.
- Reaching a new tier plays `sfx.sparkle(tier)` over the clear sound.

Reduced motion: no sweep, punch, confetti, rays, wobble or falling tag; colors and glow stay.

## Files
- Render side only (`www/src/render/helpers.js`, `www/src/render/hud.js`, `www/src/game/flow.js`): `comboTier`, `tierColor`, `confetti`, `drawSweeps`, `drawComboGlow`, `drawComboTag`, `commit`.

## Saved state
None.
