// White card with the toy's thick bottom edge (legacy --card-bb: 6px).
import { View, type ViewProps } from 'react-native';
import { colors, radius, space } from '../theme/tokens';

export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[{ backgroundColor: colors.panel, borderRadius: radius.card, padding: space.l, borderBottomWidth: 6, borderBottomColor: colors.edge, gap: space.s }, style]}
    />
  );
}
