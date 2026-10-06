# Daily challenges (Défis): daily level, streak
Status: shipped (v1, 2026-09-30; Défis screen added the same day)

## Défis screen
- Home tile "Défi du jour" (`src/screens/PlayScreen.tsx`): today's world, attempts (or "en cours") and streak flame; opens the Défis tab. The Défis tab (see navigation.md), header with streak and coins, shows from the top: the calendar (a week strip with arrows or a swipe; the month title unfolds the whole month), the picked day's level card with Jouer / Rejouer, or Continuer when that daily is in progress, the streak and freeze, today's missions. A daily in progress is resumed from here, never from the home Continuer button.
- In a daily, pause offers Recommencer while a try is left (the dropped attempt counts, the dialog says how many remain); pause "Menu" and the daily end "Menu" go back to the Défis tab.
- Défis screen (`src/screens/DefisScreen.tsx`, `src/screens/defis/Calendar.tsx`, `DayCard.tsx`): month calendar (past days and today; stars = cleared) and, below, the picked day's level card (today by default, titled "Aujourd'hui") plus the month trophy hint. Tapping the card opens the daily; the end card's "Menu" comes back here. Future days and days before `DAILY_START` are disabled. Streak count sits in the header pill.
- Daily seeds for free play ("graines") were tried and dropped the same day: without a goal or leaderboard they added nothing over normal free play.

## Daily level
- `LV.daily(day)`: world and level (3-7 of that world) drawn from a hash of the local date, plus a fixed `seed`, so every player gets the same board and piece sequence. Numbered from `DAILY_START` (2026-09-01 = #1).
- Today: 3 attempts (counted by `M.countDaily`, see Attempts and refills below). Past days (Défis calendar): unlimited, never feed the streak. Future days: locked.
- Rewards: first clear 20 coins on the day, 10 for a past day; +5 moves can be bought like in Aventure (stars capped at 1).
- Share (after a win): `Cubo Blocks #31 · Forêt · 3 étoiles · 12 coups en rab`. The native share sheet opens (`shareText` in `src/game/daily.ts`, `src/screens/LevelEnd.tsx`).
- Uses the phone's date; changing it to cheat is accepted (offline game, no server).

## Streak
- A day counts when that day's level is cleared on the day (1 star is enough).
- Coins per day: 5 + 5 × streak, capped at 40. Every 7th day: weekly chest (+50). Day 30: exclusive block skin "Or" (`STREAK_SKIN`, never sold).
- Freeze: 100 coins, max 2 held; each covers one missed day (used automatically on the next cleared day).
- `M.streakNow(profile, today)` is what to display (0 once the gap exceeds the freezes).

## Files
- `src/core/levels.ts`: `DAILY_START`, `daily`, `dayNumber`.
- `src/core/meta.ts`: `addDays`, `dayDiff`, `monthDays`, `dailyOf`, `dailyAttemptsLeft`, `countDaily`, `applyDaily`, `streakOf`, `streakNow`, `buyFreeze`.
- `src/game/daily.ts` (pure helpers: calendar, tries, tile subtitle, tab dot, `shareText`, pause `runLabel`), `startDaily(day)` in `src/game/run.ts`, `src/screens/DefisScreen.tsx` + `src/screens/defis/`, `src/screens/LevelEnd.tsx` (daily end card, branches on `stage.daily`).
- Tests: `src/core/meta-daily.test.ts`, `src/game/daily.test.ts`.

## Saved state
`profile.daily: { "<YYYY-MM-DD>": { attempts, stars? } }`, `profile.streak: { count, best, lastDay, freezes }`. Run: `state.stage.daily = day`.

## Gotchas
- Days are local dates but all arithmetic goes through UTC (`addDays`, `dayDiff`) so DST never shifts them.
- Abandoning a daily run still spends the attempt.

## Attempts and refills (2026-10-01)
- An attempt counts when the daily run ends (won or lost) or is dropped after at least one move (`settleRun` in `src/game/run.ts` calls `M.countDaily`). Opening the level or a screen bug never costs one.
- Out of attempts on today's level, not won yet: a rewarded ad gives the 3 attempts back once a day (`M.adDailyRefill`), or one attempt costs 30, 60, 120... coins (`M.buyDailyTry`). Shown on the Défis today card and the daily end card (`src/ui/DailyRefill.tsx`). The ad is a rewarded ad (`src/platform/ads.ts`).
- Saved: `daily[day]` gains `bonus` (attempts granted), `paid` (bought) and `ad` (ad used). Profile v4 gave back attempts spent under the old rule on days not won.
- The streak card shows the freezes as snowflake slots (`Snow` icon in `src/ui/Icon.tsx`, filled = owned, `M.FREEZE_MAX` slots), with "Gels n/max" under them.
