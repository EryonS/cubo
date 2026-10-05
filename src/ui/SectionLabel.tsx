// The small uppercase label over a group of rows ("SON", "MISSIONS DU JOUR").
import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { space } from '../theme/tokens';
import { Text } from './Text';

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text variant="label" accessibilityRole="header" style={[{ marginTop: space.s, marginLeft: space.xs }, style]}>{children}</Text>;
}
