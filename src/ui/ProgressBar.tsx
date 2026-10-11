// A thin progress track that fills with the accent (missions, Album, event levels). value: 0 to 1, animated.
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useColors } from '../theme/useColors';

export function ProgressBar({ value, height = 8, style }: { value: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }); }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: colors.sunken, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: colors.accent }, fill]} />
    </View>
  );
}
