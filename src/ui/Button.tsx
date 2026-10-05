// Toy button, pill shaped, with the thick bottom lip. primary: accent (the one main action of a view).
// secondary: a panel (Équiper, a second choice next to a primary). ghost: panel2, inside a card or sheet.
// danger: destructive confirm. size s for buttons inside a card or row.
import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { lip as lipW, radius, space, TOUCH } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Text } from './Text';

// The lip under a filled button: a darker step of its color (legacy toy used #5b3fd9 under #7c5cff).
export function darker(hex: string, by = 48) {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, ((n >> shift) & 255) - by));
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';
type Props = PressableProps & { label: string; sub?: string; kind?: Kind; size?: 'm' | 's'; icon?: ReactNode };

export function Button({ label, sub, kind = 'primary', size = 'm', icon, style, disabled, ...rest }: Props) {
  const colors = useColors();
  const fill = { primary: colors.accent, secondary: colors.panel, ghost: colors.panel2, danger: colors.dangerBtn }[kind];
  const ink = kind === 'primary' ? colors.onAccent : kind === 'danger' ? '#ffffff' : colors.text;
  const edge = kind === 'primary' || kind === 'danger' ? darker(fill) : colors.edge;
  const small = size === 's';
  const lip = small ? lipW.tile : lipW.card - 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={(s) => [{
        backgroundColor: fill,
        borderRadius: radius.pill,
        minHeight: small ? 40 : TOUCH + space.s,
        paddingHorizontal: small ? space.l : space.xl,
        paddingVertical: small ? space.xs : space.s,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: s.pressed ? lip - 2 : lip,
        borderBottomColor: edge,
        marginTop: s.pressed ? 2 : 0,
        opacity: disabled ? 0.5 : 1,
      }, typeof style === 'function' ? style(s) : style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
        {icon}
        <Text variant={small ? 'headline' : 'title'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: ink }}>{label}</Text>
      </View>
      {sub ? <Text variant="caption" numberOfLines={1} style={{ color: ink, opacity: 0.85 }}>{sub}</Text> : null}
    </Pressable>
  );
}
