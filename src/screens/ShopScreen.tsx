// Boutique tab (legacy screens/shop.js): Thèmes / Blocs / Cubo / Bonus. A skin tab is sections as on Profil and
// Défis: what is owned (three to a row, tap to wear), what is for sale and what is won elsewhere (events, streak, two
// to a row), each one card holding its skins split by hairlines. Bonus: the reserve and the upgrades, one list each.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { L, M } from '../core';
import { locale, tr } from '../core/i18n';
import type { BonusType, SkinKind } from '../core/types';
import { sfx } from '../audio/engine';
import { BONUS_UI, BONUS_TYPES } from '../game/bonus-ui';
import { haptic } from '../platform/haptics';
import { boardTheme } from '../render/board-themes';
import { cuboLookFor } from '../mascot/looks';
import { drawCuboPreview } from '../render/cubo-preview';
import { drawPreview } from '../render/preview';
import { today } from '../state/persist';
import type { TabParams } from '../navigation/types';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Card } from '../ui/Card';
import { Counter } from '../ui/Counter';
import { CuboPose } from '../ui/CuboPose';
import { DrawCanvas } from '../ui/DrawCanvas';
import { Icon } from '../ui/Icon';
import { Group } from '../ui/Group';
import { ListRow } from '../ui/ListRow';
import { PriceButton, StatePill } from '../ui/PriceButton';
import { Segmented } from '../ui/Segmented';
import { Tap } from '../ui/Tap';
import { showStickers } from '../ui/StickerBanner';
import { IconCanvas } from '../ui/IconCanvas';
import { Screen } from '../ui/Screen';
import { Section } from '../ui/SectionLabel';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());
type Tab = SkinKind | 'bonus';
const TABS: [Tab, () => string][] = [['boards', () => tr('Thèmes')], ['blocks', () => tr('Blocs')], ['cubo', () => tr('Cubo')], ['bonus', () => tr('Bonus')]];

// Paid stickers (collector page) can fall due on a purchase: pay them like the legacy stickerLines.
function withStickers(next: ReturnType<typeof M.buy>) {
  if (!next) return null;
  const res = M.checkStickers(next, today());
  return { profile: res.profile, fresh: res.fresh };
}

type Skin = (typeof M.SKINS)[SkinKind][number];
type Fresh = { id: string; name: string; page: string; world?: string; reward?: number };
const RING = 2;

// Buy (and wear) a skin, or wear one already owned.
function takeSkin(kind: SkinKind, id: string) {
  const { profile, setProfile } = useGame.getState();
  if (profile.equipped[kind] === id) return;
  const owned = profile.owned[kind].includes(id);
  const res = owned ? { profile: M.equip(profile, kind, id), fresh: [] as Fresh[] } : withStickers(M.buy(profile, kind, id));
  if (!res || !res.profile) return;
  setProfile(res.profile);
  if (owned) sfx.turn(); else { sfx.buy(); haptic('buy'); }
  showStickers(res.fresh);
}

// A skin drawn with the real theme code, framed by an accent ring when it is the one worn. The frame is there on
// every preview (transparent when not worn), so they all keep one size.
function SkinPreview({ kind, skin, width, on }: { kind: SkinKind; skin: Skin; width: number; on: boolean }) {
  const colors = useColors();
  const eqBoard = useGame((s) => s.profile.equipped.boards);
  const eqBlocks = useGame((s) => s.profile.equipped.blocks);
  const w = width - 4 * RING;
  return (
    <View style={{ padding: RING, borderRadius: radius.s + 2 + 2 * RING, borderWidth: RING, borderColor: on ? colors.accent : 'transparent' }}>
      {kind === 'cubo'
        ? <DrawCanvas width={w} radius={radius.s + 2} deps={[skin.id, eqBoard]} draw={(g, cw) => drawCuboPreview(g, boardTheme(eqBoard), eqBoard, skin.id, cw)} />
        : <DrawCanvas width={w} radius={radius.s + 2} deps={[kind, skin.id, eqBoard, eqBlocks]}
            draw={(g, cw, ch) => drawPreview(g, boardTheme(kind === 'boards' ? skin.id : eqBoard, kind === 'blocks' ? skin.id : eqBlocks), cw, ch)} />}
    </View>
  );
}

