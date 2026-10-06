// A bottom sheet in the toy style (legacy .overlay > .card): scrim, rounded panel with the thick
// bottom edge, content sized to itself. Built on @gorhom/bottom-sheet's modal; the parent drives it
// with a ref (present / dismiss). onOpen / onClose tell the game when to pause its timers.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BackHandler, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../core/i18n';
import { radius, space, TOUCH } from '../theme/tokens';
import { PlayedTheme, useColors, usePlayedTheme } from '../theme/useColors';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

interface Props { children: ReactNode; onOpen?: () => void; onClose?: () => void; scroll?: boolean }

export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet({ children, onOpen, onClose }, ref) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  // The modal renders its content in the provider's portal, outside this tree: the played theme is
  // handed over again, or the content would wear the equipped theme on this theme's panel.
  const played = usePlayedTheme();
  const inner = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => inner.current as BottomSheetModal);
  // Android back button: closes the sheet on top (the newest listener runs first).
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { inner.current?.dismiss(); return true; });
    return () => sub.remove();
  }, [shown]);
  const backdrop = useCallback((p: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} pressBehavior="close" style={[p.style, { backgroundColor: colors.scrim }]} />
  ), [colors.scrim]);
  return (
    <BottomSheetModal
      ref={inner}
      enableDynamicSizing
      maxDynamicContentSize={760}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: colors.panel, borderTopLeftRadius: radius.card + 8, borderTopRightRadius: radius.card + 8 }}
      handleIndicatorStyle={{ backgroundColor: colors.edge, width: 44 }}
      onChange={(i) => { if (i >= 0) { setShown(true); onOpen?.(); } }}
      onDismiss={() => { setShown(false); onClose?.(); }}
    >
      <BottomSheetView style={{ paddingHorizontal: space.l, paddingBottom: insets.bottom + space.l, paddingTop: space.xs }}>
        <PlayedTheme value={played}>{children}</PlayedTheme>
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
