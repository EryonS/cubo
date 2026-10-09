// End of a free run (legacy screens/gameover.js showGameOver): title, score, record, run summary, coin lines
// one by one while the wallet counts up, next goal, today's missions, Rejouer / Menu.
// Cubo's pose over the title (star on a record, happy past half of it, oops below). A rewarded ad doubles the run's coins once.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Share, View, Pressable, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M } from '../core';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { showRewarded } from '../platform/ads';
import { runSummary } from '../game/summary';
import { modeLabel } from '../game/modes';
import type { RunEnd } from '../game/run';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors, usePlayedTheme } from '../theme/useColors';
import { cuboLookFor } from '../mascot/looks';
import { Button } from '../ui/Button';
import { CuboPose } from '../ui/CuboPose';
import { Icon } from '../ui/Icon';
import { ListRow } from '../ui/ListRow';
import { Pips } from '../ui/Missions';
import { CoinLines, CoinTotal, EndShell } from '../ui/EndCard';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

// 0 on a short phone (SE: ~650 pt between the safe areas), 1 from ~840 pt (Pro Max): the header shrinks between.
const fit = (h: number) => Math.max(0, Math.min(1, (h - 620) / 220));
const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);

const TITLES = { over: () => tr('Plus de place !'), time: () => tr('Temps écoulé !'), quit: () => tr('Partie terminée') };

// Rewarded ad: doubles this run's coins once (legacy #over-ad).
function DoubleCoinsAd({ total, visible, tight, onDoubled }: { total: number; visible: boolean; tight: boolean; onDoubled: (n: number) => void }) {
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
    <ListRow inset title={tr`Regarder une pub · +${fmt(total)}`} disabled={busy} quiet onPress={() => { void press(); }}
      style={[{ alignSelf: 'stretch', marginTop: space.s }, tight && { minHeight: 44, paddingVertical: space.s }]} right={<Text variant="headline">{tr('Pub')}</Text>} />
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

function MissionsLine({ pad }: { pad: number }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const status = M.missionStatus(profile, {});
  const done = status.filter((m) => m.done).length;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: pad, paddingHorizontal: space.m, borderRadius: radius.tile, backgroundColor: colors.panel2 }}>
      <Text variant="muted" style={{ fontSize: 13 }}>{tr`Missions du jour · ${done}/${status.length}`}</Text>
      <Pips status={status} progress={false} />
    </View>
  );
}

