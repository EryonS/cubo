// Profil tab (legacy #profile): Cubo and the totals, trophies, the sticker album entry, stats per mode and
// lifetime counters, the cloud account. Réglages sits on the header's right.
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { M } from '../core';
import { locale, tr } from '../core/i18n';
import { albumPages, monthShelf, seasonShelf, type Trophy as T } from '../game/album';
import { cuboLookFor } from '../mascot/looks';
import type { RootParams } from '../navigation/types';
import { available } from '../platform/cloud';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { AccountBlock } from '../ui/AccountBlock';
import { Card } from '../ui/Card';
import { CuboPose } from '../ui/CuboPose';
import { ListRow } from '../ui/ListRow';
import { Screen } from '../ui/Screen';
import { HeaderButton } from '../ui/ScreenHeader';
import { SectionLabel } from '../ui/SectionLabel';
import { StatTile } from '../ui/StatTile';
import { StickerBadge, Trophy } from '../ui/StickerArt';
import { Text } from '../ui/Text';
import { StatsBlock } from './profile/StatsBlock';

const monthShort = (m: string) => new Date(m + '-15T12:00:00').toLocaleDateString(locale(), { month: 'short' });

function Shelf({ title, items }: { title: string; items: T[] }) {
  return (
    <View style={{ gap: space.s }}>
      <Text variant="label">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.m }}>
        {items.map((t) => (
          <View key={t.key} style={{ width: 72, alignItems: 'center', gap: space.xs }}>
            <Trophy kind={t.kind} />
            <Text variant="caption" style={{ textAlign: 'center' }}>{t.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function ProfileScreen() {
  const nav = useNavigation<NavigationProp<RootParams>>();
  const profile = useGame((s) => s.profile);
  const look = useMemo(() => cuboLookFor(profile.equipped.boards, profile.equipped.cubo), [profile.equipped.boards, profile.equipped.cubo]);
  const day = today();
  const { count, total } = albumPages(profile);
  const season = seasonShelf(profile, day);
  const totals: [string, string][] = [
    [tr('Parties'), String(((profile.lifetime as Record<string, number> | undefined)?.games) || profile.games || 0)],
    [tr('Étoiles'), String(M.totalStars(profile))],
    [tr('Autocollants'), `${count} / ${total}`],
  ];
  return (
    // The canvas keeps room for the sprout above the body: the body's middle sits 12 pt under the canvas middle and
    // 11 pt of air on each side. The margins put the body on the title's line and its left edge on the screen gutter.
    <Screen title={tr('Profil')} lead={(
      <View style={{ marginTop: -24, marginLeft: -11, marginRight: -8 }}>
        <CuboPose width={64} lw={128} lh={134} s={84} foot={8} look={look} mood="party" />
      </View>
    )} right={<HeaderButton icon="gear" size={22} label={tr('Réglages')} onPress={() => nav.navigate('Settings')} />}>
      <View style={{ flexDirection: 'row', gap: space.m }}>
        {totals.map(([k, v]) => <StatTile key={k} value={v} label={k} />)}
      </View>
      <ListRow big title={tr('Album')} sub={tr`Autocollants · ${count} / ${total}`} onPress={() => nav.navigate('Album')} right="chevron"
        icon={<StickerBadge page="combo" color="#ff8fab" size={44} />} />
      <Card>
        <Shelf title={tr('Trophées du mois')} items={monthShelf(profile, day, monthShort)} />
        {season.length > 0 && <Shelf title={tr('Trophées de saison')} items={season} />}
      </Card>
      <Card><StatsBlock /></Card>
      {available() && (
        <View style={{ gap: space.s }}>
          <SectionLabel>{tr('Sauvegarde en ligne')}</SectionLabel>
          <AccountBlock />
        </View>
      )}
    </Screen>
  );
}
