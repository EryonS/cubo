// Sticker album (legacy Profil > Album): pages of stickers, earned ones tappable for their card, unearned ones
// grey with their hint, secret ones hidden until earned.
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { albumPages, type StickerRow } from '../../game/album';
import type { RootParams } from '../../navigation/types';
import { useGame } from '../../state/store';
import { radius, space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Icon } from '../../ui/Icon';
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
      style={({ pressed }) => ({ width, alignItems: 'center', gap: 4, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 4, borderRadius: radius.card - 6, backgroundColor: colors.panel2, transform: [{ scale: pressed ? 0.95 : 1 }] })}
    >
      <StickerBadge page={sk.page} color={sk.color} off={!sk.on} hidden={sk.hidden} />
      <Text style={{ fontSize: 13, lineHeight: 15, textAlign: 'center' }}>{sk.hidden ? tr('Secret') : sk.name}</Text>
      <Text variant="muted" style={{ fontSize: 12, lineHeight: 15, textAlign: 'center' }}>{sub}</Text>
      {sk.on && sk.secret && <Text variant="muted" style={{ fontSize: 11, opacity: 0.8 }}>{shortDay(sk.day)}</Text>}
    </Pressable>
  );
}

export function AlbumScreen() {
  const colors = useColors();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const profile = useGame((s) => s.profile);
  const sheet = useRef<BottomSheetModal>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [w, setW] = useState(0);
  const gap = 10;
  const cw = (w - 2 * gap) / 3;
  const { pages, count, total } = albumPages(profile);
  const open = (id: string) => { setSel(id); sheet.current?.present(); };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.l, paddingTop: 8, paddingBottom: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Retour')} onPress={() => { sfx.turn(); nav.goBack(); }} hitSlop={8}
          style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
          <Icon name="chevLeft" size={16} color={colors.text} />
        </Pressable>
        <Text variant="title" style={{ flex: 1, fontSize: 28, lineHeight: 34, textTransform: 'uppercase' }}>{tr('Album')}</Text>
        <Text variant="title" style={{ fontSize: 18, color: colors.muted }}>{count} / {total}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.l, paddingBottom: 40 }}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {pages.map((p) => (
            <View key={p.id}>
              <Text variant="muted" style={{ marginTop: 18, marginBottom: 8, marginLeft: 2, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>{p.name}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                {w > 0 && p.stickers.map((sk) => <Sticker key={sk.id} sk={sk} width={cw} onOpen={open} />)}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <StickerSheet ref={sheet} id={sel} />
    </SafeAreaView>
  );
}
