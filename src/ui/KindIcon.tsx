// An obstacle drawn small, for the free-game picker (legacy kindIcon).
import { useMemo } from 'react';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { L } from '../core';
import { drawSpecial } from '../render/cells';
import { G } from '../render/g';

export function KindIcon({ kind, size = 26 }: { kind: string; size?: number }) {
  const picture = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const g = new G(rec.beginRecording(Skia.XYWHRect(0, 0, size, size)), null);
    drawSpecial(g, { kind, hp: L.KINDS[kind].hp, age: 0 }, size / 2, size / 2, size * 1.05);
    return rec.finishRecordingAsPicture();
  }, [kind, size]);
  return <Canvas style={{ width: size, height: size }}><Picture picture={picture} /></Canvas>;
}
