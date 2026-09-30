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

Timed bonuses stack up to 60 s and only tick while playing.

## Files
- `src/logic.js`: `BONUSES`, spawn rate, `use(state, type, target?)`, `tick`.
- `src/main.js`: `BONUS_UI` (French name, hint, legend text), `ICON_COLORS`, `GLYPHS` (canvas icons), inventory bar.

## Saved state
`state.inventory`, `state.effects` (keyed by internal id).

## Gotchas
- Never rename internal ids: saves and missions (`bonusUsed`, `bombCells`) depend on them. Rename only `BONUS_UI`.
- Icons are drawn in a 100-unit box centered on (0, 0); `drawIcon` adds the white badge.
- Chill mode hides bonuses entirely.
