// Toy button: primary (violet) or ghost (pale), pill shaped, with the thick bottom edge.
import { Pressable, type PressableProps } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Text } from './Text';

// The thick lip under a primary button: a darker step of the theme accent (legacy toy used #5b3fd9).
function lip(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, ((n >> shift) & 255) - 48));
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

type Props = PressableProps & { label: string; sub?: string; kind?: 'primary' | 'ghost' | 'danger' };

export function Button({ label, sub, kind = 'primary', style, ...rest }: Props) {
  const colors = useColors();
  const primary = kind !== 'ghost';
  const danger = kind === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={(s) => [{
        backgroundColor: danger ? colors.dangerBtn : primary ? colors.accent : colors.panel2,
        borderRadius: radius.pill,
        paddingVertical: space.m,
        paddingHorizontal: space.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 4,
        borderBottomColor: danger ? '#b8353a' : primary ? lip(colors.accent) : colors.edge,
        transform: [{ translateY: s.pressed ? 2 : 0 }],
      }, typeof style === 'function' ? style(s) : style]}
    >
      <Text variant="title" style={{ fontSize: 20, color: primary ? colors.onAccent : colors.text }}>{label}</Text>
      {sub ? <Text variant="muted" style={{ color: primary ? colors.onAccent : colors.muted, opacity: 0.85 }}>{sub}</Text> : null}
    </Pressable>
  );
}
