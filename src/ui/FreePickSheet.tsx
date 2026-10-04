// Free-game picker (legacy #free): mode, difficulty and what the difficulty adds.
import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import { FREE_LEVELS, FREE_MODES, LEVEL_NAMES, levelInfo, MODE_NAMES, modeNote, modeSub, richRuns } from '../game/modes';
import { sfx } from '../audio/engine';
import { useGame } from '../state/store';
import { colors, radius, space } from '../theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { KindIcon } from './KindIcon';
import { Sheet } from './Sheet';
import { Text } from './Text';

function Label({ children }: { children: string }) {
  return <Text variant="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 13, marginTop: space.s, marginBottom: -space.xs }}>{children}</Text>;
}

function Content({ onClose, onPlay, parked }: { onClose: () => void; onPlay: () => void; parked: boolean }) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title" style={{ textTransform: 'uppercase' }}>{tr('Partie libre')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Fermer')} onPress={onClose} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={colors.text} />
        </Pressable>
      </View>
      <Label>{tr('Mode')}</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FREE_MODES.map((m) => (
          <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: prefs.mode === m }} onPress={() => pick({ mode: m })}
            style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 6, borderRadius: radius.card - 4, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2.5, borderColor: prefs.mode === m ? colors.accent : 'transparent' }}>
            <Text variant="title" style={{ fontSize: 18, lineHeight: 22 }}>{MODE_NAMES[m]}</Text>
            <Text variant="muted" style={{ fontSize: 12, textAlign: 'center', lineHeight: 15 }}>{modeSub(m)}</Text>
          </Pressable>
        ))}
      </View>
      <Label>{tr('Difficulté')}</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FREE_LEVELS.map((l) => (
          <Pressable key={l} accessibilityRole="button" accessibilityState={{ selected: prefs.level === l }} onPress={() => pick({ level: l })}
            style={{ flex: 1, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2.5, borderColor: prefs.level === l ? colors.accent : 'transparent' }}>
            <Text variant="title" style={{ fontSize: 16, lineHeight: 22 }}>{LEVEL_NAMES[l]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
        {info.kinds.length > 0 && <View style={{ flexDirection: 'row', gap: 2 }}>{info.kinds.map((k) => <KindIcon key={k} kind={k} />)}</View>}
        <Text variant="muted" style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>
          {richRuns(info.text).map((r, i) => <Text key={i} variant="muted" style={{ fontSize: 13, color: r.bold ? colors.accent : colors.muted, fontFamily: r.bold ? 'Baloo2-ExtraBold' : undefined }}>{r.text}</Text>)}
        </Text>
      </View>
      <Text variant="muted" style={{ fontSize: 12, lineHeight: 16 }}>{modeNote(prefs.mode)}</Text>
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
