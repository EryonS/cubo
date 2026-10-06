// Cubo Blocks — Writes the app icon of every theme (render/app-icon.ts) for the native projects:
// assets/icons/<theme>.png (iOS, 1024 opaque) and assets/icons/android/<theme>-fg.png / -bg.png
// (adaptive layers). app.config.ts hands them to expo-alternate-app-icons; then `npx expo prebuild`.
//   npx tsx --tsconfig scripts/icons/tsconfig.json scripts/icons/app-icons.ts [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Skia } from '@shopify/react-native-skia';
import { initSkia } from './skia-node';
import { APP_ICONS, drawAppIcon, drawAppIconArt, drawAppIconBackground } from '../../src/render/app-icon';
import { G } from '../../src/render/g';

function png(size: number, draw: (g: G) => void) {
  const surface = Skia.Surface.MakeOffscreen(size, size)!;
  draw(new G(surface.getCanvas(), null));
  surface.flush();
  return surface.makeImageSnapshot().encodeToBytes();
}

async function main() {
  await initSkia();
  const out = process.argv[2] || 'assets/icons';
  mkdirSync(join(out, 'android'), { recursive: true });
  for (const id of Object.keys(APP_ICONS)) {
    writeFileSync(join(out, `${id}.png`), png(1024, (g) => drawAppIcon(g, id, 1024)));
    writeFileSync(join(out, 'android', `${id}-bg.png`), png(1024, (g) => drawAppIconBackground(g, id, 1024)));
    writeFileSync(join(out, 'android', `${id}-fg.png`), png(1024, (g) => drawAppIconArt(g, id, 1024, 0.68)));
    console.log('wrote ' + id);
  }
}

main();
