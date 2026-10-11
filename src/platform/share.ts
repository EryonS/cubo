// Sharing a picture: the share card drawn off screen with Skia, written as a PNG to the cache, handed to
// the system share sheet (expo-sharing: the iOS activity sheet, the Android chooser).
import { Skia } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { loadFonts } from '../render/font';
import { G } from '../render/g';
import { drawShareCard, SHARE_H, SHARE_SCALE, SHARE_W, type ShareCard } from '../render/share-card';

// false when nothing could be shared (no share sheet, drawing or writing failed); closing the sheet is not a failure.
export async function shareCard(card: ShareCard): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const [baloo, pixel] = await loadFonts();
    const surface = Skia.Surface.Make(SHARE_W * SHARE_SCALE, SHARE_H * SHARE_SCALE);
    if (!surface) return false;
    drawShareCard(new G(surface.getCanvas(), baloo, pixel), card);
    surface.flush();
    const file = new File(Paths.cache, 'cubo-blocks.png');
    file.create({ overwrite: true });
    file.write(surface.makeImageSnapshot().encodeToBytes());
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png' });
    return true;
  } catch {
    return false;
  }
}
