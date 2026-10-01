# Themes
Status: shipped

## What it does
A theme is a whole visual world: background (static `paint` + optional per-frame `animate`), board slab, empty cells, score plate, combo tag, display font and the CSS tokens that skin every DOM menu. Nine themes: Jouet (free default) and the eight Aventure worlds, bought in the Boutique. Outside Aventure they are purely cosmetic.

## Files
- `src/main.js`: `THEMES` (visuals), `css()` / `lightCss()` token helpers, `drawPlate`, `drawFrame`, `drawEmpty`, `paletteOf`.
- `src/meta.js`: `SKINS.boards` (id, name, price; order = Aventure world order).
- `index.html`: default CSS tokens (= Jouet) and the `@font-face` rules.
- `fonts/`: bundled Baloo 2 and Press Start 2P (OFL).
- `DESIGN.md`: the table of worlds and the contract.

## Contract (every theme)
Required: `base`, `board`, `empty`, `cellR`, `font`, `weight`, `ink`, `accent`, `danger`, `frame {r, line, lw?, inset?, glow?}`, `plate {fill, line, r, ink, sub, lw?, inset?, glow?, shadow?, bulbs?, dots?}`, `tag {fill, line, ink, glow?}`, `css` (built with `css()` for dark worlds or `lightCss()` for light ones), `paint(g, w, h)`.
Optional: `animate(g, w, h, t)`, `palette` (14 block colors + leading null), `scale` (display font factor, 0.62 for pixel fonts), `shadow` (frame shadow color).

## Saved state
`profile.owned.boards`, `profile.equipped.boards` (the key is still `boards` for old saves).

## Gotchas
- Light worlds need a dark `ink`: canvas texts (chrono, hints, floaters) are drawn with it over the background.
- `paint` runs once per resize; keep per-frame work in `animate` light (a few dozen shapes).
- Use `seeded(n)` for decoration so nothing jumps on resize.
- A new world theme also needs its Aventure world entry once Aventure ships (see worlds.md).
- Retired ids (`night`, `sunset`, `desert`, `mountain`, `dash`) are refunded by `M.migrate`; never reuse them.

## Music
Each theme has its own generative song (`SONGS` in `src/main.js`, section audio): bpm, chords, bass, bell arpeggio and optional drums. In a run the song follows `themeId()` (a world's in Aventure and dailies); on menu screens (hubs, Aventure, Puzzles, level sheet, free-play sheet) it is the equipped theme's song, like the menus' look. It switches with a short fade (`music.sync`, called from `syncTabbar` on every overlay change). Pause and settings keep the run's song. A new theme needs a `SONGS` entry, else it plays the Jouet song.
