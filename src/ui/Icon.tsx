// Line icons drawn as SVG paths (no emoji, no icon font). Paths from the legacy markup.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'play' | 'defis' | 'shop' | 'profile';

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'play' && (
        <>
          <Rect x={3.5} y={3.5} width={7} height={7} rx={2} {...stroke} />
          <Rect x={13.5} y={3.5} width={7} height={7} rx={2} {...stroke} />
          <Rect x={3.5} y={13.5} width={7} height={7} rx={2} {...stroke} />
          <Path d="M15 17h5M17.5 14.5v5" {...stroke} />
        </>
      )}
      {name === 'defis' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...stroke} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...stroke} />
          <Path d="M9 15l2 2 4-4" {...stroke} />
        </>
      )}
      {name === 'shop' && (
        <>
          <Path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" {...stroke} />
          <Path d="M9 10V7a3 3 0 0 1 6 0v3" {...stroke} />
        </>
      )}
      {name === 'profile' && (
        <>
          <Circle cx={12} cy={8} r={4} {...stroke} />
          <Path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" {...stroke} />
        </>
      )}
    </Svg>
  );
}
