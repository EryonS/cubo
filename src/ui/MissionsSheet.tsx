// The Missions sheet (legacy #missions): today's three missions with live progress.
import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import { missionStatus } from '../game/run';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Icon } from './Icon';
import { MissionList } from './Missions';
import { Sheet } from './Sheet';
import { Text } from './Text';

function Content({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  useGame((s) => s.profile);
  useGame((s) => s.saved.state);
  return (
    <View style={{ gap: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title" style={{ textTransform: 'uppercase' }}>{tr('Missions')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Fermer')} onPress={onClose} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={colors.text} />
        </Pressable>
      </View>
      <MissionList inset status={missionStatus()} />
      <Text variant="muted" style={{ fontSize: 12, lineHeight: 16 }}>{tr('Elles avancent dans tous les modes. Trois nouvelles chaque jour.')}</Text>
    </View>
  );
}

type Props = { onOpen?: () => void; onClose?: () => void };
export const MissionsSheet = forwardRef<BottomSheetModal, Props>(function MissionsSheet(props, ref) {
  return (
    <Sheet ref={ref} {...props}>
      <Content onClose={() => (ref as React.RefObject<BottomSheetModal>).current?.dismiss()} />
    </Sheet>
  );
});
