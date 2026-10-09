// Boutique tab (legacy screens/shop.js): Thèmes / Blocs / Cubo / Bonus. Skin cards with a preview,
// price, owned / equipped / exclusive states; Bonus = upgrades. Theme previews show the board colors
// (full world themes come with milestone 6).
import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { L, M } from '../core';
import { locale, tr } from '../core/i18n';
import type { BonusType, SkinKind } from '../core/types';
import { sfx } from '../audio/engine';
import { BONUS_UI, BONUS_TYPES } from '../game/bonus-ui';
import { haptic } from '../platform/haptics';
import { boardTheme } from '../render/board-themes';
import { drawCuboPreview } from '../render/cubo-preview';
import { drawPreview } from '../render/preview';
import { today } from '../state/persist';
import type { TabParams } from '../navigation/types';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Counter } from '../ui/Counter';
import { DrawCanvas } from '../ui/DrawCanvas';
import { Icon } from '../ui/Icon';
import { Group } from '../ui/Group';
import { ListRow } from '../ui/ListRow';
import { Segmented } from '../ui/Segmented';
import { showStickers } from '../ui/StickerBanner';
import { IconCanvas } from '../ui/IconCanvas';
import { Screen } from '../ui/Screen';
import { SectionLabel } from '../ui/SectionLabel';
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

// The skin card's action: Équipé (a quiet green pill), Équiper, the price, or how to get it.
function SkinAction({ equipped, owned, price, cant, exclusive, onPress }: { equipped: boolean; owned: boolean; price: number | null | undefined; cant: boolean; exclusive?: string; onPress: () => void }) {
  const colors = useColors();
  const pill = { alignSelf: 'stretch' as const, height: 40, borderRadius: radius.pill, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: space.xs, backgroundColor: colors.panel2, paddingHorizontal: space.s };
  if (equipped) return <View style={pill} accessible accessibilityLabel={tr('Équipé')}><Icon name="check" size={16} color={colors.good} /><Text variant="headline" style={{ color: colors.good }}>{tr('Équipé')}</Text></View>;
  if (owned) return <Button size="s" kind="ghost" label={tr('Équiper')} onPress={onPress} style={{ alignSelf: 'stretch' }} />;
  if (price == null) return <View style={pill}><Text variant="caption" numberOfLines={2} style={{ textAlign: 'center' }}>{exclusive}</Text></View>;
  return <Button size="s" kind={cant ? 'ghost' : 'primary'} disabled={cant} icon={<Coin size={16} ring={cant ? undefined : colors.onAccent} />} label={fmt(price)} accessibilityLabel={tr`Acheter pour ${price} pièces`} onPress={onPress} style={{ alignSelf: 'stretch' }} />;
}

function SkinCard({ kind, skin, width }: { kind: SkinKind; skin: ReturnType<typeof skinsOf>[number]; width: number }) {
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  const owned = profile.owned[kind].includes(skin.id);
  const equipped = profile.equipped[kind] === skin.id;
  const eqBoard = profile.equipped.boards;
  const eqBlocks = profile.equipped.blocks;

  const act = async () => {
    if (equipped) return;
    const res = owned ? { profile: M.equip(profile, kind, skin.id), fresh: [] as { id: string; name: string; page: string; world?: string; reward?: number }[] } : withStickers(M.buy(profile, kind, skin.id));
    if (!res || !res.profile) return;
    setProfile(res.profile);
    if (owned) sfx.turn(); else { sfx.buy(); haptic('buy'); }
    showStickers(res.fresh);
  };

  const via = kind === 'boards' && !owned && M.WORLD_ORDER.includes(skin.id);
  const cant = !owned && skin.price != null && profile.coins < skin.price;
  const colors = useColors();
  return (
    // The equipped one wears an accent ring (its padding gives back the ring's width, the card keeps its size).
    <Card small style={[{ width, alignItems: 'center', padding: space.s, gap: space.s }, equipped && { borderWidth: 2, borderColor: colors.accent, padding: space.s - 2 }]}>
      {kind === 'cubo'
        ? <DrawCanvas width={width - 2 * space.s} radius={radius.s + 2} deps={[skin.id, eqBoard]} draw={(g, w) => drawCuboPreview(g, boardTheme(eqBoard), eqBoard, skin.id, w)} />
        : <DrawCanvas width={width - 2 * space.s} radius={radius.s + 2} deps={[kind, skin.id, eqBoard, eqBlocks]}
            draw={(g, w, h) => drawPreview(g, boardTheme(kind === 'boards' ? skin.id : eqBoard, kind === 'blocks' ? skin.id : eqBlocks), w, h)} />}
      <View style={{ alignItems: 'center' }}>
        <Text numberOfLines={1}>{skin.name}</Text>
        {via && <Text variant="caption">{tr('Ou bats son boss')}</Text>}
      </View>
      <SkinAction equipped={equipped} owned={owned} price={skin.price} cant={cant} onPress={act}
        exclusive={skin.exclusive === skin.name ? tr('Récompense d’événement') : skin.exclusive} />
    </Card>
  );
}

