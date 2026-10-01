# Gridlock: guide for Claude Code

Read this before adding or changing a feature. It routes you to the right feature file and module.

## Hard rules
- `src/logic.js`, `src/meta.js`, `src/worlds.js`, `src/levels.js`, `src/tutorial.js`, `src/puzzles.js` stay **pure**: no DOM, no `window`, JSON-serializable state, seeded RNG only. They are reused as-is in the React Native port.
- `src/main.js` only draws, animates, plays sounds, handles input and persists.
- UI copy is **French**; a shape to place is a **forme**, a **pièce** is always a coin. No emoji anywhere (UI, docs shown to players): draw icons on canvas or in SVG.
- Any change to a saved shape (`gridlock.v2` run state, `gridlock.profile.v1` profile) needs a migration in `M.migrate` + a test in `tests/`.
- New static file (font, image, script) → add it to `ASSETS` in `sw.js` and bump `CACHE`.
- Visual work follows `DESIGN.md`; product scope follows `PRODUCT.md`.
- Run `node --test` from the repo root before calling work done; check the UI in a browser for visual changes.
- Changing Aventure rules or piece odds: rerun `node tools/balance.js 10` and retune `src/levels.js`.

## Where to look

| You want to... | Read | Touch |
|---|---|---|
| Add or change a visual theme / world look | [features/themes.md](features/themes.md) | `THEMES` in `src/main.js`, `SKINS.boards` in `src/meta.js`, `DESIGN.md` |
| Add or change a bonus | [features/bonus.md](features/bonus.md) | `BONUSES` in `src/logic.js`, `BONUS_UI` + `GLYPHS` in `src/main.js` |
| Change modes (Classique, Chrono, Chill) or difficulty (obstacles, coin bonus) | [features/modes.md](features/modes.md) | `MODES` / `LEVELS` in `src/logic.js`, home menu in `index.html` + `src/main.js` |
| Coins, missions, Boutique, rewarded ad | [features/economy.md](features/economy.md) | `src/meta.js`, `src/ads.js`, shop in `src/main.js` |
| Saves and migrations | [features/persistence.md](features/persistence.md) | `M.migrate`, `save()` / `saveProfile()` in `src/main.js` |
| Aventure mode (map, levels, stars, rewards) | [features/aventure.md](features/aventure.md) | `src/levels.js`, `src/meta.js`, section `aventure` in `src/main.js` |
| World rules, special cells | [features/worlds.md](features/worlds.md) | `src/worlds.js`, `KINDS` in `src/logic.js`, `drawSpecial` in `src/main.js` |
| Défis screen, daily level, streak, share | [features/daily.md](features/daily.md) | `daily` in `src/levels.js`, daily/streak in `src/meta.js`, sections `daily level, streak, profile` and `Défis screen` in `src/main.js` |
| Combo / line clear effects (juice) | [features/combo-feel.md](features/combo-feel.md) | `commit`, `drawBanner`, `drawComboTag` in `src/main.js` |
| Guided first game, one-time tips | [features/tutorial.md](features/tutorial.md) | `src/tutorial.js`, `tipSeen` / `markTip` in `src/meta.js`, sections `tutorial` and `tips` in `src/main.js` |
| Sticker album, trophies, profile and stats | [features/album.md](features/album.md) | `STICKERS` / `checkStickers` / `monthTrophy` / `modeStats` in `src/meta.js`, `#profile` screen |
| Pause, block marks | [features/comfort.md](features/comfort.md) | section `pause` and `MARKS` in `src/main.js` |
| Bonus upgrades (Boutique tab Bonus) | [features/upgrades.md](features/upgrades.md) | `EFFECT_BY_LEVEL` / `bombArea` / `reroll` in `src/logic.js`, `UPGRADE_PRICES` in `src/meta.js`, `renderUpgrades` in `src/main.js` |
| Mondes mode (endless world runs, prime) | [features/worlds-mode.md](features/worlds-mode.md) | `free` in `src/worlds.js`, mode `worlds` in `src/logic.js`, `worldPrime` in `src/meta.js`, section `Mondes` in `src/main.js` |
| Puzzles (fill a drawing with a quota of pieces) | [features/puzzles.md](features/puzzles.md) | `src/puzzles.js`, mode `puzzle` in `src/logic.js`, `applyPuzzle` in `src/meta.js`, section `Puzzles` in `src/main.js` |
| Mascot Cubo (moods, tap, setting) | [features/mascot.md](features/mascot.md) | section `mascot` in `src/main.js` |
| Second obstacles of levels 11-19 (taupe, méduse, trou noir...) | [features/twists.md](features/twists.md) | `TWISTS` in `src/levels.js`, `KINDS` / `kindMoves` in `src/logic.js`, `twist` in `src/worlds.js` |
| Cubo's wardrobe (Boutique tab Cubo) | [features/wardrobe.md](features/wardrobe.md) | `SKINS.cubo` in `src/meta.js`, `drawWardrobeHat` / `cuboLookFor` in `src/main.js` |
| Season events (Nouvel An, Nouvel An chinois, Saint-Valentin, Pâques, Plage, Halloween, Noël), their dates, season trophies | [features/seasons.md](features/seasons.md) | `EVENTS` / `applyEvent` in `src/meta.js`, `EVENT_LEVELS` in `src/levels.js`, event worlds in `src/worlds.js`, section `season events` in `src/main.js` |
| Record flag on the board frame (free runs) | [features/comfort.md](features/comfort.md) | `drawRecordFlag` in `src/main.js` |
| Tab bar, home screen, dialogs, screen layout | [features/navigation.md](features/navigation.md) | `#tabbar` / `#menu` / `#ask` in `index.html`, sections `home menu`, `tab bar`, `confirmation dialog` in `src/main.js` |

