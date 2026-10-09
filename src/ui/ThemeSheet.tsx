// Paramètres > Thème: the owned themes in a grid (a tap equips: the menus recolor live, as in the
// Boutique); a footer button leads to the Boutique for the others.
import { forwardRef } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { BottomSheetScrollView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { M } from '../core';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { boardTheme } from '../render/board-themes';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { BoardPreview } from './BoardPreview';
import { Button } from './Button';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';

const COLS = 3;

function Content({ onClose, onShop }: { onClose: () => void; onShop: () => void }) {
  const colors = useColors();
  const owned = useGame((s) => s.profile.owned.boards);
  const equipped = useGame((s) => s.profile.equipped.boards);
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 2 * space.l - (COLS - 1) * space.s) / COLS);
  const pick = (id: string) => {
    if (id === equipped) return;
    sfx.turn();
    const { profile, setProfile } = useGame.getState();
    if (profile) setProfile(M.equip(profile, 'boards', id));
  };
  const mine = M.SKINS.boards.filter((sk) => owned.includes(sk.id));
  const more = M.SKINS.boards.length - mine.length;
  return (
    <View style={{ gap: space.m }}>
      <SheetHeader title={tr('Thème')} onClose={onClose} />
      <BottomSheetScrollView style={{ maxHeight: 470 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {mine.map((sk) => {
          const on = sk.id === equipped;
          return (
            <Pressable key={sk.id} onPress={() => pick(sk.id)}
              accessibilityRole="button" accessibilityLabel={sk.name} accessibilityState={{ selected: on }}
              style={{ width: tile, padding: space.xs, gap: space.xs, borderRadius: radius.tile, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2.5, borderColor: on ? colors.accent : 'transparent' }}>
              <BoardPreview th={boardTheme(sk.id)} width={tile - 2 * space.xs - 5} radius={radius.s} />
              <Text variant="caption" numberOfLines={1} style={{ color: on ? colors.text : colors.muted }}>{sk.name}</Text>
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
      {more > 0 && <Button label={tr('Plus de thèmes dans la Boutique')} kind="secondary" onPress={onShop} />}
    </View>
  );
}

export const ThemeSheet = forwardRef<BottomSheetModal, { onShop: () => void }>(function ThemeSheet({ onShop }, ref) {
  const close = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  return (
    <Sheet ref={ref}>
      <Content onClose={close} onShop={() => { close(); onShop(); }} />
    </Sheet>
  );
});
