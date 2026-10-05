---
name: Cubo Blocks
description: Bright, toy-like block puzzle; the default look is a soft plastic toy, every other theme is a world from the Aventure map.
colors:
  toy-pink: "#ffeef4"
  toy-dot: "#ffd6e5"
  toy-white: "#ffffff"
  toy-cell: "#f6e9f2"
  toy-ink: "#4a3a66"
  toy-muted: "#8a7aa3"
  toy-violet: "#7c5cff"
  toy-mint: "#b7f0d8"
  toy-mint-ink: "#1e7a55"
  good: "#1f9e68"
  danger: "#ff5d7a"
typography:
  display:
    fontFamily: "\"Baloo 2\", ui-rounded, \"SF Pro Rounded\", system-ui, sans-serif"
    fontWeight: 800
  pixel:
    fontFamily: "\"Press Start 2P\", ui-monospace, monospace"
    fontWeight: 400
  ui:
    fontFamily: "\"Baloo 2\", ui-rounded, \"SF Pro Rounded\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
rounded:
  pill: "999px"
  card: "22px"
  board: "26px"
  cell: "24%"
components:
  score-plate:
    backgroundColor: "{colors.toy-white}"
    textColor: "{colors.toy-violet}"
    rounded: "{rounded.pill}"
    height: "72px"
  combo-tag:
    backgroundColor: "{colors.toy-mint}"
    textColor: "{colors.toy-mint-ink}"
    rounded: "{rounded.pill}"
    height: "25px"
  button-primary:
    backgroundColor: "{colors.toy-violet}"
    textColor: "{colors.toy-white}"
    typography: "{typography.display}"
  card:
    backgroundColor: "{colors.toy-white}"
    textColor: "{colors.toy-ink}"
    rounded: "{rounded.card}"
---

## Overview
Playful and flashy in the spirit of console party and platform games, without borrowing any character, logo, sound or name from them. The default theme, **Jouet**, looks like a plastic toy: pink polka-dot background, a soft white board, glossy candy blocks, pill-shaped score and combo. Every other theme is one of the eight worlds of the Aventure map (see `docs/features/themes.md`).

Themes are whole worlds (`SKINS.boards` in `www/src/core/meta.js`, visuals in `THEMES` in `www/src/themes/worlds.js`). Each defines: background `paint` (+ optional `animate`), board slab, empty cell, score plate, combo tag, display font, CSS tokens for every DOM menu, and optionally its own block `palette`, a font `scale` and a drop `shadow` color. A new theme must define all required fields.

| id | Name | Price | Material | Font | Signature |
|---|---|---|---|---|---|
| toy | Jouet | free | plastic toy, polka dots | Baloo 2 | candy palette, white pills |
| plain | Plaine | 150 | sky, hills, wooden board | Baloo 2 | drifting clouds |
| sea | Sous-marin | 300 | deep blue, light rays, seaweed | Baloo 2 | rising bubbles |
| space | Espace | 450 | starfield, ringed planet | Baloo 2 | twinkling stars, violet glow |
| ice | Glace | 600 | pale ice, floes | Baloo 2 | falling snow |
| forest | Forêt | 800 | dusk pines, mushrooms | Baloo 2 | fireflies, mushroom-cap score plate |
| retro | Rétro | 1000 | 4-green LCD handheld | Press Start 2P | pixel matrix, square cells |
| arcade | Arcade | 1200 | neon night, perspective floor | Press Start 2P | marquee bulbs on the score |
| volcano | Volcan | 1500 | basalt, lava | Baloo 2 | rising embers, orange glow |

## Colors
Tokens above are the Jouet theme. Per-theme values live in each theme's `css` map: `--bg`, `--panel`, `--panel-2`, `--slot`, `--text`, `--muted`, `--accent`, `--on-accent`, `--good`, `--edge`, `--radius`, `--card-edge`, `--plate-edge`, and the translucent helpers `--hairline` (thin outlines), `--sunken` (tracks, disabled fills) and `--scrim` (overlay backdrop). Dark worlds get defaults from `css()`, light worlds from `lightCss()`. The accent is reserved for primary action, counts and timers. Block colors come from `PALETTE` unless the theme ships its own `palette` (Jouet does); every palette keeps 14 distinct colors, one per shape family.

