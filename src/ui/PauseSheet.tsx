// Pause (legacy #pause): resume, start over, Réglages, Menu, quit.
import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import { runLabel, triesAfter } from '../game/daily';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

interface Actions { onRestart: () => void; onSettings: () => void; onMenu: () => void; onQuit: () => void; onOpen?: () => void; onClose?: () => void }

function Content({ onResume, onRestart, onSettings, onMenu, onQuit }: Actions & { onResume: () => void }) {
  const colors = useColors();
  const label = useGame((s) => runLabel(s.saved.state));
  // A daily attempt counts when dropped: restarting needs one more try left.
  const noRestart = useGame((s) => !!s.saved.state.stage?.daily && triesAfter(s.profile, s.saved.state, s.saved.state.stage.daily, today()) <= 0);
  return (
    <View style={{ gap: space.m }}>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text variant="title" style={{ fontSize: 30, textTransform: 'uppercase' }}>{tr('Pause')}</Text>
        <Text variant="muted">{label}</Text>
      </View>
      <Button label={tr('Reprendre')} onPress={onResume} />
      {!noRestart && <Button kind="ghost" label={tr('Recommencer')} onPress={onRestart} />}
      <View style={{ flexDirection: 'row', gap: space.m }}>
        <Button kind="ghost" label={tr('Réglages')} onPress={onSettings} style={{ flex: 1 }} />
        <Button kind="ghost" label={tr('Menu')} onPress={onMenu} style={{ flex: 1 }} />
      </View>
      <Pressable accessibilityRole="button" onPress={onQuit} style={{ alignItems: 'center', padding: space.s }}>
        <Text variant="muted" style={{ color: colors.danger }}>{tr('Quitter la partie')}</Text>
      </Pressable>
    </View>
  );
}

export const PauseSheet = forwardRef<BottomSheetModal, Actions>(function PauseSheet({ onOpen, onClose, ...actions }, ref) {
  const resume = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  return (
    <Sheet ref={ref} onOpen={onOpen} onClose={onClose}>
      <Content {...actions} onResume={resume} />
    </Sheet>
  );
});
