// Cubo Blocks — @shopify/react-native-skia for Node scripts: the same API over CanvasKit (wasm), so the
// game's drawing code (render/, mascot/) runs outside the app. tsconfig.json in this folder maps the
// package here; call initSkia() before the first draw.
import CanvasKitInit from 'canvaskit-wasm';
// The Skia API over a CanvasKit instance (what Skia web runs on).
import { JsiSkApi } from '@shopify/react-native-skia/lib/commonjs/skia/web';
import type { Skia as SkiaApi } from '@shopify/react-native-skia/lib/commonjs/skia/types';

export * from '@shopify/react-native-skia/lib/commonjs/skia/types';

let api: SkiaApi | null = null;
export async function initSkia() {
  api ??= JsiSkApi(await CanvasKitInit()) as SkiaApi;
}
export const Skia = new Proxy({} as SkiaApi, {
  get: (_, k) => {
    if (!api) throw new Error('initSkia() first');
    return api[k as keyof SkiaApi];
  },
});
