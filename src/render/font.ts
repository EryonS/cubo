// The game's canvas fonts, loaded once for every Skia canvas: Baloo 2 extra bold, and Press Start 2P
// (Rétro and Arcade).
import { useTypeface } from '@shopify/react-native-skia';

export const useBaloo = () => useTypeface(require('../../assets/fonts/Baloo2-ExtraBold.ttf'));
export const usePixel = () => useTypeface(require('../../assets/fonts/PressStart2P-Regular.ttf'));