// An owned skin in its grid: the whole tile wears it.
function OwnedTile({ kind, skin, width }: { kind: SkinKind; skin: Skin; width: number }) {
  const colors = useColors();
  const on = useGame((s) => s.profile.equipped[kind] === skin.id);
  return (
    <Tap quiet label={on ? `${skin.name}, ${tr('Équipé')}` : tr`Équiper ${skin.name}`} accessibilityState={{ selected: on }}
      onPress={() => takeSkin(kind, skin.id)} style={{ width, alignItems: 'center', gap: space.xs, paddingVertical: space.m, paddingHorizontal: space.xs }}>
      <SkinPreview kind={kind} skin={skin} width={width - 2 * space.xs} on={on} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 14 }}>{skin.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
        {on && <Icon name="check" size={13} color={colors.good} />}
        <Text variant="caption" style={{ color: on ? colors.good : colors.accent }}>{on ? tr('Équipé') : tr('Équiper')}</Text>
      </View>
    </Tap>
  );
}

// A skin for sale or to win, in its section's grid: preview, name, then the price or how to win it.
function SkinTile({ kind, skin, width }: { kind: SkinKind; skin: Skin; width: number }) {
  const coins = useGame((s) => s.profile.coins);
  const via = kind === 'boards' && M.WORLD_ORDER.includes(skin.id);
  return (
    <View style={{ width, alignItems: 'center', gap: space.s, paddingVertical: space.m, paddingHorizontal: space.s }}>
      <SkinPreview kind={kind} skin={skin} width={width - 2 * space.s} on={false} />
      <View style={{ alignItems: 'center', flex: 1, marginTop: -space.xs }}>
        <Text numberOfLines={1}>{skin.name}</Text>
        {via && <Text variant="caption">{tr('Ou bats son boss')}</Text>}
        {skin.price == null && <Text variant="caption" numberOfLines={2} style={{ textAlign: 'center' }}>{skin.exclusive === skin.name ? tr('Récompense d’événement') : skin.exclusive}</Text>}
      </View>
      {skin.price != null && (
        <PriceButton price={skin.price} coins={coins} label={tr`Acheter ${skin.name} pour ${skin.price} pièces`} onPress={() => takeSkin(kind, skin.id)} style={{ alignSelf: 'stretch' }} />
      )}
    </View>
  );
}

// Tiles `cols` to a row in one card, split by hairlines as in the album.
function Grid({ cols, tileW, cells }: { cols: number; tileW: number; cells: ReactNode[] }) {
  const colors = useColors();
  const line = { backgroundColor: colors.hairline };
  const rows: ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols));
  return (
    <Card style={{ paddingVertical: space.xs, paddingHorizontal: space.s, gap: 0 }}>
      {rows.map((row, r) => {
        const free = cols - row.length;
        return (
          <Fragment key={r}>
            {r > 0 && <View style={[line, { height: StyleSheet.hairlineWidth, marginHorizontal: space.s }]} />}
            <View style={{ flexDirection: 'row' }}>
              {row.map((cell, c) => (
                <Fragment key={c}>
                  {c > 0 && <View style={[line, { width: StyleSheet.hairlineWidth, marginVertical: space.m }]} />}
                  {cell}
                </Fragment>
              ))}
              {Array.from({ length: free }, (_, c) => <View key={`e${c}`} style={{ width: tileW + StyleSheet.hairlineWidth }} />)}
            </View>
          </Fragment>
        );
      })}
    </Card>
  );
}

// Nothing left to buy on a shelf: Cubo, proud, and a line about it.
function SoldOut({ title, text }: { title: string; text: string }) {
  const eqBoard = useGame((s) => s.profile.equipped.boards);
  const eqCubo = useGame((s) => s.profile.equipped.cubo);
  const look = useMemo(() => cuboLookFor(eqBoard, eqCubo), [eqBoard, eqCubo]);
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <CuboPose width={72} lw={128} lh={134} s={84} foot={8} look={look} mood="party" />
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text variant="headline">{title}</Text>
        <Text variant="muted">{text}</Text>
      </View>
    </Card>
  );
}

