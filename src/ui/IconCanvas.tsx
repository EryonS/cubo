// A bonus or coin icon on its own small canvas (legend, Boutique bonus rows).
import { useMemo } from 'react';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { G } from '../render/g';
import { drawIcon } from '../render/icons';

export function IconCanvas({ type, size = 40 }: { type: string; size?: number }) {
  const picture = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const g = new G(rec.beginRecording(Skia.XYWHRect(0, 0, size, size)), null);
    drawIcon(g, type, size / 2, size / 2, size * 0.94);
    return rec.finishRecordingAsPicture();
  }, [type, size]);
  return <Canvas style={{ width: size, height: size }}><Picture picture={picture} /></Canvas>;
}
