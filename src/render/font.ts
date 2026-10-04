// The game's canvas font (Baloo 2 extra bold), loaded once for every Skia canvas.
import { useTypeface } from '@shopify/react-native-skia';

export const useBaloo = () => useTypeface(require('../../assets/fonts/Baloo2-ExtraBold.ttf'));
