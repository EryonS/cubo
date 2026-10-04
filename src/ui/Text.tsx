// Text in the game's font (Baloo 2): body = bold, title = extra bold.
import { Text as RNText, type TextProps } from 'react-native';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/fonts';

type Props = TextProps & { variant?: 'body' | 'muted' | 'title' | 'big' };

const STYLES = {
  body: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  muted: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  big: { fontFamily: fonts.display, fontSize: 40, color: colors.accent },
} as const;

export function Text({ variant = 'body', style, ...rest }: Props) {
  return <RNText {...rest} style={[STYLES[variant], style]} />;
}
