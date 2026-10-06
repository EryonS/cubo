// Paramètres > Icône de l'app: the icon of every theme in a grid. The owned themes' icons can be picked
// (the system keeps the choice); the others wait, dimmed and locked, for the Boutique or their event.
import { forwardRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { M } from '../core';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { appIcon, setAppIcon } from '../platform/app-icon';
import { drawAppIcon } from '../render/app-icon';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { DrawCanvas } from './DrawCanvas';
import { Icon } from './Icon';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';

const COLS = 4;
// iOS home-screen corner: 22.37 % of the side.
const CORNER = 0.2237;

// The icon of a theme at `size`, with the home screen's rounded corners.
export function AppIconThumb({ id, size }: { id: string; size: number }) {
  return <DrawCanvas width={size} height={size} radius={size * CORNER} deps={[id]} draw={(g, w) => drawAppIcon(g, id, w)} />;
}

function Content({ onClose, onPicked }: { onClose: () => void; onPicked: (id: string) => void }) {
  const colors = useColors();
  const owned = useGame((s) => s.profile.owned.boards);
  const { width } = useWindowDimensions();
  const [current, setCurrent] = useState(appIcon);
  const tile = Math.floor((width - 2 * space.l - (COLS - 1) * space.s) / COLS);
  const thumb = tile - 2 * space.xs - 5;
  const pick = async (id: string) => {
    if (id === current) return;
    sfx.turn();
    if (await setAppIcon(id)) { setCurrent(id); onPicked(id); }
  };
  return (
    <View style={{ gap: space.m }}>
      <SheetHeader title={tr('Icône de l’app')} onClose={onClose} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {M.SKINS.boards.map((sk) => {
          const on = sk.id === current;
          const mine = owned.includes(sk.id);
          return (
            <Pressable key={sk.id} disabled={!mine} onPress={() => { void pick(sk.id); }}
              accessibilityRole="button" accessibilityLabel={sk.name} accessibilityState={{ selected: on, disabled: !mine }}
              style={{ width: tile, padding: space.xs, gap: space.xs, borderRadius: radius.tile, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2.5, borderColor: on ? colors.accent : 'transparent' }}>
              <View style={{ opacity: mine ? 1 : 0.35 }}><AppIconThumb id={sk.id} size={thumb} /></View>
              {!mine && <View style={{ position: 'absolute', top: space.xs + thumb / 2 - 10, alignSelf: 'center' }}><Icon name="lock" size={20} color={colors.text} /></View>}
              <Text variant="caption" numberOfLines={1} style={{ color: on ? colors.text : colors.muted }}>{sk.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption">{tr('Chaque thème débloqué dans la Boutique ou pendant un événement ajoute son icône.')}</Text>
    </View>
  );
}

export const AppIconSheet = forwardRef<BottomSheetModal, { onPicked: (id: string) => void }>(function AppIconSheet({ onPicked }, ref) {
  const close = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  return (
    <Sheet ref={ref}>
      <Content onClose={close} onPicked={onPicked} />
    </Sheet>
  );
});
