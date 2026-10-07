// "TEST" pill over every screen while test mode is on (game/devmode.ts), so the test profile is
// never mistaken for the real one. Touches pass through.
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testMode } from '../platform/kv';
import { colors, radius, space } from '../theme/tokens';
import { Text } from './Text';

export function TestBadge() {
  const insets = useSafeAreaInsets();
  if (!testMode) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + space.xxs, left: 0, right: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.dangerBtn, borderRadius: radius.pill, paddingHorizontal: space.s, paddingVertical: space.xxs }}>
        <Text variant="label" style={{ color: colors.onAccent }} maxFontSizeMultiplier={1}>TEST</Text>
      </View>
    </View>
  );
}
