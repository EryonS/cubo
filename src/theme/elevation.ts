// Raised surfaces: a soft offset shadow instead of the old thick bottom edge. On light themes the shadow
// is tinted with the theme ink; on dark themes it is black and a hairline outline keeps the edge readable.
import { StyleSheet, type ViewStyle } from 'react-native';

type Pal = { bg: string; text: string; hairline: string };

const dark = (hex: string) => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 128;
};

// card: cards, rows, tiles on the background. low: pills and small controls. none: flat (insets).
export function raised(c: Pal, level: 'card' | 'low' = 'card'): ViewStyle {
  const d = dark(c.bg);
  const card = level === 'card';
  return {
    shadowColor: d ? '#000000' : c.text,
    shadowOpacity: d ? (card ? 0.4 : 0.3) : (card ? 0.12 : 0.1),
    shadowRadius: card ? 10 : 5,
    shadowOffset: { width: 0, height: card ? 4 : 2 },
    ...(d ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline } : null),
  };
}
