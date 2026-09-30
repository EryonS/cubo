# Navigation (tab bar, home, dialogs)
Status: shipped (2026-09-30, UI/UX audit)

## What it does
- **Tab bar** (`#tabbar`, bottom, safe-area aware): Jouer, Défis, Boutique, Profil. These four are the hub screens (`.overlay.hub`). The bar shows only while a hub is up and no other overlay covers it (`syncTabbar`, driven by a `MutationObserver` on every `.overlay`). A red dot on Défis while today's level can still be won. Tapping the active tab scrolls it to the top.
- **Jouer** (`#menu`): header (brand, coins, settings gear), Continuer when a run is in progress, the Aventure hero card (next level to play with its world preview; tap = level sheet, "Carte" chip = world map), tiles Défi du jour (opens today's level sheet) and Puzzles, the Partie libre row (last mode and level; the chevron opens the `#free` sheet to change them, Jouer starts), and a Missions row that jumps to the Défis tab.
- **Défis**: today's level card with a Play button, streak card + freeze, today's missions, then "Rattraper un niveau manqué" which unfolds the calendar.
- **Boutique**: Thèmes, Blocs, Bonus (upgrades). World themes say "Ou bats son boss". Only reachable from the tab bar (the in-game wallet is display only).
- **Profil**: Album (trophies, stickers) and Stats.
- **Settings**: gear on Jouer and Réglages in pause; grouped Son / Affichage / Aide; tapping a row flips its switch.
- **Dialogs**: `ask({ title, text, ok, danger })` replaces `window.confirm` (styled, promise based). `guardRun(needed, go)` asks before dropping a run in progress.
- Close rules: X goes back to the Jouer hub, the back arrow goes up one level (stage > world > map).

## Files
- `index.html`: `#tabbar`, `#menu`, `#free`, `#ask`, CSS sections "tab bar + hub screens", "Défis tab", "Confirmation dialog".
- `src/main.js`: sections `confirmation dialog`, `home menu (Jouer tab)`, `tab bar`; `renderDefis` / `todayHtml` / `streakHtml`.

## Saved state
None. `profile.adventure.fails` (see aventure.md) drives the paid skip on the level sheet.

## Gotchas
- `syncTabbar` must only write a class when it changes: every class write re-triggers the observer.
- Switching tabs adds `.no-anim` to the target hub (no scrim fade, quick card fade); the class is dropped when the hub hides, never while shown (that would restart the animation).
- Hub cards have a fixed height so switching tabs doesn't jump; long content scrolls inside the card.
- Result cards (`.card.sticky-foot`: game over, level end) keep their buttons stuck to the bottom on short phones.
