// Cubo Blocks — The game screen: one Skia canvas for the run, the dragged shape on the UI thread.
//
// Two pictures: the background (recorded once per size) and the run (board, tray, inventory, score
// band, effects), recorded on the JS thread only while something moves. The dragged shape (a piece,
// or the bomb) is its own picture inside a Group whose transform follows the finger on the UI
// thread, so it stays glued to the finger even when the JS thread is busy (see the spec, Rendering).
// The HUD buttons, the pause / missions / legend sheets and the end card are React Native.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { Canvas, Group, Picture, Skia, type SkPicture, type SkTypeface } from '@shopify/react-native-skia';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { L, M } from '../core';
import { locale, tr } from '../core/i18n';
import type { BonusType } from '../core/types';
import { useGame } from '../state/store';
import { today } from '../state/persist';
import { setRunOpen } from '../game/hub';
import { triesAfter } from '../game/daily';
import { ambientGap, anim, animating, TRASH_ARM_MS, type DragState } from '../game/anim';
import { cuboHit, cuboSpot } from '../mascot/state';
import { dragGeometry, easeOut, LIFT_MS } from '../game/drag';
import { dismissTip, hideTips, pumpTips, useTips } from '../game/tips';
import { endTutorial } from '../game/tutorial';
import { tutActive, tutor, useTut } from '../game/tut-state';
import { bonusLeft, hasInventory, trashView, undoView } from '../game/hud';
import { freeTray, hintDisabled, liftOrigin, spotAt } from '../game/puzzle';
import {
  bestOf, commit, discardPiece, enterRun, newRun, fireBonus, giveUpRun, hintPuzzle, liftPuzzlePiece, startPuzzle, startSurprise, liveRun, persistRun, quitRun, restartRun, rotateTray, restartCurrent,
  setAiming, setEndHandler, stepFlyers, syncBudget, tapCubo, tickRun, undoMove, useRunHud, type RunEnd,
} from '../game/run';
import { boardCellAt, computeLayout, invAt, miniCell, overTrash, slotAt, HUD_BTN, INV_TOP, type Layout } from '../render/layout';
import { G } from '../render/g';
import {
  drawAim, drawBanner, drawBoard, drawChrono, drawComboGlow, drawComboHang, drawFades, drawFlyers, drawFloaters, drawHint, drawHUD,
  drawInventory, drawMascot, drawParticles, drawPiece, drawRecordFlag, drawReturning, drawSweeps, drawTray, drawTrash, frameFx, ghostOf, paintBackground,
} from '../render/draw';
import { drawIcon } from '../render/icons';
import { useBaloo, usePixel } from '../render/font';
import { Ctx } from '../render/ctx2d';
import { drawTutorialCells, drawTutorialHand } from '../render/tutorial';
import { playedTheme, themeFor } from '../render/board-themes';
import { musicScene, sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import type { RootParams } from '../navigation/types';
import { radius, space } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { colorsFor, darkBg, PlayedTheme, useColors } from '../theme/useColors';
import { fonts } from '../theme/fonts';
import { ask, asking } from '../ui/dialog';
import { Icon } from '../ui/Icon';
import { LegendSheet } from '../ui/LegendSheet';
import { MissionsSheet } from '../ui/MissionsSheet';
import { PauseSheet } from '../ui/PauseSheet';
import { Text } from '../ui/Text';
import { TipBubble } from '../ui/TipBubble';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { Coin } from '../ui/Wallet';
import { GameOver } from './GameOver';
import { LevelEndCard, useLevelEnd } from './LevelEnd';
import { PuzzleEndCard, usePuzzleEnd } from './PuzzleEnd';

const now = () => performance.now();
const fmt = (n: number) => n.toLocaleString(locale());

// centered: the picture is drawn around (0, 0) (the dragged shape or bomb). Its bounds must then cover
// negative coordinates too: iOS drops a picture whose shadowed content (bonus icons) falls outside them.
function record(lay: Layout, typeface: SkTypeface | null, paint: (g: G) => void, pixel: SkTypeface | null = null, centered = false): SkPicture {
  const rec = Skia.PictureRecorder();
  const bounds = centered ? Skia.XYWHRect(-lay.W, -lay.H, lay.W * 2, lay.H * 2) : Skia.XYWHRect(0, 0, lay.W, lay.H);
  const g = new G(rec.beginRecording(bounds), typeface, pixel);
  paint(g);
  return rec.finishRecordingAsPicture();
}
const emptyPicture = () => {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
};
const nope = () => { sfx.nope(); haptic('nope'); };

type Gest = { kind: 'piece' | 'bomb' | 'aimtap' | 'inv'; id?: string; sx: number; sy: number };

// A HUD button in the top row (legacy .hud-btn).
function HudBtn({ right, label, onPress, disabled, children }: { right: number; label: string; onPress: () => void; disabled?: boolean; children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ position: 'absolute', top: insets.top + 12, right, width: HUD_BTN, height: HUD_BTN, borderRadius: radius.tile, backgroundColor: colors.panel,
        ...raised(colors, 'low'), alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      {children}
    </Pressable>
  );
}
// A count or price centered over a HUD button's top edge: the buttons sit 8 pt apart, so a badge on a
// corner ran into the next one's ("2/3" next to "Gratuit").
function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  const colors = useColors();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -9, left: -30, right: -30, alignItems: 'center' }}>
      <View style={{ minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 6, backgroundColor: color ?? colors.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 }}>
        {children}
      </View>
    </View>
  );
}

