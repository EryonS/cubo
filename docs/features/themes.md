# Themes
Status: shipped

## What it does
A theme is a whole visual world: background (static `paint` + optional per-frame `animate`), board slab, empty cells, score plate, combo tag, display font (Baloo 2, or Press Start 2P for pixel themes) and the menu colors that skin every native screen (`src/theme/menu-themes.ts`). Nine themes: Jouet (free default) and the eight Aventure worlds, bought in the Boutique. Outside Aventure they are purely cosmetic.

## Files
- `src/render/theme.ts`: the `Theme` type and `TOY` (Jouet). `src/render/board-themes.ts`: `LOOKS` (colors, frame, plate, tag, palette of every other theme), `boardTheme(id, skin)`, `themeFor(played, board, skin, patterns)` (the world of a level / Mondes run, else the run's own theme, else the equipped board), `RETRO4`.
- `src/render/decor/worlds.ts`, `src/render/decor/events.ts`, `src/render/decor/util.ts`: `WORLD_DECOR` / `EVENT_DECOR` (`paint`, `animate` per theme), helpers (`seeded`, gradients, hills). Drawn through `src/render/ctx2d.ts`, a canvas-2D context over `G` (Skia). Plate, frame and empty cells are drawn in `src/render/draw.ts` (`drawFrame`, `drawPlate`, `drawBoard`).
- `src/theme/menu-themes.ts` (`MENU_OVERRIDES`, generated, contrast-checked) + `src/theme/useColors.ts`: the menu colors of the equipped theme. `src/theme/tokens.ts`: shared tokens (Jouet defaults).
- `src/core/meta.ts`: `SKINS.boards` (id, name, price; order = Aventure world order).
- `assets/fonts/`: bundled Baloo 2 and Press Start 2P (OFL), registered by the `expo-font` plugin in `app.config.ts`; `src/theme/fonts.ts`, `src/render/font.ts` (Skia typefaces).
- `DESIGN.md`: the table of worlds and the contract.

## Contract (every theme)
Required (the `Theme` interface in `src/render/theme.ts`): `base`, `board`, `empty`, `cellR`, `ink`, `accent`, `danger`, `frame {r, line, lw?, inset?, glow?}`, `plate {fill, line, r, ink, sub, lw?, inset?, glow?, shadow?, bulbs?, dots?}`, `tag {fill, line, ink, glow?}`, `paint(g, w, h)`, plus the theme's `MENU_OVERRIDES` entry in `src/theme/menu-themes.ts` (menu colors).
Optional: `animate(g, w, h, t)`, `palette` (14 block colors + leading null), `scale` (display font factor, 0.62 for pixel fonts), `pixel` (Press Start 2P), `shadow` (frame shadow color). The legacy `font` / `weight` fields are gone: Baloo 2 everywhere, Press Start 2P when `pixel`.

## Saved state
`profile.owned.boards`, `profile.equipped.boards` (the key is still `boards` for old saves).

## Gotchas
- Light worlds need a dark `ink`: canvas texts (chrono, hints, floaters) are drawn with it over the background.
- `paint` runs once per resize; keep per-frame work in `animate` light (a few dozen shapes).
- Use `seeded(n)` (`src/render/decor/util.ts`) for decoration so nothing jumps on resize.
- A new world theme also needs its Aventure world entry (see worlds.md).
- Retired ids (`night`, `sunset`, `desert`, `mountain`, `dash`) are refunded by `M.migrate` (`RETIRED` in `src/core/meta.ts`); never reuse them.

## Music
Each theme has its own generative song (`SONGS` in `src/audio/songs.ts`, pure scores): bpm, chords, bass, bell arpeggio and optional drums, played by `src/audio/engine.ts`. The intended rule (legacy): in a run the song follows the played theme (a world's in Aventure and dailies); on menu screens it is the equipped theme's song; it switches with a short fade. In the port `pickSong(id)` exists in `engine.ts` but nothing calls it yet, so every screen plays the Jouet song. A new theme needs a `SONGS` entry, else it plays the Jouet song.
