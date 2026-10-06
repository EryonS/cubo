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
Each theme has its own generative song (`SONGS` in `src/audio/songs.ts`, pure scores): bpm, chords, a soft pad, bass, a music-box arpeggio, a legato lead melody (`lead`: 16 steps over two bars, chord tone index played an octave up, -1 holds) and optional light drums. Made softer on 2026-10-06 (user's request): only sine and triangle waves (no square or saw, a test checks it), slower tempos, a reverb and a gentle lowpass on the music bus, brush and shaker drums.

`src/audio/engine.ts` plays it: each note is voiced by its role (pad = two detuned voices swelling in, bell = music box, lead = flute with a late vibrato). `musicScene(theme)` picks the song: `GameScreen` passes the played theme while it is focused (a world's in Aventure, dailies and events, a free run's own theme) and `null` when it leaves, except when Paramètres opens from the pause. On the menus the equipped theme's song plays calm (no drums, lighter lead, lower level) and follows a theme change in the Boutique. A new song starts from its first bar and crossfades over the old one. A new theme needs a `SONGS` entry, else it plays the Jouet song.