const skinsOf = (kind: SkinKind) => M.SKINS[kind];

// Bonuses bought one by one into the reserve; the price follows the bonus's upgrade level.
function Reserve() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  return (
    <View style={{ gap: space.s }}>
      <Group>
      {BONUS_TYPES.map((type: BonusType) => {
        const ui = BONUS_UI[type];
        const n = M.bonusStock(profile, type);
        const price = M.bonusPrice(profile, type);
        const full = n >= M.STOCK_MAX;
        const off = full || profile.coins < price;
        const buy = () => {
          const next = M.buyBonus(useGame.getState().profile, type);
          if (!next) return;
          setProfile(next);
          sfx.buy(); haptic('buy');
        };
        return (
          <ListRow key={type} title={ui.name} icon={<IconCanvas type={type} size={40} />}
            sub={tr`En réserve : ${n} · niveau ${M.upgradeLevel(profile, type)}`}
            label={tr`${ui.name}, ${n} en réserve`}
            right={full
              ? <View style={{ height: 40, paddingHorizontal: space.l, borderRadius: radius.pill, backgroundColor: colors.panel2, justifyContent: 'center' }}><Text variant="headline" style={{ color: colors.muted }}>{tr('Plein')}</Text></View>
              : <Button size="s" kind={off ? 'ghost' : 'primary'} disabled={off} icon={<Coin size={16} ring={off ? undefined : colors.onAccent} />} label={fmt(price)} accessibilityLabel={tr`Acheter ${ui.name} pour ${price} pièces`} onPress={buy} />} />
        );
      })}
      </Group>
      <Text variant="caption" style={{ marginHorizontal: space.xs }}>{tr`Quand une partie n’a plus ce bonus, son bouton puise dans ta réserve (${M.STOCK_MAX} au plus de chaque). Plus le bonus est amélioré, plus il coûte.`}</Text>
    </View>
  );
}

function Upgrades() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  return (
    <View style={{ gap: space.s }}>
      <Group>
      {BONUS_TYPES.map((type: BonusType) => {
        const ui = BONUS_UI[type];
        const lv = M.upgradeLevel(profile, type);
        const price = M.upgradePrice(profile, type);
        const off = price == null || profile.coins < price;
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
            sub={price == null ? ui.levels[lv - 1] + tr(' · niveau max') : `${ui.levels[lv - 1]} → ${ui.levels[lv]}`}
            label={`${ui.name}, ${tr`Niveau ${lv} sur ${L.UPGRADE_MAX}`}`}
            right={price == null
              ? <View style={{ height: 40, paddingHorizontal: space.l, borderRadius: radius.pill, backgroundColor: colors.panel2, justifyContent: 'center' }}><Text variant="headline" style={{ color: colors.muted }}>{tr('Max')}</Text></View>
              : <Button size="s" kind={off ? 'ghost' : 'primary'} disabled={off} icon={<Coin size={16} ring={off ? undefined : colors.onAccent} />} label={fmt(price)} accessibilityLabel={tr`Améliorer ${ui.name} pour ${price} pièces`} onPress={buy} />}>
            <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.xs }}>
              {[1, 2, 3].map((k) => <View key={k} style={{ width: 18, height: 6, borderRadius: 3, backgroundColor: k <= lv ? colors.accent : colors.sunken }} />)}
            </View>
          </ListRow>
        );
      })}
      </Group>
      <Text variant="caption" style={{ marginHorizontal: space.xs }}>{tr('Les améliorations comptent dans tous les modes, même dans la partie en cours.')}</Text>
    </View>
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
  // Two columns between the 16 pt gutters, 12 pt apart.
  const cardW = Math.floor((W - 2 * space.l - space.m) / 2);
  return (
    <Screen title={tr('Boutique')} right={<Counter icon={<Coin size={20} />} value={fmt(coins)} label={tr`${coins} pièces`} />}>
      <Segmented role="tab" options={TABS.map(([id, label]) => [id, label()] as [Tab, string])} value={tab} onChange={(v) => { sfx.turn(); setTab(v); }} />
      {tab === 'bonus' ? (
        <>
          <SectionLabel>{tr('Réserve')}</SectionLabel>
          <Reserve />
          <SectionLabel>{tr('Améliorations')}</SectionLabel>
          <Upgrades />
        </>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
          {skinsOf(tab).map((skin) => <SkinCard key={tab + skin.id} kind={tab} skin={skin} width={cardW} />)}
        </View>
      )}
    </Screen>
  );
}
