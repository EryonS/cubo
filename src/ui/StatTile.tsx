// A number and what it counts (profile totals, stats per mode).
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';
import { Text } from './Text';

export function StatTile({ value, label, inset, style }: { value: string; label: string; inset?: boolean; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={[{ flex: 1, minWidth: 0, paddingVertical: space.m, paddingHorizontal: space.m, borderRadius: radius.tile,
      backgroundColor: inset ? colors.panel2 : colors.panel, ...(inset ? null : raised(colors, 'low')) }, style]}>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text variant="caption" numberOfLines={1}>{label}</Text>
    </View>
  );
}
