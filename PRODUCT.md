# Cubo Blocks

## What it is
Casual 8x8 block puzzle (Block Blast family) with a bright, toy-like look. Drag pieces from a 3-slot tray onto the grid, clear rows and columns, chain combos. Timed and instant bonuses (Toupie, Étoile, Bulle, Bombe, Tornade) are collected into an inventory and fired by the player.

## Who plays, where
A French-speaking player killing time on a phone: at home, on holiday, on a trip. One hand, short sessions, bright daylight or a dark room, sometimes offline.

## Loop and retention
Score and record per mode; coins picked up on the grid and paid at game over; three daily missions; a Boutique of cosmetic items (block skins and world themes). Rewarded ad (stub) doubles a run's coins.

Aventure mode: a map of 8 worlds, 20 short levels each (goal + move budget, stars), each world with its own rule, a trial at level 10 and a boss fight at 20 (beating it gives its theme), star chests.

Daily level (same for everyone, 3 attempts, share text), day streak with freezes and rewards, sticker album with monthly trophies, Défis screen (today + calendar), missions reachable from the menu and in game, profile with album and stats.

Secret stickers in the album, per-mode stats with the last scores.

Planned (see `docs/CLAUDE.md`): polish, React Native port.

## Constraints
- Native app (React Native / Expo, Skia board), iOS first; the web version was dropped on 2026-10-06. `src/core/` stays pure.
- French UI copy.
- No emoji anywhere in the UI: icons are drawn (canvas or SVG).
- In Classique, Chrono, Chill and the daily level, cosmetics never change gameplay. World rules only apply inside Aventure.

## Comfort
Pause button in the HUD (the game also pauses when the app goes to the background). Settings: a mark per block color for color-blind players, and dark menu screens for the light themes (the game keeps its theme).

## Brand commitments
- Playful, colorful, rounded, toy-like; inspired by console party games without copying any of them.
- Themes are whole worlds (the Aventure worlds), not recolors.
