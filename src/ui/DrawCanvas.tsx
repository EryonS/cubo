// A small Skia canvas drawn once with a draw function (Boutique previews; height: the preview's
// proportions when not given).
import { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { G } from '../render/g';
import { useBaloo } from '../render/font';
import { PREVIEW_H, PREVIEW_W } from '../render/preview';

export function DrawCanvas({ draw, width, height: h, radius = 12, deps }: { draw: (g: G, w: number, h: number) => void; width: number; height?: number; radius?: number; deps: unknown[] }) {
  const typeface = useBaloo();
  const height = h ?? Math.round((width * PREVIEW_H) / PREVIEW_W);
  const picture = useMemo(() => {
    if (!typeface) return null;
    const rec = Skia.PictureRecorder();
    draw(new G(rec.beginRecording(Skia.XYWHRect(0, 0, width, height)), typeface), width, height);
    return rec.finishRecordingAsPicture();
  }, [...deps, width, height, typeface]);
  if (!picture) return <View style={{ width, height, borderRadius: radius }} />;
  return <Canvas style={{ width, height, borderRadius: radius, overflow: 'hidden' }}><Picture picture={picture} /></Canvas>;
}
