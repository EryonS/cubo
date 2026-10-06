# Combo feel
Status: shipped

## What it does
Juice on line clears, scaled by a **tier** (`comboTier(combo, lines)` in `src/game/juice.ts`): 1 = combo 2-3 or a double, 2 = combo 4-5 or a triple+, 3 = combo 6+ (and "Grille vide !").
- Every clear: a white light sweep along each cleared row / column (`drawSweeps`).
- Tier 1+: board zoom punch (`punch`), points floater bigger, bouncing and tier colored.
- Tier 2+ or 2+ lines: star confetti in the block colors (`confetti`, particles with `star`).
- Banner: tier color (theme accent, orange, then sliding rainbow), wobble, turning sunburst from tier 2.
- While a combo of 2+ runs: the board frame glows in the tier color, pulsing faster on the last move of grace (`drawComboGlow`).
- Combo tag (a flat pill, no glow) sits on the board frame's bottom line, centered on the board, hidden while a hint line shows there (user's choice 2026-10-06: under the score it crowded the band and the frame glow). It pops when the combo grows; when a combo of 2+ breaks it turns grey, tilts and falls (`comboBreak`), with `sfx.fizzle`.
- Reaching a new tier plays `sfx.sparkle(tier)` over the clear sound.

Reduced motion (the phone's accessibility setting, read in `src/screens/GameScreen.tsx` into `anim.calm`): no sweep, punch, confetti, rays, wobble or falling tag; colors and glow stay.

## Files
- `src/game/juice.ts` (pure, tested in `juice.test.ts`): `comboTier`, `tierColor`, `punchAmp`, `confettiCount`, banners, pennant.
- `src/render/draw.ts`: `drawSweeps`, `drawComboGlow`, `drawComboTag`, punch and combo-break effects. `src/game/run.ts`: `commit` (starts the effects), `confetti`. Effect state lives in `anim` (`src/game/anim.ts`).

## Saved state
None.
