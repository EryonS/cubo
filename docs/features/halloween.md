# Halloween event
Status: shipped (2026-10-01)

## What it does
Every October (local date), a home row "Halloween" opens the event screen: one-line intro, world rules, the three rewards, 10 levels on a path (level 10 is a boss, the Citrouille géante). Outside October the row and the screen are gone.
- World `halloween` (worlds.js, not on the map): pumpkins (2 hp) drop a bag of 5 coins, a ghost appears every 6 moves and jumps every 2.
- Levels: hand-made in `EVENT_LEVELS` (levels.js), balanced with the bot (80-100 %, boss 70 %). Play like Aventure levels (stars, bought moves); no skip, no starting Bombe, no fail counter.
- Pay: 15 coins a first clear (boss 50), 5 a new star.
- Clearing the 10 levels: theme Halloween (exclusive in the Boutique) and Cubo's Chapeau de sorcière the first time; 200 coins in later years. Plus the year's trophy: silver, gold with all 30 stars (Profil > Album > Trophées de saison).
- Progress belongs to one October: next year starts from level 1 again (user's choice). Trophies stay.

## Files
- `src/meta.js`: `EVENT`, `eventActive`, `eventOf`, `eventLevelOpen`, `applyEvent`, `seasonTrophy`.
- `src/levels.js`: `EVENT_LEVELS`, `eventLevel(n)` (stage carries `event: 'halloween'`; main adds `eventDay`, the day it started, so a level finished after midnight on the 31st still counts).
- `src/worlds.js`: `WORLDS.halloween`. `src/logic.js`: kinds `pumpkin`, `ghost`.
- `src/main.js`: section `Halloween event`, theme `THEMES.halloween`, `SONGS.halloween`, `CUBO_LOOKS.halloween` (pumpkin Cubo, witch hat, bat burst), `BOSS_LOOK.halloween`, season shelf in `albumHtml`.
- `index.html`: `#menu-event`, `#event`.
- Tests: `tests/event.test.js`.

## Saved state
`profile.halloween = { year, stars: { [n]: 0..3 } }`, `profile.trophies = { 'halloween-<year>': 'silver' | 'gold' }`. Both optional, read with defaults.

## Gotchas
- `WD.WORLDS` now holds a world that is not on the map: iterate `M.WORLD_ORDER` / `WD.ORDER` for map things.
- Level names: `eventLevelName` (10 is "Boss", not "Épreuve").
