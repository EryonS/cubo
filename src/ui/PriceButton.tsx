// A price in coins (Boutique, gel de série): an accent pill when the wallet has it. Short, a flat pill with the
// price in muted ink, readable rather than faded, whose tap says how many coins are missing. StatePill is the
// flat pill in the same place once there is nothing to buy (Plein, Max, Équipé).
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { locale, many, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from './Button';
import { Tap } from './Tap';
import { Text } from './Text';
import { toast } from './Toast';
import { Coin } from './Wallet';

const PILL = { height: 40, borderRadius: radius.pill, paddingHorizontal: space.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s } as const;

export function PriceButton({ price, coins, label, onPress, style }: { price: number; coins: number; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const value = price.toLocaleString(locale());
  if (coins >= price) return <Button size="s" icon={<Coin size={16} ring={colors.onAccent} />} label={value} accessibilityLabel={label} onPress={onPress} style={style} />;
  const missing = price - coins;
  const say = many(missing) ? tr`Il te manque ${missing} pièces` : tr`Il te manque ${missing} pièce`;
  return (
    <Tap quiet label={`${label}. ${say}`} onPress={() => { sfx.nope(); haptic('nope'); toast(say); }}
      style={[PILL, { backgroundColor: colors.panel2 }, style]}>
      <Coin size={16} />
      <Text variant="headline" style={{ color: colors.muted, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </Tap>
  );
}

export function StatePill({ label, icon, color, style }: { label: string; icon?: ReactNode; color?: string; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={label} style={[PILL, { backgroundColor: colors.panel2, gap: space.xs }, style]}>
      {icon}
      <Text variant="headline" numberOfLines={1} style={{ color: color ?? colors.muted }}>{label}</Text>
    </View>
  );
}
