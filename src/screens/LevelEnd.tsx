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
import { eventLevelName, hatName, settleEvent, type EventPay } from '../game/events';
import { freshFlags, levelMood, nextLevelOf, settleLevel, type LevelReport } from '../game/levelend';
import { shareText, dailyWord } from '../game/daily';
import { buyExtraMoves, setLevelEndHandler, startId, type LevelEnd } from '../game/run';
import { cuboLookFor } from '../mascot/looks';
import { haptic } from '../platform/haptics';
import type { Layout } from '../render/layout';
import { today } from '../state/persist';
import { fonts } from '../theme/fonts';
import { levelName } from '../state/progress';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors, usePlayedTheme } from '../theme/useColors';
import { Button } from '../ui/Button';
import { CuboPose } from '../ui/CuboPose';
import { StarRow } from '../ui/Stars';
import { ListRow } from '../ui/ListRow';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';
import { Flame, Icon } from '../ui/Icon';
import { DailyRefill } from '../ui/DailyRefill';

const fmt = (n: number) => n.toLocaleString(locale());

export interface LevelCardData { end: LevelEnd; report: LevelReport | null; eventPay: EventPay | null; lines: Earned[]; total: number }

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
      if (stage.event) {
        const paid = settleEvent(profile, { ...stage, won: end.won }, key, flags.current, today());
        flags.current = paid.flags;
        if (paid.profile !== profile) setProfile(paid.profile);
        const lines = [...(end.run ? end.run.earned : []), ...(paid.pay ? paid.pay.earned : [])];
        setCard({ end, report: null, eventPay: paid.pay, lines, total: lines.reduce((a, l) => a + l.coins, 0) });
        return;
      }
      if (res.profile !== profile) setProfile(res.profile);
      const lines = [...(end.run ? end.run.earned : []), ...(res.report ? res.report.earned : [])];
      setCard({ end, report: res.report, eventPay: null, lines, total: lines.reduce((a, l) => a + l.coins, 0) });
    });
    return () => setLevelEndHandler(null);
  }, []);
  return [card, setCard];
}

function Opt({ label, children, disabled, onPress }: { label: string; children: React.ReactNode; disabled?: boolean; onPress: () => void }) {
  return (
    <ListRow inset title={label} disabled={disabled} quiet onPress={onPress} style={{ alignSelf: 'stretch', marginTop: space.s }}
      right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>{children}</View>} />
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
  onEvent: (id: string, level?: number) => void;
}

export function LevelEndCard({ card, lay, onMap, onAgain, onNext, onRevived, onMenu, onEvent }: Props) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const mascot = useGame((s) => s.saved.settings.mascot);
  const played = usePlayedTheme();
  const look = useMemo(() => cuboLookFor(played, profile.equipped.cubo), [played, profile.equipped.cubo]);
  const { end, report, eventPay, lines, total } = card;
  const { stage, won, outOfMoves } = end;
  const { world: w, n } = stage;
  const eventId = stage.event;
  const ev = eventId ? M.eventById(eventId) : null;
  const [equipped, setEquipped] = useState(false);
  const [worn, setWorn] = useState(false);
  const title = eventId && won ? (n === 10 ? tr('Boss vaincu !') : tr('Niveau réussi !'))
    : won ? (n === M.LEVELS_PER_WORLD ? tr('Boss vaincu !') : n === M.TRIAL_LEVEL ? tr('Épreuve réussie !') : tr('Niveau réussi !'))
    : end.timeUp ? tr('Temps écoulé !') : end.quit ? tr('Niveau abandonné') : outOfMoves ? tr('Plus de coups !') : tr('Plus de place !');
  const next = !eventId && won ? nextLevelOf(profile, w, n) : null;
  const eventNext = ev && won && n < ev.levels && M.eventActive(today(), ev.id) ? n + 1 : null;
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
  const wear = () => {
    if (!eventPay?.unlocked.length) return;
    let p = useGame.getState().profile;
    for (const u of eventPay.unlocked) {
      const nextP = M.equip(p, u.kind as 'boards' | 'cubo', u.id);
      if (nextP) p = nextP;
    }
    useGame.getState().setProfile(p);
    sfx.buy();
    setWorn(true);
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
        <View style={{ backgroundColor: colors.panel, borderRadius: radius.card + 8, overflow: 'hidden', maxHeight: '100%' }}>
          <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.m, alignItems: 'center', gap: 2 }}>
            {mascot && (
              <Animated.View entering={ZoomIn.duration(560)} style={{ marginTop: -12, marginBottom: -4, transformOrigin: 'bottom' }}>
                <CuboPose width={112} lw={224} lh={236} s={150} foot={13} look={look} mood={levelMood(won, stage.stars)} />
              </Animated.View>
            )}
            <Text variant="title" style={{ fontSize: 30, textTransform: 'uppercase', textAlign: 'center' }}>{title}</Text>
            <Text variant="muted">{ev ? `${ev.name} · ${eventLevelName(n)}` : day ? `${dailyWord(day, today())} #${LV.dayNumber(day)} · ${WD.WORLDS[w].name}` : `${WD.WORLDS[w].name} · ${levelName(n)}`}</Text>
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
            {ev && eventPay?.unlocked.map((u) => (
              <View key={u.kind + u.id} style={{ alignSelf: 'stretch', marginTop: 10, padding: 10, paddingHorizontal: 12, borderRadius: radius.card - 6, borderWidth: 2, borderColor: colors.good }}>
                <Text style={{ color: colors.good, fontFamily: fonts.display }}>{u.kind === 'boards' ? tr`Thème « ${ev.name} » débloqué !` : tr`${hatName(ev.hat)} pour Cubo !`}</Text>
              </View>
            ))}
            {ev && !!eventPay?.unlocked.length && (
              <Opt label={tr('Les mettre maintenant')} disabled={worn} onPress={wear}>
                <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{worn ? tr('Équipé') : tr('Équiper')}</Text>
              </Opt>
            )}
            {ev && eventPay?.trophy && (
              <View style={{ alignSelf: 'stretch', marginTop: 10, padding: 10, paddingHorizontal: 12, borderRadius: radius.card - 6, borderWidth: 2, borderColor: colors.good }}>
                <Text style={{ color: colors.good, fontFamily: fonts.display }}>{eventPay.trophy === 'gold' ? tr`Trophée ${ev.name} ${M.eventYear(stage.eventDay || today())} en or !` : tr`Trophée ${ev.name} ${M.eventYear(stage.eventDay || today())} en argent !`}</Text>
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
          {eventId && ev ? (
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.xl, backgroundColor: colors.panel }}>
              <Button kind="ghost" label={tr('Événement')} onPress={() => onEvent(ev.id)} style={{ flex: 1, paddingHorizontal: 4 }} />
              {!three && <Button kind={eventNext ? 'ghost' : 'primary'} label={won ? tr('Rejouer') : tr('Réessayer')} onPress={onAgain} style={{ flex: 1, paddingHorizontal: 4 }} />}
              {eventNext != null && <Button label={tr('Suivant')} onPress={() => onEvent(ev.id, eventNext)} style={{ flex: 1, paddingHorizontal: 4 }} />}
            </View>
          ) : day ? (
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