export function GameOver({ end, onAgain, onMenu, onRevive }: { end: RunEnd; onAgain: () => void; onMenu: () => void; onRevive: () => boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const k = fit(height - insets.top - insets.bottom);
  const scoreSize = lerp(54, 76, k);
  const ss = scoreSize / 76;
  const linePad = lerp(2, 5, k);
  const profile = useGame((s) => s.profile);
  const mascot = useGame((s) => s.saved.settings.mascot);
  const played = usePlayedTheme();
  const look = useMemo(() => cuboLookFor(played, profile.equipped.cubo), [played, profile.equipped.cubo]);
  const tiles = useMemo(() => runSummary(end), [end]);
  const [shown, setShown] = useState(end.coinsBefore);
  const [lines, setLines] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [doubled, setDoubled] = useState(false); // the doubled coins are paid: the run can no longer be taken back
  const [reviving, setReviving] = useState(false);
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

  // Seconde chance: an ad, then the card closes and the run goes on (the run's coins are settled again at its real end).
  const revive = async () => {
    if (reviving) return;
    setReviving(true);
    if (!(await showRewarded()) || !onRevive()) setReviving(false);
  };

  const share = async () => {
    sfx.turn();
    const text = [
      `Cubo Blocks · ${modeLabel(useGame.getState().saved.state)}`,
      tr`${fmt(end.score)} points${end.record ? tr(' · nouveau record') : ''}`,
      tiles.filter((x) => x.value !== '–').map((x) => `${x.label} : ${x.value}`).join(' · '),
    ].join('\n');
    try { await Share.share({ message: text }); } catch { setFlash(tr('Partage impossible ici')); setTimeout(() => setFlash(null), 1800); }
  };

  // Outside the scroll: Rejouer stays on screen however long the coin list is.
  const footer = (
    <View style={{ paddingHorizontal: space.xl, paddingTop: lerp(space.s, space.m, k), paddingBottom: lerp(space.l, space.xl, k), gap: space.s }}>
      {end.revive && !doubled && (
        <Button label={tr('Seconde chance')} sub={tr('Regarde une pub : une bombe géante, et tu continues')} disabled={reviving} onPress={() => { void revive(); }} />
      )}
      <View style={{ flexDirection: 'row', gap: space.s }}>
        {/* Under Seconde chance, Rejouer steps back to ghost (panel2: a panel-colored button would vanish on the card). */}
        <Button kind="ghost" label={tr('Menu')} onPress={onMenu} style={{ flex: 1, paddingHorizontal: space.s }} />
        <Button kind={end.revive && !doubled ? 'ghost' : 'primary'} label={tr('Rejouer')} onPress={onAgain} style={{ flex: 1.4, paddingHorizontal: space.s }} />
      </View>
    </View>
  );

  return (
    <EndShell content={{ paddingTop: lerp(space.l, space.xl, k), paddingBottom: space.xs, gap: space.xs }} footer={footer}>
            {mascot && (
              <Animated.View entering={ZoomIn.duration(560)} style={{ marginTop: -12, marginBottom: -4, transformOrigin: 'bottom' }}>
                <CuboPose width={lerp(76, 112, k)} lw={224} lh={236} s={150} foot={13} look={look} mood={end.record ? 'star' : end.score >= end.best / 2 ? 'happy' : 'oops'} />
              </Animated.View>
            )}
            <Text variant="title" style={{ fontSize: lerp(23, 30, k), textTransform: 'uppercase', textAlign: 'center' }}>{TITLES[end.title]()}</Text>
            <Text variant="big" style={{ fontSize: scoreSize, lineHeight: Math.round(94 * ss), paddingBottom: 4, marginTop: Math.round(-10 * ss), marginBottom: Math.round((Platform.OS === 'android' ? -14 : -26) * ss), color: colors.text }}>{fmt(end.score)}</Text>
            <Text variant="muted" style={{ fontSize: 15 }}>{tr('Record : ') + fmt(end.best)}</Text>
            {end.record && (
              <View style={{ marginTop: lerp(4, 8, k), paddingHorizontal: 14, paddingVertical: lerp(2, 4, k), borderRadius: radius.pill, backgroundColor: colors.accent }}>
                <Text variant="title" style={{ fontSize: lerp(15, 17, k), color: colors.onAccent, letterSpacing: 1 }}>{tr('NOUVEAU RECORD')}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: lerp(8, 12, k), alignSelf: 'stretch' }}>
              {tiles.map((x, i) => (
                <View key={i} style={{ flex: 1, minWidth: 0, paddingVertical: lerp(4, 7, k), paddingHorizontal: 4, borderRadius: radius.tile, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2, borderColor: x.best ? colors.accent : 'transparent' }}>
                  <Text variant="title" numberOfLines={1} adjustsFontSizeToFit={x.value.length > 5} style={{ fontSize: 17, lineHeight: 22 }}>{x.value}</Text>
                  <Text variant="caption" numberOfLines={1} style={{ color: x.best ? colors.accent : colors.muted }}>{x.best ? tr('Record !') : x.label}</Text>
                </View>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: lerp(4, 6, k), paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.panel2, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <Icon name="share" size={16} color={colors.text} />
              <Text style={{ fontSize: 13 }}>{flash ?? tr('Partager le résumé')}</Text>
            </Pressable>
            <View style={{ alignSelf: 'stretch', marginTop: lerp(4, 10, k), minHeight: end.earned.length * (20 + linePad * 2) }}>
              <CoinLines lines={end.earned} shown={lines} pad={linePad} stagger={0} />
            </View>
            <CoinTotal value={fmt(shown)} pad={lerp(6, 11, k)} style={{ marginTop: space.xs }} />
            <DoubleCoinsAd total={end.total} visible={end.total > 0} tight={k < 0.5} onDoubled={(n) => {
              setDoubled(true);
              const from = shown;
              const steps = Math.min(12, n);
              for (let i = 1; i <= steps; i++) timers.current.push(setTimeout(() => setShown(Math.round(from + (n * i) / steps)), i * 28));
            }} />
            <View style={{ alignSelf: 'stretch', marginTop: lerp(6, 10, k) }}>
              <Goal key={profile.coins} coins={profile.coins} delay={linesDone} />
            </View>
            <View style={{ alignSelf: 'stretch', marginTop: lerp(6, 8, k) }}><MissionsLine pad={lerp(7, 10, k)} /></View>
    </EndShell>
  );
}
