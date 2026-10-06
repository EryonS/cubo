// The top of every screen: back button (stack screens), the title, and counters on the right.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tr } from '../core/i18n';
import { radius, space, TOUCH } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

type Props = { title: string; back?: boolean | (() => void); lead?: ReactNode; right?: ReactNode };

// A square icon button on the header line (back, Paramètres).
export function HeaderButton({ icon, size = 18, label, onPress }: { icon: IconName; size?: number; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Tap label={label} onPress={onPress}
      style={{ width: TOUCH, height: TOUCH, borderRadius: radius.s + 4, backgroundColor: colors.panel, ...raised(colors, 'low'), alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size} color={colors.text} />
    </Tap>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  const nav = useNavigation();
  return <HeaderButton icon="chevLeft" label={tr('Retour')} onPress={onPress ?? (() => nav.goBack())} />;
}

export function ScreenHeader({ title, back, lead, right }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: TOUCH }}>
      {back ? <BackButton onPress={typeof back === 'function' ? back : undefined} /> : null}
      {lead}
      <Text variant="display" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flex: 1 }}>{title}</Text>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>{right}</View> : null}
    </View>
  );
}
