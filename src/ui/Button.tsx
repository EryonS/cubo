// Toy button, pill shaped, raised by a soft shadow. primary: accent (the one main action of a view).
// secondary: a panel (Équiper, a second choice next to a primary). ghost: panel2, inside a card or sheet.
// danger: destructive confirm. size s for buttons inside a card or row.
import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { radius, space, TOUCH } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';
import { Text } from './Text';

// A darker step of a color (pressed states, edges drawn on a filled surface).
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
  const small = size === 's';
  const filled = kind === 'primary' || kind === 'danger';
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
        ...(filled && !disabled ? { shadowColor: fill, shadowOpacity: 0.35, shadowRadius: small ? 6 : 10, shadowOffset: { width: 0, height: small ? 2 : 4 } } : null),
        ...(kind === 'secondary' ? raised(colors, 'low') : null),
        transform: [{ scale: s.pressed ? 0.96 : 1 }],
        opacity: disabled ? 0.5 : 1,
      }, typeof style === 'function' ? style(s) : style]}
    >
      {/* A long label (a narrow dialog button, English) shrinks to fit instead of running past the pill. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, maxWidth: '100%' }}>
        {icon}
        <Text variant={small ? 'headline' : 'title'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
          style={{ color: ink, flexShrink: 1 }}>{label}</Text>
      </View>
      {sub ? <Text variant="caption" numberOfLines={1} style={{ color: ink, opacity: 0.85 }}>{sub}</Text> : null}
    </Pressable>
  );
}
