// Sticker album (legacy Profil > Album): pages of stickers, earned ones tappable for their card, unearned ones
// grey with their hint, secret ones hidden until earned.
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { albumPages, type StickerRow } from '../../game/album';
import type { RootParams } from '../../navigation/types';
import { useGame } from '../../state/store';
import { lip, radius, space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Counter } from '../../ui/Counter';
import { Screen } from '../../ui/Screen';
import { SectionLabel } from '../../ui/SectionLabel';
import { StickerBadge } from '../../ui/StickerArt';
import { Text } from '../../ui/Text';
import { shortDay, StickerSheet } from './StickerSheet';

function Sticker({ sk, width, onOpen }: { sk: StickerRow; width: number; onOpen: (id: string) => void }) {
  const colors = useColors();
  const sub = sk.on ? (sk.secret ? sk.hint : shortDay(sk.day)) : sk.hidden ? tr('À découvrir') : sk.hint;
  return (
    <Pressable
      accessibilityRole={sk.on ? 'button' : 'text'}
      disabled={!sk.on}
      onPress={() => { sfx.turn(); onOpen(sk.id); }}
      accessibilityLabel={`${sk.hidden ? tr('Secret') : sk.name}, ${sub}`}
      style={({ pressed }) => ({ width, alignItems: 'center', gap: space.xs, paddingTop: space.m, paddingBottom: space.s, paddingHorizontal: space.xs, borderRadius: radius.tile, backgroundColor: colors.panel, borderBottomWidth: lip.tile, borderBottomColor: colors.edge, transform: [{ scale: pressed ? 0.95 : 1 }] })}
    >
      <StickerBadge page={sk.page} color={sk.color} off={!sk.on} hidden={sk.hidden} />
      <Text numberOfLines={2} style={{ fontSize: 14, textAlign: 'center' }}>{sk.hidden ? tr('Secret') : sk.name}</Text>
      <Text variant="caption" numberOfLines={3} style={{ textAlign: 'center' }}>{sub}</Text>
      {sk.on && sk.secret && <Text variant="caption">{shortDay(sk.day)}</Text>}
    </Pressable>
  );
}

export function AlbumScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const profile = useGame((s) => s.profile);
  const sheet = useRef<BottomSheetModal>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [w, setW] = useState(0);
  const gap = space.s;
  const cw = (w - 2 * gap) / 3;
  const { pages, count, total } = albumPages(profile);
  const open = (id: string) => { setSel(id); sheet.current?.present(); };
  return (
    <Screen title={tr('Album')} back={() => { sfx.turn(); nav.goBack(); }}
      right={<Counter icon={<StickerBadge page="combo" color="#ff8fab" size={22} />} value={`${count} / ${total}`} label={tr`Autocollants · ${count} / ${total}`} />}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ gap: space.m }}>
        {pages.map((p) => (
          <View key={p.id} style={{ gap: space.s }}>
            <SectionLabel>{p.name}</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {w > 0 && p.stickers.map((sk) => <Sticker key={sk.id} sk={sk} width={cw} onOpen={open} />)}
            </View>
          </View>
        ))}
      </View>
      <StickerSheet ref={sheet} id={sel} />
    </Screen>
  );
}
