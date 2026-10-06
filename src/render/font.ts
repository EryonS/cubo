// The game's canvas fonts, loaded once for every Skia canvas: Baloo 2 extra bold, and Press Start 2P
// (Rétro and Arcade). Skia's useTypeface loads its own copy per component, so a screen of previews
// (Boutique, Aventure strip) waited for each one; here every canvas shares one load, started at launch.
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Skia, type SkTypeface } from '@shopify/react-native-skia';

const BALOO = require('../../assets/fonts/Baloo2-ExtraBold.ttf');
const PIXEL = require('../../assets/fonts/PressStart2P-Regular.ttf');

const faces = new Map<number, SkTypeface>();
const loading = new Map<number, Promise<SkTypeface | null>>();

function load(mod: number): Promise<SkTypeface | null> {
  let p = loading.get(mod);
  if (!p) {
    p = Skia.Data.fromURI(Image.resolveAssetSource(mod).uri)
      .then((data) => {
        const face = Skia.Typeface.MakeFreeTypeFaceFromData(data);
        if (face) faces.set(mod, face);
        return face;
      })
      .catch(() => {
        loading.delete(mod); // a later canvas tries again
        return null;
      });
    loading.set(mod, p);
  }
  return p;
}

function useFace(mod: number): SkTypeface | null {
  const [face, setFace] = useState(() => faces.get(mod) ?? null);
  useEffect(() => {
    if (face) return;
    let live = true;
    load(mod).then((f) => { if (live && f) setFace(f); });
    return () => { live = false; };
  }, [mod, face]);
  return face;
}

export const useBaloo = () => useFace(BALOO);
export const usePixel = () => useFace(PIXEL);

// At launch, so the first canvases already have their fonts.
export function preloadFonts() {
  load(BALOO);
  load(PIXEL);
}
