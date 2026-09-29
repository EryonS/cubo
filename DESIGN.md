---
name: Gridlock
description: Road-trip block puzzle; every theme is a piece of road signage or car interior.
colors:
  asphalt: "#16181c"
  asphalt-slab: "#1f2227"
  asphalt-cell: "#2a2d33"
  autoroute-blue: "#1f4fa3"
  autoroute-blue-deep: "#173e83"
  sign-white: "#ffffff"
  works-yellow: "#ffc400"
  good: "#5ee08a"
  danger: "#ff6b5e"
typography:
  display:
    fontFamily: "\"DIN Condensed\", \"DIN Alternate\", \"Roboto Condensed\", \"Arial Narrow\", sans-serif"
    fontWeight: 700
    letterSpacing: "0.03em"
  ui:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 800
rounded:
  plate: "14px"
  card: "22px"
  tag: "6px"
components:
  score-sign:
    backgroundColor: "{colors.autoroute-blue}"
    textColor: "{colors.sign-white}"
    rounded: "{rounded.plate}"
    height: "72px"
  combo-tag:
    backgroundColor: "{colors.works-yellow}"
    textColor: "{colors.asphalt}"
    rounded: "{rounded.tag}"
    height: "25px"
  button-primary:
    backgroundColor: "{colors.works-yellow}"
    textColor: "{colors.asphalt}"
    typography: "{typography.display}"
  card:
    backgroundColor: "{colors.autoroute-blue}"
    textColor: "{colors.sign-white}"
    rounded: "{rounded.card}"
---

## Overview
Every screen is road furniture. The default theme, **Autoroute**, reads as a French motorway: asphalt ground with grain, a scrolling lane dash on the right edge, a blue motorway sign for the score, and a yellow roadworks "panonceau" hung under it for the combo. Menus are big blue signs with the white inset border. The blocks stay the bright, candy-colored stars; the world around them is signage.

Themes are whole worlds sold in the Boutique (`SKINS.boards` in `src/meta.js`, visuals in `THEMES` in `src/main.js`). Each theme defines: background paint/animation, board frame, empty cell, score plate, combo tag, canvas display font, and the CSS variables that skin every DOM menu. A new theme must define all of them.

| id | Name | Material | Display face | Signature |
|---|---|---|---|---|
| night | Autoroute | asphalt, blue sign, yellow works sign | DIN Condensed | lane dash scrolling |
| sunset | Coucher de soleil | synthwave sky, neon pink tube | Futura italic | glowing plate |
| desert | Route 66 | motel sign, turquoise + rust | Rockwell | chasing marquee bulbs |
| mountain | Col de montagne | French brown tourist sign, alpine night | Avenir Next Condensed | snow peaks |
| dash | Tableau de bord | instrument cluster, chrome bezel, amber | DIN Alternate | odometer drums roll the score |

## Colors
Tokens above are the Autoroute theme. Per-theme values live in each theme's `css` map (`--bg`, `--panel`, `--panel-2`, `--slot`, `--text`, `--muted`, `--accent`, `--on-accent`, `--good`, `--edge`, `--radius`, `--card-edge`, `--plate-edge`). The accent is always the theme's "attention sign" color (works yellow, sun yellow, mustard, ice, amber) and is reserved for primary action, combo, counts and timers. Block colors (`PALETTE`) are shared by all themes and never change with the theme.

## Typography
Two faces: the theme's display face (system fonts only, so it works offline) for numbers, titles, buttons and tabs, always uppercase in buttons/tabs; a rounded system UI face for running text (mission descriptions, legend, labels). Score on the sign: 0.64 x plate height. Game-over score: 76px.

## Layout
Tall screens: HUD buttons row, then score sign + combo tag sitting right above the board. Screens under 760px tall: the sign moves up between the wallet and the restart button to give the board its room. Bonus timers are not in the header: they drain as a ring around their inventory button.

## Elevation & Depth
Plates and the board slab cast an offset shadow (y 5-8px, blur 14-20px). Neon themes may glow; others never use zero-offset halos.

## Shapes
Signs use an inner border inset from the edge (white on Autoroute/Col, cream on Route 66, chrome on Tableau de bord). Radii come from `--radius` per theme: squarer for signage, rounder for synthwave and dashboard.

## Components
- **Score sign**: plate with "RECORD n" subline and the score; odometer variant for the dashboard.
- **Combo tag**: small sign under the score with the grace dots.
- **HUD buttons**: small plates (`--panel` + `--plate-edge`).
- **Inventory buttons**: `--slot` tiles, accent count badge, conic timer ring when active.
- **Cards** (game over, boutique, legend): `--panel` with `--card-edge`; Route 66 adds a dotted bulb outline.
- **Boutique theme preview**: mini sign + board patch drawn with the real theme code.

## Do's and Don'ts
- Do draw every icon (canvas/SVG). Don't use emoji.
- Do keep blocks readable on every theme; backgrounds stay behind a mostly opaque board slab.
- Do add a theme as a complete world (all fields), priced in the Boutique.
- Don't let a theme change gameplay or layout geometry.
- Don't load web fonts; the game must work offline.
