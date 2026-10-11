// Stats (legacy stats.js): one mode at a time (tabs over the card, as in the Boutique; four numbers, bar chart of the last 20 scores) in one card,
// flat inside (no tile or panel in the card), and the lifetime counters as a grouped list.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { M } from '../../core';
import { locale, tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { barPath, chartBars, CHART_H, CHART_RUNS, CHART_W, lifetimeRows, modeTiles, STAT_MODES } from '../../game/album';
import { useGame } from '../../state/store';
import { fonts } from '../../theme/fonts';
import { space, TOUCH } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Card } from '../../ui/Card';
import { Group } from '../../ui/Group';
import { Segmented } from '../../ui/Segmented';
import { Text } from '../../ui/Text';

const fmt = (n: number) => n.toLocaleString(locale());

function Chart({ scores }: { scores: number[] }) {
  const colors = useColors();
  const [on, setOn] = useState<number | null>(null);
  if (!scores.length) {
    return <Text variant="muted">{tr('Tes prochaines parties dans ce mode s’afficheront ici.')}</Text>;
  }
  const { bars, peak } = chartBars(scores);
  const n = scores.length;
  const px = bars[peak].x + bars[peak].w / 2;
  const cap = on === null
    ? tr`${n} dernière${n > 1 ? 's' : ''} partie${n > 1 ? 's' : ''} · meilleure : ${fmt(scores[peak])}`
    : tr`${on + 1 === n ? tr('Dernière partie') : tr`Partie ${on + 1} sur ${n}`} : ${fmt(scores[on])} points`;
  return (
    <View>
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

// The four numbers in a 2 x 2 grid split by hairlines, like the profile totals.
function Tiles({ tiles }: { tiles: { label: string; value: string }[] }) {
  const colors = useColors();
  const line = { borderColor: colors.hairline };
  return (
    <View>
      {[0, 2].map((r) => (
        <View key={r} style={[{ flexDirection: 'row' }, r ? { borderTopWidth: StyleSheet.hairlineWidth, ...line } : null]}>
          {tiles.slice(r, r + 2).map((t, i) => (
            <View key={t.label} accessible accessibilityLabel={`${t.value} ${t.label}`}
              style={[{ flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: space.s, paddingHorizontal: space.s }, i ? { borderLeftWidth: StyleSheet.hairlineWidth, ...line } : null]}>
              <Text variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>{t.value}</Text>
              <Text variant="caption" numberOfLines={1}>{t.label}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ModeStats() {
  const profile = useGame((s) => s.profile);
  const bests = useGame((s) => s.saved.bests);
  const [mode, setMode] = useState('classic');
  const tiles = modeTiles(profile, mode, bests, fmt);
  return (
    <>
      <Segmented role="tab" options={STAT_MODES() as [string, string][]} value={mode} onChange={(v) => { sfx.turn(); setMode(v); }} />
      <Card>
        <Tiles tiles={tiles} />
        <Chart key={mode} scores={M.recentScores(profile, mode, CHART_RUNS)} />
      </Card>
    </>
  );
}

export function Lifetime() {
  const profile = useGame((s) => s.profile);
  return (
    <Group>
      {lifetimeRows(profile, fmt).map(([k, v]) => (
        <View key={k} accessible accessibilityLabel={`${k} : ${v}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: TOUCH, paddingVertical: space.s, paddingHorizontal: space.l }}>
          <Text style={{ flex: 1 }}>{k}</Text>
          <Text variant="headline" style={{ fontVariant: ['tabular-nums'] }}>{v}</Text>
        </View>
      ))}
    </Group>
  );
}
