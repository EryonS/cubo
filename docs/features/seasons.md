# Season events
Status: shipped (2026-10-01; Halloween first, the five others the same day)

## What it does
Seven events, each open on its dates (local date, `window(year)` in `EVENTS`). Two can be open at once (the Chinese New Year falls in January or February): each open event gets its own home row (icon, name, progress, end date), opening its event screen: one-line intro, world rules, the three rewards, 10 levels on a path (level 10 is a boss). Outside the event months the row and the screen are gone.

| Event | Months | World rules (worlds.js) | Boss | Cubo reward |
|---|---|---|---|---|
| Nouvel An chinois `lunar` | 3 days before the Chinese New Year to day 15 (Lantern Festival); dates from the `LUNAR_NEW_YEAR` table (2026-2040, none after) | lanterns rise a row each move and drop a coin; one takes off from the bottom row every 4 moves; a firecracker lands every 6 moves and hardens into rock after 6 | Dragon de papier | Cornes de dragon `dragon` |
| Nouvel An `newyear` | January | rockets explode in an X on their diagonals (`burst`); every level is timed | Horloge de minuit | Chapeau pailleté `sequin` |
| Saint-Valentin `valentine` | February | twin hearts: destroying one destroys its twin (`link`, same color); a thorny rose (2 hp) grows every 6 moves | Cupidon | Serre-tête cœurs `hearts` |
| Pâques `easter` | Easter Sunday - 14 days to Easter Sunday + 7 (`easterSunday`, Gregorian computus) | some bushes hide an egg (`hides`, `sp.egg`): found eggs count for egg goals and pay a coin; an empty bush regrows every 6 moves | Lapin géant | Oreilles de lapin `bunny` |
| Plage `beach` | July and August | crabs walk sideways (`sidestep`) and drop a coin; every 8 moves the tide floods the lowest row with room (water, `ttl` 6) | Crabe géant | Chapeau de paille `straw` |
| Halloween `halloween` | October | pumpkins (2 hp) drop a bag of 5 coins; a ghost appears every 6 moves and jumps every 2 | Citrouille géante | Chapeau de sorcière `witch` |
| Noël `xmas` | December | presents (2 hp) open into a random bonus (`gift`); a snow pile falls every 5 moves | Renne farceur | Bonnet de Noël `santa` |

- Levels: hand-made in `EVENT_LEVELS` (levels.js), balanced with the bot: 75-100 % wins, bosses 70-85 %. They play like Aventure levels (stars, bought moves); no skip, no starting Bombe, no fail counter.
- Pay: 15 coins a first clear (boss 50), 5 a new star.
- Clearing the 10 levels: the event's theme (exclusive in the Boutique) and its Cubo piece the first time; 200 coins in later years. Plus the year's trophy: silver, gold with all 30 stars (Profil > Album > Trophées de saison, which lists every trophy won and the one open now).
- Progress belongs to one year: the next time the event opens, it starts from level 1 again (user's choice). Trophies stay.
- Each event has its own theme (`THEMES[id]`, animated background: fireworks over a city at midnight, floating hearts, butterflies over a meadow, waves and gulls, falling snow and a lit tree, bats under the moon), song (`SONGS[id]`), Cubo look (`CUBO_LOOKS[id]`) and boss tint (`BOSS_LOOK[id]`).

## Files
- `src/meta.js`: `EVENTS` (with `window(year)`), `eventsFor(day)` (all open), `eventFor(day)` (first), `easterSunday`, `LUNAR_NEW_YEAR`, `eventById`, `eventEnd`, `eventOf` / `eventStars` / `eventLevelOpen(profile, id, day, n)`, `applyEvent(profile, id, day, n, stars)`, `seasonTrophy(profile, id, year)`.
- `src/levels.js`: `EVENT_LEVELS`, `eventLevel(id, n)` (stage carries `event: id`; main adds `eventDay`, the day it started, so a level finished after midnight on the last day still counts).
- `src/worlds.js`: the six event worlds (`pairs`, `hideEggs`, `tide` helpers). `src/logic.js`: kinds `pumpkin`, `ghost`, `present`, `snowpile`, `heart`, `rose`, `bush`, `egg`, `water`, `crab`, `rocket` and flags `link`, `sidestep`, `burst`, `hides`.
- `src/main.js`: section `season events` (row, screen, sheet, launch, `showEventEnd`), the themes, songs, looks, `drawSpecial` branches, `drawWardrobeHat` (event hats), season shelf in `albumHtml`.
- `index.html`: `#menu-event`, `#event`.
- Tests: `tests/event.test.js`.

## Saved state
`profile.seasons = { [id]: { year, stars: { [n]: 0..3 } } }` (v6 moved the first Halloween's `profile.halloween` here), `profile.trophies = { '<id>-<year>': 'silver' | 'gold' }`.

## Gotchas
- `WD.WORLDS` holds worlds that are not on the map: iterate `M.WORLD_ORDER` / `WD.ORDER` for map things.
- Level names: `eventLevelName` (10 is "Boss", not "Épreuve").
- The `LUNAR_NEW_YEAR` table ends in 2040: extend it before then.
- A new event needs: an `EVENTS` entry with its `window`, a world in worlds.js, `EVENT_LEVELS[id]` (bot-tuned), theme + exclusive skins in `SKINS.boards` / `SKINS.cubo`, `THEMES`, `SONGS`, `CUBO_LOOKS`, `BOSS_LOOK`, a hat in `drawWardrobeHat`, drawings for its cells.
