// Cubo Blocks — The game screen: one Skia canvas for the run, the dragged shape on the UI thread.
//
// Two pictures: the background (recorded once per size) and the run (board, tray, inventory, score
// band, effects), recorded on the JS thread only while something moves. The dragged shape (a piece,
// or the bomb) is its own picture inside a Group whose transform follows the finger on the UI
// thread, so it stays glued to the finger even when the JS thread is busy (see the spec, Rendering).
// The HUD buttons, the pause / missions / legend sheets and the end card are React Native.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Group, Picture, Skia, type SkPicture, type SkTypeface } from '@shopify/react-native-skia';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { L, M } from '../core';
import { locale, tr } from '../core/i18n';
import { useGame } from '../state/store';
import { ambient, anim, animating, TRASH_ARM_MS, type DragState } from '../game/anim';
import { dragGeometry, easeOut, LIFT_MS } from '../game/drag';
import { hasInventory, trashView, undoView } from '../game/hud';
import {
  bestOf, commit, discardPiece, enterRun, fireBonus, giveUpRun, liveRun, persistRun, quitRun, restartRun, rotateTray,
  setAiming, setEndHandler, stepFlyers, syncBudget, tickRun, undoMove, useRunHud, type RunEnd,
} from '../game/run';
import { boardCellAt, computeLayout, invAt, miniCell, overTrash, slotAt, HUD_BTN, type Layout } from '../render/layout';
import { G } from '../render/g';
import {
  drawAim, drawBanner, drawBoard, drawChrono, drawComboGlow, drawComboHang, drawFades, drawFlyers, drawFloaters, drawHint, drawHUD,
  drawInventory, drawParticles, drawPiece, drawRecordFlag, drawReturning, drawSweeps, drawTray, drawTrash, frameFx, ghostOf, paintBackground,
} from '../render/draw';
import { drawIcon } from '../render/icons';
import { useBaloo } from '../render/font';
import { themeFor } from '../render/theme';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import type { RootParams } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';
import { fonts } from '../theme/fonts';
import { ask, asking } from '../ui/dialog';
import { Icon } from '../ui/Icon';
import { LegendSheet } from '../ui/LegendSheet';
import { MissionsSheet } from '../ui/MissionsSheet';
import { PauseSheet } from '../ui/PauseSheet';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';
import { GameOver } from './GameOver';

const now = () => performance.now();
const fmt = (n: number) => n.toLocaleString(locale());

function record(lay: Layout, typeface: SkTypeface | null, paint: (g: G) => void): SkPicture {
  const rec = Skia.PictureRecorder();
  const g = new G(rec.beginRecording(Skia.XYWHRect(0, 0, lay.W, lay.H)), typeface);
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
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ position: 'absolute', top: insets.top + 12, right, width: HUD_BTN, height: HUD_BTN, borderRadius: radius.card - 4, backgroundColor: colors.panel,
        borderBottomWidth: 3, borderBottomColor: colors.edge, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      {children}
    </Pressable>
  );
}
function Badge({ children, color = colors.accent }: { children: React.ReactNode; color?: string }) {
  return (
    <View style={{ position: 'absolute', top: -6, right: -8, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 6, backgroundColor: color, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 }}>
      {children}
    </View>
  );
}

