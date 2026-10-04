// A small Skia canvas showing a theme and a block skin (Boutique cards, Aventure card).
import { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { G } from '../render/g';
import { useBaloo } from '../render/font';
import { drawPreview, PREVIEW_H, PREVIEW_W } from '../render/preview';
import type { Theme } from '../render/theme';

export function BoardPreview({ th, width, radius = 12 }: { th: Theme; width: number; radius?: number }) {
  const typeface = useBaloo();
  const height = Math.round((width * PREVIEW_H) / PREVIEW_W);
  const picture = useMemo(() => {
    if (!typeface) return null;
    const rec = Skia.PictureRecorder();
    const g = new G(rec.beginRecording(Skia.XYWHRect(0, 0, width, height)), typeface);
    drawPreview(g, th, width, height);
    return rec.finishRecordingAsPicture();
  }, [th, width, height, typeface]);
  if (!picture) return <View style={{ width, height, borderRadius: radius }} />;
  return (
    <Canvas style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
