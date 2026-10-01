# Navigation (tab bar, home, dialogs)
Status: shipped (2026-09-30, UI/UX audit)

## What it does
- **Full-screen menus** (2026-10-01): on phones (<= 600px) the hubs and menu screens (`.overlay.screen`: Jouer, Défis, Boutique, Profil, Aventure, Puzzles, Réglages) fill the screen, the tab bar docks to the bottom edge. Dialogs and sheets (`#ask`, `#free`, `#stage`, results, pause) keep their card.
- **Menu theme**: menu screens (`.overlay.ui`) and the tab bar always wear the equipped theme (a `<style>` scoped to them in `applyThemeCss`); the game and its in-game cards wear the theme played. The pixel font uses a scaled-down face ("Press Start 2P UI", `size-adjust`) in the DOM.
- **Coins**: tapping the coin count (HUD wallet, Jouer and Défis headers) opens the Boutique tab (`coinsToShop`); a run in progress waits behind, as with any menu. Not during the tutorial.
- **Swipe**: no swipe between tabs (removed 2026-10-01, user choice): tabs change from the tab bar only, the new hub still slides in (`.from-*` / `.out-*`). Swipes remain on the Aventure world page (next / previous world) and the Défis calendar (next / previous week or month, `stepCal`); `onSwipe` is touch only, ignores `.no-swipe` scrollers, and never presses the button it ends on (`swallowClick`).
- **Parked free run**: starting a level, a daily or a puzzle during a free run (Classique, Chrono, Chill, Mondes) parks it in `parked` instead of ending it. The Partie libre row then shows it with Reprendre (`resumeParked`). Starting a new free run (sheet or endless world) asks, then settles the parked run's coins and missions (`dropParked`).
- **Button labels** stay on one line: `fitText` shrinks a label that doesn't fit, after any overlay change or resize. Disabled buttons are faded and flat (generic `:disabled` rules).
- **Tab bar** (`#tabbar`, bottom, safe-area aware): Jouer, Défis, Boutique, Profil. These four are the hub screens (`.overlay.hub`). The bar shows only while a hub is up and no other overlay covers it (`syncTabbar`, driven by a `MutationObserver` on every `.overlay`). A red dot on Défis while today's level can still be won. Tapping the active tab scrolls it to the top.
- **Jouer** (`#menu`): header (brand, coins, settings gear), Continuer only for a free run in progress, the Aventure hero card (next level to play with its world preview; tap = Aventure page on that level's world (user's choice 2026-10-01, not the level sheet), "Carte" chip = same page; a level in progress shows there with Reprendre), tiles Défi du jour (opens the Défis tab, where a daily in progress resumes) and Puzzles (a puzzle in progress resumes from it), the Partie libre row (last mode and level; the chevron opens the `#free` sheet to change them, Jouer starts), and a Missions row that jumps to the Défis tab.
- **Défis**: today's level card with a Play button, streak card + freeze, today's missions, then "Rattraper un niveau manqué" which unfolds the calendar.
- **Boutique**: Thèmes, Blocs, Bonus (upgrades). World themes say "Ou bats son boss". Only reachable from the tab bar (the in-game wallet is display only).
- **Profil**: Album (trophies, stickers), Stats and Réglages (the `#settings-body` node is moved in while that tab shows, and back into `#settings` when the gear opens it).
- **Aventure** (one screen, `#adventure`): strip of world thumbnails on top (scrolls sideways), the picked world below (rules, chests, levels path, endless run). Swipe the world page or use its arrows to change world; a locked world shows what opens it. `openWorld(w)` opens it on a world, `openAdventure()` on the world of the next level. The separate world-map screen is gone.
- **Settings**: Profil tab Réglages and Réglages in pause (no gear on Jouer since 2026-10-01); grouped Son / Affichage / Aide; tapping a row flips its switch.
- **Dialogs**: `ask({ title, text, ok, danger })` replaces `window.confirm` (styled, promise based). `guardRun(needed, go)` asks before dropping a run in progress.
- Close rules: X goes back to the Jouer hub, the back arrow goes up one level (stage > world > map).

## Files
- `www/index.html`: `#tabbar`, `#menu`, `#free`, `#ask`, CSS sections "tab bar + hub screens", "Défis tab", "Confirmation dialog".
- `www/src/ui/dialog.js`, `www/src/screens/home.js`, `www/src/ui/tabbar.js`, `www/src/screens/defis.js`: sections `confirmation dialog`, `home menu (Jouer tab)`, `tab bar`; `renderDefis` / `todayHtml` / `streakHtml`.

## Saved state
`cuboblocks.v2` gained `parked` (a run state, optional, no migration). `profile.adventure.fails` (see aventure.md) drives the paid skip on the level sheet.

## Gotchas
- `syncTabbar` must only write a class when it changes: every class write re-triggers the observer.
- Switching tabs adds `.no-anim` to the target hub (no scrim fade, quick card fade); the class is dropped when the hub hides, never while shown (that would restart the animation).
- Hub cards have a fixed height so switching tabs doesn't jump; long content scrolls inside the card.
- Result cards (`.card.sticky-foot`: game over, level end) keep their buttons stuck to the bottom on short phones.
