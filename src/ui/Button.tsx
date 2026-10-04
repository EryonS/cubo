// Toy button: primary (violet) or ghost (pale), pill shaped, with the thick bottom edge.
import { Pressable, type PressableProps } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Text } from './Text';

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
        borderBottomColor: danger ? '#b8353a' : primary ? '#5b3fd9' : colors.edge,
        transform: [{ translateY: s.pressed ? 2 : 0 }],
      }, typeof style === 'function' ? style(s) : style]}
    >
      <Text variant="title" style={{ fontSize: 20, color: primary ? colors.onAccent : colors.text }}>{label}</Text>
      {sub ? <Text variant="muted" style={{ color: primary ? colors.onAccent : colors.muted, opacity: 0.85 }}>{sub}</Text> : null}
    </Pressable>
  );
}
