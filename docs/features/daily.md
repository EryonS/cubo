# Daily challenges (Défis): daily level, streak
Status: shipped (v1, 2026-09-30; Défis screen added the same day)

## Défis screen
- Menu row "Défis" (`#menu-defis`): today's level status and the streak flame.
- `#defis` overlay, one screen: month calendar (past days and today; stars = cleared) and, below, the picked day's level card (today by default, titled "Aujourd'hui") plus the month trophy hint. Tapping the card opens the daily sheet; its "Retour" comes back here. Future days and days before `DAILY_START` are disabled. Streak count sits in the header pill.
- Daily seeds for free play ("graines") were tried and dropped the same day: without a goal or leaderboard they added nothing over normal free play.

## Daily level
- `LV.daily(day)`: world and level (3-7 of that world) drawn from a hash of the local date, plus a fixed `seed`, so every player gets the same board and piece sequence. Numbered from `DAILY_START` (2026-09-01 = #1).
- Today: 3 attempts (counted when a run starts, `M.startDaily`). Past days (Défis calendar): unlimited, never feed the streak. Future days: locked.
- Rewards: first clear 20 coins on the day, 10 for a past day; +5 moves can be bought like in Aventure (stars capped at 1).
- Share (after a win): `Gridlock #31 · Forêt · 3 étoiles · 12 coups en rab`. Phones get the share sheet, otherwise it is copied.
- Uses the phone's date; changing it to cheat is accepted (offline game, no server).

## Streak
- A day counts when that day's level is cleared on the day (1 star is enough).
- Coins per day: 5 + 5 × streak, capped at 40. Every 7th day: weekly chest (+50). Day 30: exclusive block skin "Or" (`STREAK_SKIN`, never sold).
- Freeze: 100 coins, max 2 held; each covers one missed day (used automatically on the next cleared day).
- `M.streakNow(profile, today)` is what to display (0 once the gap exceeds the freezes).

## Files
- `src/levels.js`: `DAILY_START`, `daily`, `dayNumber`.
- `src/meta.js`: `addDays`, `dayDiff`, `monthDays`, `dailyOf`, `dailyAttemptsLeft`, `startDaily`, `applyDaily`, `streakOf`, `streakNow`, `buyFreeze`.
- `src/main.js`: section `daily level, streak, profile` (`openDailySheet`, `startDaily`, `showDailyEnd`, `shareText`, `renderDailyButton`) and `Défis screen` (`openDefis`, `renderDefis`, `calendarHtml`, `dayHtml`); `endLevel` branches on `stage.daily`.
- Tests: `tests/meta-daily.test.js`.

## Saved state
`profile.daily: { "<YYYY-MM-DD>": { attempts, stars? } }`, `profile.streak: { count, best, lastDay, freezes }`. Run: `state.stage.daily = day`.

## Gotchas
- Days are local dates but all arithmetic goes through UTC (`addDays`, `dayDiff`) so DST never shifts them.
- Abandoning a daily run still spends the attempt.
