// Coins pill: a drawn coin and the amount.
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { locale, tr } from '../core/i18n';
import { colors, radius, space } from '../theme/tokens';
import { Text } from './Text';

export function Coin({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={8.5} fill={colors.coin} stroke={colors.coinEdge} strokeWidth={2} />
      <Circle cx={10} cy={10} r={4.5} fill="none" stroke={colors.coinEdge} strokeWidth={1.6} />
    </Svg>
  );
}

export function Wallet({ coins }: { coins: number }) {
  return (
    <View
      accessibilityLabel={tr`${coins} pièces`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', backgroundColor: colors.panel, borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: space.xs }}
    >
      <Coin />
      <Text>{coins.toLocaleString(locale())}</Text>
    </View>
  );
}
