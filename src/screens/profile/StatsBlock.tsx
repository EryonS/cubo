// Stats (legacy stats.js): one mode at a time (pills, four tiles, bar chart of the last 20 scores), then the
// lifetime counters.
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { M } from '../../core';
import { locale, tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { barPath, chartBars, CHART_H, CHART_RUNS, CHART_W, lifetimeRows, modeTiles, STAT_MODES } from '../../game/album';
import { useGame } from '../../state/store';
import { fonts } from '../../theme/fonts';
import { radius, space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Segmented } from '../../ui/Segmented';
import { StatTile } from '../../ui/StatTile';
import { Text } from '../../ui/Text';

const fmt = (n: number) => n.toLocaleString(locale());

function Chart({ scores }: { scores: number[] }) {
  const colors = useColors();
  const [on, setOn] = useState<number | null>(null);
  if (!scores.length) {
    return <View style={{ padding: space.m, borderRadius: radius.tile, backgroundColor: colors.panel2 }}><Text variant="muted">{tr('Tes prochaines parties dans ce mode s’afficheront ici.')}</Text></View>;
  }
  const { bars, peak } = chartBars(scores);
  const n = scores.length;
  const px = bars[peak].x + bars[peak].w / 2;
  const cap = on === null
    ? tr`${n} dernière${n > 1 ? 's' : ''} partie${n > 1 ? 's' : ''} · meilleure : ${fmt(scores[peak])}`
    : tr`${on + 1 === n ? tr('Dernière partie') : tr`Partie ${on + 1} sur ${n}`} : ${fmt(scores[on])} points`;
  return (
    <View style={{ padding: space.m, borderRadius: radius.tile, backgroundColor: colors.panel2 }}>
      <Svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H + 1}`} style={{ aspectRatio: CHART_W / (CHART_H + 1) }}>
        {bars.map((b, i) => (
          <G key={i} onPress={() => { sfx.turn(); setOn(i); }}>
            <Rect x={b.slotX} y={0} width={b.slotW} height={CHART_H} fill="transparent" />
            <Path d={barPath(b)} fill={colors.accent} opacity={on === i ? 1 : 0.85} />
          </G>
        ))}
        <Line x1={0} x2={CHART_W} y1={CHART_H + 0.5} y2={CHART_H + 0.5} stroke={colors.hairline} strokeWidth={1} />
        <SvgText x={Math.min(CHART_W - 4, Math.max(4, px))} y={bars[peak].y - 4} textAnchor={px < 30 ? 'start' : px > CHART_W - 30 ? 'end' : 'middle'}
          fill={colors.text} fontFamily={fonts.display} fontSize={11}>{fmt(scores[peak])}</SvgText>
      </Svg>
      <Text variant="caption" style={{ marginTop: space.s }}>{cap}</Text>
    </View>
  );
}

export function StatsBlock() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const bests = useGame((s) => s.saved.bests);
  const [mode, setMode] = useState('classic');
  const tiles = modeTiles(profile, mode, bests, fmt);
  return (
    <View style={{ gap: space.m }}>
      <Text variant="label">{tr('Stats')}</Text>
      <Segmented kind="chips" inset options={STAT_MODES() as [string, string][]} value={mode} onChange={(v) => { sfx.turn(); setMode(v); }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {tiles.map((t) => <StatTile key={t.label} inset value={t.value} label={t.label} style={{ flexBasis: '45%', flexGrow: 1 }} />)}
      </View>
      <Chart key={mode} scores={M.recentScores(profile, mode, CHART_RUNS)} />
      <Text variant="label" style={{ marginTop: space.s }}>{tr('Depuis le début')}</Text>
      <View>
        {lifetimeRows(profile, fmt).map(([k, v], i, a) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40, paddingHorizontal: space.xs, borderBottomWidth: i === a.length - 1 ? 0 : 1, borderBottomColor: colors.hairline }}>
            <Text variant="muted" style={{ color: colors.text, flex: 1 }}>{k}</Text>
            <Text variant="headline" style={{ fontVariant: ['tabular-nums'] }}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
