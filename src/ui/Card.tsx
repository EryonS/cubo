// The two surfaces of the app. A card sits on the screen background: panel color, raised by a soft shadow. An inset sits inside a card: panel2, flat, smaller corners. Never put a card in a card.
import { View, type ViewProps } from 'react-native';
import { radius, space } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';

type Props = ViewProps & { inset?: boolean; small?: boolean };

export function Card({ inset, small, style, ...rest }: Props) {
  const colors = useColors();
  const base = inset
    ? { backgroundColor: colors.panel2, borderRadius: radius.tile, padding: space.m, gap: space.s }
    : { backgroundColor: colors.panel, borderRadius: small ? radius.tile : radius.card, padding: small ? space.m : space.l, gap: small ? space.xs : space.m,
        ...raised(colors, small ? 'low' : 'card') };
  return <View {...rest} style={[base, style]} />;
}
