// A bonus or coin icon on its own small canvas (legend, Boutique bonus rows). The canvas overflows the
// icon's box by PAD on every side so the badge's drop shadow fades out instead of being cut square.
import { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { G } from '../render/g';
import { drawIcon } from '../render/icons';

const PAD = 0.25;

export function IconCanvas({ type, size = 40 }: { type: string; size?: number }) {
  const pad = Math.ceil(size * PAD);
  const full = size + 2 * pad;
  const picture = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const g = new G(rec.beginRecording(Skia.XYWHRect(0, 0, full, full)), null);
    drawIcon(g, type, full / 2, full / 2, size * 0.94);
    return rec.finishRecordingAsPicture();
  }, [type, size, full]);
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Canvas style={{ position: 'absolute', left: -pad, top: -pad, width: full, height: full }}><Picture picture={picture} /></Canvas>
    </View>
  );
}
