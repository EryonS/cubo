// Aventure (legacy #adventure): a strip of worlds on top, the picked world below (rules, chests, 20 levels,
// endless run). Swipe the world or use the arrows to change world; locked worlds show what opens them.
// Route params: world = the world to open, level = also open that level's sheet (from the level end card).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { M, WD } from '../core';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { lastOpenWorld } from '../game/levelend';
import { startWorldRun } from '../game/run';
import { guardFree } from '../game/modes';
import { haptic } from '../platform/haptics';
import { boardTheme } from '../render/board-themes';
import { nextAdventure } from '../state/progress';
import { useGame } from '../state/store';
import type { RootParams } from '../navigation/types';
import { fonts } from '../theme/fonts';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { BoardPreview } from '../ui/BoardPreview';
import { ask } from '../ui/dialog';
import { Icon } from '../ui/Icon';
import { Crown, LStar } from '../ui/Stars';
import { Text } from '../ui/Text';
import { Chests } from './adventure/Chests';
import { Endless } from './adventure/Endless';
import { LevelPath } from './adventure/LevelPath';
import { LevelSheet } from './adventure/LevelSheet';
import { Rules } from './adventure/Rules';

const fmt = (n: number) => n.toLocaleString(locale());
const WORLD_MAX = M.LEVELS_PER_WORLD * 3;
const index = (w: string) => M.WORLD_ORDER.indexOf(w);

function worldGateText(w: string) {
  const prev = M.WORLD_ORDER[index(w) - 1];
  if (prev && !M.worldOpen(useGame.getState().profile, prev)) return tr('Ouvre d’abord ') + WD.WORLDS[prev].name + '.';
  return !M.levelCleared(useGame.getState().profile, prev, M.LEVELS_PER_WORLD)
    ? tr`Bats le boss de ${WD.WORLDS[prev].name} pour ouvrir ce monde.`
    : tr`Il te faut ${M.worldGate(w)} étoiles pour ouvrir ce monde.`;
}

function StarPill({ value, size = 18 }: { value: string; size?: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.panel2 }}>
      <LStar size={size} on />
      <Text variant="title" style={{ fontSize: size, lineHeight: size + 6 }}>{value}</Text>
    </View>
  );
}

function SquareBtn({ icon, label, onPress, disabled }: { icon: 'chevLeft' | 'chevRight'; label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <Icon name={icon} size={16} color={colors.text} />
    </Pressable>
  );
}

function WorldTile({ w, picked, onPick }: { w: string; picked: boolean; onPick: () => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const th = useMemo(() => boardTheme(w, profile.equipped.blocks), [w, profile.equipped.blocks]);
  const open = M.worldOpen(profile, w);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: picked }} onPress={onPick}
      style={({ pressed }) => ({ width: 82, padding: 4, paddingBottom: 6, borderRadius: radius.card - 2, backgroundColor: picked ? colors.panel : colors.panel2, borderWidth: 3, borderColor: picked ? colors.accent : 'transparent', alignItems: 'center', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <View style={{ opacity: open ? 1 : 0.5 }}><BoardPreview th={th} width={66} radius={radius.card - 8} /></View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 18, marginTop: 4 }}>{WD.WORLDS[w].name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 16 }}>
        {open ? <><LStar size={11} on /><Text variant="muted" style={{ fontSize: 12 }}>{M.worldStars(profile, w)}</Text></> : <Icon name="lock" size={12} color={colors.muted} />}
      </View>
      {M.worldMastered(profile, w) && <View style={{ position: 'absolute', top: 2, right: 2 }} accessibilityLabel={tr('Monde maîtrisé')}><Crown size={18} /></View>}
    </Pressable>
  );
}

