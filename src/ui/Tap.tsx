// A pressable block: the tick sound, shrinks a little under the finger (shade: darkens in place instead, for
// rows inside a Group), a button to VoiceOver.
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { sfx } from '../audio/engine';

type Props = Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children: ReactNode; label?: string; quiet?: boolean; shade?: boolean };

export function Tap({ onPress, style, children, label, quiet, shade, disabled, ...rest }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} {...rest}
      onPress={(e) => { if (!quiet) sfx.turn(); onPress?.(e); }}
      style={({ pressed }) => [style, shade ? pressed && { backgroundColor: 'rgba(128,128,128,0.14)' } : { transform: [{ scale: pressed ? 0.97 : 1 }] }, disabled && { opacity: 0.45 }]}>
      {children}
    </Pressable>
  );
}
