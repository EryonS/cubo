// Sticker album (legacy Profil > Album): one card per page holding its stickers three to a row, split by
// hairlines. Earned ones show their name and day and open their card (hint, reward) on tap, unearned ones grey
// with their hint, secret ones hidden until earned.
import { Fragment, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { albumPages, type StickerRow } from '../../game/album';
import type { RootParams } from '../../navigation/types';
import { useGame } from '../../state/store';
import { space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Card } from '../../ui/Card';
import { Counter } from '../../ui/Counter';
import { Screen } from '../../ui/Screen';
import { SectionLabel } from '../../ui/SectionLabel';
import { StickerBadge } from '../../ui/StickerArt';
import { Text } from '../../ui/Text';
import { shortDay, StickerSheet } from './StickerSheet';

const COLS = 3;

function Sticker({ sk, onOpen }: { sk: StickerRow; onOpen: (id: string) => void }) {
  const sub = sk.on ? shortDay(sk.day) : sk.hidden ? tr('À découvrir') : sk.hint;
  return (
    <Pressable
      accessibilityRole={sk.on ? 'button' : 'text'}
      disabled={!sk.on}
      onPress={() => { sfx.turn(); onOpen(sk.id); }}
      accessibilityLabel={`${sk.hidden ? tr('Secret') : sk.name}, ${sub}`}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: space.xs, paddingVertical: space.m, paddingHorizontal: space.xs, transform: [{ scale: pressed ? 0.95 : 1 }] })}
    >
      <StickerBadge page={sk.page} color={sk.color} off={!sk.on} hidden={sk.hidden} />
      <Text numberOfLines={2} style={{ fontSize: 14, textAlign: 'center' }}>{sk.hidden ? tr('Secret') : sk.name}</Text>
      <Text variant="caption" numberOfLines={3} style={{ textAlign: 'center' }}>{sub}</Text>
    </Pressable>
  );
}

// A page's stickers in rows of three, split by light hairlines (inset like a Group's) between rows and cells.
function PageGrid({ stickers, onOpen }: { stickers: StickerRow[]; onOpen: (id: string) => void }) {
  const colors = useColors();
  const line = { backgroundColor: colors.hairline };
  const rows: StickerRow[][] = [];
  for (let i = 0; i < stickers.length; i += COLS) rows.push(stickers.slice(i, i + COLS));
  return (
    <Card style={{ paddingVertical: space.xs, paddingHorizontal: space.s, gap: 0 }}>
      {rows.map((row, r) => (
        <Fragment key={r}>
          {r > 0 && <View style={[line, { height: StyleSheet.hairlineWidth, marginHorizontal: space.s }]} />}
          <View style={{ flexDirection: 'row' }}>
            {Array.from({ length: COLS }, (_, c) => (
              <Fragment key={c}>
                {c > 0 && <View style={[line, { width: StyleSheet.hairlineWidth, marginVertical: space.m, opacity: row[c] ? 1 : 0 }]} />}
                {row[c] ? <Sticker sk={row[c]} onOpen={onOpen} /> : <View style={{ flex: 1 }} />}
              </Fragment>
            ))}
          </View>
        </Fragment>
      ))}
    </Card>
  );
}

export function AlbumScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const profile = useGame((s) => s.profile);
  const sheet = useRef<BottomSheetModal>(null);
  const [sel, setSel] = useState<string | null>(null);
  const { pages, count, total } = albumPages(profile);
  const open = (id: string) => { setSel(id); sheet.current?.present(); };
  return (
    <Screen title={tr('Album')} back={() => { sfx.turn(); nav.goBack(); }}
      right={<Counter icon={<StickerBadge page="combo" color="#ff8fab" size={22} />} value={`${count} / ${total}`} label={tr`Autocollants · ${count} / ${total}`} />}>
      <View style={{ gap: space.m }}>
        {pages.map((p) => (
          <View key={p.id} style={{ gap: space.s }}>
            <SectionLabel>{p.name}</SectionLabel>
            <PageGrid stickers={p.stickers} onOpen={open} />
          </View>
        ))}
      </View>
      <StickerSheet ref={sheet} id={sel} />
    </Screen>
  );
}
