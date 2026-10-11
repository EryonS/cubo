// Profil tab (legacy #profile): Cubo in the header, the three headline totals, then sections as on Paramètres:
// Collection (Album and what is owned of each Boutique shelf), Trophées (month and season shelves), stats per
// mode and the lifetime counters. Paramètres sits on the header's right.
import { useMemo, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { M } from '../core';
import { locale, tr } from '../core/i18n';
import * as Soc from '../core/social';
import type { SkinKind } from '../core/types';
import { accountInfo, subscribeAccount } from '../game/account';
import { useSocial } from '../game/social';
import { available } from '../platform/cloud';
import { albumPages, monthShelf, seasonShelf, type Trophy as T } from '../game/album';
import { cuboLookFor } from '../mascot/looks';
import type { RootParams, TabParams } from '../navigation/types';
import { boardTheme } from '../render/board-themes';
import { drawCuboPreview } from '../render/cubo-preview';
import { drawBlock } from '../render/draw';
import type { G } from '../render/g';
import { drawPreview } from '../render/preview';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';
import { Card } from '../ui/Card';
import { CuboPose } from '../ui/CuboPose';
import { DrawCanvas } from '../ui/DrawCanvas';
import { Group } from '../ui/Group';
import { Icon } from '../ui/Icon';
import { ListRow } from '../ui/ListRow';
import { ProgressBar } from '../ui/ProgressBar';
import { Screen } from '../ui/Screen';
import { HeaderButton } from '../ui/ScreenHeader';
import { Section } from '../ui/SectionLabel';
import { StickerBadge, Trophy } from '../ui/StickerArt';
import { Text } from '../ui/Text';
import { Lifetime, ModeStats } from './profile/StatsBlock';

const fmt = (n: number) => n.toLocaleString(locale());
const monthShort = (m: string) => new Date(m + '-15T12:00:00').toLocaleDateString(locale(), { month: 'short' });

// The three totals side by side in one card, split by hairlines.
function Totals({ items }: { items: [string, string][] }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', borderRadius: radius.card, backgroundColor: colors.panel, paddingVertical: space.m, ...raised(colors) }}>
      {items.map(([label, value], i) => (
        <View key={label} accessible accessibilityLabel={`${value} ${label}`}
          style={{ flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: space.s, borderLeftWidth: i ? StyleSheet.hairlineWidth : 0, borderLeftColor: colors.hairline }}>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
          <Text variant="caption" numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Shelf({ title, items }: { title: string; items: T[] }) {
  return (
    <View style={{ gap: space.s }}>
      <Text variant="headline">{title}</Text>
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

// Row icons of the Collection list: one 48 pt column so the titles line up.
const ICON_W = 48;
const Thumb = ({ draw, deps }: { draw: (g: G, w: number, h: number) => void; deps: unknown[] }) => (
  <DrawCanvas width={ICON_W} radius={8} deps={deps} draw={draw} />
);

function CommunityBadge() {
  const colors = useColors();
  return (
    <View style={{ width: ICON_W, alignItems: 'center' }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="profile" size={22} color={colors.onAccent} />
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const nav = useNavigation<NavigationProp<RootParams & TabParams>>();
  const profile = useGame((s) => s.profile);
  const bests = useGame((s) => s.saved.bests);
  const { boards: eqBoard, blocks: eqBlocks, cubo: eqCubo } = profile.equipped;
  const look = useMemo(() => cuboLookFor(eqBoard, eqCubo), [eqBoard, eqCubo]);
  const signed = useSyncExternalStore(subscribeAccount, accountInfo, accountInfo);
  const me = useSocial((s) => s.me);
  const day = today();
  const { count, total } = albumPages(profile);
  const season = seasonShelf(profile, day);
  const lt = (profile.lifetime || {}) as Record<string, number>;
  const best = Math.max(lt.score || 0, ...Object.values(bests || {}));
  const totals: [string, string][] = [
    [tr('Parties'), fmt(lt.games || profile.games || 0)],
    [tr('Étoiles'), fmt(M.totalStars(profile))],
    [tr('Meilleur score'), fmt(best)],
  ];
  const owned = (kind: SkinKind) => `${(profile.owned[kind] || []).length} / ${M.SKINS[kind].length}`;
  const nameOf = (kind: SkinKind) => M.SKINS[kind].find((sk) => sk.id === profile.equipped[kind])?.name;
  const shop = (tab: SkinKind) => nav.navigate('Shop', { tab });
  return (
    // The canvas keeps room for the sprout above the body: the body's middle sits 12 pt under the canvas middle and
    // 11 pt of air on each side. The margins put the body on the title's line and its left edge on the screen gutter.
    <Screen title={tr('Profil')} lead={(
      <View style={{ marginTop: -24, marginLeft: -11, marginRight: -8 }}>
        <CuboPose width={64} lw={128} lh={134} s={84} foot={8} look={look} mood="party" />
      </View>
    )} right={<HeaderButton icon="gear" size={22} label={tr('Paramètres')} onPress={() => nav.navigate('Settings')} />}>
      <Totals items={totals} />

      {available() && (
        <Section title={tr('Communauté')}>
          <Group>
            <ListRow title={signed && me ? me.name : tr('Communauté')} right="chevron" onPress={() => nav.navigate('Community')} icon={<CommunityBadge />}
              sub={signed && me ? Soc.showCode(me.code) : signed ? tr('Choisis ton pseudo et ajoute des amis') : tr('Connecte-toi pour avoir un pseudo et des amis')} />
          </Group>
        </Section>
      )}

      <Section title={tr('Collection')} info={tr`Les autocollants récompensent tes exploits : chacun rapporte ${M.STICKER_REWARD} pièces. Thèmes, blocs et tenues de Cubo s’achètent à la Boutique ; certains se gagnent en battant le boss d’un monde ou pendant un événement.`}>
        <Group>
          <ListRow title={tr('Album')} sub={tr`${count} / ${total} autocollants`} right="chevron" onPress={() => nav.navigate('Album')}
            icon={<View style={{ width: ICON_W, alignItems: 'center' }}><StickerBadge page="combo" color="#ff8fab" size={40} /></View>}>
            <ProgressBar value={total ? count / total : 0} height={6} style={{ marginTop: space.s }} />
          </ListRow>
          <ListRow title={tr('Thèmes')} sub={`${nameOf('boards')} · ${owned('boards')}`} right="chevron" onPress={() => shop('boards')}
            icon={<Thumb deps={[eqBoard, eqBlocks]} draw={(g, w, h) => drawPreview(g, boardTheme(eqBoard, eqBlocks), w, h)} />} />
          <ListRow title={tr('Blocs')} sub={`${nameOf('blocks')} · ${owned('blocks')}`} right="chevron" onPress={() => shop('blocks')}
            icon={<Thumb deps={[eqBoard, eqBlocks]} draw={(g, w, h) => {
              // Four blocks of the equipped skin, in the equipped theme's palette.
              const th = boardTheme(eqBoard, eqBlocks);
              const c = Math.min(w, h) / 2;
              const ox = (w - 2 * c) / 2;
              const oy = (h - 2 * c) / 2;
              [1, 4, 9, 11].forEach((v, i) => drawBlock(g, th, ox + (i % 2 + 0.5) * c, oy + (Math.floor(i / 2) + 0.5) * c, c, th.palette[v] || th.ink, 1, 1, null, v));
            }} />} />
          <ListRow title={tr('Tenues de Cubo')} sub={`${nameOf('cubo')} · ${owned('cubo')}`} right="chevron" onPress={() => shop('cubo')}
            icon={<Thumb deps={[eqBoard, eqCubo]} draw={(g, w) => drawCuboPreview(g, boardTheme(eqBoard), eqBoard, eqCubo, w)} />} />
        </Group>
      </Section>

      <Section title={tr('Trophées')} info={tr('Trophée du mois : réussis le défi de chaque jour du mois, même en rattrapant un jour passé ; en or avec 3 étoiles partout. Trophée de saison : il suit tes étoiles dans un événement ; bronze à 70 %, argent à 80 %, or à 90 %, diamant avec toutes.')}>
        <Card>
          <Shelf title={tr('Du mois')} items={monthShelf(profile, day, monthShort)} />
          {season.length > 0 && <Shelf title={tr('De saison')} items={season} />}
        </Card>
      </Section>

      <Section title={tr('Stats par mode')}>
        <ModeStats />
      </Section>

      <Section title={tr('Depuis le début')}>
        <Lifetime />
      </Section>
    </Screen>
  );
}
