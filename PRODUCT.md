# Gridlock

## What it is
Casual 8x8 block puzzle (Block Blast family) with a road-trip theme. Drag pieces from a 3-slot tray onto the grid, clear rows and columns, chain combos. Timed and instant bonuses (Volant, Nitro, Régulateur, Bombe, Déviation) are collected into an inventory and fired by the player.

## Who plays, where
A French-speaking player killing time on a phone, often as a passenger on a long drive: one hand, short sessions, bright daylight or a dark car at night, sometimes offline.

## Loop and retention
Score and record per run; coins picked up on the grid and paid at game over; three fixed daily missions; a Boutique of cosmetic items only (block skins and full visual themes). Rewarded ad (stub) doubles a run's coins.

## Constraints
- Web first (vanilla JS canvas, no build, offline PWA); React Native port planned. `src/logic.js` and `src/meta.js` stay pure.
- French UI copy.
- No emoji anywhere in the UI: icons are drawn (canvas or SVG).
- Cosmetics never change gameplay.

## Brand commitments
- Road world: signage, road markings, dashboards, road-trip landscapes.
- Themes are whole worlds unlocked in the Boutique, not recolors.