export function AdventureScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const route = useRoute<RouteProp<RootParams, 'Adventure'>>();
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const [w, setW] = useState(() => route.params?.world ?? nextAdventure(profile)?.[0] ?? lastOpenWorld(profile));
  const [dir, setDir] = useState(0);
  const [pick, setPick] = useState<{ w: string; n: number } | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const strip = useRef<ScrollView>(null);

  // Coming back with params (level end card: Carte / Suivant) re-aims the screen.
  useEffect(() => {
    const p = route.params;
    if (!p?.world) return;
    setDir(0);
    setW(p.world);
    if (p.level) { setPick({ w: p.world, n: p.level }); setTimeout(() => sheetRef.current?.present(), 250); }
  }, [route.params]);

  const go = useCallback((next: string) => {
    setDir(Math.sign(index(next) - index(w)));
    setW(next);
  }, [w]);
  useEffect(() => { strip.current?.scrollTo({ x: Math.max(0, index(w) * 90 - 110), animated: true }); }, [w]);
  const step = useCallback((d: number) => {
    const next = M.WORLD_ORDER[index(w) + d];
    if (!next) { sfx.nope(); haptic('nope'); return; }
    sfx.turn();
    go(next);
  }, [w, go]);
  const swipe = useMemo(() => Gesture.Pan().runOnJS(true).activeOffsetX([-24, 24]).failOffsetY([-18, 18])
    .onEnd((e) => { if (Math.abs(e.translationX) > 60) step(e.translationX < 0 ? 1 : -1); }), [step]);

  const open = M.worldOpen(profile, w);
  const rules = WD.WORLDS[w];
  const i = index(w);
  const onEndless = async () => {
    const g = guardFree(useGame.getState().saved.state, useGame.getState().saved.parked);
    if (g.needed && !(await ask({ title: tr('Abandonner ?'), text: g.text, ok: tr('Abandonner'), danger: true }))) return;
    startWorldRun(w);
    nav.navigate('Game');
  };
  const Enter = dir > 0 ? SlideInRight : SlideInLeft;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.l, paddingTop: 8, paddingBottom: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Retour')} onPress={() => { sfx.turn(); nav.goBack(); }} hitSlop={8}
          style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
          <Icon name="chevLeft" size={16} color={colors.text} />
        </Pressable>
        <Text variant="title" style={{ flex: 1, fontSize: 28, lineHeight: 34, textTransform: 'uppercase' }}>{tr('Aventure')}</Text>
        <StarPill value={fmt(M.totalStars(profile))} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.l, paddingVertical: 6 }} style={{ marginBottom: 8, flexGrow: 0 }} accessibilityRole="tablist">
          {M.WORLD_ORDER.map((id) => <WorldTile key={id} w={id} picked={id === w} onPick={() => { if (id !== w) { sfx.turn(); go(id); } }} />)}
        </ScrollView>
        <GestureDetector gesture={swipe}>
          <Animated.View key={w} entering={dir ? Enter.duration(240) : undefined} style={{ paddingHorizontal: space.l }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text variant="title" numberOfLines={1} style={{ flex: 1, fontSize: 26, lineHeight: 32, textTransform: 'uppercase', letterSpacing: 0.5 }}>{rules.name}</Text>
              {open ? <StarPill value={`${M.worldStars(profile, w)} / ${WORLD_MAX}`} size={16} />
                : <Icon name="lock" size={18} color={colors.muted} />}
              <SquareBtn icon="chevLeft" label={tr('Monde précédent')} disabled={i === 0} onPress={() => step(-1)} />
              <SquareBtn icon="chevRight" label={tr('Monde suivant')} disabled={i === M.WORLD_ORDER.length - 1} onPress={() => step(1)} />
            </View>
            {!open && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 10, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
                <Icon name="lock" size={18} color={colors.muted} />
                <Text variant="muted" style={{ flex: 1, fontSize: 14 }}>{worldGateText(w)}</Text>
              </View>
            )}
            <View style={{ opacity: open ? 1 : 0.55 }}><Rules w={w} /></View>
            {open && <Chests w={w} />}
            <LevelPath w={w} locked={!open} onPick={(n) => { setPick({ w, n }); sheetRef.current?.present(); }} />
            <Endless w={w} onPlay={onEndless} />
          </Animated.View>
        </GestureDetector>
      </ScrollView>
      <LevelSheet ref={sheetRef} pick={pick} onGame={() => nav.navigate('Game')} />
    </SafeAreaView>
  );
}
