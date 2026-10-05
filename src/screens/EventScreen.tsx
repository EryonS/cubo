// A season event (legacy #event): intro, world rules, the three rewards, 10 levels on a path.
// A level opens a sheet (goal, budget, stars) then starts like an Aventure level, without a bomb or a skip.
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { LV, M, WD } from '../core';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { eventDate, eventLevelName, hatName } from '../game/events';
import { guardFree } from '../game/modes';
import { startEventLevel } from '../game/run';
import { haptic } from '../platform/haptics';
import type { RootParams } from '../navigation/types';
import { boardTheme } from '../render/board-themes';
import { drawCuboPreview } from '../render/cubo-preview';
import { drawPreview } from '../render/preview';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { fonts } from '../theme/fonts';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from '../ui/Button';
import { DrawCanvas } from '../ui/DrawCanvas';
import { ask } from '../ui/dialog';
import { Icon, Star } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { StarRow } from '../ui/Stars';
import { Text } from '../ui/Text';
import { Trophy } from '../ui/StickerArt';
import { Rules } from './adventure/Rules';

const GAP = 8;
const ROW_H = 76;
const cell = (n: number) => {
  const row = Math.floor((n - 1) / 5);
  return { row, col: row % 2 ? 4 - ((n - 1) % 5) : (n - 1) % 5 };
};

