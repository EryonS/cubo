// Profil tab (legacy #profile): Cubo and the totals, trophies, the sticker album entry, stats per mode and
// lifetime counters, Réglages.
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { M } from '../core';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { albumPages, monthShelf, seasonShelf, type Trophy as T } from '../game/album';
import { cuboLookFor } from '../mascot/looks';
import type { RootParams } from '../navigation/types';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Card } from '../ui/Card';
import { CuboPose } from '../ui/CuboPose';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { StickerBadge, Trophy } from '../ui/StickerArt';
import { Text } from '../ui/Text';
import { StatsBlock } from './profile/StatsBlock';

const monthShort = (m: string) => new Date(m + '-15T12:00:00').toLocaleDateString(locale(), { month: 'short' });

function Shelf({ title, items }: { title: string; items: T[] }) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="muted" style={{ fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 2 }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
        {items.map((t) => (
          <View key={t.key} style={{ width: 70, alignItems: 'center' }}>
            <Trophy kind={t.kind} />
            <Text variant="muted" style={{ fontSize: 12, textAlign: 'center', color: colors.muted }}>{t.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Row({ label, sub, onPress, left }: { label: string; sub?: string; onPress: () => void; left?: React.ReactNode }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={() => { sfx.turn(); onPress(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        {left}
        <View style={{ flex: 1 }}>
          <Text variant="title" style={{ fontSize: 20 }}>{label}</Text>
          {sub ? <Text variant="muted">{sub}</Text> : null}
        </View>
        <Icon name="chevRight" size={16} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

export function ProfileScreen() {
  const colors = useColors();
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
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <CuboPose width={76} lw={152} lh={160} s={100} foot={9} look={look} mood="party" />
        <Text variant="title" style={{ flex: 1, fontSize: 32, textTransform: 'uppercase' }}>{tr('Profil')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {totals.map(([k, v]) => (
          <View key={k} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.card - 6, backgroundColor: colors.panel }}>
            <Text variant="title" style={{ fontSize: 22, lineHeight: 26 }}>{v}</Text>
            <Text variant="muted" style={{ fontSize: 12 }}>{k}</Text>
          </View>
        ))}
      </View>
      <Row label={tr('Album')} sub={tr`Autocollants · ${count} / ${total}`} onPress={() => nav.navigate('Album')}
        left={<StickerBadge page="combo" color="#ff8fab" size={44} />} />
      <Card>
        <Shelf title={tr('Trophées du mois')} items={monthShelf(profile, day, monthShort)} />
        {season.length > 0 && <View style={{ marginTop: space.s }}><Shelf title={tr('Trophées de saison')} items={season} /></View>}
      </Card>
      <Card><StatsBlock /></Card>
      <Row label={tr('Réglages')} onPress={() => nav.navigate('Settings')} />
    </Screen>
  );
}
