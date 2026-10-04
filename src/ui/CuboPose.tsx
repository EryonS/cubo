// A still Cubo in a pose on a small canvas (home line of the day, result card): legacy drawCubo(0, pose).
// The canvas works in the legacy pixel size (lw x lh) and is scaled to `width`.
import { useMemo } from 'react';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { drawCubo } from '../mascot/body';
import type { CuboLook } from '../mascot/looks';
import { G } from '../render/g';
import { useBaloo } from '../render/font';
import { colors } from '../theme/tokens';

export function CuboPose({ width, lw, lh, s, foot, look, mood }: { width: number; lw: number; lh: number; s: number; foot: number; look: CuboLook; mood: string }) {
  const typeface = useBaloo();
  const height = (width * lh) / lw;
  const picture = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const g = new G(rec.beginRecording(Skia.XYWHRect(0, 0, width, height)), typeface);
    g.scale(width / lw);
    drawCubo(g, 0, { x: lw / 2, y: lh - foot, s }, look, mood, { calm: true, look: null, ink: colors.text }, true);
    return rec.finishRecordingAsPicture();
  }, [width, height, lw, lh, s, foot, look, mood, typeface]);
  return <Canvas style={{ width, height }}><Picture picture={picture} /></Canvas>;
}
