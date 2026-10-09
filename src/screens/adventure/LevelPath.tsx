// The 20 levels of a world on a winding path (legacy #levels + drawPath): rows of 5, every other row runs
// right to left; a line joins them, solid up to the last cleared level, dotted after.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { M } from '../../core';
import { tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { haptic } from '../../platform/haptics';
import { useGame } from '../../state/store';
import { levelName } from '../../state/progress';
import { fonts } from '../../theme/fonts';
import { useColors } from '../../theme/useColors';
import { Icon } from '../../ui/Icon';
import { StarRow } from '../../ui/Stars';
import { Text } from '../../ui/Text';

const GAP = 8;
const ROW_H = 76;
const pos = (n: number) => {
  const row = Math.floor((n - 1) / 5);
  return { row, col: row % 2 ? 4 - ((n - 1) % 5) : (n - 1) % 5 };
};

// hot: the next level to play, the only one on the accent (test mode opens them all).
function Disc({ n, open, done, hot, boss, trial }: { n: number; open: boolean; done: boolean; hot: boolean; boss: boolean; trial: boolean }) {
  const colors = useColors();
  const r = boss ? 16 : trial ? 14 : 24;
  const w = boss ? 54 : 48;
  const bg = hot ? colors.accent : colors.panel;
  const ring = trial ? '#ffd166' : done ? colors.good : !open ? colors.hairline : 'transparent';
  return (
    <View style={{ width: w, height: 52 }}>
      <View style={{ position: 'absolute', top: 4, width: w, height: 48, borderRadius: r, backgroundColor: 'rgba(0,0,0,0.15)' }} />
      <View style={{ width: w, height: 48, borderRadius: r, backgroundColor: bg, borderWidth: trial ? 3 : 2, borderColor: ring, alignItems: 'center', justifyContent: 'center' }}>
        {open
          ? <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: hot ? colors.onAccent : colors.text }}>{n}</Text>
          : <Icon name="lock" size={18} color={colors.muted} />}
      </View>
    </View>
  );
}

export function LevelPath({ w, locked, onPick }: { w: string; locked: boolean; onPick: (n: number) => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const [width, setWidth] = useState(0);
  const cw = (width - 4 * GAP) / 5;
  const center = (n: number) => { const p = pos(n); return [p.col * (cw + GAP) + cw / 2, p.row * ROW_H + 24] as const; };
  const levels = Array.from({ length: M.LEVELS_PER_WORLD }, (_, i) => i + 1);
  const cleared = levels.filter((n) => M.levelStars(profile, w, n) !== undefined).length;
  const line = (a: readonly (readonly [number, number])[]) => a.map((p, i) => (i ? 'L' : 'M') + Math.round(p[0]) + ' ' + Math.round(p[1])).join('');
  const pts = width ? levels.map(center) : [];
  return (
    <View style={{ height: 3 * ROW_H + 70, opacity: locked ? 0.55 : 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={3 * ROW_H + 70} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Path d={line(pts.slice(Math.max(0, cleared - 1)))} fill="none" stroke={colors.hairline} strokeWidth={6} strokeLinecap="round" strokeDasharray="0.1 13" />
          {cleared > 1 && <Path d={line(pts.slice(0, cleared))} fill="none" stroke={colors.accent} strokeOpacity={0.3} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
        </Svg>
      )}
      {width > 0 && levels.map((n) => {
        const open = M.levelOpen(profile, w, n);
        const stars = M.levelStars(profile, w, n);
        const boss = n === M.LEVELS_PER_WORLD;
        const trial = n === M.TRIAL_LEVEL;
        const p = pos(n);
        return (
          <Pressable key={n} accessibilityRole="button"
            accessibilityLabel={levelName(n) + (trial || boss ? tr` (niveau ${n})` : '') + (open ? '' : tr(', verrouillé'))}
            onPress={() => { if (open) { sfx.turn(); onPick(n); } else { sfx.nope(); haptic('nope'); } }}
            style={({ pressed }) => ({ position: 'absolute', left: p.col * (cw + GAP), top: p.row * ROW_H, width: cw, alignItems: 'center', gap: 3, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <Disc n={n} open={open} done={stars !== undefined} hot={open && stars === undefined && (n === 1 || M.levelCleared(profile, w, n - 1))} boss={boss} trial={trial} />
            {(boss || trial) && stars === undefined
              ? <Text variant="muted" style={{ fontSize: 12, marginTop: -2, textTransform: 'uppercase', letterSpacing: 0.6, lineHeight: 14 }}>{boss ? tr('Boss') : tr('Épreuve')}</Text>
              : <StarRow n={stars || 0} size={12} />}
          </Pressable>
        );
      })}
    </View>
  );
}
