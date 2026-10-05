// End of a free run (legacy screens/gameover.js showGameOver): title, score, record, run summary, coin lines
// one by one while the wallet counts up, next goal, today's missions, Rejouer / Menu.
// Cubo's pose over the title (star on a record, happy past half of it, oops below). A rewarded ad doubles the run's coins once.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { M } from '../core';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { showRewarded } from '../platform/ads';
import { runSummary } from '../game/summary';
import { modeLabel } from '../game/modes';
import type { RunEnd } from '../game/run';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { cuboLookFor } from '../mascot/looks';
import { Button } from '../ui/Button';
import { CuboPose } from '../ui/CuboPose';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

const TITLES = { over: () => tr('Plus de place !'), time: () => tr('Temps écoulé !'), quit: () => tr('Partie terminée') };

// Rewarded ad: doubles this run's coins once (legacy #over-ad).
function DoubleCoinsAd({ total, visible, onDoubled }: { total: number; visible: boolean; onDoubled: (n: number) => void }) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [got, setGot] = useState(false);
  if (!visible) return null;
  if (got) {
    return (
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2 }}>
        <Text variant="muted" style={{ fontSize: 14 }}>{tr('Bonus pub')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 14 }}>+{total}</Text>
          <Coin size={14} />
        </View>
      </View>
    );
  }
  const press = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await showRewarded();
    if (!ok) { setBusy(false); return; }
    const { profile, setProfile } = useGame.getState();
    setProfile(M.doubleRun(profile, { total }));
    sfx.buy();
    setGot(true);
    onDoubled(total);
  };
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void press(); }}
      style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2, opacity: busy ? 0.45 : 1 }}>
      <Text style={{ fontSize: 15, flex: 1 }}>{tr`Regarder une pub · +${fmt(total)}`}</Text>
      <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{tr('Pub')}</Text>
    </Pressable>
  );
}

function Goal({ coins, delay }: { coins: number; delay: number }) {
  const colors = useColors();
  const goal = useMemo(() => M.nextGoal(useGame.getState().profile), []);
  const [filled, setFilled] = useState(false);
  useEffect(() => { const id = setTimeout(() => setFilled(true), delay); return () => clearTimeout(id); }, [delay]);
  if (!goal) return <Text variant="muted" style={{ fontSize: 13 }}>{tr('Toute la boutique est débloquée')}</Text>;
  const ready = coins >= goal.price!;
  const price = goal.price!;
  const kind = goal.kind === 'blocks' ? tr('les blocs') : goal.kind === 'cubo' ? tr('l’accessoire de Cubo') : tr('le thème');
  const color = ready ? colors.good : colors.muted;
  return (
    <View>
      <Text variant="muted" style={{ fontSize: 13, color, fontFamily: ready ? 'Baloo2-ExtraBold' : undefined }}>
        {ready ? tr`« ${goal.name} » est disponible en boutique` : tr`Plus que ${fmt(price - coins)} pièces pour ${kind} « ${goal.name} »`}
      </Text>
      <View style={{ height: 8, marginTop: 6, borderRadius: 4, backgroundColor: colors.sunken, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: filled ? `${Math.min(100, (coins / price) * 100)}%` : '0%', borderRadius: 4, backgroundColor: ready ? colors.good : colors.accent }} />
      </View>
    </View>
  );
}

function MissionsLine() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const status = M.missionStatus(profile, {});
  const done = status.filter((m) => m.done).length;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, paddingHorizontal: 12, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
      <Text variant="muted" style={{ fontSize: 13 }}>{tr`Missions du jour · ${done}/${status.length}`}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {status.map((m, i) => <View key={i} style={{ width: 14, height: 6, borderRadius: 3, backgroundColor: m.done ? colors.good : colors.hairline }} />)}
      </View>
    </View>
  );
}

