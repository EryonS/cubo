# Economy: coins, missions, Boutique, ads
Status: shipped

## What it does
- **Coins**: picked up on the grid (coin +1, bag +5), plus end-of-run bonuses and mission rewards. Spent on discards (10, +5 each), undos (free, then 1, 2, 3...) and the Boutique.
- **Missions**: 3 per day, same draw for everyone that day, harder every 6 completed. Shown in the Défis tab, the home row "Missions" (progress pips, jumps to Défis), the in-game HUD button `#missions-open` (badge `done/3` once one is done, live run progress, pauses timers like any overlay) and the `#missions` sheet; `renderMissionBadges` refreshes both after each move.
- **Boutique** (tab bar only; the wallet is display only): block skins and world themes (cosmetic), and bonus upgrades (tab Bonus, see upgrades.md).
- **Mondes prime**: Mondes runs pay a prime on the score (see worlds-mode.md).
- **Rewarded ad** (stub): doubles a run's coins once.

## Files
- `www/src/core/meta.js`: `SKINS`, `MISSIONS`, `dailyMissions`, `applyRun`, `runCoins` (adds the free play difficulty bonus, modes.md), `buy`, `equip`, `spend`, `nextGoal`.
- `www/src/platform/ads.js`: `showRewarded()` (rewarded ads, two placements: double the run's coins on the game over card, refill today's daily tries). Native app: AdMob via `@capacitor-community/admob`, Google's consent form (UMP) before the first ad where required, "Confidentialité des pubs" row in Réglages when Google says the player must be able to change it, game audio suspended while an ad plays, a short message when no ad is available. Web: a 3-second stand-in. **Google test ids for now**: replace `UNITS`, `TESTING`, `GADApplicationIdentifier` (ios/App/App/Info.plist) and `admob_app_id` (android strings.xml) with the real AdMob ids before release. No ATT prompt yet (iOS ads are non-personalized until it is added with a translated NSUserTrackingUsageDescription).
- `www/src/screens/shop.js` (wallet, Boutique), `www/src/screens/gameover.js` (game-over report).

## Saved state
`gridlock.profile.v1`: `{ version, coins, owned, equipped, day, missions, missionsDone, games }`.

## Gotchas
- Aventure: a world theme comes free with its boss, or is bought; beating the boss after buying it pays the price back (line "Thème X déjà à toi"). Coins buy +5 moves (20, 40, 80... per attempt), a starting Bombe (30) and level skips (250). Level rewards: first clear 10 (boss 50), +5 per new star. Dailies: first clear 20 (past day 10); streak 5 + 5 × days (max 40), weekly chest 50, freeze 100 (max 2). Stickers: 20 (world stickers 30). Block skin "Or" is a 30-day streak reward, never sold (`price: null`).
- Keep new sinks in `meta.js` as pure functions returning a new profile or `null` when the wallet is short.


## Day rollover
Missions roll over in `M.ensureDay`. Besides launch and run start, `rollDay()` (www/src/app/base.js`, `www/src/platform/storage.js) runs when the app comes back from the background, when Jouer, Défis or Missions open, and once a minute, so an app left open past midnight shows the new missions.
