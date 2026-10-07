# Economy: coins, missions, Boutique, ads
Status: shipped

## What it does
- **Coins**: picked up on the grid (coin +1, bag +5), plus end-of-run bonuses and mission rewards. Spent on discards (10, +5 each), undos (free, then 1, 2, 3...) and the Boutique.
- **Missions**: 3 per day, same draw for everyone that day, harder every 6 completed. Shown in the Défis tab, the home row "Missions" (progress pips, jumps to Défis), the in-game HUD button "Missions du jour" (`src/screens/GameScreen.tsx`: badge `done/3` once one is done, live run progress, pauses timers like any open sheet) and the missions sheet (`src/ui/MissionsSheet.tsx`, pips in `src/ui/Missions.tsx`); both read the run's stats, so they refresh after each move.
- **Boutique** (tab bar only; the wallet, `src/ui/Wallet.tsx`, is display only): block skins and world themes (cosmetic), and bonus upgrades (tab Bonus, see upgrades.md).
- **Mondes prime**: Mondes runs pay a prime on the score (see worlds-mode.md).
- **Rewarded ad**: doubles a run's coins once (`DoubleCoinsAd` in `src/screens/GameOver.tsx`).

## Files
- `src/core/meta.ts`: `SKINS`, `MISSIONS`, `dailyMissions`, `applyRun`, `runCoins` (adds the free play difficulty bonus, modes.md), `buy`, `equip`, `spend`, `nextGoal`.
- `src/platform/ads.ts`: `showRewarded()` (rewarded ads, two placements: double the run's coins on the game over card, refill today's daily tries). `react-native-google-mobile-ads`, Google's consent form (UMP) before the first ad where required, then the iOS tracking prompt (`expo-tracking-transparency`), "Confidentialité des pubs" row in Paramètres when Google says the player must be able to change it (`showPrivacyOptions`; `checkPrivacy()` asks at launch from `App.tsx`, so the row is there before any ad), game audio suspended while an ad plays (`holdAudio`), a short toast when no ad is available. Real AdMob ids (app ids in the `react-native-google-mobile-ads` plugin of `app.config.ts`, rewarded units in `UNITS`); dev builds (`__DEV__`) keep Google's test units, since AdMob suspends accounts that view or click their own live ads.
- `src/screens/ShopScreen.tsx` (Boutique), `src/screens/GameOver.tsx` (game-over report), `src/ui/Wallet.tsx`.

## Saved state
`cuboblocks.profile.v1` (MMKV, `src/state/persist.ts`): `{ version, coins, owned, equipped, day, missions, missionsDone, games }`.

## Gotchas
- Aventure: a world theme comes free with its boss, or is bought; beating the boss after buying it pays the price back (line "Thème X déjà à toi"). Coins buy +5 moves (20, 40, 80... per attempt), a starting Bombe (30) and level skips (250). Level rewards: first clear 10 (boss 50), +5 per new star. Dailies: first clear 20 (past day 10); streak 5 + 5 × days (max 40), weekly chest 50, freeze 100 (max 2). Stickers: 20 (world stickers 30). Block skin "Or" is a 30-day streak reward, never sold (`price: null`).
- Keep new sinks in `src/core/meta.ts` as pure functions returning a new profile or `null` when the wallet is short.


## Day rollover
Missions roll over in `M.ensureDay`. Besides launch and run start (`rollMissions` in `src/game/run.ts`), `rollDay()` (`src/state/store.ts`, `rollDay` in `src/state/persist.ts`) runs when the app comes back to the foreground (`App.tsx`) and when the Défis tab opens, so an app left open past midnight shows the new missions. The legacy once-a-minute timer is not ported.
