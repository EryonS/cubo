// The tab bar (Jouer, Défis, Boutique, Profil): a panel with a soft shadow above it instead of a top line.
// Each tab is its icon alone (the label goes to VoiceOver). A soft accent pill sits behind the active icon and
// slides to the tab tapped, the icon hops once; the tick sound and a light tap like every button.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { haptic } from '../platform/haptics';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Tap } from './Tap';

const ICON = 26;
const PILL = { width: 60, height: 38 };
const EASE = { duration: 260, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };

const isDark = (hex: string) => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 128;
};
const rgba = (hex: string, a: number) => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dark = isDark(colors.bg);
  const [w, setW] = useState(0);
  const tabW = w / state.routes.length;
  // The pill's x: set in place on the first layout, then slides.
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (!tabW) return;
    const to = tabW * state.index + (tabW - PILL.width) / 2;
    x.value = placed.current ? withTiming(to, EASE) : to;
    placed.current = true;
  }, [tabW, state.index, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={{
      backgroundColor: colors.panel, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: space.s,
      boxShadow: `0 -3px 12px ${dark ? 'rgba(0,0,0,0.35)' : rgba(colors.text, 0.08)}`,
      ...(dark ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline } : null),
    }}>
      <View style={{ flexDirection: 'row' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {tabW > 0 && <Animated.View style={[{ position: 'absolute', top: 0, left: 0, ...PILL, borderRadius: radius.pill, backgroundColor: `${colors.accent}2e` }, pill]} />}
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const focused = state.index === i;
          const onPress = () => {
            haptic('tap');
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Tab key={route.key} focused={focused} title={options.title ?? route.name} onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              icon={options.tabBarIcon?.({ focused, color: focused ? colors.accent : colors.muted, size: ICON })} />
          );
        })}
      </View>
    </View>
  );
}

type TabProps = { focused: boolean; title: string; icon: React.ReactNode; onPress: () => void; onLongPress: () => void };

function Tab({ focused, title, icon, onPress, onLongPress }: TabProps) {
  const hop = useSharedValue(1);
  useEffect(() => {
    if (focused) hop.value = withSequence(withTiming(1.14, { duration: 110 }), withTiming(1, { duration: 170 }));
  }, [focused, hop]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: hop.value }] }));
  return (
    <Tap onPress={onPress} onLongPress={onLongPress} label={title} accessibilityRole="tab" accessibilityState={{ selected: focused }}
      style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View style={[{ ...PILL, alignItems: 'center', justifyContent: 'center' }, st]}>{icon}</Animated.View>
    </Tap>
  );
}
