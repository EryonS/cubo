// Cubo Blocks — The game screen: one Skia canvas for the run, the dragged shape on the UI thread.
//
// Two pictures: the background (recorded once per size) and the run (board, tray, score band,
// effects), recorded on the JS thread only while something moves. The dragged shape is its own
// picture inside a Group whose transform follows the finger on the UI thread, so it stays glued
// to the finger even when the JS thread is busy (see the spec, Rendering).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Group, Picture, Skia, useTypeface, type SkPicture, type SkTypeface } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Rect } from 'react-native-svg';
import { tr } from '../core/i18n';
import { useGame } from '../state/store';
import { anim, animating, type DragState } from '../game/anim';
import { dragGeometry, easeOut, LIFT_MS } from '../game/drag';
import { bestOf, commit, enterRun, newRun, type RunEnd } from '../game/run';
import { computeLayout, miniCell, slotAt, type Layout } from '../render/layout';
import { G } from '../render/g';
import { drawBoard, drawFades, drawFloaters, drawHUD, drawPiece, drawReturning, drawTray, ghostOf, paintBackground } from '../render/draw';
import { TOY } from '../render/theme';
import { colors, radius, space } from '../theme/tokens';
import { GameOver } from './GameOver';

const th = TOY;
const now = () => performance.now();

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

export function GameScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const typeface = useTypeface(require('../../assets/fonts/Baloo2-ExtraBold.ttf'));
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const lay = useMemo(() => (size ? computeLayout({ ...size, safeTop: insets.top }) : null), [size, insets.top]);
  const [end, setEnd] = useState<RunEnd | null>(null);

  const background = useMemo(() => (lay ? record(lay, null, (g) => paintBackground(g, th, lay.W, lay.H)) : null), [lay]);
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
  const dirty = useRef(true);

  // ---------- frame loop ----------
  const draw = useCallback(() => {
    if (!lay) return;
    const t = now();
    const d = drag.current;
    if (d) { d.x = dragX.value; d.y = dragY.value; }
    if (!dirty.current && !d && !animating(t)) return;
    dirty.current = false;
    const state = useGame.getState().saved.state;
    const best = bestOf(state);
    runPicture.value = record(lay, typeface, (g) => {
      drawHUD(g, th, lay, state, best);
      drawBoard(g, th, lay, state, ghostOf(lay, state, d, t), t);
      drawFades(g, th, lay, t);
      drawTray(g, th, lay, state, d, t);
      drawReturning(g, th, lay, state, t);
      drawFloaters(g, th, lay, t);
    });
  }, [lay, typeface, runPicture, dragX, dragY]);

  // Entering the screen starts (or resumes) the run once per focus. Kept apart from the frame
  // loop below, which restarts whenever draw changes (layout, font loaded): re-entering the run
  // there would reset the record the score band compares against.
  useFocusEffect(useCallback(() => {
    if (useGame.getState().saved.state.over) newRun();
    else enterRun();
    dirty.current = true;
  }, []));
  useFocusEffect(useCallback(() => {
    dirty.current = true;
    let raf = 0;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]));
  useEffect(() => { dirty.current = true; }, [lay, typeface]);

  // ---------- drag & drop (legacy game/drag.js) ----------
  const onDown = useCallback((x: number, y: number) => {
    if (!lay || drag.current) return;
    const state = useGame.getState().saved.state;
    if (state.over) return;
    const idx = slotAt(lay, x, y);
    const piece = idx >= 0 ? state.tray[idx] : null;
    if (!piece || anim.returning.some((p) => p.idx === idx)) return;
    const l = lay.cell * 2.2;
    drag.current = { idx, x, y, lift: l, t0: now() };
    dragPicture.value = record(lay, typeface, (g) => drawPiece(g, th, piece, 0, 0, lay.cell));
    lift.value = l;
    miniRatio.value = miniCell(lay) / lay.cell;
    liftK.value = 0;
    liftK.value = withTiming(1, { duration: LIFT_MS, easing: Easing.out(Easing.cubic) });
  }, [lay, typeface, dragPicture, lift, miniRatio, liftK]);

  const onUp = useCallback((x: number, y: number) => {
    const d = drag.current;
    if (!lay || !d) return;
    drag.current = null;
    dragPicture.value = emptyPicture();
    dirty.current = true;
    const state = useGame.getState().saved.state;
    const piece = state.tray[d.idx];
    if (!piece) return;
    const t = now();
    const g = dragGeometry(lay, state.board, piece, x, y, d.lift, easeOut((t - d.t0) / LIFT_MS));
    if (g.valid && commit(lay, d.idx, g.row, g.col, setEnd)) return;
    anim.returning.push({ idx: d.idx, x: g.cx, y: g.cy, size: g.size, t0: t });
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
    .onFinalize((e) => {
      scheduleOnRN(onUp, e.x, e.y);
    }), [onDown, onUp, dragX, dragY]);

  const again = useCallback(() => {
    setEnd(null);
    newRun();
    dirty.current = true;
  }, []);

  const onLayout = (e: LayoutChangeEvent) => setSize({ W: e.nativeEvent.layout.width, H: e.nativeEvent.layout.height });

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('Pause')}
        onPress={() => nav.goBack()}
        hitSlop={8}
        style={{ position: 'absolute', top: insets.top + 12, left: space.l, width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Rect x={6} y={4.5} width={4.2} height={15} rx={1.6} fill={colors.text} />
          <Rect x={13.8} y={4.5} width={4.2} height={15} rx={1.6} fill={colors.text} />
        </Svg>
      </Pressable>
      {end && <GameOver end={end} onAgain={again} onMenu={() => { setEnd(null); nav.goBack(); }} />}
    </View>
  );
}
