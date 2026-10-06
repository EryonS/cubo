// Text in the game's font (Baloo 2) on the app's type scale (theme/tokens `type`).
//
// Baloo 2's line box is 1.6 em tall (ascent 1078, descent 524). When a style sets a tighter lineHeight,
// iOS trims the line from the top, so the glyphs ride up out of their box (an 18 pt label in a 22 pt line
// sits ~3 pt high). iOS Text puts them back on center with a translate, which keeps the layout box as is.
// Android already draws the glyphs on the line's center; the same translate sits every label low.
import { createContext, useContext } from 'react';
import { Platform, StyleSheet, Text as RNText, useWindowDimensions, type TextProps, type TextStyle } from 'react-native';
import { useColors } from '../theme/useColors';
import { typeScale as scale, type TypeVariant } from '../theme/tokens';

type Props = TextProps & { variant?: TypeVariant };

const BALOO_BOX = 1.602;
const CAP_NUDGE = 0.024; // caps and digits sit a hair above the line's center
export const MAX_FONT_SCALE = 1.3; // Dynamic Type grows text up to here; past it the cards would break

export function centerShift(st: TextStyle, fontScale: number): number {
  if (Platform.OS === 'android') return 0;
  const fs = st.fontSize ?? 16;
  const lh = st.lineHeight;
  const family = st.fontFamily ?? '';
  if (!lh || (family && !family.startsWith('Baloo'))) return 0;
  const k = Math.min(fontScale, MAX_FONT_SCALE);
  return Math.max(0, (fs * BALOO_BOX - lh) / 2 + fs * CAP_NUDGE) * k;
}

// A Text inside a Text is a span: it never moves on its own (the outer one carries the shift).
const Nested = createContext(false);

export function Text({ variant = 'body', style, maxFontSizeMultiplier = MAX_FONT_SCALE, ...rest }: Props) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const { tone, lh, ...base } = scale[variant];
  const color = tone === 'muted' ? colors.muted : tone === 'accent' ? colors.accent : colors.text;
  // An undefined key must not wipe the variant's value: Android then falls back to the system font.
  const own = Object.fromEntries(Object.entries(StyleSheet.flatten(style) ?? {}).filter(([, v]) => v !== undefined)) as TextStyle;
  // A style that only changes the size keeps the variant's leading.
  const lineHeight = own.lineHeight ?? Math.round((own.fontSize ?? base.fontSize) * lh);
  const flat = { ...base, color, ...own, lineHeight } as TextStyle;
  const nested = useContext(Nested);
  const dy = nested ? 0 : centerShift(flat, fontScale);
  const transform = dy ? [...((flat.transform as object[] | undefined) ?? []), { translateY: dy }] : flat.transform;
  const node = <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={[flat, !nested && transform ? { transform } as TextStyle : null]} />;
  return nested ? node : <Nested.Provider value>{node}</Nested.Provider>;
}
