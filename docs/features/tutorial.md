# Tutorial and tips
Status: shipped

## What it does
- **Guided first game**: 3 scripted steps (drag a piece anywhere, fill a column, two clears in a row for combo x2). A hand drags a ghost of the piece to glowing target cells; a coach card replaces the HUD. Steps 2-3 refuse a move that clears nothing ("Vise les cases qui brillent."). Ends on a "Bien joué !" card ("Continuer"), then the home tabs over a fresh board. "Passer" skips it the same way.
- Runs at launch for new players only (`M.needsTutorial` checked in `App.tsx`: no games, no stars, not seen). Replay: Réglages > "Revoir le tutoriel"; a run in progress is restored afterwards (behind the menu).
- **One-time tips**: a dark bubble pointing at the relevant button, shown the first time: a bonus is collected (`bonus`), coins are collected (`coins`), the player is stuck with a rescue available (`stuck`), a Chrono / Chill / Aventure / daily game starts (`chrono`, `chill`, `adventure`, `daily`). Tap it (or the board) to close. Hidden under overlays, dropped on game over or when the menu opens (a dropped tip was never marked seen, so it comes back later).

## Files
- `src/core/tutorial.ts` (pure): `STEPS`, `lesson(i)` builds the step state on `logic.createGame`, `accepts`, `afterMove` (empties the used slot, no refill), `done`, `targets`.
- `src/core/meta.ts`: `tipSeen`, `markTip`, `needsTutorial`.
- Tutorial: `src/game/tutorial.ts` (`startTutorial`, `tutorialMoved`, `endTutorial`), `src/game/tut-state.ts` (`tutActive`), `src/game/tutorial-geom.ts`, `src/render/tutorial.ts` (glow and hand), `src/ui/TutorialOverlay.tsx` (coach card, Passer, end card), hooks in `src/game/run.ts` and `src/screens/GameScreen.tsx`.
- Tips: `src/game/tips.ts` (`collectTips`, `modeTips`, `stuckTip`, queue), `src/game/tip-place.ts` (bubble position), `src/ui/TipBubble.tsx`; queued from `src/game/run.ts`, marked seen when shown.
- Replay: `src/screens/SettingsScreen.tsx` (Revoir le tutoriel).
- Tests: `src/core/tutorial.test.ts`, `src/game/tutorial-geom.test.ts`, `src/game/tip-place.test.ts`.

## Saved state
`profile.tips = { tutorial: true, bonus: true, ... }`, optional, read with defaults (no migration). The tutorial board itself is never saved (`setSaved` in `src/state/store.ts` skips while `tutActive()`) and never counts for missions, records or stats.

## Gotchas
- Changing a step: the test plays each piece on its suggested spot and checks it clears; keep the lines of the combo step independent so both orders work.
- The hand ends `2.2 * cell` below the target on touch screens, matching the drag lift, so copying the gesture lands the piece right.