## Adding a new feature
1. Create `docs/features/<feature>.md` (template below) and add a row to the table above.
2. Put rules in a pure module, rendering in `src/main.js`.
3. Add tests for the pure part in `tests/<module>.test.js`.
4. Update the feature file when behavior or saved state changes.

```markdown
# <Feature>
Status: shipped | planned
## What it does
## Files
## Saved state
## Gotchas
```

## Roadmap (decided in the 2026-09-30 brainstorm)
1. New art direction (**done**): Jouet default theme, 8 world themes, bonus renames.
2. Aventure (**done**, v1): world map, 10 levels per world, world rules, stars, coin helpers, theme unlock on boss.
3. Retention (**done**, v1): daily level + share text, day streak with freezes, sticker album with monthly trophies, profile and stats.
4. Onboarding (**done**): guided first game + one-time tips.
5. Combo feel (**done**): tiered clear effects.
6. Comfort and retention (**done**, v1): pause, color-blind block marks, dark menus (removed 2026-10-01), per-mode stats, secret stickers. A weekend event shipped then was removed on 2026-09-30 (overlapped the daily level, nothing to chase once its tiers were paid).
7. Aventure v2 (**done**): 20 levels a world, boss fights, coins / combo / crate goals, star chests.
8. Bonus upgrades + Mondes mode (**done**).
9. Puzzles (**done**): 40 drawings to fill with a quota of pieces.
10. UI/UX audit (**done**, 2026-09-30): tab bar (Jouer / Défis / Boutique / Profil), new home, Mondes moved into each Aventure world, streak moved to Défis, styled confirm dialogs, boss refunds an already bought theme, paid skip only after 2 failures, "forme" for shapes and "pièce" only for coins.
10. Mascot Cubo (**done**).
11. Second obstacles in levels 11-19, Cubo's wardrobe, Halloween event, record flag (**done**, 2026-10-01). Then five more season events, one per season (**done**, same day).
12. Later: polish, React Native port.
