// Free-game picker (legacy #free): mode, difficulty and what the difficulty adds.
import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import { FREE_LEVELS, FREE_MODES, LEVEL_NAMES, levelInfo, MODE_NAMES, modeNote, modeSub, richRuns } from '../game/modes';
import { sfx } from '../audio/engine';
import { useGame } from '../state/store';
import { fonts } from '../theme/fonts';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from './Button';
import { SectionLabel } from './SectionLabel';
import { Segmented } from './Segmented';
import { KindIcon } from './KindIcon';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';

function Content({ onClose, onPlay, parked }: { onClose: () => void; onPlay: () => void; parked: boolean }) {
  const colors = useColors();
  const prefs = useGame((s) => s.saved.prefs);
  const board = useGame((s) => s.profile.equipped.boards);
  const pick = (next: Partial<typeof prefs>) => {
    sfx.turn();
    const { saved, setSaved } = useGame.getState();
    setSaved({ ...saved, prefs: { ...saved.prefs, ...next } });
  };
  const info = levelInfo(board, prefs.level);
  return (
    <View style={{ gap: space.m }}>
      <SheetHeader title={tr('Partie libre')} onClose={onClose} />
      <SectionLabel>{tr('Mode')}</SectionLabel>
      <View style={{ flexDirection: 'row', gap: space.s }}>
        {FREE_MODES.map((m) => (
          <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: prefs.mode === m }} onPress={() => pick({ mode: m })}
            style={{ flex: 1, paddingVertical: space.m, paddingHorizontal: space.xs, borderRadius: radius.tile, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2.5, borderColor: prefs.mode === m ? colors.accent : 'transparent' }}>
            <Text variant="headline">{MODE_NAMES[m]}</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>{modeSub(m)}</Text>
          </Pressable>
        ))}
      </View>
      <SectionLabel>{tr('Difficulté')}</SectionLabel>
      <Segmented inset options={FREE_LEVELS.map((l) => [l, LEVEL_NAMES[l]] as [typeof l, string])} value={prefs.level} onChange={(l) => pick({ level: l })} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.tile, backgroundColor: colors.panel2 }}>
        {info.kinds.length > 0 && <View style={{ flexDirection: 'row', gap: space.xxs }}>{info.kinds.map((k) => <KindIcon key={k} kind={k} />)}</View>}
        <Text variant="muted" style={{ flex: 1 }}>
          {richRuns(info.text).map((r, i) => <Text key={i} variant="muted" style={{ color: r.bold ? colors.accent : colors.muted, fontFamily: r.bold ? fonts.display : undefined }}>{r.text}</Text>)}
        </Text>
      </View>
      <Text variant="caption">{modeNote(prefs.mode)}</Text>
      <Button label={parked ? tr('Nouvelle partie') : tr('Jouer')} onPress={onPlay} />
    </View>
  );
}

type Props = { onPlay: () => void; parked: boolean };
export const FreePickSheet = forwardRef<BottomSheetModal, Props>(function FreePickSheet({ onPlay, parked }, ref) {
  const close = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  return (
    <Sheet ref={ref}>
      <Content onClose={close} onPlay={() => { close(); onPlay(); }} parked={parked} />
    </Sheet>
  );
});
