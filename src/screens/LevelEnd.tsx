// End of an Aventure level (legacy showLevelEnd): title, stars popping in, coin lines (the run's and the
// level's: first clear, new stars, stickers, theme unlocked or refunded), +moves offer when out of moves,
// then Carte / Rejouer or Réessayer / Suivant. The hook registers the level-end handler of the game
// screen and settles the level (stars, rewards, one recorded fail per start) before the card shows.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { M, LV, WD } from '../core';
import { locale, tr } from '../core/i18n';
import type { Earned } from '../core/meta';
import { sfx } from '../audio/engine';
import { freshFlags, levelMood, nextLevelOf, settleLevel, type LevelReport } from '../game/levelend';
import { shareText, dailyWord } from '../game/daily';
import { buyExtraMoves, setLevelEndHandler, startId, type LevelEnd } from '../game/run';
import { cuboLookFor } from '../mascot/looks';
import { haptic } from '../platform/haptics';
import type { Layout } from '../render/layout';
import { today } from '../state/persist';
import { levelName } from '../state/progress';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from '../ui/Button';
import { CuboPose } from '../ui/CuboPose';
import { StarRow } from '../ui/Stars';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';
import { Flame, Icon } from '../ui/Icon';
import { DailyRefill } from '../ui/DailyRefill';

const fmt = (n: number) => n.toLocaleString(locale());

export interface LevelCardData { end: LevelEnd; report: LevelReport | null; lines: Earned[]; total: number }

// Registers the handler while the game screen is mounted; returns the card to show.
export function useLevelEnd(): [LevelCardData | null, (c: LevelCardData | null) => void] {
  const [card, setCard] = useState<LevelCardData | null>(null);
  const flags = useRef(freshFlags());
  useEffect(() => {
    setLevelEndHandler((end) => {
      const { profile, setProfile } = useGame.getState();
      const { stage } = end;
      const key = `${stage.world}-${stage.n}-${end.state.seed}-${startId()}`;
      const res = settleLevel(profile, stage, key, flags.current, today());
      flags.current = res.flags;
      if (res.profile !== profile) setProfile(res.profile);
      if (stage.event) return; // season events settle on their own screen
      const lines = [...(end.run ? end.run.earned : []), ...(res.report ? res.report.earned : [])];
      setCard({ end, report: res.report, lines, total: lines.reduce((a, l) => a + l.coins, 0) });
    });
    return () => setLevelEndHandler(null);
  }, []);
  return [card, setCard];
}

function Opt({ label, children, disabled, onPress }: { label: string; children: React.ReactNode; disabled?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2, opacity: disabled ? 0.45 : 1 }}>
      <Text style={{ fontSize: 15, flex: 1 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>{children}</View>
    </Pressable>
  );
}

interface Props {
  card: LevelCardData;
  lay: Layout | null;
  onMap: (world: string) => void;
  onAgain: () => void;
  onNext: (to: [string, number]) => void;
  onRevived: () => void;
  onMenu: () => void; // daily: back to the Défis tab
}

