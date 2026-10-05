// The top of every screen: back button (stack screens), the title, and counters on the right.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tr } from '../core/i18n';
import { radius, space, TOUCH } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

type Props = { title: string; back?: boolean | (() => void); lead?: ReactNode; right?: ReactNode };

export function BackButton({ onPress }: { onPress?: () => void }) {
  const colors = useColors();
  const nav = useNavigation();
  return (
    <Tap label={tr('Retour')} onPress={onPress ?? (() => nav.goBack())}
      style={{ width: TOUCH, height: TOUCH, borderRadius: radius.s + 4, backgroundColor: colors.panel, ...raised(colors, 'low'), alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="chevLeft" size={18} color={colors.text} />
    </Tap>
  );
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
