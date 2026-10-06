// The Missions sheet (legacy #missions): today's three missions with live progress.
import { forwardRef } from 'react';
import { View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import { missionStatus } from '../game/run';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { MissionList } from './Missions';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';

function Content({ onClose }: { onClose: () => void }) {
  useGame((s) => s.profile);
  useGame((s) => s.saved.state);
  return (
    <View style={{ gap: space.m }}>
      <SheetHeader title={tr('Missions')} onClose={onClose} />
      <MissionList inset status={missionStatus()} />
      <Text variant="caption">{tr('Les missions avancent dans tous les modes. Trois nouvelles chaque jour.')}</Text>
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