export function GameScreen() {
  const nav = useNavigation<NavigationProp<RootParams>>();
  const insets = useSafeAreaInsets();
  const typeface = useBaloo();
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const lay = useMemo(() => (size ? computeLayout({ ...size, safeTop: insets.top }) : null), [size, insets.top]);
  const [end, setEnd] = useState<RunEnd | null>(null);
  useEffect(() => { setEndHandler(setEnd); return () => setEndHandler(null); }, []);

  const skin = useGame((s) => s.profile.equipped.blocks);
  const patterns = useGame((s) => s.saved.settings.patterns);
  const th = useMemo(() => themeFor(skin, patterns), [skin, patterns]);

  const background = useMemo(() => (lay ? record(lay, null, (g) => paintBackground(g, th, lay.W, lay.H)) : null), [lay, th]);
  const runPicture = useSharedValue<SkPicture>(emptyPicture());

  // The dragged shape, on the UI thread: finger position, pick-up progress (0..1), its picture.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const liftK = useSharedValue(0);
  const lift = useSharedValue(0);
  const miniRatio = useSharedValue(0.5);
  const dragPicture = useSharedValue<SkPicture>(emptyPicture());
  const dragTransform = useDerivedValue(() => {
    const k = liftK.value;
    return [{ translateX: dragX.value }, { translateY: dragY.value - lift.value * k }, { scale: miniRatio.value + (1 - miniRatio.value) * k }];
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
    onOpen: () => { open.current.add(name); if (name === 'pause') persistRun(); },
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
    const busy = !!d || !!aim || animating(t);
    if (!blocked() && (busy || acc.current >= 33)) {
      syncBudget(t);
      tickRun(acc.current, t);
      acc.current = 0;
    } else if (blocked()) acc.current = 0;
    stepFlyers(lay, t);
    st = useGame.getState().saved.state;
    if (!dirty.current && st === lastDrawn.current && !d && !aim && !animating(t)) {
      // Only decoration waves (pennant, combo glow, clock): half rate, and idle again once they are gone.
      if (!ambient(st) || t - lastDraw.current < 33) return;
    }
    dirty.current = false;
    lastDrawn.current = st;
    lastDraw.current = t;
    const dt = Math.min(0.05, (t - anim.lastT) / 1000);
    anim.lastT = t;
    const best = bestOf(st);
    const coins = useGame.getState().profile.coins;
    runPicture.value = record(lay, typeface, (g) => {
      drawHUD(g, th, lay, st, best, t);
      // Shake and punch move the board group only, not the band or the tray.
      const fx = frameFx(lay, t);
      g.save();
      g.translate(fx.sx, fx.sy);
      g.translate(fx.cx, fx.cy); g.scale(fx.zoom); g.translate(-fx.cx, -fx.cy);
      drawBoard(g, th, lay, st, ghostOf(lay, st, d, t), t);
      drawComboGlow(g, th, lay, st, t);
      drawFades(g, th, lay, t);
      drawSweeps(g, lay, t);
      drawAim(g, th, lay, st, t);
      g.restore();
      drawRecordFlag(g, th, lay, st, t);
      drawComboHang(g, th, lay, st, t);
      drawTray(g, th, lay, st, d, t);
      drawChrono(g, th, lay, st, t);
      drawHint(g, th, lay, st, t);
      if (anim.trash) drawTrash(g, th, lay, st, coins, t); else drawInventory(g, th, lay, st, t);
      drawReturning(g, th, lay, st, t);
      drawParticles(g, t, dt);
      drawFloaters(g, th, lay, t);
      drawFlyers(g, lay, t);
      drawBanner(g, th, lay, t);
    });
  }, [lay, typeface, th, runPicture, dragX, dragY]);

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
      const st = useGame.getState().saved.state;
      if (!st.over && (st.moves > 0 || st.clock > 0) && open.current.size === 0 && !asking()) pauseRef.current?.present();
    });
    return () => sub.remove();
  }, []);

  // Entering the screen starts (or resumes) the run once per focus. Kept apart from the frame
  // loop below, which restarts whenever frame changes (layout, font loaded): re-entering the run
  // there would reset the record the score band compares against.
  useFocusEffect(useCallback(() => {
    const { state, prefs } = useGame.getState().saved;
    if (state.over) restartRun(prefs);
    else enterRun();
    dirty.current = true;
    if (reopenPause.current) { reopenPause.current = false; setTimeout(() => pauseRef.current?.present(), 250); }
    return () => { persistRun(); };
  }, []));
  useFocusEffect(useCallback(() => {
    dirty.current = true;
    lastRaf.current = now();
    let raf = 0;
    const loop = () => { frame(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frame]));
  useEffect(() => { dirty.current = true; }, [lay, typeface, th]);

  // ---------- touch: pieces, bomb, inventory buttons ----------
  const onDown = useCallback((x: number, y: number) => {
    if (!lay || gest.current) return;
    const state = useGame.getState().saved.state;
    // Tap-aim mode: the next touch picks the cell, or cancels off the board.
    if (anim.aiming && !anim.aiming.drag) {
      if (!boardCellAt(lay, x, y)) { setAiming(false); dirty.current = true; return; }
      gest.current = { kind: 'aimtap', sx: x, sy: y };
      return;
    }
    if (state.over) return;
    if (hasInventory(state)) {
      const id = invAt(lay, x, y);
      if (id) {
        if (id === 'bomb') {
          if (!(state.inventory.bomb > 0)) return;
          gest.current = { kind: 'bomb', sx: x, sy: y };
          setAiming({ drag: true, x, y, lift: lay.cell * 1.8 });
          sfx.pick();
          dragPicture.value = record(lay, typeface, (g) => drawIcon(g, 'bomb', 0, 0, lay.cell * 1.1));
          lift.value = lay.cell * 1.8;
          miniRatio.value = 1;
          liftK.value = 1;
        } else gest.current = { kind: 'inv', id, sx: x, sy: y };
        return;
      }
    }
    const idx = slotAt(lay, x, y);
    const piece = idx >= 0 ? state.tray[idx] : null;
    if (!piece || anim.returning.some((p) => p.idx === idx)) return;
    const l = lay.cell * 2.2;
    drag.current = { idx, x, y, lift: l, t0: now(), sx: x, sy: y };
    gest.current = { kind: 'piece', sx: x, sy: y };
    if (state.mode !== 'puzzle') anim.trash = { over: false, since: 0, armed: false };
    if (!L.canTurn(state)) sfx.pick();
    haptic('pick');
    dragPicture.value = record(lay, typeface, (g) => drawPiece(g, th, piece, 0, 0, lay.cell));
    lift.value = l;
    miniRatio.value = miniCell(lay) / lay.cell;
    liftK.value = 0;
    liftK.value = withTiming(1, { duration: LIFT_MS, easing: Easing.out(Easing.cubic) });
  }, [lay, typeface, th, dragPicture, lift, miniRatio, liftK]);

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
      if (state.over || !(state.inventory[gs.id as keyof typeof state.inventory] > 0)) return;
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
    const g = dragGeometry(lay, state.board, piece, x, y, d.lift, easeOut((t - d.t0) / LIFT_MS));
    const back = () => anim.returning.push({ idx: d.idx, x: g.cx, y: g.cy, size: g.size, t0: t });
    // Only a piece held over the bin until it armed gets thrown: a quick slip below the tray doesn't count.
    if (released && bin && bin.over && bin.armed) {
      if (!discardPiece(lay, d.idx, x, y)) { back(); nope(); }
      return;
    }
    const isTap = t - d.t0 < 280 && Math.hypot(x - d.sx, y - d.sy) < 12;
    if (isTap && released && L.canTurn(state)) { rotateTray(d.idx); return; }
    if (g.valid && released && commit(lay, d.idx, g.row, g.col)) return;
    back();
    if (released) nope();
  }, [lay, dragPicture]);

  const pan = useMemo(() => Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => {
      dragX.value = e.x;
      dragY.value = e.y;
      scheduleOnRN(onDown, e.x, e.y);
    })
    .onUpdate((e) => {
      dragX.value = e.x;
      dragY.value = e.y;
    })
    .onFinalize((e, success) => {
      scheduleOnRN(onUp, e.x, e.y, success);
    }), [onDown, onUp, dragX, dragY]);

  // ---------- HUD ----------
  const coins = useGame((s) => s.profile.coins);
  const pending = useRunHud((s) => s.pending);
  const bump = useRunHud((s) => s.bump);
  const aiming = useRunHud((s) => s.aiming);
  const stuck = useGame((s) => s.saved.state.stuck && !s.saved.state.over);
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
    const text = tr('La partie reprend depuis le début. Les pièces gagnées sont gardées.');
    if (st.moves > 0 && !st.over && !(await ask({ title: tr('Recommencer ?'), text, ok: tr('Recommencer'), danger: true }))) return;
    pauseRef.current?.dismiss();
    setEnd(null);
    restartRun({ mode: st.mode, level: st.level });
    dirty.current = true;
  };
  const confirmQuit = async () => {
    const text = tr('La partie s’arrête ici : ton score compte. Les pièces gagnées sont gardées.');
    if (!(await ask({ title: tr('Quitter la partie ?'), text, ok: tr('Quitter'), danger: true }))) return;
    pauseRef.current?.dismiss();
    quitRun();
    dirty.current = true;
  };
  const again = useCallback(() => {
    const st = useGame.getState().saved.state;
    setEnd(null);
    restartRun({ mode: st.mode, level: st.level });
    dirty.current = true;
  }, []);

  const onLayout = (e: LayoutChangeEvent) => setSize({ W: e.nativeEvent.layout.width, H: e.nativeEvent.layout.height });
  const top = insets.top + 12;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      {lay && background && (
        <GestureDetector gesture={pan}>
          <Canvas style={{ flex: 1 }}>
            <Picture picture={background} />
            <Picture picture={runPicture} />
            <Group transform={dragTransform}>
              <Picture picture={dragPicture} />
            </Group>
          </Canvas>
        </GestureDetector>
      )}
      <Animated.View style={[{ position: 'absolute', top, left: space.l }, walletStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Pièces : ouvrir la Boutique')} onPress={goShop}
          style={{ height: HUD_BTN, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel, borderBottomWidth: 3, borderBottomColor: colors.edge }}>
          <Coin size={18} />
          <Text style={{ fontFamily: fonts.display, fontSize: 21, lineHeight: 26 }}>{fmt(coins)}</Text>
          {pending > 0 && <Text style={{ color: colors.good, fontSize: 16 }}>+{pending}</Text>}
        </Pressable>
      </Animated.View>
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
      {lay && stuck && !aiming && (
        <Pressable accessibilityRole="button" onPress={() => { giveUpRun(); dirty.current = true; }}
          style={({ pressed }) => ({ position: 'absolute', left: lay.W / 2 - 110, width: 220, top: lay.ty + lay.trayH / 2 - 25, height: 50, borderRadius: radius.card, backgroundColor: colors.panel, borderBottomWidth: 4, borderBottomColor: colors.edge, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <Text variant="title" style={{ fontSize: 20, textTransform: 'uppercase' }}>{tr('Terminer la partie')}</Text>
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
      {end && <GameOver end={end} onAgain={again} onMenu={() => { setEnd(null); leave(); }} />}
    </View>
  );
}
