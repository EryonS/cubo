# Bonus
Status: shipped

## What it does
About 7% of tray pieces carry a bonus icon on one block. Clearing that block stores the bonus in the inventory (max 2 per type, extra ones give points). The player fires them from the inventory bar.

| Shown name | Internal id | Effect |
|---|---|---|
| Toupie | `rotate` | 30 s: tap a tray piece to rotate it |
| Étoile | `nitro` | 30 s: points ×2 |
| Bulle | `shield` | 30 s: combo cannot break |
| Bombe | `bomb` | drag onto the grid: clears 21 cells (5×5 without corners) |
| Tornade | `reroll` | replaces the 3 tray pieces |

Timed bonuses stack up to two uses and only tick while playing. Durations, Étoile multiplier, Bombe area and Tornade draws grow with upgrades: see upgrades.md.

## Files
- `src/core/logic.ts`: `BONUSES`, spawn rate, `use(state, type, target?)`, `tick`.
- `src/game/bonus-ui.ts`: `BONUS_UI` (French name, hint, legend text; English in `src/i18n/en.ts`), test `bonus-ui.test.ts`.
- `src/render/icons.ts`: `ICON_COLORS`, `GLYPHS` (icons drawn through `G`), `drawIcon`. Inventory bar: state in `src/game/hud.ts` (`invView`), drawn in `src/render/draw.ts`, buttons laid out by `invBoxes` in `src/render/layout.ts`; legend sheet `src/ui/LegendSheet.tsx`.

## Saved state
`state.inventory`, `state.effects` (keyed by internal id).

## Gotchas
- Never rename internal ids: saves and missions (`bonusUsed`, `bombCells`) depend on them. Rename only `BONUS_UI`.
- Icons are drawn in a 100-unit box centered on (0, 0); `drawIcon` adds the white badge.
- Chill mode hides bonuses entirely.
