// White card with the toy's thick bottom edge (legacy --card-bb: 6px).
import { View, type ViewProps } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';

export function Card({ style, ...rest }: ViewProps) {
  const colors = useColors();
  return (
    <View
      {...rest}
      style={[{ backgroundColor: colors.panel, borderRadius: radius.card, padding: space.l, borderBottomWidth: 6, borderBottomColor: colors.edge, gap: space.s }, style]}
    />
  );
}
