// One choice among a few: a track filling the width (Boutique tabs, Profil stats modes, language).
// The caller plays the tick in onChange.
import { View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Tap } from './Tap';
import { Text } from './Text';

type Props<T extends string> = { options: [T, string][]; value: T; onChange: (v: T) => void; inset?: boolean; role?: 'tab' | 'radio' };

export function Segmented<T extends string>({ options, value, onChange, inset, role = 'radio' }: Props<T>) {
  const colors = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: space.xs, padding: space.xs, borderRadius: radius.pill, backgroundColor: inset ? colors.panel2 : colors.panel }}>
      {options.map(([id, name]) => {
        const on = id === value;
        return (
          <Tap key={id} accessibilityRole={role} accessibilityState={{ selected: on }} label={name} quiet onPress={() => { if (!on) onChange(id); }}
            style={{ flex: 1, height: 36, paddingHorizontal: space.m, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : 'transparent' }}>
            <Text variant="body" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: on ? colors.onAccent : colors.muted }}>{name}</Text>
          </Tap>
        );
      })}
    </View>
  );
}
