# Economy: coins, missions, Boutique, ads
Status: shipped

## What it does
- **Coins**: picked up on the grid (coin +1, bag +5), plus end-of-run bonuses and mission rewards. Spent on discards (10, +5 each), undos (free, then 1, 2, 3...) and the Boutique.
- **Missions**: 3 per day, same draw for everyone that day, harder every 6 completed.
- **Boutique**: block skins and world themes, cosmetic only.
- **Rewarded ad** (stub): doubles a run's coins once.

## Files
- `src/meta.js`: `SKINS`, `MISSIONS`, `dailyMissions`, `applyRun`, `runCoins`, `buy`, `equip`, `spend`, `nextGoal`.
- `src/ads.js`: `showRewarded()` stub (AdMob in React Native).
- `src/main.js`: wallet, shop, game-over report.

## Saved state
`gridlock.profile.v1`: `{ version, coins, owned, equipped, day, missions, missionsDone, games }`.

## Gotchas
- Aventure: a world theme comes free with its boss, or is bought. Coins buy +5 moves (20, 40, 80... per attempt), a starting Bombe (30) and level skips (250). Level rewards: first clear 10 (boss 50), +5 per new star. Planned: streak freezes (max 2).
- Keep new sinks in `meta.js` as pure functions returning a new profile or `null` when the wallet is short.
