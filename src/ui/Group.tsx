// A grouped list: one card on the background holding rows split by a hairline (Paramètres, Boutique bonus,
// Défis série and missions). A ListRow inside a Group draws flat (no own panel, corners or shadow) and
// shades instead of shrinking under the finger. Falsy children are skipped, so `{x && <ListRow />}` works.
import { Children, createContext, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';

export const InGroup = createContext(false);

export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const rows = Children.toArray(children);
  if (!rows.length) return null;
  return (
    // The shadow sits on the outer view: overflow hidden on the same view would cut it.
    <View style={[{ borderRadius: radius.card, backgroundColor: colors.panel, ...raised(colors) }, style]}>
      <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
        <InGroup.Provider value>
          {rows.map((row, i) => (
            <Fragment key={i}>
              {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: space.l }} />}
              {row}
            </Fragment>
          ))}
        </InGroup.Provider>
      </View>
    </View>
  );
}
