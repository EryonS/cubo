// Sticker card (legacy #sticker-info, openSticker): badge, name, album page, what earned it, the day, the reward.
import { forwardRef } from 'react';
import { View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { M } from '../../core';
import { locale, tr } from '../../core/i18n';
import { stickerColor } from '../../game/album';
import { sfx } from '../../audio/engine';
import { useGame } from '../../state/store';
import { radius, space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { StickerBadge } from '../../ui/StickerArt';
import { Text } from '../../ui/Text';
import { Coin } from '../../ui/Wallet';

export const fullDay = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const shortDay = (day: unknown) => (typeof day === 'string'
  ? tr`Obtenu le ${new Date(day + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })}`
  : tr('Obtenu'));

function Card({ id, onClose }: { id: string | null; onClose: () => void }) {
  const colors = useColors();
  const sk = M.STICKERS.find((x) => x.id === id);
  const got = useGame((s) => s.profile.stickers) as Record<string, string | true> | undefined;
  const day = id ? (got || {})[id] : undefined;
  if (!sk || !day) return <View style={{ height: 40 }} />;
  const page = M.STICKER_PAGES.find((p) => p.id === sk.page);
  const when = typeof day === 'string' ? tr('Obtenu le ') + fullDay(day) : tr('Obtenu avant que le jeu note la date');
  return (
    <View style={{ alignItems: 'center', gap: space.s }}>
      <View style={{ paddingTop: 4, paddingBottom: 6 }}><StickerBadge page={sk.page} color={stickerColor(sk)} size={84} /></View>
      <Text variant="title" style={{ textTransform: 'uppercase', textAlign: 'center' }}>{sk.name}</Text>
      <Text variant="muted" style={{ textAlign: 'center' }}>{page ? page.name : ''}{sk.secret ? tr(' · secret') : ''}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: space.s, padding: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
        <Text variant="muted" style={{ fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase' }}>{tr('Pour l’avoir')}</Text>
        <Text>{sk.hint}</Text>
      </View>
      <Text variant="muted" style={{ marginTop: 4 }}>{when}</Text>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
        <Text variant="muted">{tr('Récompense')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Coin size={18} />
          <Text variant="title" style={{ fontSize: 20 }}>+{sk.reward || M.STICKER_REWARD}</Text>
        </View>
      </View>
      <Button label="OK" onPress={() => { sfx.turn(); onClose(); }} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

export const StickerSheet = forwardRef<BottomSheetModal, { id: string | null }>(function StickerSheet({ id }, ref) {
  const close = () => (ref as { current: BottomSheetModal | null }).current?.dismiss();
  return <Sheet ref={ref}><Card id={id} onClose={close} /></Sheet>;
});