export function GameScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const typeface = useBaloo();
  const pixel = usePixel();
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const lay = useMemo(() => (size ? computeLayout({ ...size, safeTop: insets.top }) : null), [size, insets.top]);
  const [end, setEnd] = useState<RunEnd | null>(null);
  useEffect(() => { setEndHandler(setEnd); return () => setEndHandler(null); }, []);
  const [levelCard, setLevelCard] = useLevelEnd();
  const [puzzleCard, setPuzzleCard] = usePuzzleEnd();
  // A result card covers the game: tips wait (read by the frame loop).
  const cards = useRef(false);
  cards.current = !!(end || levelCard || puzzleCard);
  const tutOn = useTut((s) => s.tut !== null);

  const skin = useGame((s) => s.profile.equipped.blocks);
  const patterns = useGame((s) => s.saved.settings.patterns);
  const mascot = useGame((s) => s.saved.settings.mascot);
  const wear = useGame((s) => s.profile.equipped.cubo);
  const board = useGame((s) => s.profile.equipped.boards);
  // An Aventure level or a Mondes run wears its world's theme, a free run its own, else the equipped one.
  const played = useGame((s) => playedTheme(s.saved.state, board));
  const colors = useMemo(() => colorsFor(played), [played]);
  const th = useMemo(() => themeFor({ theme: played }, board, skin, patterns), [played, board, skin, patterns]);

  const background = useMemo(() => (lay ? record(lay, null, (g) => paintBackground(g, th, lay.W, lay.H)) : null), [lay, th]);
  const runPicture = useSharedValue<SkPicture>(emptyPicture());
  // Animated decor (clouds, bubbles, fireworks...): a third picture, redrawn at ~25 fps, drawn under the run.
  const decorPicture = useSharedValue<SkPicture>(emptyPicture());
  const lastDecor = useRef(0);

  // The dragged shape, on the UI thread: finger position, pick-up progress (0..1), its picture.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const liftK = useSharedValue(0);
  const lifted = useSharedValue(false);
  const lift = useSharedValue(0);
  const miniRatio = useSharedValue(0.5);
  // Where the dragged piece sits from the finger: a surprise piece picked up from the board keeps its grabbed cell under it.
  const offX = useSharedValue(0);
  const offY = useSharedValue(0);
  const dragPicture = useSharedValue<SkPicture>(emptyPicture());
  const dragTransform = useDerivedValue(() => {
    const k = liftK.value;
    return [{ translateX: dragX.value + offX.value }, { translateY: dragY.value + offY.value - lift.value * k }, { scale: miniRatio.value + (1 - miniRatio.value) * k }];
  });

  const drag = useRef<DragState | null>(null);
  const gest = useRef<Gest | null>(null);
  const dirty = useRef(true);
  const lastDrawn = useRef<unknown>(null);

  // ---------- sheets ----------
  const pauseRef = useRef<BottomSheetModal>(null);
  const missionsRef = useRef<BottomSheetModal>(null);
  const legendRef = useRef<BottomSheetModal>(null);
  const open = useRef(new Set<string>());
  const reopenPause = useRef(false);
  const track = (name: string) => ({
    onOpen: () => { dirty.current = true; open.current.add(name); if (name === 'pause') persistRun(); },
    onClose: () => { open.current.delete(name); dirty.current = true; },
  });
  // Timers (bonuses, clock) only run while actually playing.
  const blocked = () => open.current.size > 0 || asking() || AppState.currentState !== 'active';

  // ---------- frame loop ----------
  const lastDraw = useRef(0);
  const lastRaf = useRef(0);
  const acc = useRef(0);
  const frame = useCallback(() => {
    if (!lay) return;
    const t = now();
    acc.current += Math.min(50, t - lastRaf.current);
    lastRaf.current = t;
    const d = drag.current;
    const aim = anim.aiming;
    anim.mascot = mascot;
    if (d) { d.x = dragX.value; d.y = dragY.value; }
    if (aim && gest.current?.kind === 'bomb') {
      aim.x = dragX.value; aim.y = dragY.value;
      aim.cell = boardCellAt(lay, aim.x, aim.y - aim.lift);
    } else if (aim && gest.current?.kind === 'aimtap') aim.cell = boardCellAt(lay, dragX.value, dragY.value);
    let st = useGame.getState().saved.state;
    if (d && anim.trash) {
      const over = overTrash(lay, d.x, d.y);
      const tz = anim.trash;
      if (over !== tz.over) { tz.over = over; tz.since = t; tz.armed = false; }
      if (over && !tz.armed && t - tz.since >= TRASH_ARM_MS && !trashView(st, useGame.getState().profile.coins).broke) { tz.armed = true; haptic('arm'); }
    }
    // Timers: every frame while something moves, else 30 times a second.
    const tut = tutor();
    const busy = !!d || !!aim || animating(t);
    // A tip bubble takes the touches until it is closed: the clock and bonuses wait for it too.
    const tipUp = !!useTips.getState().shown;
    if (!blocked() && !tut && !tipUp && (busy || acc.current >= 33)) {
      syncBudget(t);
      tickRun(acc.current, t);
      acc.current = 0;
    } else if (blocked() || tipUp) acc.current = 0;
    stepFlyers(lay, t);
    if (th.animate && t - lastDecor.current >= 40) {
      lastDecor.current = t;
      const animate = th.animate;
      decorPicture.value = record(lay, null, (g) => animate(new Ctx(g), lay.W, lay.H, t));
    }
    st = useGame.getState().saved.state;
    pumpTips(blocked() || cards.current, st.over);
    // The tutorial's glow and hand move all the time.
    if (!dirty.current && st === lastDrawn.current && !d && !aim && !animating(t) && !(tut && !tut.ending)) {
      // Only decoration waves (pennant, combo glow, clock, Cubo breathing): half rate or less, and idle again once they are gone.
      const gap = ambientGap(st);
      if (!gap || t - lastDraw.current < gap) return;
    }
    dirty.current = false;
    lastDrawn.current = st;
    lastDraw.current = t;
    const dt = Math.min(0.05, (t - anim.lastT) / 1000);
    anim.lastT = t;
    const best = bestOf(st);
    const { coins, stock } = useGame.getState().profile;
    runPicture.value = record(lay, typeface, (g) => {
      g.face(th);
      drawHUD(g, th, lay, st, best, t);
      // Shake and punch move the board group only, not the band or the tray.
      const fx = frameFx(lay, t);
      g.save();
      g.translate(fx.sx, fx.sy);
      g.translate(fx.cx, fx.cy); g.scale(fx.zoom); g.translate(-fx.cx, -fx.cy);
      drawBoard(g, th, lay, st, ghostOf(lay, st, d, t), t);
      drawComboGlow(g, th, lay, st, t);
      if (tut) drawTutorialCells(g, th, lay, st, tut, t);
      drawFades(g, th, lay, t);
      drawSweeps(g, lay, t);
      drawAim(g, th, lay, st, t);
      g.restore();
      drawRecordFlag(g, th, lay, st, t);
      drawComboHang(g, th, lay, st, t, stock);
      drawMascot(g, th, lay, st, d, open.current.size > 0 || asking(), wear, t);
      drawTray(g, th, lay, st, d, t);
      drawChrono(g, th, lay, st, t);
      drawHint(g, th, lay, st, t, stock);
      if (anim.trash) drawTrash(g, th, lay, st, coins, t); else drawInventory(g, th, lay, st, t, stock);
      drawReturning(g, th, lay, st, t);
      drawParticles(g, t, dt);
      drawFloaters(g, th, lay, t);
      drawFlyers(g, lay, t);
      drawBanner(g, th, lay, t);
      if (tut) drawTutorialHand(g, th, lay, st, tut, d, t);
    }, pixel);
  }, [lay, typeface, pixel, th, mascot, wear, runPicture, dragX, dragY]);

  // Reduced motion (legacy calm()): no shake, punch, sweeps, confetti, wobble.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { anim.calm = v; }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { anim.calm = v; dirty.current = true; });
    return () => sub.remove();
  }, []);

  // Leaving the app mid-run pauses it, and saves the clock and timers.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') return;
      persistRun();
      if (tutActive()) return;
      const st = useGame.getState().saved.state;
      if (!st.over && (st.moves > 0 || st.clock > 0) && open.current.size === 0 && !asking()) pauseRef.current?.present();
    });
    return () => sub.remove();
  }, []);

  // Music: the played theme's song while the game is on screen (Paramètres opened from the pause keeps it).
  const focused = useRef(false);
  useEffect(() => { if (focused.current) musicScene(played); }, [played]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const { saved, profile } = useGame.getState();
    musicScene(playedTheme(saved.state, profile.equipped.boards));
    return () => { focused.current = false; if (!reopenPause.current) musicScene(null); };
  }, []));

  // Android back button on the board: opens the pause (a sheet on top closes itself first; a result
  // card waits for a choice).
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!cards.current && !tutActive() && open.current.size === 0 && !asking()) { sfx.turn(); setAiming(false); pauseRef.current?.present(); }
      return true;
    });
    return () => sub.remove();
  }, []));

  // Entering the screen starts (or resumes) the run once per focus. Kept apart from the frame
  // loop below, which restarts whenever frame changes (layout, font loaded): re-entering the run
  // there would reset the record the score band compares against.
  useFocusEffect(useCallback(() => {
    setRunOpen(true);
    const { state, prefs } = useGame.getState().saved;
    if (state.over) restartRun({ ...prefs, theme: state.theme });
    else enterRun();
    dirty.current = true;
    if (reopenPause.current) { reopenPause.current = false; setTimeout(() => pauseRef.current?.present(), 250); }
    return () => { setRunOpen(false); persistRun(); hideTips(); };
  }, []));
  useFocusEffect(useCallback(() => {
    dirty.current = true;
    lastRaf.current = now();
    let raf = 0;
    const loop = () => { frame(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frame]));
  useEffect(() => { dirty.current = true; decorPicture.value = emptyPicture(); }, [lay, typeface, pixel, th, mascot, wear, decorPicture]);

  // ---------- touch: pieces, bomb, inventory buttons ----------
  const onDown = useCallback((x: number, y: number) => {
    if (!lay || gest.current) return;
    dismissTip();
    const state = useGame.getState().saved.state;
    // Tap-aim mode: the next touch picks the cell, or cancels off the board.
    if (anim.aiming && !anim.aiming.drag) {
      if (!boardCellAt(lay, x, y)) { setAiming(false); dirty.current = true; return; }
      gest.current = { kind: 'aimtap', sx: x, sy: y };
      return;
    }
    if (mascot && !tutActive() && !drag.current && cuboHit(x, y, cuboSpot(lay, state))) { tapCubo(lay, th.id); dirty.current = true; return; }
    if (state.over) return;
    if (hasInventory(state) && !tutActive()) {
      const id = invAt(lay, x, y);
      if (id) {
        if (id === 'bomb') {
          if (!(bonusLeft(state, useGame.getState().profile.stock, 'bomb') > 0)) return;
          gest.current = { kind: 'bomb', sx: x, sy: y };
          setAiming({ drag: true, x, y, lift: lay.cell * 1.8 });
          sfx.pick();
          dragPicture.value = record(lay, typeface, (g) => drawIcon(g, 'bomb', 0, 0, lay.cell * 1.1), null, true);
          lift.value = lay.cell * 1.8;
          miniRatio.value = 1;
          liftK.value = 1;
        } else gest.current = { kind: 'inv', id, sx: x, sy: y };
        return;
      }
    }
    const free = freeTray(state);
    // Puzzle surprise: grabbing a placed piece picks it up where the finger holds it (legacy liftFromBoard).
    if (free) {
      const cell = boardCellAt(lay, x, y);
      const spot = cell && spotAt(state, cell[0], cell[1]);
      const slot = cell && spot ? liftPuzzlePiece(cell[0], cell[1]) : null;
      if (cell && spot && slot !== null) {
        const o = liftOrigin(spot.cells, spot.piece.w, spot.piece.h);
        drag.current = { idx: slot, x, y, lift: 0, t0: now() - 200, sx: x, sy: y, fromBoard: true, ox: lay.bx + o.cx * lay.cell - x, oy: lay.by + o.cy * lay.cell - y };
        gest.current = { kind: 'piece', sx: x, sy: y };
        dragPicture.value = record(lay, typeface, (g) => drawPiece(g, th, spot.piece, 0, 0, lay.cell), null, true);
        offX.value = drag.current.ox!;
        offY.value = drag.current.oy!;
        lift.value = 0;
        miniRatio.value = 1;
        liftK.value = 1;
        dirty.current = true;
        return;
      }
    }
    const idx = slotAt(lay, x, y, free);
    const piece = idx >= 0 ? state.tray[idx] : null;
    if (!piece || anim.returning.some((p) => p.idx === idx)) return;
    const l = lay.cell * 2.2;
    drag.current = { idx, x, y, lift: l, t0: now(), sx: x, sy: y };
    gest.current = { kind: 'piece', sx: x, sy: y };
    offX.value = 0;
    offY.value = 0;
    if (state.mode !== 'puzzle' && !tutActive()) anim.trash = { over: false, since: 0, armed: false };
    if (!L.canTurn(state)) sfx.pick();
    haptic('pick');
    dragPicture.value = record(lay, typeface, (g) => drawPiece(g, th, piece, 0, 0, lay.cell), null, true);
    lift.value = l;
    miniRatio.value = miniCell(lay, free) / lay.cell;
    liftK.value = 0;
    liftK.value = withTiming(1, { duration: LIFT_MS, easing: Easing.out(Easing.cubic) });
  }, [lay, typeface, th, mascot, dragPicture, lift, miniRatio, liftK, offX, offY]);

  const onUp = useCallback((x: number, y: number, released: boolean) => {
    const gs = gest.current;
    if (!lay || !gs) return;
    gest.current = null;
    dirty.current = true;
    const moved = Math.hypot(x - gs.sx, y - gs.sy) > 12;
    if (gs.kind === 'aimtap') {
      const cell = boardCellAt(lay, x, y);
      if (released && cell) { if (fireBonus(lay, 'bomb', { r: cell[0], c: cell[1] })) setAiming(false); else nope(); }
      return;
    }
    if (gs.kind === 'bomb') {
      dragPicture.value = emptyPicture();
      const aim = anim.aiming;
      if (!moved && released) { setAiming(true); return; }
      const cell = aim ? boardCellAt(lay, x, y - aim.lift) : null;
      setAiming(false);
      if (!released || !cell) return;
      if (!fireBonus(lay, 'bomb', { r: cell[0], c: cell[1] })) nope();
      return;
    }
    if (gs.kind === 'inv') {
      if (!released || moved) return;
      const state = useGame.getState().saved.state;
      if (gs.id === 'legend') { setAiming(false); legendRef.current?.present(); return; }
      if (state.over || !(bonusLeft(state, useGame.getState().profile.stock, gs.id as BonusType) > 0)) return;
      setAiming(false);
      fireBonus(lay, gs.id as 'rotate');
      return;
    }
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    dragPicture.value = emptyPicture();
    const bin = anim.trash;
    anim.trash = null;
    const state = useGame.getState().saved.state;
    const piece = state.tray[d.idx];
    if (!piece) return;
    const t = now();
    const g = dragGeometry(lay, state.board, piece, x + (d.ox || 0), y + (d.oy || 0), d.lift, easeOut((t - d.t0) / LIFT_MS), freeTray(state));
    const back = () => anim.returning.push({ idx: d.idx, x: g.cx, y: g.cy, size: g.size, t0: t });
    // Only a piece held over the bin until it armed gets thrown: a quick slip below the tray doesn't count.
    if (released && bin && bin.over && bin.armed) {
      if (!discardPiece(lay, d.idx, x, y)) { back(); nope(); }
      return;
    }
    const isTap = t - d.t0 - (d.fromBoard ? 200 : 0) < 280 && Math.hypot(x - d.sx, y - d.sy) < 12;
    // A tap on a piece just picked up from the board sends it back to the tray.
    if (isTap && d.fromBoard) { back(); return; }
    if (isTap && released && L.canTurn(state)) { rotateTray(d.idx); return; }
    if (g.valid && released && commit(lay, d.idx, g.row, g.col)) return;
    back();
    if (released) nope();
  }, [lay, dragPicture]);

  const pan = useMemo(() => Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => {
      lifted.value = false;
      dragX.value = e.x;
      dragY.value = e.y;
      scheduleOnRN(onDown, e.x, e.y);
    })
    .onUpdate((e) => {
      dragX.value = e.x;
      dragY.value = e.y;
    })
    // A very quick tap ends before the pan activates (success false): the finger lifting still counts as a release.
    .onTouchesUp(() => { lifted.value = true; })
    .onFinalize((e, success) => {
      scheduleOnRN(onUp, e.x, e.y, success || lifted.value);
    }), [onDown, onUp, dragX, dragY, lifted]);

  // ---------- HUD ----------
  const coins = useGame((s) => s.profile.coins);
  const pending = useRunHud((s) => s.pending);
  const bump = useRunHud((s) => s.bump);
  const aiming = useRunHud((s) => s.aiming);
  const stuck = useGame((s) => s.saved.state.stuck && !s.saved.state.over);
  const puzzle = useGame((s) => s.saved.state.mode === 'puzzle');
  const hintOff = useGame((s) => hintDisabled(s.saved.state, s.profile.coins));
  const undoDisabled = useGame((s) => undoView(s.saved.state).disabled);
  const undoCost = useGame((s) => undoView(s.saved.state).cost);
  const undoBadge = useGame((s) => undoView(s.saved.state).badge);
  const missionsDone = useGame((s) => M.missionStatus(s.profile, liveRun(s.saved.state)).filter((m) => m.done).length);
  const walletScale = useSharedValue(1);
  useEffect(() => { if (bump) walletScale.value = withSequence(withTiming(1.25, { duration: 120 }), withTiming(1, { duration: 200 })); }, [bump, walletScale]);
  const walletStyle = useAnimatedStyle(() => ({ transform: [{ scale: walletScale.value }] }));

  const goShop = () => { sfx.turn(); persistRun(); nav.navigate('Tabs', { screen: 'Shop' }); };
  const leave = () => { persistRun(); nav.goBack(); };
  const confirmRestart = async () => {
    const st = useGame.getState().saved.state;
    const { profile } = useGame.getState();
    const after = st.stage && st.stage.daily ? triesAfter(profile, st, st.stage.daily, today()) : Infinity;
    const text = Number.isFinite(after) ? tr`Cet essai compte : il t’en restera ${after}. Les pièces gagnées sont gardées.` : tr('La partie reprend depuis le début. Les pièces gagnées sont gardées.');
    if (st.moves > 0 && !st.over && !(await ask({ title: tr('Recommencer ?'), text, ok: tr('Recommencer'), danger: true }))) return;
    pauseRef.current?.dismiss();
    setEnd(null);
    setLevelCard(null);
    setPuzzleCard(null);
    if (!restartCurrent()) { nope(); return; }
    dirty.current = true;
  };
  const confirmQuit = async () => {
    const run = useGame.getState().saved.state;
    const st = run.stage;
    const text = run.puzzle ? tr('Tu retournes aux puzzles. Ta progression sur ce dessin est perdue.') : st && st.daily ? tr('Le niveau compte comme raté et cet essai est utilisé. Les pièces gagnées sont gardées.')
      : st ? tr('Le niveau compte comme raté. Les pièces gagnées sont gardées.')
        : tr('La partie s’arrête ici : ton score compte. Les pièces gagnées sont gardées.');
    if (!(await ask({ title: tr('Quitter la partie ?'), text, ok: tr('Quitter'), danger: true }))) return;
    pauseRef.current?.dismiss();
    if (run.puzzle) { toPuzzles(true); return; }
    quitRun();
    dirty.current = true;
  };
  const again = useCallback(() => {
    setEnd(null);
    setLevelCard(null);
    if (!restartCurrent()) nope();
    dirty.current = true;
  }, [setLevelCard]);

  // Back to the Aventure screen, on a world (and its level sheet): the screen below the game, else in its place.
  const toMap = (p: { world: string; level?: number }) => {
    persistRun();
    setLevelCard(null);
    if (nav.getState().routes.some((r) => r.name === 'Adventure')) nav.popTo('Adventure', p);
    else nav.replace('Adventure', p);
  };

  // Back to the event screen, optionally opening the next level's sheet.
  const toEvent = (id: string, level?: number) => {
    persistRun();
    setLevelCard(null);
    if (nav.getState().routes.some((r) => r.name === 'Event')) nav.popTo('Event', { id, level });
    else nav.replace('Event', { id, level });
  };

  // Back to the Puzzles list (under the game when it was started from there). drop: the puzzle is abandoned without a result.
  const toPuzzles = (drop = false) => {
    if (drop) {
      const { saved, setSaved } = useGame.getState();
      setSaved({ ...saved, state: { ...saved.state, over: true, quit: true } });
    } else persistRun();
    setPuzzleCard(null);
    if (nav.getState().routes.some((r) => r.name === 'Puzzles')) nav.popTo('Puzzles');
    else nav.replace('Puzzles');
  };
  // End of the tutorial (skip or "Continuer"): the home menu over a fresh board, or the run that was going on.
  const leaveTutorial = () => {
    sfx.turn();
    const prefs = useGame.getState().saved.prefs;
    endTutorial(() => newRun(prefs));
    dirty.current = true;
    nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }));
  };
  const onLayout = (e: LayoutChangeEvent) => setSize({ W: e.nativeEvent.layout.width, H: e.nativeEvent.layout.height });
  const top = insets.top + 12;

  return (
    <PlayedTheme value={played}>
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      {/* While the board is on screen: status bar text for the played theme, Android button bar hidden
          (a swipe from the bottom shows it). */}
      {isFocused && <StatusBar style={darkBg(th.base) ? 'light' : 'dark'} />}
      {isFocused && Platform.OS === 'android' && <NavigationBar hidden />}
      {lay && background && (
        <GestureDetector gesture={pan}>
          <Canvas style={{ flex: 1 }}>
            <Picture picture={background} />
            <Picture picture={decorPicture} />
            <Picture picture={runPicture} />
            <Group transform={dragTransform}>
              <Picture picture={dragPicture} />
            </Group>
          </Canvas>
        </GestureDetector>
      )}
      {!tutOn && <Animated.View style={[{ position: 'absolute', top, left: space.l }, walletStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Pièces : ouvrir la Boutique')} onPress={goShop}
          style={{ height: HUD_BTN, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: radius.tile, backgroundColor: colors.panel, ...raised(colors, 'low') }}>
          <Coin size={18} />
          <Text style={{ fontFamily: fonts.display, fontSize: 21, lineHeight: 26 }}>{fmt(coins)}</Text>
          {pending > 0 && <Text style={{ color: colors.good, fontSize: 16 }}>+{pending}</Text>}
        </Pressable>
      </Animated.View>}
      {!tutOn && <>
      <HudBtn right={16} label={tr('Pause')} onPress={() => { sfx.turn(); setAiming(false); pauseRef.current?.present(); }}>
        <Icon name="pause" size={20} color={colors.text} />
      </HudBtn>
      <HudBtn right={66} label={tr('Annuler le dernier coup')} disabled={undoDisabled} onPress={() => { setAiming(false); if (!lay || !undoMove(lay)) nope(); dirty.current = true; }}>
        <Icon name="undo" size={20} color={colors.text} />
        {!undoDisabled && (
          <Badge>
            <Text style={{ color: '#fff', fontSize: 13, lineHeight: 17 }}>{undoBadge}</Text>
            {undoCost > 0 && <Coin size={11} />}
          </Badge>
        )}
      </HudBtn>
      <HudBtn right={116} label={tr('Missions du jour')} onPress={() => { setAiming(false); missionsRef.current?.present(); }}>
        <Icon name="target" size={20} color={colors.text} />
        {missionsDone > 0 && <Badge color={colors.good}><Text style={{ color: '#fff', fontSize: 13, lineHeight: 17 }}>{missionsDone}/3</Text></Badge>}
      </HudBtn>
      </>}
      {lay && !tutOn && stuck && !aiming && !puzzle && (
        <Pressable accessibilityRole="button" onPress={() => { giveUpRun(); dirty.current = true; }}
          style={({ pressed }) => ({ position: 'absolute', left: lay.W / 2 - 110, width: 220, top: lay.ty + lay.trayH / 2 - 25, height: 50, borderRadius: radius.card, backgroundColor: colors.panel, ...raised(colors), alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <Text variant="title" style={{ fontSize: 20, textTransform: 'uppercase' }}>{tr('Terminer la partie')}</Text>
        </Pressable>
      )}
      {lay && !tutOn && puzzle && (
        <Pressable
          accessibilityRole="button" accessibilityLabel={tr`Indice pour ${M.PUZZLE_HINT} pièces`} accessibilityState={{ disabled: hintOff }}
          onPress={() => { if (!lay || !hintPuzzle(lay)) nope(); dirty.current = true; }}
          style={({ pressed }) => ({ position: 'absolute', left: lay.W / 2 - 62, width: 124, justifyContent: 'center', top: lay.ty + lay.trayH + INV_TOP, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.panel, ...raised(colors, 'low'), opacity: hintOff ? 0.45 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
          <Text variant="title" style={{ fontSize: 19, lineHeight: 24 }}>{tr('Indice')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: 16, color: colors.muted }}>{M.PUZZLE_HINT}</Text><Coin size={15} />
          </View>
        </Pressable>
      )}
      <PauseSheet
        ref={pauseRef}
        {...track('pause')}
        onRestart={confirmRestart}
        onSettings={() => { reopenPause.current = true; pauseRef.current?.dismiss(); nav.navigate('Settings', { from: 'pause' }); }}
        onMenu={() => { pauseRef.current?.dismiss(); leave(); }}
        onQuit={confirmQuit}
      />
      <MissionsSheet ref={missionsRef} {...track('missions')} />
      <LegendSheet ref={legendRef} {...track('legend')} />
      {levelCard && (
        <LevelEndCard card={levelCard} lay={lay} onMap={(world) => toMap({ world })} onAgain={again} onRevived={() => { setLevelCard(null); dirty.current = true; }} onMenu={() => { setLevelCard(null); leave(); }}
          onNext={([world, level]) => toMap(level === 1 && world !== levelCard.end.stage.world ? { world } : { world, level })}
          onEvent={toEvent} />
      )}
      {puzzleCard && (
        <PuzzleEndCard card={puzzleCard} onList={() => toPuzzles()}
          onMore={() => { setPuzzleCard(null); startSurprise(); dirty.current = true; }}
          onAgain={() => { setPuzzleCard(null); restartCurrent(); dirty.current = true; }}
          onNext={(n) => { setPuzzleCard(null); startPuzzle(n); dirty.current = true; }} />
      )}
      {lay && <TipBubble lay={lay} safeTop={insets.top} />}
      <TutorialOverlay onEnd={leaveTutorial} />
      {end && <GameOver end={end} onAgain={again} onMenu={() => { setEnd(null); leave(); }} />}
    </View>
    </PlayedTheme>
  );
}
