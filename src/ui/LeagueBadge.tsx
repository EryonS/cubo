// A league's shield, drawn (no emoji): a rim, a face and a gem in the tier's color. A dark rim on a light face keeps
// it readable on light, dark and Rétro panels alike. Higher tiers add a gem dot and crown ticks.
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { clampTier, tierName } from '../core/league';

// rim, face, gem highlight: Bronze, Argent, Or, Saphir, Rubis, Diamant.
const TONES: [string, string, string][] = [
  ['#8a5230', '#d99a6c', '#fbe3cf'],
  ['#6b7585', '#cfd6e0', '#ffffff'],
  ['#b07a00', '#ffd23f', '#fff4c2'],
  ['#1f4fb0', '#5b93f2', '#d6e6ff'],
  ['#a01c3a', '#ee4d6e', '#ffd3dc'],
  ['#1b8a9e', '#7fe3f2', '#f0feff'],
];

export function LeagueBadge({ tier, size = 40 }: { tier: number; size?: number }) {
  const t = clampTier(tier);
  const [rim, face, shine] = TONES[t];
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityRole="image" accessibilityLabel={tierName(t)}>
      <Path d="M20 2.5 L35 7.5 V19 C35 28.5 28.5 34.5 20 38 C11.5 34.5 5 28.5 5 19 V7.5 Z" fill={face} stroke={rim} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M20 7 L30.5 10.6 V19 C30.5 25.8 26 30.4 20 33 C14 30.4 9.5 25.8 9.5 19 V10.6 Z" fill="none" stroke={rim} strokeOpacity={0.35} strokeWidth={1.5} strokeLinejoin="round" />
      <Polygon points="20,11.5 27,18.5 20,28.5 13,18.5" fill={rim} />
      <Polygon points="20,11.5 27,18.5 20,18.5" fill={shine} fillOpacity={0.55} />
      {t >= 2 && <Circle cx={20} cy={18.5} r={1.8} fill={shine} />}
      {t >= 4 && <Path d="M12.5 8.2 L14 11 M27.5 8.2 L26 11" stroke={rim} strokeWidth={2} strokeLinecap="round" />}
    </Svg>
  );
}
