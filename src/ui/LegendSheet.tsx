// What every bonus icon does (legacy #legend): mobile has no hover.
import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { L } from '../core';
import { tr } from '../core/i18n';
import { BONUS_TYPES, BONUS_UI, COIN_UI } from '../game/bonus-ui';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { IconCanvas } from './IconCanvas';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

function Content({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const upgrades = useGame((s) => s.saved.state.upgrades);
  const lv = (type: (typeof BONUS_TYPES)[number]) => Math.min(L.UPGRADE_MAX, Math.max(1, (upgrades && upgrades[type]) || 1));
  const rows = [
    ...BONUS_TYPES.map((t) => ({ type: t as string, name: BONUS_UI[t].name, text: BONUS_UI[t].desc(lv(t)) })),
    ...(['coin', 'bag'] as const).map((t) => ({ type: t as string, name: COIN_UI[t].name, text: COIN_UI[t].desc })),
  ];
  return (
    <View style={{ gap: space.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title" style={{ textTransform: 'uppercase' }}>{tr('Bonus')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Fermer')} onPress={onClose} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={colors.text} />
        </Pressable>
      </View>
      {rows.map((r, i) => (
        <View key={r.type} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.hairline }}>
          <IconCanvas type={r.type} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15 }}>{r.name}</Text>
            <Text variant="muted" style={{ fontSize: 13, lineHeight: 17 }}>{r.text}</Text>
          </View>
        </View>
      ))}
      <Text variant="muted" style={{ fontSize: 12, lineHeight: 17, marginTop: 4 }}>
        {tr("Efface un bloc qui porte une icône pour la ramasser. Les bonus vont dans ta barre (2 max par type), les pièces dans ton porte-monnaie. Une forme ne te plaît pas ? Maintiens-la tout en bas pour la jeter : 10 pièces, puis 5 de plus à chaque fois dans la partie. Un chrono se cumule sur deux utilisations et s'arrête quand un menu est ouvert. Améliore tes bonus dans la Boutique, onglet Bonus.")}
      </Text>
    </View>
  );
}

type Props = { onOpen?: () => void; onClose?: () => void };
export const LegendSheet = forwardRef<BottomSheetModal, Props>(function LegendSheet(props, ref) {
  return (
    <Sheet ref={ref} {...props}>
      <Content onClose={() => (ref as React.RefObject<BottomSheetModal>).current?.dismiss()} />
    </Sheet>
  );
});
