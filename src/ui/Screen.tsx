// A screen: theme background, safe area on top, the header, then the content scrolling with the 16 pt
// gutter and 12 pt between blocks. Stack screens scroll under the home indicator / Android button bar
// and end with its height; on tabs the tab bar covers it.
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { ScreenHeader } from './ScreenHeader';

type Props = {
  children: ReactNode;
  title?: string;
  back?: boolean | (() => void);
  lead?: ReactNode;
  right?: ReactNode;
  scroll?: boolean; // false: the content lays itself out (fills the rest of the screen)
  tab?: boolean; // a tab screen: no bottom inset
};

export function Screen({ children, title, back, lead, right, scroll = true, tab = !back }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const header = title !== undefined ? <ScreenHeader title={title} back={back} lead={lead} right={right} /> : null;
  return (
    <SafeAreaView edges={tab || scroll ? ['top'] : ['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.xl + (tab ? 0 : insets.bottom), gap: space.m }}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: space.l, paddingTop: space.s, gap: space.m }}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
