// Sticker badge and trophy drawings (legacy STICKER_GLYPHS / SECRET_GLYPH / TROPHY_SVG in screens/daily.js).
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SECRET_GLYPH, STICKER_GLYPHS, type Prim } from '../game/album';
import { useColors } from '../theme/useColors';

function Glyph({ prims, size, color }: { prims: Prim[]; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {prims.map((p, i) => p.t === 'circle'
        ? <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={color} />
        : p.fill
          ? <Path key={i} d={p.d} fill={color} />
          : <Path key={i} d={p.d} fill="none" stroke={color} strokeWidth={p.sw || 2.4} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
  );
}

// A round badge: the page's glyph in white on the sticker's color, a white ring; off = grey and flat.
export function StickerBadge({ page, color, size = 54, off = false, hidden = false }: { page: string; color: string; size?: number; off?: boolean; hidden?: boolean }) {
  const colors = useColors();
  const ring = size >= 80 ? 4 : 3;
  return (
    <View style={[
      { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: off ? colors.sunken : color },
      off ? null : { borderWidth: ring, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
    ]}>
      <Glyph prims={hidden ? SECRET_GLYPH : STICKER_GLYPHS[page]} size={size * 0.52} color={off ? colors.muted : '#fff'} />
    </View>
  );
}

// Month / season trophy: gold, silver, or an empty grey outline.
export function Trophy({ kind, size = 44 }: { kind: string | null; size?: number }) {
  const colors = useColors();
  const fill = kind === 'gold' ? '#f5c542' : kind === 'silver' ? '#c9d2de' : 'none';
  const stroke = kind ? (kind === 'gold' ? '#b07a12' : '#8a96a8') : colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={kind ? 1 : 0.35}>
      <Path d="M7 3h10v5a5 5 0 0 1-10 0z" fill={fill} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M10 13h4v3h-4zM8 19.5h8V21H8zM9.5 16h5l1 3.5h-7z" fill={fill} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}
