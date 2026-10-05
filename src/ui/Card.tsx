// The two surfaces of the app. A card sits on the screen background: panel color with the toy's lip
// underneath. An inset sits inside a card: panel2, flat, smaller corners. Never put a card in a card.
import { View, type ViewProps } from 'react-native';
import { lip, radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';

type Props = ViewProps & { inset?: boolean; small?: boolean };

export function Card({ inset, small, style, ...rest }: Props) {
  const colors = useColors();
  const base = inset
    ? { backgroundColor: colors.panel2, borderRadius: radius.tile, padding: space.m, gap: space.s }
    : { backgroundColor: colors.panel, borderRadius: small ? radius.tile : radius.card, padding: small ? space.m : space.l, gap: small ? space.xs : space.m,
        borderBottomWidth: small ? lip.tile : lip.card, borderBottomColor: colors.edge };
  return <View {...rest} style={[base, style]} />;
}
