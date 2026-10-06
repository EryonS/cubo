// Line icons drawn as SVG paths (no emoji, no icon font). Paths from the legacy markup.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'play' | 'defis' | 'shop' | 'profile' | 'chevDown' | 'chevRight' | 'chevLeft' | 'close' | 'map' | 'puzzle' | 'target' | 'undo' | 'pause' | 'trash' | 'share' | 'check' | 'lock' | 'gear';

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
      {name === 'chevDown' && <Path d="M6 9l6 6 6-6" {...stroke} strokeWidth={3} />}
      {name === 'chevRight' && <Path d="M9 5l7 7-7 7" {...stroke} strokeWidth={3} />}
      {name === 'chevLeft' && <Path d="M15 5l-7 7 7 7" {...stroke} strokeWidth={3} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...stroke} strokeWidth={3} />}
      {name === 'map' && (
        <>
          <Path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z" {...stroke} strokeWidth={2.6} />
          <Path d="M9 4v14M15 6v14" {...stroke} strokeWidth={2.6} />
        </>
      )}
      {name === 'puzzle' && <Path d="M4 8.5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z" {...stroke} />}
      {name === 'target' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...stroke} />
          <Circle cx={12} cy={12} r={4.5} {...stroke} />
          <Circle cx={12} cy={12} r={1} fill={color} />
        </>
      )}
      {name === 'undo' && (
        <>
          <Path d="M9 14L4 9l5-5" {...stroke} />
          <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" {...stroke} />
        </>
      )}
      {name === 'pause' && (
        <>
          <Rect x={6} y={4.5} width={4.2} height={15} rx={1.6} fill={color} />
          <Rect x={13.8} y={4.5} width={4.2} height={15} rx={1.6} fill={color} />
        </>
      )}
      {name === 'trash' && <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" {...stroke} strokeWidth={2.2} />}
      {name === 'share' && <Path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...stroke} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} strokeWidth={3} />}
      {name === 'lock' && (
        <>
          <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...stroke} />
          <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...stroke} />
        </>
      )}
      {name === 'gear' && (
        <>
          <Circle cx={12} cy={12} r={3} {...stroke} strokeWidth={2} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...stroke} strokeWidth={2} />
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

const STAR = 'M12 2.6l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1l-5.7 3 1.1-6.3L2.8 9.3l6.4-.9z';
// edge: an outline around a lit star, for light or yellow backgrounds.
export function Star({ size = 16, on = true, color = '#ffd23f', edge }: { size?: number; on?: boolean; color?: string; edge?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={on ? color : 'none'} stroke={on ? edge ?? 'none' : color} strokeWidth={on ? 2 : 1.8} strokeLinejoin="round" opacity={on ? 1 : 0.45} />
    </Svg>
  );
}

// Streak flame: lit when the streak runs.
export function Flame({ size = 18, on = true, color }: { size?: number; on?: boolean; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.3.2 1.7 1 2.8 2.1 3.3-.4-3.3.3-6.3 1-9z" fill={on ? '#ff7a1a' : color} opacity={on ? 1 : 0.35} />
      {on && <Path d="M12 13.5c.9 1.4 2.6 2.2 2.6 4.2a2.6 2.6 0 0 1-5.2 0c0-1.5.9-2.6 2.6-4.2z" fill="#ffd23f" />}
    </Svg>
  );
}

// Streak freeze: an ice-blue snowflake, faded when the slot is empty.
export function Snow({ size = 22, on = true, color }: { size?: number; on?: boolean; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={on ? 1 : 0.3}>
      <Path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" fill="none" stroke={on ? '#3fb7e8' : color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
