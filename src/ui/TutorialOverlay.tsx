// The guided first game's overlays (legacy #coach, #coach-skip, #tutorial-end): the coach card at the top
// (step counter, title, text; red text and a nudge after a refused move, accent title on success), the
// "Passer" button, and the "Bien joué !" card. The hand and the glowing cells are drawn on the canvas.
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../core';
import { tr } from '../core/i18n';
import { useTut } from '../game/tut-state';
import { radius, space } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { useColors } from '../theme/useColors';
import { fonts } from '../theme/fonts';
import { Button } from './Button';
import { Text } from './Text';

function Coach() {
  const colors = useColors();
  const tut = useTut((s) => s.tut)!;
  const insets = useSafeAreaInsets();
  const step = T.STEPS[tut.step];
  const nudge = useSharedValue(0);
  useEffect(() => {
    if (tut.mood === 'nope') nudge.value = withSequence(withTiming(-6, { duration: 90 }), withTiming(6, { duration: 180 }), withTiming(0, { duration: 90 }));
  }, [tut.mood, tut.nonce, nudge]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, alignItems: 'center' }, style]}>
      <View style={{ width: '100%', maxWidth: 340, marginHorizontal: space.l, paddingTop: 10, paddingBottom: 12, paddingHorizontal: space.l, borderRadius: radius.card, backgroundColor: colors.panel, ...raised(colors), alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
        <Text variant="muted" style={{ fontFamily: fonts.display, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' }}>{tr`Étape ${tut.step + 1} / ${T.STEPS.length}`}</Text>
        <Text variant="title" style={{ fontSize: 21, lineHeight: 24, textAlign: 'center', color: tut.mood === 'yay' ? colors.accent : colors.text }}>{tut.mood === 'yay' ? tr('Bravo !') : step.title}</Text>
        <Text variant="muted" style={{ fontSize: 14, lineHeight: 18, textAlign: 'center', fontFamily: fonts.bold, color: tut.mood === 'nope' ? '#e5484d' : colors.muted }}>
          {tut.mood === 'nope' ? tr('Vise les cases qui brillent.') : step.text}
        </Text>
      </View>
    </Animated.View>
  );
}

function End({ onEnd }: { onEnd: () => void }) {
  const colors = useColors();
  const rules = [
    tr("La partie s'arrête quand plus aucune forme ne rentre."),
    tr("Plusieurs lignes d'un coup rapportent beaucoup plus."),
    tr("Bonus, pièces à ramasser, poubelle : on t'explique au bon moment."),
  ];
  return (
    <Animated.View entering={FadeIn.duration(250)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, justifyContent: 'center', padding: space.m }}>
      <Animated.View entering={ZoomIn.duration(300)} style={{ width: '100%', maxWidth: 360, alignSelf: 'center', padding: space.xl, borderRadius: radius.card + 8, backgroundColor: colors.panel, ...raised(colors), alignItems: 'center' }}>
        <Text variant="title" style={{ fontSize: 30, lineHeight: 42, textTransform: 'uppercase' }}>{tr('Bien joué !')}</Text>
        <Text style={{ marginTop: 10, color: colors.muted, lineHeight: 21 }}>{tr("Tu connais l'essentiel.")}</Text>
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 16 }}>
          {rules.map((r) => (
            <View key={r} style={{ padding: 10, paddingHorizontal: 12, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
              <Text style={{ fontSize: 14, lineHeight: 18 }}>{r}</Text>
            </View>
          ))}
        </View>
        <Button label={tr('Continuer')} onPress={onEnd} style={{ alignSelf: 'stretch', marginTop: space.xl }} />
      </Animated.View>
    </Animated.View>
  );
}

export function TutorialOverlay({ onEnd }: { onEnd: () => void }) {
  const colors = useColors();
  const tut = useTut((s) => s.tut);
  const insets = useSafeAreaInsets();
  if (!tut) return null;
  return (
    <>
      {!tut.ending && <Coach />}
      {!tut.ending && (
        <Pressable accessibilityRole="button" onPress={onEnd}
          style={{ position: 'absolute', right: 16, bottom: insets.bottom + 14, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.panel, ...raised(colors)}}>
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.muted }}>{tr('Passer')}</Text>
        </Pressable>
      )}
      {tut.ending && <End onEnd={onEnd} />}
    </>
  );
}
