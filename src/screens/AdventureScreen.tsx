// Aventure (legacy #adventure): a strip of worlds on top, the picked world below (rules, chests, Jouer,
// 20 levels). Swipe the world or use the arrows to change world; locked worlds show what opens them.
// Route param: world = the world to open. Its level sheet only opens on a tap (a level or Jouer).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { M, WD } from '../core';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { lastOpenWorld } from '../game/levelend';
import { inProgress } from '../game/modes';
import { haptic } from '../platform/haptics';
import { boardTheme } from '../render/board-themes';
import { levelName, nextAdventure } from '../state/progress';
import { useGame } from '../state/store';
import type { Profile } from '../core/types';
import type { RootParams } from '../navigation/types';
import { fonts } from '../theme/fonts';
import { radius, space, TOUCH } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';
import { BoardPreview } from '../ui/BoardPreview';
import { Counter } from '../ui/Counter';
import { ListRow } from '../ui/ListRow';
import { Button } from '../ui/Button';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Tap } from '../ui/Tap';
import { Icon } from '../ui/Icon';
import { Crown, LStar } from '../ui/Stars';
import { Text } from '../ui/Text';
import { Chests } from './adventure/Chests';
import { LevelPath } from './adventure/LevelPath';
import { LevelSheet } from './adventure/LevelSheet';
import { RulesFold } from './adventure/Rules';

const fmt = (n: number) => n.toLocaleString(locale());
const WORLD_MAX = M.LEVELS_PER_WORLD * 3;
const index = (w: string) => M.WORLD_ORDER.indexOf(w);
// The world's first open level not cleared yet (the one "Jouer" opens); null once all are.
const nextIn = (profile: Profile, w: string) => {
  for (let n = 1; n <= M.LEVELS_PER_WORLD; n++) if (M.levelOpen(profile, w, n) && !M.levelCleared(profile, w, n)) return n;
  return null;
};

function worldGateText(w: string) {
  const prev = M.WORLD_ORDER[index(w) - 1];
  if (prev && !M.worldOpen(useGame.getState().profile, prev)) return tr('Ouvre d’abord ') + WD.WORLDS[prev].name + '.';
  return !M.levelCleared(useGame.getState().profile, prev, M.LEVELS_PER_WORLD)
    ? tr`Bats le boss de ${WD.WORLDS[prev].name} pour ouvrir ce monde.`
    : tr`Il te faut ${M.worldGate(w)} étoiles pour ouvrir ce monde.`;
}

function SquareBtn({ icon, label, onPress, disabled }: { icon: 'chevLeft' | 'chevRight'; label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Tap label={label} disabled={disabled} onPress={onPress} quiet
      style={{ width: TOUCH, height: TOUCH, borderRadius: radius.s + 4, backgroundColor: colors.panel, ...raised(colors, 'low'), alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={16} color={colors.text} />
    </Tap>
  );
}

function WorldTile({ w, picked, onPick }: { w: string; picked: boolean; onPick: () => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const th = useMemo(() => boardTheme(w, profile.equipped.blocks), [w, profile.equipped.blocks]);
  const open = M.worldOpen(profile, w);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: picked }} onPress={onPick}
      style={({ pressed }) => ({ width: 88, padding: space.xs, paddingBottom: space.s, borderRadius: radius.tile, backgroundColor: colors.panel, ...raised(colors, 'low'), borderWidth: 3, borderColor: picked ? colors.accent : 'transparent', alignItems: 'center', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <View style={{ opacity: open ? 1 : 0.5 }}><BoardPreview th={th} width={74} radius={radius.s} /></View>
      <Text variant="caption" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: fonts.display, color: colors.text, marginTop: space.xs }}>{WD.WORLDS[w].name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs, height: 16 }}>
        {open ? <><LStar size={11} on /><Text variant="caption">{M.worldStars(profile, w)}</Text></> : <Icon name="lock" size={12} color={colors.muted} />}
      </View>
      {M.worldMastered(profile, w) && <View style={{ position: 'absolute', top: 2, right: 2 }} accessibilityLabel={tr('Monde maîtrisé')}><Crown size={18} /></View>}
    </Pressable>
  );
}