export function LevelEndCard({ card, lay, onMap, onAgain, onNext, onRevived, onMenu }: Props) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const mascot = useGame((s) => s.saved.settings.mascot);
  const look = useMemo(() => cuboLookFor('toy', profile.equipped.cubo), [profile.equipped.cubo]);
  const { end, report, lines, total } = card;
  const { stage, won, outOfMoves } = end;
  const { world: w, n } = stage;
  const [equipped, setEquipped] = useState(false);
  const title = won
    ? (n === M.LEVELS_PER_WORLD ? tr('Boss vaincu !') : n === M.TRIAL_LEVEL ? tr('Épreuve réussie !') : tr('Niveau réussi !'))
    : end.timeUp ? tr('Temps écoulé !') : end.quit ? tr('Niveau abandonné') : outOfMoves ? tr('Plus de coups !') : tr('Plus de place !');
  const next = won ? nextLevelOf(profile, w, n) : null;
  const moreCost = M.extraMovesCost(stage.extra || 0);
  const progress = Math.min(stage.goal.type === 'score' ? end.state.score : stage.progress, stage.goal.target);

  // One chime per star, in step with the stars' entrance (0, 180, 360 ms).
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    for (let k = 0; k < stage.stars; k++) ids.push(setTimeout(() => { sfx.star(k); haptic('star'); }, 60 + k * 180));
    return () => ids.forEach(clearTimeout);
  }, [stage.stars]);

  const more = () => {
    if (!lay || !buyExtraMoves(lay)) { sfx.nope(); haptic('nope'); return; }
    onRevived();
  };
  const equip = () => {
    if (!report?.themeUnlocked) return;
    const { profile: p, setProfile } = useGame.getState();
    const nextP = M.equip(p, 'boards', report.themeUnlocked);
    if (!nextP) { sfx.nope(); return; }
    setProfile(nextP);
    sfx.buy();
    setEquipped(true);
  };
  const three = won && stage.stars >= 3;
  const day = stage.daily;
  const left = day ? M.dailyAttemptsLeft(profile, day, today()) : 0;
  const streak = report?.streak;
  const [shared, setShared] = useState<string | null>(null);
  const share = async () => {
    if (!day) return;
    sfx.turn();
    try { await Share.share({ message: shareText(day, WD.WORLDS[w].name, stage.stars, stage.movesLeft) }); } catch { setShared(tr('Partage impossible ici')); setTimeout(() => setShared(null), 1800); }
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, justifyContent: 'center', padding: space.m }}>
      <Animated.View entering={ZoomIn.duration(260)} style={{ maxHeight: '100%' }}>
        <View style={{ backgroundColor: colors.panel, borderRadius: radius.card + 8, borderBottomWidth: 6, borderBottomColor: colors.edge, overflow: 'hidden', maxHeight: '100%' }}>
          <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.m, alignItems: 'center', gap: 2 }}>
            {mascot && (
              <Animated.View entering={ZoomIn.duration(560)} style={{ marginTop: -12, marginBottom: -4, transformOrigin: 'bottom' }}>
                <CuboPose width={112} lw={224} lh={236} s={150} foot={13} look={look} mood={levelMood(won, stage.stars)} />
              </Animated.View>
            )}
            <Text variant="title" style={{ fontSize: 30, textTransform: 'uppercase', textAlign: 'center' }}>{title}</Text>
            <Text variant="muted">{day ? `${dailyWord(day, today())} #${LV.dayNumber(day)} · ${WD.WORLDS[w].name}` : `${WD.WORLDS[w].name} · ${levelName(n)}`}</Text>
            <View style={{ marginVertical: 12 }}><StarRow n={stage.stars} size={44} gap={6} animate /></View>
            <Text variant="muted" style={{ textAlign: 'center' }}>{LV.goalText(stage.goal)} · {fmt(progress)} / {fmt(stage.goal.target)}</Text>
            {streak && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <Flame size={20} color={colors.text} />
                <Text style={{ fontFamily: 'Baloo2-ExtraBold' }}>{tr`Série : ${streak.count} jour${streak.count > 1 ? 's' : ''}`}</Text>
              </View>
            )}
            {report?.unlocked && (
              <View style={{ alignSelf: 'stretch', marginTop: 10, padding: 10, paddingHorizontal: 12, borderRadius: radius.card - 6, borderWidth: 2, borderColor: colors.good }}>
                <Text style={{ color: colors.good, fontFamily: 'Baloo2-ExtraBold' }}>{tr('Skin de blocs « Or » débloqué ! Équipe-le dans la Boutique, onglet Blocs.')}</Text>
              </View>
            )}
            {report?.themeUnlocked && (
              <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
                <View style={{ padding: 10, paddingHorizontal: 12, borderRadius: radius.card - 6, borderWidth: 2, borderColor: colors.good }}>
                  <Text style={{ color: colors.good, fontFamily: 'Baloo2-ExtraBold' }}>{tr`Thème « ${WD.WORLDS[report.themeUnlocked].name} » débloqué !`}</Text>
                </View>
                <Opt label={tr('Mettre ce thème maintenant')} disabled={equipped} onPress={equip}>
                  <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{equipped ? tr('Équipé') : tr('Équiper')}</Text>
                </Opt>
              </View>
            )}
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
            {day && <DailyRefill day={day} />}
            {outOfMoves && (
              <Opt label={tr`+${M.EXTRA_MOVES} coups pour finir (1 étoile max)`} disabled={profile.coins < moreCost} onPress={more}>
                <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{moreCost}</Text><Coin size={16} />
              </Opt>
            )}
            {day && won && (
              <Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.panel2, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
                <Icon name="share" size={16} color={colors.text} />
                <Text style={{ fontSize: 14 }}>{shared || tr('Partager le résumé')}</Text>
              </Pressable>
            )}
          </ScrollView>
          {day ? (
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.xl, backgroundColor: colors.panel }}>
              <Button kind="ghost" label={tr('Menu')} onPress={onMenu} style={{ flex: 1, paddingHorizontal: 4 }} />
              {left > 0 && !three && <Button label={`${won ? tr('Rejouer') : tr('Réessayer')}${Number.isFinite(left) ? ` (${left})` : ''}`} onPress={onAgain} style={{ flex: 1.4, paddingHorizontal: 4 }} />}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.xl, backgroundColor: colors.panel }}>
              <Button kind="ghost" label={tr('Carte')} onPress={() => onMap(w)} style={{ flex: 1, paddingHorizontal: 4 }} />
              {!three && <Button kind={next ? 'ghost' : 'primary'} label={won ? tr('Rejouer') : tr('Réessayer')} onPress={onAgain} style={{ flex: 1, paddingHorizontal: 4 }} />}
              {next && <Button label={tr('Suivant')} onPress={() => onNext(next)} style={{ flex: 1, paddingHorizontal: 4 }} />}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