const SHELF: Record<SkinKind, { mine: () => string; out: () => [string, string]; more: () => string; win: () => string }> = {
  boards: {
    mine: () => tr('Tes thèmes'),
    out: () => [tr('Un vrai aventurier !'), tr('Tous les mondes de la Boutique sont à toi. Il ne reste plus qu’à les visiter.')],
    more: () => tr('Les thèmes que tu achètes ou gagnes en battant le boss d’un monde arrivent ici.'),
    win: () => tr('Chaque événement de saison donne son thème quand tu bats son mini-boss, au niveau 12. Ils ne s’achètent pas.'),
  },
  blocks: {
    mine: () => tr('Tes blocs'),
    out: () => [tr('Collection complète !'), tr('Tous les blocs sont à toi. De quoi bâtir un château, brique par brique.')],
    more: () => tr('Les blocs que tu achètes arrivent ici.'),
    win: () => tr('Les blocs Or récompensent une série de 30 jours de défis du jour. Ils ne s’achètent pas.'),
  },
  cubo: {
    mine: () => tr('Tes tenues'),
    out: () => [tr('Garde-robe pleine à craquer !'), tr('Cubo n’a plus un crochet de libre. Il hésite chaque matin devant le miroir.')],
    more: () => tr('Les tenues que tu achètes ou gagnes pendant les événements arrivent ici.'),
    win: () => tr('Chaque événement de saison donne sa tenue quand tu bats son boss, au niveau 25. Elles ne s’achètent pas.'),
  },
};

// A skin tab: what is owned (three to a row, tap to wear), what is for sale (cheapest first), what is won elsewhere
// (two to a row).
function Shelf({ kind, room }: { kind: SkinKind; room: number }) {
  const owned = useGame((s) => s.profile.owned[kind]);
  const all = M.SKINS[kind];
  const mine = all.filter((sk) => owned.includes(sk.id));
  const sale = all.filter((sk) => !owned.includes(sk.id) && sk.price != null);
  const won = all.filter((sk) => !owned.includes(sk.id) && sk.price == null);
  // Cell width: the card's 8 pt side padding, a hairline between cells.
  const cell = (cols: number) => Math.floor((room - 2 * space.s - (cols - 1) * StyleSheet.hairlineWidth) / cols);
  const big = cell(2);
  const small = cell(3);
  const count = <Text variant="caption" style={{ marginRight: space.xs }}>{`${mine.length} / ${all.length}`}</Text>;
  return (
    <>
      <Section title={SHELF[kind].mine()} note={SHELF[kind].more()} right={count}>
        <Grid cols={3} tileW={small} cells={mine.map((sk) => <OwnedTile key={sk.id} kind={kind} skin={sk} width={small} />)} />
      </Section>
      <Section title={tr('À acheter')}>
        {sale.length > 0
          ? <Grid cols={2} tileW={big} cells={sale.map((sk) => <SkinTile key={sk.id} kind={kind} skin={sk} width={big} />)} />
          : <SoldOut title={SHELF[kind].out()[0]} text={SHELF[kind].out()[1]} />}
      </Section>
      {won.length > 0 && (
        <Section title={tr('À gagner')} note={SHELF[kind].win()}>
          <Grid cols={2} tileW={big} cells={won.map((sk) => <SkinTile key={sk.id} kind={kind} skin={sk} width={big} />)} />
        </Section>
      )}
    </>
  );
}

