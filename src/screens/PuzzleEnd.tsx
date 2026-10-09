// End of a puzzle (legacy showPuzzleEnd): Cubo in party mood, stars (a surprise has none, it counts the ones
// solved), hints used, the coin lines, then Puzzles / Un autre / Rejouer / Suivant. The hook registers the
// puzzle-end handler of the game screen; the result (stars, coins, stickers) is settled in game/run.ts.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { M } from '../core';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { isSurprise, nextPuzzle, puzzleLabel } from '../game/puzzle';
import { setPuzzleEndHandler, type PuzzleEnd } from '../game/run';
import { cuboLookFor } from '../mascot/looks';
import { haptic } from '../platform/haptics';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors, usePlayedTheme } from '../theme/useColors';
import { Button } from '../ui/Button';
import { CuboPose } from '../ui/CuboPose';
import { StarRow } from '../ui/Stars';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

export function usePuzzleEnd(): [PuzzleEnd | null, (c: PuzzleEnd | null) => void] {
  const [card, setCard] = useState<PuzzleEnd | null>(null);
  useEffect(() => {
    setPuzzleEndHandler(setCard);
    return () => setPuzzleEndHandler(null);
  }, []);
  return [card, setCard];
}

interface Props { card: PuzzleEnd; onList: () => void; onMore: () => void; onAgain: () => void; onNext: (n: number) => void }

export function PuzzleEndCard({ card, onList, onMore, onAgain, onNext }: Props) {
  const colors = useColors();
  const equipped = useGame((s) => s.profile.equipped.cubo);
  const mascot = useGame((s) => s.saved.settings.mascot);
  const solved = useGame((s) => M.surprisesSolved(s.profile));
  const played = usePlayedTheme();
  const look = useMemo(() => cuboLookFor(played, equipped), [played, equipped]);
  const { pz, lines, total } = card;
  const next = nextPuzzle(pz);
  const surprise = isSurprise(pz);
  const hints = pz.hints;

  // One chime per star, in step with the stars' entrance.
  useEffect(() => {
    if (surprise) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    for (let k = 0; k < pz.stars; k++) ids.push(setTimeout(() => { sfx.star(k); haptic('star'); }, 60 + k * 180));
    return () => ids.forEach(clearTimeout);
  }, [surprise, pz.stars]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, justifyContent: 'center', padding: space.m }}>
      <Animated.View entering={ZoomIn.duration(260)} style={{ maxHeight: '100%' }}>
        <View style={{ backgroundColor: colors.panel, borderRadius: radius.card + 8, overflow: 'hidden', maxHeight: '100%' }}>
          <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.m, alignItems: 'center', gap: 2 }}>
            {mascot && (
              <Animated.View entering={ZoomIn.duration(560)} style={{ marginTop: -12, marginBottom: -4, transformOrigin: 'bottom' }}>
                <CuboPose width={112} lw={224} lh={236} s={150} foot={13} look={look} mood="party" />
              </Animated.View>
            )}
            <Text variant="title" style={{ fontSize: 30, textTransform: 'uppercase', textAlign: 'center' }}>{tr('Puzzle réussi !')}</Text>
            <Text variant="muted" style={{ textAlign: 'center' }}>{puzzleLabel(pz)}</Text>
            {surprise
              ? <Text variant="muted" style={{ marginTop: 8, textAlign: 'center' }}>{tr`${fmt(solved)} puzzle${solved > 1 ? 's' : ''} surprise réussi${solved > 1 ? 's' : ''}`}</Text>
              : <View style={{ marginVertical: 12 }}><StarRow n={pz.stars} size={44} gap={6} animate /></View>}
            <Text variant="muted" style={{ textAlign: 'center' }}>{hints ? tr`${hints} indice${hints > 1 ? 's' : ''} utilisé${hints > 1 ? 's' : ''}` : tr('Sans indice')}</Text>
            {surprise && !lines.length && <Text variant="muted" style={{ marginTop: 8, textAlign: 'center' }}>{tr`Les ${M.SURPRISE_DAILY} puzzles surprise payés du jour sont faits : reviens demain pour des pièces.`}</Text>}
            <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
              {lines.map((l, i) => (
                <Animated.View key={i} entering={FadeInDown.delay(i * 90).duration(250)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2 }}>
                  <Text variant="muted" style={{ flex: 1 }}>{l.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 14 }}>+{l.coins}</Text><Coin size={14} />
                  </View>
                </Animated.View>
              ))}
            </View>
            {total > 0 && (
              <View style={{ alignSelf: 'stretch', marginTop: 6, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{tr('Pièces')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text variant="title" style={{ fontSize: 26, lineHeight: 30 }}>+{fmt(total)}</Text><Coin size={20} />
                </View>
              </View>
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.xl, backgroundColor: colors.panel }}>
            <Button kind="ghost" label={tr('Puzzles')} onPress={onList} style={{ flex: 1, paddingHorizontal: 4 }} />
            {surprise && <Button label={tr('Un autre')} onPress={onMore} style={{ flex: 1, paddingHorizontal: 4 }} />}
            {!surprise && pz.stars < 3 && <Button kind={next ? 'ghost' : 'primary'} label={tr('Rejouer')} onPress={onAgain} style={{ flex: 1, paddingHorizontal: 4 }} />}
            {next && <Button label={tr('Suivant')} onPress={() => onNext(next)} style={{ flex: 1, paddingHorizontal: 4 }} />}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
