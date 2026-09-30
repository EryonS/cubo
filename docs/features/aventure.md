# Aventure
Status: shipped (v1, 2026-09-30)

## What it does
A fourth mode next to Classique / Chrono / Chill: short levels (1-3 min) with a goal and a move budget (or a clock in Arcade), grouped in 8 worlds of 10 levels.
- **Map** (menu > Aventure): Plaine, Sous-marin, Espace, Glace, Forêt, Rétro, Arcade, Volcan. World k opens when the boss of world k-1 is beaten **and** the player has 18 × k stars.
- **World screen**: rule card (advantage / drawback), 10 level buttons; level n opens once n-1 is cleared; level 10 is the boss.
- **Level sheet**: goal, budget, best stars; options: start with a Bombe (30 coins), skip the level without a star (250 coins, not for bosses).
- **In level**: the world's theme is forced; the score plate shows `progress / target` and `LABEL · N COUPS`. Moves left ≤ 3 blink.
- **End**: 1 star for the win, +1 with 15% of the budget left, +1 with 30% (clock left for timed levels). Out of moves: buy +5 moves (20, 40, 80... coins per attempt), stars then capped at 1.
- **Rewards**: first clear 10 coins (boss 50), +5 per new star; beating a boss gives the world's theme (still sold in the Boutique). Grid coins and daily missions count as in any run.

## Files
- `src/levels.js` (pure): `level(world, n)` builds the stage from a difficulty curve; `BOSSES` holds the hand-tuned level 10s; `goalText`, `goalLabel`.
- `src/worlds.js` (pure): world rules, registered into logic with `L.defineWorlds` (see worlds.md).
- `src/logic.js`: `stage` in the run state, special cells (`SPECIAL`, `KINDS`, `state.special`), `clearCells`, `fall`, `stageMove`, `finishStage`, `addMoves`.
- `src/meta.js`: `worldOpen`, `levelOpen`, `applyLevel`, `skipLevel`, `totalStars`, `worldStars`, prices.
- `src/main.js`: section `aventure` (map, world, level sheet, level end), `drawSpecial`, `stageEffects`, HUD branch in `drawHUD`, `RETRO4` palette.
- `index.html`: overlays `#adventure`, `#world`, `#stage`, `#level-end` and their CSS.
- `tools/bot.js`, `tools/balance.js`: greedy bot + balance report (`node tools/balance.js 10`). Dev only, not cached by the service worker.
- Tests: `tests/adventure.test.js`, `tests/meta-adventure.test.js`.

## Saved state
- Run (`gridlock.v2`): `state.stage = { world, n, goal, maxMoves, movesLeft, progress, won, stars, extra, clock?, setup?, ramp }`, `state.special[64]`.
- Profile: `profile.adventure.stars = { "<world>-<n>": 0..3 }` (key present = cleared, 0 = skipped).

## Gotchas
- Retune budgets with `node tools/balance.js` after changing a rule, a kind or the piece odds. v1 target: bot wins 90-100% early, ≥70% in Volcan.
- A new goal type needs: `stageMove` progress, `goalText` / `goalLabel`, the HUD, and the bot's goal awareness.
- Gravity chains snap instantly (no falling animation yet).
- Records per mode ignore Aventure (`bests` skips it).
