// A bottom sheet in the toy style (legacy .overlay > .card): scrim, rounded panel with the thick
// bottom edge, content sized to itself. Built on @gorhom/bottom-sheet's modal; the parent drives it
// with a ref (present / dismiss). onOpen / onClose tell the game when to pause its timers.
import { forwardRef, useCallback, type ReactNode } from 'react';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from '../theme/tokens';

interface Props { children: ReactNode; onOpen?: () => void; onClose?: () => void; scroll?: boolean }

export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet({ children, onOpen, onClose }, ref) {
  const insets = useSafeAreaInsets();
  const backdrop = useCallback((p: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" style={[p.style, { backgroundColor: '#4a3a66' }]} />
  ), []);
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
      <BottomSheetView style={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xl, paddingTop: space.s }}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