function EventPath({ id, onPick }: { id: string; onPick: (n: number) => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const [width, setWidth] = useState(0);
  const day = today();
  const levels = Array.from({ length: 10 }, (_, i) => i + 1);
  const cw = (width - 4 * GAP) / 5;
  const center = (n: number) => { const p = cell(n); return [p.col * (cw + GAP) + cw / 2, p.row * ROW_H + 24] as const; };
  const cleared = levels.filter((n) => M.eventStars(profile, id, day, n) !== undefined).length;
  const line = (a: readonly (readonly [number, number])[]) => a.map((p, i) => (i ? 'L' : 'M') + Math.round(p[0]) + ' ' + Math.round(p[1])).join('');
  const pts = width ? levels.map(center) : [];
  return (
    <View style={{ height: ROW_H + 78 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={ROW_H + 78} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Path d={line(pts.slice(Math.max(0, cleared - 1)))} fill="none" stroke={colors.hairline} strokeWidth={6} strokeLinecap="round" strokeDasharray="0.1 13" />
          {cleared > 1 && <Path d={line(pts.slice(0, cleared))} fill="none" stroke={colors.accent} strokeOpacity={0.3} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
        </Svg>
      )}
      {width > 0 && levels.map((n) => {
        const open = M.eventLevelOpen(profile, id, day, n);
        const stars = M.eventStars(profile, id, day, n);
        const boss = n === 10;
        const p = cell(n);
        const w = boss ? 54 : 48;
        return (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={eventLevelName(n) + (open ? '' : tr(', verrouillé'))}
            onPress={() => { if (open) { sfx.turn(); onPick(n); } else { sfx.nope(); haptic('nope'); } }}
            style={({ pressed }) => ({ position: 'absolute', left: p.col * (cw + GAP), top: p.row * ROW_H, width: cw, alignItems: 'center', gap: 3, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <View style={{ width: w, height: 52 }}>
              <View style={{ position: 'absolute', top: 4, width: w, height: 48, borderRadius: boss ? 16 : 24, backgroundColor: 'rgba(0,0,0,0.15)' }} />
              <View style={{ width: w, height: 48, borderRadius: boss ? 16 : 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: !open || stars !== undefined ? colors.panel2 : colors.accent, borderColor: stars !== undefined ? colors.good : !open ? colors.hairline : 'transparent' }}>
                {open ? <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: stars !== undefined ? colors.text : colors.onAccent }}>{n}</Text>
                  : <Icon name="lock" size={18} color={colors.muted} />}
              </View>
            </View>
            {boss && stars === undefined
              ? <Text variant="muted" style={{ fontSize: 12, marginTop: -2, textTransform: 'uppercase', letterSpacing: 0.6 }}>{tr('Boss')}</Text>
              : <StarRow n={stars || 0} size={12} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function LevelSheet({ id, n, onClose, onPlay }: { id: string; n: number; onClose: () => void; onPlay: () => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const ev = M.eventById(id);
  const stage = LV.eventLevel(id, n);
  if (!ev || !stage) return null;
  const day = today();
  const best = M.eventStars(profile, id, day, n);
  const budget = stage.clock ? tr`${Math.round(stage.clock / 1000)} secondes (les lignes rajoutent du temps)` : tr`${stage.maxMoves} coups`;
  const keep = (k: number) => (stage.clock ? `${Math.ceil((stage.clock / 1000) * k)} s` : tr`${Math.ceil(stage.maxMoves * k)} coups`);
  const boss = typeof stage.boss === 'object' ? stage.boss : null;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Retour à l’événement')} onPress={onClose} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevLeft" size={16} color={colors.text} />
        </Pressable>
        <Text variant="title" style={{ flex: 1, textTransform: 'uppercase' }}>{eventLevelName(n)}</Text>
      </View>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Text variant="muted">{ev.name} · {tr`niveau ${n}`}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 18, marginTop: 6, textAlign: 'center' }}>{LV.goalText(stage.goal)}</Text>
        {boss && (
          <Text variant="muted" style={{ fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8, maxWidth: 300 }}>
            {tr`${stage.goal.target} PV : chaque ligne qui le traverse en retire 2. Tous les ${boss.every} coups, il riposte avec des ${LV.KIND_NAMES[boss.kind]}.`}
          </Text>
        )}
        <Text variant="muted" style={{ marginTop: 10 }}>{budget}</Text>
        <View style={{ marginTop: 14, marginBottom: 6 }}><StarRow n={best || 0} size={34} gap={6} /></View>
        <Text variant="muted" style={{ fontSize: 13, lineHeight: 18, textAlign: 'center', maxWidth: 290 }}>
          {tr`1 étoile en réussissant, 2 s'il te reste ${keep(0.15)}, 3 s'il t'en reste ${keep(0.3)}.`}
        </Text>
      </View>
      <Button label={tr('Jouer')} onPress={onPlay} style={{ marginTop: space.l }} />
    </View>
  );
}

function Reward({ label, got, children }: { label: string; got?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      {children}
      <Text style={{ fontSize: 12, lineHeight: 15, textAlign: 'center' }}>{label}</Text>
      {!!got && <Text style={{ fontSize: 12, color: colors.good, fontFamily: fonts.display }}>{got}</Text>}
    </View>
  );
}

export function EventScreen() {
  const colors = useColors();
  const nav = useNavigation<NavigationProp<RootParams>>();
  const route = useRoute<RouteProp<RootParams, 'Event'>>();
  const id = route.params.id;
  const profile = useGame((s) => s.profile);
  const blocks = profile.equipped.blocks;
  const sheetRef = useRef<BottomSheetModal>(null);
  const [n, setN] = useState<number | null>(route.params.level ?? null);
  const day = today();
  const ev = M.eventById(id);

  useEffect(() => {
    if (!ev || !M.eventActive(day, id)) { nav.goBack(); return; }
    const level = route.params.level;
    if (!level) return;
    setN(level);
    const t = setTimeout(() => sheetRef.current?.present(), 280);
    return () => clearTimeout(t);
  }, [route.params.level, ev, id, day, nav]);

  if (!ev) return null;
  const year = M.eventYear(day);
  const trophy = M.seasonTrophy(profile, id, year);
  const owned = (kind: 'boards' | 'cubo', sid: string) => (profile.owned[kind] || []).includes(sid);
  const trophyLine = trophy === 'gold' ? tr('Or') : trophy === 'silver' ? tr('Argent · or avec 30 étoiles') : tr('Or avec 30 étoiles');
  const open = (level: number) => { setN(level); sheetRef.current?.present(); };
  const play = async () => {
    if (!n) return;
    const { saved } = useGame.getState();
    const g = guardFree(saved.state, saved.parked);
    if (g.needed && !(await ask({ title: tr('Abandonner ?'), text: g.text, ok: tr('Abandonner'), danger: true }))) return;
    if (!startEventLevel(id, n, today())) { sfx.nope(); haptic('nope'); return; }
    sheetRef.current?.dismiss();
    nav.navigate('Game');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.l, paddingTop: 8, paddingBottom: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Retour')} onPress={() => { sfx.turn(); nav.goBack(); }} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevLeft" size={16} color={colors.text} />
        </Pressable>
        <Text variant="title" numberOfLines={1} style={{ flex: 1, fontSize: 26, lineHeight: 32, textTransform: 'uppercase' }}>{ev.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.panel2, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Star size={16} /><Text>{M.eventTotalStars(profile, id, day)} / {ev.levels * 3}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: 40 }}>
        <Text variant="muted" style={{ fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
          {tr`Événement de saison jusqu’au ${eventDate(M.eventEnd(id, day))} : ${ev.levels} niveaux, ${ev.blurb}. Finis-les pour gagner le thème ${ev.name}, ${hatName(ev.hat).toLowerCase()} pour Cubo et le trophée ${year}. Tout repart à zéro l’an prochain.`}
        </Text>
        {WD.WORLDS[id] && <Rules w={id} />}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Reward label={tr`Thème ${ev.name}`} got={owned('boards', ev.theme) ? tr('Gagné') : undefined}>
            <DrawCanvas width={100} radius={12} deps={[ev.theme, blocks]} draw={(g, w, h) => drawPreview(g, boardTheme(ev.theme, blocks), w, h)} />
          </Reward>
          <Reward label={hatName(ev.hat)} got={owned('cubo', ev.hat) ? tr('Gagné') : undefined}>
            <DrawCanvas width={100} radius={12} deps={[ev.hat, ev.theme]} draw={(g, w) => drawCuboPreview(g, boardTheme(ev.theme), ev.theme, ev.hat, w)} />
          </Reward>
          <Reward label={tr`Trophée ${year}`} got={trophyLine}>
            <View style={{ height: 75, justifyContent: 'center' }}><Trophy kind={trophy} size={54} /></View>
          </Reward>
        </View>
        <EventPath id={id} onPick={open} />
      </ScrollView>
      <Sheet ref={sheetRef}>
        {n != null && <LevelSheet id={id} n={n} onClose={() => sheetRef.current?.dismiss()} onPlay={play} />}
      </Sheet>
    </SafeAreaView>
  );
}
