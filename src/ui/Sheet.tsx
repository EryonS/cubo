// A bottom sheet in the toy style (legacy .overlay > .card): scrim, rounded panel with the thick
// bottom edge, content sized to itself. Built on @gorhom/bottom-sheet's modal; the parent drives it
// with a ref (present / dismiss). onOpen / onClose tell the game when to pause its timers.
import { forwardRef, useCallback, type ReactNode } from 'react';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../core/i18n';
import { radius, space, TOUCH } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

interface Props { children: ReactNode; onOpen?: () => void; onClose?: () => void; scroll?: boolean }

export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet({ children, onOpen, onClose }, ref) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const backdrop = useCallback((p: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} pressBehavior="close" style={[p.style, { backgroundColor: colors.scrim }]} />
  ), [colors.scrim]);
  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      maxDynamicContentSize={760}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: colors.panel, borderTopLeftRadius: radius.card + 8, borderTopRightRadius: radius.card + 8 }}
      handleIndicatorStyle={{ backgroundColor: colors.edge, width: 44 }}
      onChange={(i) => { if (i >= 0) onOpen?.(); }}
      onDismiss={onClose}
    >
      <BottomSheetView style={{ paddingHorizontal: space.l, paddingBottom: insets.bottom + space.l, paddingTop: space.xs }}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

// A sheet's top line: its title and a 44 pt close button on the right.
export function SheetHeader({ title, onClose, closeLabel }: { title: string; onClose: () => void; closeLabel?: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: TOUCH }}>
      <Text variant="title" accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textTransform: 'uppercase' }}>{title}</Text>
      <Tap label={closeLabel ?? tr('Fermer')} onPress={onClose}
        style={{ width: TOUCH, height: TOUCH, borderRadius: radius.pill, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={16} color={colors.text} />
      </Tap>
    </View>
  );
}
