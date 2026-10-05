// An on/off switch in the theme colors. The knob takes onAccent so it stays visible on any accent.
import { View } from 'react-native';
import { useColors } from '../theme/useColors';

export function Toggle({ on }: { on: boolean }) {
  const colors = useColors();
  return (
    <View style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: on ? colors.accent : colors.sunken, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: 14, backgroundColor: on ? colors.onAccent : '#ffffff',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }} />
    </View>
  );
}
