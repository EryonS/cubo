// The tab bar's icons: solid toy shapes with their details cut out (a mask), so they read without a label.
// Jouer: a T piece. Défis: a calendar with a star. Boutique: a bag. Profil: Cubo's face.
import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, Mask, Path, Rect } from 'react-native-svg';

export type TabIconName = 'play' | 'defis' | 'shop' | 'profile';

const W = '#ffffff'; // kept
const B = '#000000'; // cut out

function Shape({ name }: { name: TabIconName }) {
  switch (name) {
    case 'play':
      return (
        <>
          <Rect x={1.5} y={5.25} width={6} height={6} rx={1.6} fill={W} />
          <Rect x={9} y={5.25} width={6} height={6} rx={1.6} fill={W} />
          <Rect x={16.5} y={5.25} width={6} height={6} rx={1.6} fill={W} />
          <Rect x={9} y={12.75} width={6} height={6} rx={1.6} fill={W} />
        </>
      );
    case 'defis':
      return (
        <>
          <Rect x={3} y={5} width={18} height={16.5} rx={4} fill={W} />
          <Rect x={6.9} y={2.5} width={2.8} height={5.2} rx={1.4} fill={W} />
          <Rect x={14.3} y={2.5} width={2.8} height={5.2} rx={1.4} fill={W} />
          <Rect x={3} y={8.9} width={18} height={1.5} fill={B} />
          <Path d="M12 11.4L13.09 14.2L16.09 14.37L13.76 16.27L14.53 19.18L12 17.55L9.47 19.18L10.24 16.27L7.91 14.37L10.91 14.2Z"
            fill={B} stroke={B} strokeWidth={0.9} strokeLinejoin="round" />
        </>
      );
    case 'shop':
      return (
        <>
          <Path d="M4.5 8.5h15l-1.2 11a2.5 2.5 0 0 1-2.5 2.2H8.2a2.5 2.5 0 0 1-2.5-2.2z" fill={W} stroke={W} strokeWidth={1} strokeLinejoin="round" />
          <Path d="M8.8 9V7a3.2 3.2 0 0 1 6.4 0v2" fill="none" stroke={W} strokeWidth={2.3} strokeLinecap="round" />
          <Circle cx={8.8} cy={12.2} r={1.25} fill={B} />
          <Circle cx={15.2} cy={12.2} r={1.25} fill={B} />
        </>
      );
    case 'profile':
      return (
        <>
          <Rect x={3} y={3.5} width={18} height={17} rx={5.5} fill={W} />
          <Ellipse cx={9.2} cy={10.8} rx={1.45} ry={1.75} fill={B} />
          <Ellipse cx={14.8} cy={10.8} rx={1.45} ry={1.75} fill={B} />
          <Path d="M9.2 14.4q2.8 2.6 5.6 0" fill="none" stroke={B} strokeWidth={1.9} strokeLinecap="round" />
        </>
      );
  }
}

export function TabIcon({ name, size = 26, color }: { name: TabIconName; size?: number; color: string }) {
  const id = `tab-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <Mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={24} height={24}>
          <Shape name={name} />
        </Mask>
      </Defs>
      <Rect x={0} y={0} width={24} height={24} fill={color} mask={`url(#${id})`} />
    </Svg>
  );
}
