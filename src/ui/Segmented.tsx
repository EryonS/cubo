// One choice among a few. "tabs": a track filling the width (Boutique tabs, language).
// The caller plays the tick in onChange. "chips": separate pills that scroll sideways when they run out of room (stats modes).
import { ScrollView, View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Tap } from './Tap';
import { Text } from './Text';

type Props<T extends string> = { options: [T, string][]; value: T; onChange: (v: T) => void; kind?: 'tabs' | 'chips'; inset?: boolean; role?: 'tab' | 'radio' };

export function Segmented<T extends string>({ options, value, onChange, kind = 'tabs', inset, role = 'radio' }: Props<T>) {
  const colors = useColors();
  const items = options.map(([id, name]) => {
    const on = id === value;
    return (
      <Tap key={id} accessibilityRole={role} accessibilityState={{ selected: on }} label={name} quiet onPress={() => { if (!on) onChange(id); }}
        style={[{ height: 36, paddingHorizontal: space.m, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : kind === 'chips' ? (inset ? colors.panel2 : colors.panel) : 'transparent' }, kind === 'tabs' && { flex: 1 }]}>
        <Text variant="body" numberOfLines={1} adjustsFontSizeToFit={kind === 'tabs'} minimumFontScale={0.8} style={{ color: on ? colors.onAccent : colors.muted }}>{name}</Text>
      </Tap>
    );
  });
  if (kind === 'chips') return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>{items}</ScrollView>;
  return <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: space.xs, padding: space.xs, borderRadius: radius.pill, backgroundColor: inset ? colors.panel2 : colors.panel }}>{items}</View>;
}
