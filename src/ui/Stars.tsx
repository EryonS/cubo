// The Aventure star (legacy starSvg: gold with an amber edge, a sunken socket when off), a row of them,
// the star chest and the mastered-world crown.
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { useColors } from '../theme/useColors';

const STAR_PATH = 'M12 2.6l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1l-5.7 3 1.1-6.3L2.8 9.3l6.4-.9z';

export function LStar({ size = 16, on }: { size?: number; on: boolean }) {
  const colors = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR_PATH} fill={on ? '#ffc83d' : colors.sunken} stroke={on ? '#d99a00' : 'none'} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}

// n of 3 on. animate: the stars pop in one after the other (0, 180, 360 ms), as the level end card.
export function StarRow({ n, size = 12, gap = 1, animate = false }: { n: number; size?: number; gap?: number; animate?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap }} accessibilityLabel={`${n}/3`}>
      {[0, 1, 2].map((k) => animate
        ? <Animated.View key={k} entering={ZoomIn.delay(k * 180).duration(420)}><LStar size={size} on={k < n} /></Animated.View>
        : <LStar key={k} size={size} on={k < n} />)}
    </View>
  );
}

export function ChestIcon({ grey = false }: { grey?: boolean }) {
  return (
    <View style={grey ? { opacity: 0.5 } : undefined}>
      <Svg width={30} height={26} viewBox="0 0 30 26">
        <Path d="M3 11h24v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill={grey ? '#9a9a9a' : '#c98b4a'} />
        <Path d="M3 11V8a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v3z" fill={grey ? '#b5b5b5' : '#e0a45e'} />
        <Path d="M3 11h24" stroke={grey ? '#6e6e6e' : '#8a5526'} strokeWidth={2.4} />
        <Rect x={12} y={8.5} width={6} height={7} rx={1.6} fill={grey ? '#cfcfcf' : '#ffd166'} stroke={grey ? '#6e6e6e' : '#8a5526'} strokeWidth={1.6} />
      </Svg>
    </View>
  );
}

export function Crown({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 18.5 2.5 7l5.2 4.3L12 4l4.3 7.3L21.5 7l-1 11.5z" fill="#f5b700" stroke="rgba(0,0,0,.25)" strokeWidth={1} strokeLinejoin="round" />
      <Rect x={3.5} y={19.3} width={17} height={2.2} rx={1} fill="#f5b700" />
    </Svg>
  );
}
