// Boutique tab (legacy screens/shop.js): Thèmes / Blocs / Cubo / Bonus. Skin cards with a preview,
// price, owned / equipped / exclusive states; Bonus = upgrades. Theme previews show the board colors
// (full world themes come with milestone 6).
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
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
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { DrawCanvas } from '../ui/DrawCanvas';
import { showStickers } from '../ui/StickerBanner';
import { IconCanvas } from '../ui/IconCanvas';
import { Screen } from '../ui/Screen';
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

function Price({ price, off }: { price: number; off: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
      <Coin size={16} />
      <Text variant="title" style={{ fontSize: 18, lineHeight: 22, color: off ? colors.muted : colors.onAccent }}>{fmt(price)}</Text>
    </View>
  );
}

function SkinCard({ kind, skin, width }: { kind: SkinKind; skin: ReturnType<typeof skinsOf>[number]; width: number }) {
  const colors = useColors();
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
  const bg = equipped ? 'transparent' : owned ? colors.panel : skin.price == null || cant ? colors.sunken : colors.accent;
  return (
    <View style={{ width, padding: 7, paddingBottom: 8, borderRadius: radius.card - 2, backgroundColor: colors.panel2, alignItems: 'center' }}>
      {kind === 'cubo'
        ? <DrawCanvas width={width - 14} radius={radius.card - 6} deps={[skin.id, eqBoard]} draw={(g, w) => drawCuboPreview(g, boardTheme(eqBoard), eqBoard, skin.id, w)} />
        : <DrawCanvas width={width - 14} radius={radius.card - 6} deps={[kind, skin.id, eqBoard, eqBlocks]}
            draw={(g, w, h) => drawPreview(g, boardTheme(kind === 'boards' ? skin.id : eqBoard, kind === 'blocks' ? skin.id : eqBlocks), w, h)} />}
      <Text numberOfLines={1} style={{ marginVertical: 7, fontSize: 14 }}>{skin.name}</Text>
      {via && <Text variant="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 6 }}>{tr('Ou bats son boss')}</Text>}
      <Pressable
        accessibilityRole="button"
        disabled={equipped || (!owned && (skin.price == null || cant))}
        onPress={act}
        style={({ pressed }) => ({ alignSelf: 'stretch', paddingVertical: 8, paddingHorizontal: 9, borderRadius: 9, backgroundColor: bg, transform: [{ scale: pressed ? 0.97 : 1 }],
          borderWidth: equipped ? 2 : owned ? 1.5 : 0, borderColor: equipped ? colors.good : colors.hairline })}
      >
        {equipped ? <Text variant="title" style={{ fontSize: 18, lineHeight: 22, textAlign: 'center', color: colors.good }}>{tr('Équipé')}</Text>
          : owned ? <Text variant="title" style={{ fontSize: 18, lineHeight: 22, textAlign: 'center' }}>{tr('Équiper')}</Text>
          : skin.price == null ? <Text variant="title" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 16, lineHeight: 22, textAlign: 'center', color: colors.muted }}>{skin.exclusive}</Text>
          : <Price price={skin.price} off={cant} />}
      </Pressable>
    </View>
  );
}

const skinsOf = (kind: SkinKind) => M.SKINS[kind];

function Upgrades() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  return (
    <View style={{ gap: 8 }}>
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
          <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.card - 4, backgroundColor: colors.panel2 }}>
            <IconCanvas type={type} size={40} />
            <View style={{ flex: 1 }} accessibilityLabel={tr`Niveau ${lv} sur ${L.UPGRADE_MAX}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 15 }}>{ui.name}</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3].map((k) => <View key={k} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: k <= lv ? colors.accent : colors.hairline }} />)}
                </View>
              </View>
              <Text variant="muted" style={{ fontSize: 13 }}>
                {price == null ? ui.levels[lv - 1] + tr(' · niveau max') : `${ui.levels[lv - 1]} → ${ui.levels[lv]}`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={price == null ? tr('Max') : tr`Améliorer ${ui.name} pour ${price} pièces`}
              disabled={off}
              onPress={buy}
              style={({ pressed }) => ({ minWidth: 70, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: off ? colors.sunken : colors.accent, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              {price == null ? <Text variant="title" style={{ fontSize: 18, lineHeight: 22, textAlign: 'center', color: colors.muted }}>{tr('Max')}</Text> : <Price price={price} off={off} />}
            </Pressable>
          </View>
        );
      })}
      <Text variant="muted" style={{ fontSize: 12, lineHeight: 17, marginTop: 4 }}>{tr('Les améliorations comptent dans tous les modes, même dans la partie en cours.')}</Text>
    </View>
  );
}

export function ShopScreen() {
  const colors = useColors();
  const coins = useGame((s) => s.profile.coins);
  const [tab, setTab] = useState<Tab>('boards');
  const { width: W } = useWindowDimensions();
  // Screen padding 16 + card padding 24 on both sides, 10 between the two columns.
  const cardW = Math.floor((W - 2 * space.l - 2 * space.l - 10) / 2);
  return (
    <Screen>
      <View style={{ backgroundColor: colors.panel, borderRadius: radius.card + 8, borderBottomWidth: 6, borderBottomColor: colors.edge, padding: space.l, gap: space.m }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="title" style={{ fontSize: 30, textTransform: 'uppercase' }}>{tr('Boutique')}</Text>
          <View accessibilityLabel={tr`${coins} pièces`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.panel2 }}>
            <Coin size={19} />
            <Text variant="title" style={{ fontSize: 22, lineHeight: 28 }}>{fmt(coins)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.card - 2, backgroundColor: colors.panel2 }}>
          {TABS.map(([id, label]) => (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => { sfx.turn(); setTab(id); }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: radius.card - 5, backgroundColor: tab === id ? colors.accent : 'transparent', alignItems: 'center' }}>
              <Text variant="title" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, lineHeight: 22, textTransform: 'uppercase', color: tab === id ? colors.onAccent : colors.muted }}>{label()}</Text>
            </Pressable>
          ))}
        </View>
        {tab === 'bonus' ? <Upgrades /> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {skinsOf(tab).map((skin) => <SkinCard key={tab + skin.id} kind={tab} skin={skin} width={cardW} />)}
          </View>
        )}
      </View>
    </Screen>
  );
}
