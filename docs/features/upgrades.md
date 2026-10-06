# Bonus upgrades
Status: shipped

## What it does
Boutique, tab "Bonus": each of the 5 bonuses goes from level 1 to 3. Upgrades count in every mode (Aventure, dailies included) and apply to the run in progress as soon as they are bought.

| Bonus | Level 1 | Level 2 | Level 3 | Prices (lv 2 / lv 3) |
|---|---|---|---|---|
| Toupie (`rotate`) | 30 s | 45 s | 60 s | 200 / 500 |
| Étoile (`nitro`) | points ×2 | ×2.5 | ×3 | 250 / 600 |
| Bulle (`shield`) | 30 s | 45 s | 60 s | 200 / 500 |
| Bombe (`bomb`) | 21 cells | full 5×5 (25) | 5×5 + whole row and column | 300 / 700 |
| Tornade (`reroll`) | 3 random pieces | 3 pieces that fit | 3 pieces of ≤ 3 blocks that fit | 200 / 500 |

A timed bonus stacks up to two uses (2 × its duration).

## Files
- `src/core/logic.ts`: `EFFECT_BY_LEVEL`, `NITRO_BY_LEVEL`, `upLevel`, `effectMs`, `nitroMul`, `bombArea(r, c, level)`, `reroll`.
- `src/core/meta.ts`: `UPGRADE_PRICES`, `upgradeLevel`, `upgradePrice`, `buyUpgrade`.
- `src/game/bonus-ui.ts` (`BONUS_UI`: `hint(lv)`, `desc(lv)`, `levels`), the `Upgrades` list in `src/screens/ShopScreen.tsx`, legend in `src/ui/LegendSheet.tsx`.
- Tests: `src/core/upgrades.test.ts`.

## Saved state
- Profile: `upgrades: { [bonus]: 2 | 3 }`, optional (absent = level 1).
- Run: `state.upgrades`, copied from the profile by `createGame` (and on purchase). Old runs without it play at level 1.

## Gotchas
- The Aventure bot (`scripts/bot.ts`) never fires bonuses, so upgrades don't change the balanced move budgets.
- Tornade level 2/3 draws up to 30 times per slot, then keeps the last draw.
