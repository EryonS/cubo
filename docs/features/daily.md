# Daily level and streak
Status: planned (retention lot)

## Daily level
- One Aventure-style level per day: world, goal and piece sequence drawn from the date seed, the same for every player.
- 3 attempts max on the day itself.
- Share text copied to the clipboard, no emoji: `Gridlock #142 · Glace · 3 étoiles · 4 coups en rab`.
- Calendar in the profile: every past day can be replayed (unlimited attempts), future days stay locked.
- Uses the phone's date; changing it to cheat is accepted (offline game, no server).

## Streak
- A day counts when that day's daily level is cleared (1 star is enough). Past days replayed later never count.
- Rewards: rising coins (10, 15, 20...), a bonus on day 7, an exclusive block skin on day 30 (not sold).
- Streak freeze: bought with coins, max 2 held, protects one missed day.
- Shown as a drawn flame with the day count next to the daily level.

## Files (planned)
- `src/meta.js`: `dailyLevel(day)`, `applyDaily(profile, day, result)`, streak + freezes.
- Reuses `dayRandom(day)` already in `meta.js` and the level generator from `src/levels.js`.

## Saved state (planned)
`profile.daily: { "<YYYY-MM-DD>": { stars, attempts, onDay } }`, `profile.streak: { count, best, lastDay, freezes }`.
