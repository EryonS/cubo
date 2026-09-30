# Aventure
Status: shipped (v2, 2026-10-01; v1 2026-09-30)

## What it does
A fourth mode next to Classique / Chrono / Chill: short levels (1-3 min) with a goal and a move budget (or a clock in Arcade), grouped in 8 worlds of 20 levels.
- **Map** (menu > Aventure): Plaine, Sous-marin, Espace, Glace, Forêt, Rétro, Arcade, Volcan. World k opens when the boss (level 20) of world k-1 is beaten **and** the player has 36 × k stars. Worlds opened under v1 stay open (`adventure.opened`, set by the v3 migration).
- **World screen**: rule card (advantage / drawback), star chests, 20 level buttons; level n opens once n-1 is cleared. Level 10 is the **Épreuve** (the hand-tuned v1 boss, gold ring, 25 coins), level 20 the **boss fight**.
- **Goals**: lines, score, special cells (`clear`), coins to pick up (`coins`, progress = `stats.coins`), a combo to reach (`combo`), crates (`clear` of kind `crate`: Plaine only, bottom rows stacked with crates and one 2-4 gap each, 2 hits a crate; `stage.fill` = rows), boss (`boss`).
- **Boss fight** (`goal: { type: 'boss', target: hp, name }`, `stage.boss: { every, count, kind }`): a 2x2 boss in the center (`L.BOSS_AT`) that line clears never remove; every boss cell inside a cleared line (or a bomb blast) takes 1 hp, so a line through it takes 2. Every `every` moves it drops `count` cells of `kind` (spawned events carry `attack: true`). Gravity lands blocks on it, the sea current skips its rows. The HUD plate shows an hp bar; the boss has a face (eyes follow the dragged piece), flashes when hit, squashes when it strikes back.
- **Star chests** (`M.CHESTS`): at 15 / 35 / 55 world stars: 40 coins, 2 free starting Bombes (`adventure.bombs`, used before paying on the level sheet), 150 coins. Opened once.
- **Level sheet**: goal, budget, best stars; options: start with a Bombe (30 coins), skip the level without a star (250 coins, not for bosses).
- **In level**: the world's theme is forced; the score plate shows `progress / target` and `LABEL · N COUPS`. Moves left ≤ 3 blink.
- **End**: 1 star for the win, +1 with 15% of the budget left, +1 with 30% (clock left for timed levels). Out of moves: buy +5 moves (20, 40, 80... coins per attempt), stars then capped at 1.
- **Rewards**: first clear 10 coins (Épreuve 25, boss 60), +5 per new star; beating a boss gives the world's theme (still sold in the Boutique). Grid coins and daily missions count as in any run.

## Files
- `src/levels.js` (pure): `level(world, n)` builds the stage from a difficulty curve; `TRIALS` holds the hand-tuned level 10s, `BOSSES` the level 20 fights; `goalText`, `goalLabel`.
- `src/worlds.js` (pure): world rules, registered into logic with `L.defineWorlds` (see worlds.md).
- `src/logic.js`: `stage` in the run state, special cells (`SPECIAL`, `KINDS`, `state.special`), `clearCells` (boss hits in `hit.boss`, events `bossHits`), `fall`, `stageMove`, `finishStage`, `addMoves`, `placeBoss`, `bossAttack`, `prefill` (crates).
- `src/meta.js`: `worldOpen`, `levelOpen`, `applyLevel`, `skipLevel`, `totalStars`, `worldStars`, `CHESTS` / `chestState` / `openChest`, `freeBombs` / `useFreeBomb`, prices, `migrateAdventure`.
- `src/main.js`: section `aventure` (map, world, `renderChests`, level sheet, level end, `levelName`), section `boss` (`drawBoss`, `drawBossBar`, `bossEffects`), `drawSpecial` (crate), `stageEffects`, HUD branch in `drawHUD`, `RETRO4` palette.
- `index.html`: overlays `#adventure`, `#world`, `#stage`, `#level-end` and their CSS.
- `tools/bot.js`, `tools/balance.js`: greedy bot + balance report (`node tools/balance.js 10`). Dev only, not cached by the service worker.
- Tests: `tests/adventure.test.js`, `tests/meta-adventure.test.js`, `tests/adventure-v2.test.js`.

## Saved state
- Run (`gridlock.v2`): `state.stage = { world, n, goal, maxMoves, movesLeft, progress, won, stars, extra, clock?, setup?, ramp }`, `state.special[64]`.
- Profile (version 3): `profile.adventure = { stars: { "<world>-<n>": 0..3 } (key present = cleared, 0 = skipped), opened?: [world], chests?: { "<world>-<i>": true }, bombs?: n }`.

## Gotchas
- Retune budgets with `node tools/balance.js` after changing a rule, a kind or the piece odds. Target: bot wins 90-100% early, ≥70% late and on bosses (v2 run: world averages 88-100%, bosses 69-100%).
- "Empty the grid" was tried as a goal and dropped: the bot could not win it even with 300 moves (luck-bound). Crates replaced it. Rétro has no crates: gravity chains clear them for free.
- Old saves keep `<world>-10` stars: that level is now the Épreuve, so v1 bosses count as cleared trials.
- A new goal type needs: `stageMove` progress, `goalText` / `goalLabel`, the HUD, and the bot's goal awareness.
- Gravity chains are animated wave by wave (`events.waves`); the board state is already final, only the drawing lags.
- Records per mode ignore Aventure (`bests` skips it).
