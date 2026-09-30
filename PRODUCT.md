# Gridlock

## What it is
Casual 8x8 block puzzle (Block Blast family) with a bright, toy-like look. Drag pieces from a 3-slot tray onto the grid, clear rows and columns, chain combos. Timed and instant bonuses (Toupie, Étoile, Bulle, Bombe, Tornade) are collected into an inventory and fired by the player.

## Who plays, where
A French-speaking player killing time on a phone: at home, on holiday, on a trip. One hand, short sessions, bright daylight or a dark room, sometimes offline.

## Loop and retention
Score and record per mode; coins picked up on the grid and paid at game over; three daily missions; a Boutique of cosmetic items (block skins and world themes). Rewarded ad (stub) doubles a run's coins.

Aventure mode: a map of 8 worlds, 10 short levels each (goal + move budget, stars), each world with its own rule; beating a boss gives its theme.

Planned (see `docs/CLAUDE.md`): daily level with sharing, day streak, sticker album with monthly trophies, profile and stats.

## Constraints
- Web first (vanilla JS canvas, no build, offline PWA); React Native port planned. `src/logic.js` and `src/meta.js` stay pure.
- French UI copy.
- No emoji anywhere in the UI: icons are drawn (canvas or SVG).
- In Classique, Chrono, Chill and the daily level, cosmetics never change gameplay. World rules only apply inside Aventure.

## Brand commitments
- Playful, colorful, rounded, toy-like; inspired by console party games without copying any of them.
- Themes are whole worlds (the Aventure worlds), not recolors.