// Bonuses bought one by one into the reserve; the price follows the bonus's upgrade level.
function Reserve() {
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  return (
    <Section title={tr('Réserve')} note={tr`Quand une partie n’a plus ce bonus, son bouton puise dans ta réserve (${M.STOCK_MAX} au plus de chaque). Plus le bonus est amélioré, plus il coûte.`}>
      <Group>
      {BONUS_TYPES.map((type: BonusType) => {
        const ui = BONUS_UI[type];
        const n = M.bonusStock(profile, type);
        const price = M.bonusPrice(profile, type);
        const buy = () => {
          const next = M.buyBonus(useGame.getState().profile, type);
          if (!next) return;
          setProfile(next);
          sfx.buy(); haptic('buy');
        };
        return (
          <ListRow key={type} title={ui.name} icon={<IconCanvas type={type} size={40} />}
            sub={tr`En réserve : ${n} / ${M.STOCK_MAX}`}
            label={tr`${ui.name}, ${n} en réserve`}
            right={n >= M.STOCK_MAX
              ? <StatePill label={tr('Plein')} />
              : <PriceButton price={price} coins={profile.coins} label={tr`Acheter ${ui.name} pour ${price} pièces`} onPress={buy} />} />
        );
      })}
      </Group>
    </Section>
  );
}

function Upgrades() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  return (
    <Section title={tr('Améliorations')} note={tr('Les améliorations comptent dans tous les modes, même dans la partie en cours. Les bonus de ta réserve montent de niveau avec : l’amélioration paie leur différence de prix.')}>
      {BONUS_TYPES.every((type) => M.upgradePrice(profile, type) == null) && (
        <SoldOut title={tr('Tout est au max !')} text={tr('Tes bonus ne peuvent pas aller plus loin. Cubo prend des notes.')} />
      )}
      <Group>
      {BONUS_TYPES.map((type: BonusType) => {
        const ui = BONUS_UI[type];
        const lv = M.upgradeLevel(profile, type);
        const price = M.upgradePrice(profile, type);
        const topUp = M.stockTopUp(profile, type);
        const buy = () => {
          const { profile: p, saved, setSaved } = useGame.getState();
          const next = M.buyUpgrade(p, type);
          if (!next) return;
          setProfile(next);
          // Bought levels apply to the run in progress too.
          setSaved({ ...saved, state: { ...saved.state, upgrades: { ...next.upgrades } } });
          sfx.buy(); haptic('buy');
        };
        return (
          <ListRow key={type} title={ui.name} icon={<IconCanvas type={type} size={40} />}
            sub={price == null ? ui.levels[lv - 1] + tr(' · niveau max') : `${ui.levels[lv - 1]} → ${ui.levels[lv]}` + (topUp ? tr` · dont ${topUp} pour ta réserve` : '')}
            label={`${ui.name}, ${tr`Niveau ${lv} sur ${L.UPGRADE_MAX}`}`}
            right={price == null
              ? <StatePill label={tr('Max')} />
              : <PriceButton price={price} coins={profile.coins} label={tr`Améliorer ${ui.name} pour ${price} pièces`} onPress={buy} />}>
            <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.xs }}>
              {Array.from({ length: L.UPGRADE_MAX }, (_, k) => <View key={k} style={{ width: 18, height: 6, borderRadius: 3, backgroundColor: k < lv ? colors.accent : colors.sunken }} />)}
            </View>
          </ListRow>
        );
      })}
      </Group>
    </Section>
  );
}

export function ShopScreen() {
  const coins = useGame((s) => s.profile.coins);
  const [tab, setTab] = useState<Tab>('boards');
  // Opened from elsewhere on a given tab (the level sheet's "Acheter un bonus").
  // The param is cleared once applied, so the same link works again after switching tabs.
  const nav = useNavigation<BottomTabNavigationProp<TabParams, 'Shop'>>();
  const asked = useRoute<RouteProp<TabParams, 'Shop'>>().params?.tab;
  useEffect(() => {
    if (!asked) return;
    setTab(asked);
    nav.setParams({ tab: undefined });
  }, [asked, nav]);
  const { width: W } = useWindowDimensions();
  return (
    <Screen title={tr('Boutique')} right={<Counter icon={<Coin size={20} />} value={fmt(coins)} label={tr`${coins} pièces`} />}>
      <Segmented role="tab" options={TABS.map(([id, label]) => [id, label()] as [Tab, string])} value={tab} onChange={(v) => { sfx.turn(); setTab(v); }} />
      {tab === 'bonus' ? <><Reserve /><Upgrades /></> : <Shelf key={tab} kind={tab} room={W - 2 * space.l} />}
    </Screen>
  );
}