export function AdventureScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const route = useRoute<RouteProp<RootParams, 'Adventure'>>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const profile = useGame((s) => s.profile);
  const [w, setW] = useState(() => route.params?.world ?? nextAdventure(profile)?.[0] ?? lastOpenWorld(profile));
  const [dir, setDir] = useState(0);
  const [pick, setPick] = useState<{ w: string; n: number } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const sheetRef = useRef<BottomSheetModal>(null);
  const strip = useRef<ScrollView>(null);

  // Coming back with params (level end card: Carte / Suivant) re-aims the screen.
  useEffect(() => {
    const p = route.params;
    if (!p?.world) return;
    setDir(0);
    setW(p.world);
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
  // This world's level in progress (Continuer), else its next level.
  const going = useGame((s) => { const st = s.saved.state; return inProgress(st) && st.stage && !st.stage.daily && !st.stage.event && st.stage.world === w ? st.stage.n : 0; });
  const next = open ? nextIn(profile, w) : null;
  const openLevel = (n: number) => { setPick({ w, n }); sheetRef.current?.present(); };
  const i = index(w);
  const Enter = dir > 0 ? SlideInRight : SlideInLeft;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.m }}>
        <ScreenHeader title={tr('Aventure')} back={() => { sfx.turn(); nav.goBack(); }}
          right={<Counter icon={<LStar size={18} on />} value={fmt(M.totalStars(profile))} label={tr`${M.totalStars(profile)} étoiles`} />} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl + insets.bottom }}>
        <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l, paddingBottom: space.xs }} style={{ marginBottom: space.l, flexGrow: 0 }} accessibilityRole="tablist">
          {M.WORLD_ORDER.map((id) => <WorldTile key={id} w={id} picked={id === w} onPick={() => { if (id !== w) { sfx.turn(); go(id); } }} />)}
        </ScrollView>
        <GestureDetector gesture={swipe}>
          <Animated.View key={w} entering={dir ? Enter.duration(240) : undefined} style={{ paddingHorizontal: space.l, gap: space.l }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="title" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.5 }}>{rules.name}</Text>
                {open ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}><LStar size={14} on /><Text variant="muted">{`${M.worldStars(profile, w)} / ${WORLD_MAX}`}</Text></View>
                  : <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}><Icon name="lock" size={14} color={colors.muted} /><Text variant="muted">{tr('Verrouillé')}</Text></View>}
              </View>
              <SquareBtn icon="chevLeft" label={tr('Monde précédent')} disabled={i === 0} onPress={() => step(-1)} />
              <SquareBtn icon="chevRight" label={tr('Monde suivant')} disabled={i === M.WORLD_ORDER.length - 1} onPress={() => step(1)} />
            </View>
            {!open && <ListRow title={worldGateText(w)} icon={<Icon name="lock" size={18} color={colors.muted} />} />}
            <View style={{ opacity: open ? 1 : 0.55 }}><RulesFold w={w} open={rulesOpen} onToggle={() => { sfx.turn(); setRulesOpen((o) => !o); }} /></View>
            {open && <Chests w={w} />}
            {(going || next) ? (
              <Button label={going ? tr`Continuer : ${levelName(going)}` : next === M.LEVELS_PER_WORLD ? tr('Affronter le boss') : tr`Jouer le niveau ${next}`}
                onPress={() => { sfx.turn(); if (going) nav.navigate('Game'); else openLevel(next!); }} />
            ) : null}
            <LevelPath w={w} locked={!open} onPick={openLevel} />
          </Animated.View>
        </GestureDetector>
      </ScrollView>
      <LevelSheet ref={sheetRef} pick={pick} onGame={() => nav.navigate('Game')} onShop={() => nav.navigate('Tabs', { screen: 'Shop', params: { tab: 'bonus' } })} />
    </SafeAreaView>
  );
}
