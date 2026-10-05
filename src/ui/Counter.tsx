// A pill with an icon and a number (coins, streak, stars). Tappable when given onPress.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { lip, radius, space, TOUCH } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Tap } from './Tap';
import { Text } from './Text';

type Props = { icon: ReactNode; value: string; label: string; onPress?: () => void; inset?: boolean };

export function Counter({ icon, value, label, onPress, inset }: Props) {
  const colors = useColors();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 36, paddingHorizontal: space.m, borderRadius: radius.pill,
      backgroundColor: inset ? colors.panel2 : colors.panel, borderBottomWidth: inset ? 0 : lip.tile, borderBottomColor: colors.edge }}>
      {icon}
      <Text variant="headline" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={label}>{body}</View>;
  return <Tap label={label} onPress={onPress} hitSlop={(TOUCH - 36) / 2}>{body}</Tap>;
}