## Typography
Baloo 2 everywhere (UI and display), Press Start 2P for the two pixel worlds with `scale: 0.62` so numbers fit. Both are bundled in `fonts/` for offline play. Score in the band: 0.56 x band height. Game-over score: 76px.

## Layout
HUD buttons row, then the score band right above the board (board-frame wide, 60px; 50px under 760px tall): record pennant on its left, score centered, Cubo standing on the frame at its right end, combo tag hung from its bottom edge. Tray pads are 2.7 cells tall. Bonus timers drain as a ring around their inventory button.

## Elevation & Depth
Plates and the board slab cast an offset shadow (y 5-8px, blur 14-20px), tinted on light worlds (`shadow`). Neon worlds (Espace, Arcade, Volcan) may glow.

Menus (React Native): no thick bottom edges. A surface on the background is raised by `raised()` (src/theme/elevation.ts): a soft shadow tinted with the theme ink on light worlds, black plus a hairline outline on dark worlds. A surface inside a card (`panel2`) is flat. Never a card inside a card.

## Shapes
Round and soft: pills for score and combo, 22px cards, board radius 18-26px, cells with 16-24% radius. Only Rétro goes square.

## Components
Menu building blocks live in `src/ui` and take every value from `src/theme/tokens.ts` (4 pt spacing grid, radii s/tile/card/pill, type scale display/title/headline/body/muted/caption/label, 44 pt touch targets): `Screen` + `ScreenHeader` (back, title, counters), `Card` (or `inset`), `ListRow`, `Segmented`, `Counter`, `StatTile`, `Toggle`, `Tap`, `SectionLabel`, `Button` (primary/secondary/ghost/danger, sizes m/s), `Sheet` + `SheetHeader`. `Text` re-centers Baloo 2 glyphs when a line height is tighter than the font's 1.6 em box (iOS otherwise draws them high). Theme menu colors keep muted text at 4.5:1 on bg/panel/panel2 and onAccent at 3:1 on accent.

- **Score band** (drawn with the theme's plate style): "SCORE" / "RECORD n" subline and the score, record pennant on the left. Variants: marquee bulbs (Arcade), mushroom-cap dots (Forêt).
- **Combo tag**: pill under the score with the grace dots.
- **HUD buttons**: `--panel` + `--plate-edge`.
- **Inventory buttons**: `--slot` tiles, accent count badge, conic timer ring when active.
- **Bonus icons** (drawn in `GLYPHS`): Toupie, Étoile, Bulle, Bombe, Tornade on a white badge ringed with their color.
- **Cards** (menu, game over, boutique, legend): `--panel` with `--card-edge`.
- **Boutique theme preview**: mini plate + board patch drawn with the real theme code.

## Motion and sound
- Toy feel: pieces pop, lines flash then shrink, blocks fall with gravity and bounce once on landing, the sea current slides a row with a small overshoot, asteroids and embers drop in from above, mushrooms grow.
- Gravity chains play as waves 430 ms apart, so each reaction reads on its own.
- `prefers-reduced-motion`: no shake, no falls, slides or drops (cells appear in place), banners fade instead of bouncing.
- Sounds are synthesized (WebAudio): xylophone / music-box plucks for clears, bonuses and stars, a wooden tok for placing, slide whistle for game over, filtered noise for cracks, whooshes and sizzles. Music is a soft pad with a music-box arpeggio.
- App icons: Jouet style (pink polka dots, white board, candy blocks), drawn by `tools/icons.html`, exported with `python3 tools/make_icons.py`.

## Do's and Don'ts
- Do draw every icon (canvas/SVG). Don't use emoji.
- Do keep blocks readable on every theme; backgrounds stay behind a mostly opaque board slab.
- Do add a theme as a complete world (all fields), priced in the Boutique.
- Don't let a theme change gameplay or layout geometry outside the Aventure mode.
- Don't use road or car imagery anymore; the road-trip identity was retired on 2026-09-30.
- Don't imitate any real game's characters, logos or sounds.
