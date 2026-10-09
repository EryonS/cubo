// Free-game picker (legacy #free): theme of the run, mode, difficulty and what the difficulty adds.
// The theme is the run's own: it starts on the equipped one and does not change the app's.
// With a free run parked, Reprendre comes first and Jouer becomes Nouvelle partie.
import { forwardRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { M } from '../core';
import { tr } from '../core/i18n';
import { FREE_LEVELS, FREE_MODES, LEVEL_NAMES, levelInfo, MODE_NAMES, modeNote, modeSub, richRuns } from '../game/modes';
import { sfx } from '../audio/engine';
import { boardTheme } from '../render/board-themes';
import { drawPreview } from '../render/preview';
import { useGame } from '../state/store';
import { fonts } from '../theme/fonts';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from './Button';
import { DrawCanvas } from './DrawCanvas';
import { SectionLabel } from './SectionLabel';
import { Segmented } from './Segmented';
import { KindIcon } from './KindIcon';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';

const THUMB_W = 112;

// The owned themes in a row: a preview and the name, the picked one ringed.
function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const colors = useColors();
  const owned = useGame((s) => s.profile.owned.boards);
  const blocks = useGame((s) => s.profile.equipped.blocks);
  const themes = M.SKINS.boards.filter((sk) => owned.includes(sk.id));
  const at = Math.max(0, themes.findIndex((sk) => sk.id === value));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: Math.max(0, at - 1) * (THUMB_W + space.s), y: 0 }}
      contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }} style={{ marginHorizontal: -space.l }}>
      {themes.map((sk) => {
        const on = sk.id === value;
        return (
          <Pressable key={sk.id} accessibilityRole="button" accessibilityLabel={sk.name} accessibilityState={{ selected: on }} onPress={() => onChange(sk.id)}
            style={{ width: THUMB_W, padding: space.xs, gap: space.xs, borderRadius: radius.tile, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2.5, borderColor: on ? colors.accent : 'transparent' }}>
            <DrawCanvas width={THUMB_W - 2 * space.xs - 5} radius={radius.s} deps={[sk.id, blocks]} draw={(g, w, h) => drawPreview(g, boardTheme(sk.id, blocks), w, h)} />
            <Text variant="caption" numberOfLines={1} style={{ color: on ? colors.text : colors.muted }}>{sk.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Content({ onClose, onPlay, onResume }: { onClose: () => void; onPlay: (theme: string) => void; onResume?: () => void }) {
  const colors = useColors();
  const prefs = useGame((s) => s.saved.prefs);
  const owned = useGame((s) => s.profile.owned.boards);
  // The sheet mounts on each opening: it starts on the app's theme.
  const [board, setBoard] = useState(() => useGame.getState().profile.equipped.boards);
  const pick = (next: Partial<typeof prefs>) => {
    sfx.turn();
    const { saved, setSaved } = useGame.getState();
    setSaved({ ...saved, prefs: { ...saved.prefs, ...next } });
  };
  const info = levelInfo(board, prefs.level);
  return (
    <View style={{ gap: space.m }}>
      <SheetHeader title={tr('Partie libre')} onClose={onClose} />
      {onResume && <Button label={tr('Reprendre')} onPress={onResume} />}
      {owned.length > 1 && <>
        <SectionLabel>{tr('Thème')}</SectionLabel>
        <ThemePicker value={board} onChange={(id) => { sfx.turn(); setBoard(id); }} />
      </>}
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
      <Button label={onResume ? tr('Nouvelle partie') : tr('Jouer')} kind={onResume ? 'secondary' : 'primary'} onPress={() => onPlay(board)} />
    </View>
  );
}

type Props = { onPlay: (theme: string) => void; onResume?: () => void };
export const FreePickSheet = forwardRef<BottomSheetModal, Props>(function FreePickSheet({ onPlay, onResume }, ref) {
  const close = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  return (
    <Sheet ref={ref}>
      <Content onClose={close} onPlay={(theme) => { close(); onPlay(theme); }} onResume={onResume && (() => { close(); onResume(); })} />
    </Sheet>
  );
});
