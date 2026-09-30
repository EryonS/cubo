# Weekend event
Status: shipped (v1, 2026-10-01)

## What it does
Every Saturday and Sunday (local time), the home menu shows a **Week-end** row and the Défis screen a Week-end card (on weekdays the card announces the coming world).
The event is an endless Classique run (Normal) under one Aventure world's rule, a new world each week: Plaine, Sous-marin, Espace, Glace, Forêt, Rétro, Volcan, then again (Arcade sits out: its drawback is a clock).
The run wears the world's theme (and Rétro's 4-tone palette). Worlds with special cells start with 3 of them on the board; `afterMove` rules (current, asteroids, mushrooms, embers) keep acting.
Point tiers pay once per weekend: 1 000 (+20), 2 500 (+40), 5 000 (+80). Missions and lifetime stats count as usual.

## Files
- `src/levels.js`: `weekend(day)` → `{ id: saturday, world, active, setup }`, `EVENT_WORLDS`, `EVENT_START` (week 0).
- `src/logic.js`: `createGame(seed, { mode: 'classic', event })` sets `state.event`; `rulesOf` reads it; `worldMove` (aging + `afterMove`) runs after each placement; `runStats().mode` is `'event'`.
- `src/worlds.js`: `scatter` reads `setup` from the stage or the event.
- `src/meta.js`: `EVENT_TIERS`, `eventOf`, `applyEvent`.
- `src/main.js`: section `weekend event` (`renderEventButton`, `eventHtml`, `openEventSheet`, `startEvent`), `sameRun` (Rejouer keeps the event while the weekend lasts), `settleRun` adds the tiers.
- `tests/weekend-stats.test.js`.

## Saved state
`profile.events: { [saturday]: { best, games, paid } }`. The run's `state.event` is saved with the run. The event record never goes into `bests`.

## Gotchas
- A run started on Sunday evening can end after midnight: it still pays that weekend's tiers (`state.event.id`), but Rejouer then starts a plain Classique game.
- The week's world comes from the date only, so everyone gets the same one.
