// A tab screen: pink background, safe area on top, scrolls.
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';

export function Screen({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.l, gap: space.l }}>{children}</ScrollView>
    </SafeAreaView>
  );
}
