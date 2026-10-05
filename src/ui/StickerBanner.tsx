// "Autocollant !" banner (legacy: a gold banner with the sticker name and its coins, pushed on a Boutique
// purchase). `showStickers()` queues one banner per new sticker; <StickerBannerHost/> is mounted once at the
// root and shows them one after another over the screens.
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { M } from '../core';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { stickerColor } from '../game/album';
import { haptic } from '../platform/haptics';
import { radius, space } from '../theme/tokens';
import { StickerBadge } from './StickerArt';
import { Text } from './Text';
import { Coin } from './Wallet';

interface Item { id: string; name: string; page: string; world?: string; reward: number }
const SHOW_MS = 2200;
const useBanners = create<{ queue: Item[] }>(() => ({ queue: [] }));

export function showStickers(fresh: { id: string; name: string; page: string; world?: string; reward?: number }[]) {
  if (!fresh.length) return;
  sfx.mission();
  haptic('mission');
  useBanners.setState((s) => ({ queue: [...s.queue, ...fresh.map((f) => ({ id: f.id, name: f.name, page: f.page, world: f.world, reward: f.reward || M.STICKER_REWARD }))] }));
}

export function StickerBannerHost() {
  const head = useBanners((s) => s.queue[0]);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!head) return;
    const id = setTimeout(() => useBanners.setState((s) => ({ queue: s.queue.slice(1) })), SHOW_MS);
    return () => clearTimeout(id);
  }, [head]);
  if (!head) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + space.l, left: space.l, right: space.l, alignItems: 'center' }}>
      <Animated.View
        key={head.id}
        entering={ZoomIn.duration(260)}
        exiting={FadeOut.duration(200)}
        accessibilityRole="alert"
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 10, paddingHorizontal: 16, paddingRight: 20, borderRadius: radius.card, backgroundColor: '#fff3c4', borderWidth: 2, borderColor: '#f5b700', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
      >
        <StickerBadge page={head.page} color={stickerColor(head)} size={46} />
        <View>
          <Text variant="title" style={{ fontSize: 22, lineHeight: 26, color: '#8a5a00', textTransform: 'uppercase' }}>{tr('Autocollant !')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 15, color: '#6b4a00' }}>{head.name} · +{head.reward}</Text>
            <Coin size={15} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