export function GameOver({ end, onAgain, onMenu }: { end: RunEnd; onAgain: () => void; onMenu: () => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const mascot = useGame((s) => s.saved.settings.mascot);
  const look = useMemo(() => cuboLookFor('toy', profile.equipped.cubo), [profile.equipped.cubo]);
  const tiles = useMemo(() => runSummary(end), [end]);
  const [shown, setShown] = useState(end.coinsBefore);
  const [lines, setLines] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Coin lines appear one by one; the wallet counts up in at most 12 steps (legacy countCoins).
  useEffect(() => {
    const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
    let cur = end.coinsBefore;
    end.earned.forEach((line, i) => {
      later(() => {
        setLines(i + 1);
        const from = cur;
        const to = from + line.coins;
        cur = to;
        const steps = Math.min(12, line.coins);
        for (let k = 1; k <= steps; k++) later(() => { setShown(Math.round(from + ((to - from) * k) / steps)); sfx.coin(k); }, k * 28);
      }, 350 + i * 420);
    });
    return () => timers.current.forEach(clearTimeout);
  }, [end]);

  const linesDone = 350 + end.earned.length * 420;

  const share = async () => {
    sfx.turn();
    const text = [
      `Cubo Blocks · ${modeLabel(useGame.getState().saved.state)}`,
      tr`${fmt(end.score)} points${end.record ? tr(' · nouveau record') : ''}`,
      tiles.filter((x) => x.value !== '–').map((x) => `${x.label} : ${x.value}`).join(' · '),
    ].join('\n');
    try { await Share.share({ message: text }); } catch { setFlash(tr('Partage impossible ici')); setTimeout(() => setFlash(null), 1800); }
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, justifyContent: 'center', padding: space.m }}>
      <Animated.View entering={ZoomIn.duration(260)} style={{ maxHeight: '100%' }}>
        <View style={{ backgroundColor: colors.panel, borderRadius: radius.card + 8, borderBottomWidth: 6, borderBottomColor: colors.edge, overflow: 'hidden', maxHeight: '100%' }}>
          <ScrollView contentContainerStyle={{ padding: space.xl, alignItems: 'center', gap: 4 }}>
            {mascot && (
              <Animated.View entering={ZoomIn.duration(560)} style={{ marginTop: -12, marginBottom: -4, transformOrigin: 'bottom' }}>
                <CuboPose width={112} lw={224} lh={236} s={150} foot={13} look={look} mood={end.record ? 'star' : end.score >= end.best / 2 ? 'happy' : 'oops'} />
              </Animated.View>
            )}
            <Text variant="title" style={{ fontSize: 30, textTransform: 'uppercase', textAlign: 'center' }}>{TITLES[end.title]()}</Text>
            <Text variant="big" style={{ fontSize: 76, lineHeight: 94, paddingBottom: 4, marginTop: -10, marginBottom: -26, color: colors.text }}>{fmt(end.score)}</Text>
            <Text variant="muted" style={{ fontSize: 15 }}>{tr('Record : ') + fmt(end.best)}</Text>
            {end.record && (
              <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.accent }}>
                <Text variant="title" style={{ fontSize: 17, color: colors.onAccent, letterSpacing: 1 }}>{tr('NOUVEAU RECORD')}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, alignSelf: 'stretch' }}>
              {tiles.map((x, i) => (
                <View key={i} style={{ flex: 1, minWidth: 0, paddingVertical: 7, paddingHorizontal: 4, borderRadius: radius.card - 8, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2, borderColor: x.best ? colors.accent : 'transparent' }}>
                  <Text variant="title" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, lineHeight: 22 }}>{x.value}</Text>
                  <Text variant="muted" numberOfLines={1} style={{ fontSize: 11, color: x.best ? colors.accent : colors.muted }}>{x.best ? tr('Record !') : x.label}</Text>
                </View>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.panel2, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <Icon name="share" size={16} color={colors.text} />
              <Text style={{ fontSize: 13 }}>{flash ?? tr('Partager le résumé')}</Text>
            </Pressable>
            <View style={{ alignSelf: 'stretch', marginTop: 10, minHeight: end.earned.length * 30 }}>
              {end.earned.slice(0, lines).map((line, i) => (
                <Animated.View key={i} entering={FadeInDown.duration(250)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2 }}>
                  <Text variant="muted" style={{ fontSize: 14, flex: 1 }}>{line.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 14 }}>+{line.coins}</Text>
                    <Coin size={14} />
                  </View>
                </Animated.View>
              ))}
            </View>
            <View style={{ alignSelf: 'stretch', marginTop: 4, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>{tr('Pièces')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Coin size={20} />
                <Text variant="title" style={{ fontSize: 26, lineHeight: 30 }}>{fmt(shown)}</Text>
              </View>
            </View>
            <DoubleCoinsAd total={end.total} visible={end.total > 0} onDoubled={(n) => {
              const from = shown;
              const steps = Math.min(12, n);
              for (let i = 1; i <= steps; i++) timers.current.push(setTimeout(() => setShown(Math.round(from + (n * i) / steps)), i * 28));
            }} />
            <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
              <Goal key={profile.coins} coins={profile.coins} delay={linesDone} />
            </View>
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}><MissionsLine /></View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' }}>
              <Button kind="ghost" label={tr('Menu')} onPress={onMenu} style={{ flex: 1, paddingHorizontal: 8 }} />
              <Button label={tr('Rejouer')} onPress={onAgain} style={{ flex: 1.4, paddingHorizontal: 8 }} />
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
