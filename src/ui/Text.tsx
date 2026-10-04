// Text in the game's font (Baloo 2): body = bold, title = extra bold.
import { Text as RNText, type TextProps } from 'react-native';
import { useColors } from '../theme/useColors';
import { fonts } from '../theme/fonts';

type Props = TextProps & { variant?: 'body' | 'muted' | 'title' | 'big' };

const BASE = {
  body: { fontFamily: fonts.bold, fontSize: 16 },
  muted: { fontFamily: fonts.semibold, fontSize: 14 },
  title: { fontFamily: fonts.display, fontSize: 24 },
  big: { fontFamily: fonts.display, fontSize: 40 },
} as const;

export function Text({ variant = 'body', style, ...rest }: Props) {
  const colors = useColors();
  const color = variant === 'muted' ? colors.muted : variant === 'big' ? colors.accent : colors.text;
  return <RNText {...rest} style={[BASE[variant], { color }, style]} />;
}
