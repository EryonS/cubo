// The small uppercase label over a group of rows ("SON", "MISSIONS DU JOUR"), and Section: that label over its
// block (a Group, a Card), as on Paramètres. `info` adds a small "i" next to the label that explains the block in a
// dialog: keep it for what a player cannot guess (how a trophy is won, what a streak gives), not on every section.
import type { ReactNode } from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { tr } from '../core/i18n';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { notice } from './dialog';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

export function SectionLabel({ children, info, style }: { children: string; info?: string; style?: StyleProp<TextStyle> }) {
  const label = <Text variant="label" accessibilityRole="header" style={[{ marginTop: space.s, marginLeft: space.xs }, style]}>{children}</Text>;
  if (!info) return label;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs }}>
      {label}
      <InfoButton title={children} text={info} />
    </View>
  );
}

// The "i": 20 pt drawn, 44 pt to the finger.
export function InfoButton({ title, text, color }: { title: string; text: string; color?: string }) {
  const colors = useColors();
  return (
    <Tap label={tr`En savoir plus : ${title}`} onPress={() => { void notice(title, text); }} hitSlop={12}
      style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="info" size={17} color={color ?? colors.muted} />
    </Tap>
  );
}

export function Section({ title, info, right, children, style }: { title: string; info?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: space.s }, style]}>
      {right ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.m }}>
          <SectionLabel info={info}>{title}</SectionLabel>
          {right}
        </View>
      ) : <SectionLabel info={info}>{title}</SectionLabel>}
      {children}
    </View>
  );
}
