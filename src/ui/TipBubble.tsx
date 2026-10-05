// The one-time tip bubble (legacy #tip): a dark bubble with an arrow pointing at its anchor.
// Tap it to close. Hidden while a sheet or card covers the game.
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { tr } from '../core/i18n';
import { dismissTip, useTips } from '../game/tips';
import { anchorRect, placeTip } from '../game/tip-place';
import type { Layout } from '../render/layout';
import { radius } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { fonts } from '../theme/fonts';
import { Text } from './Text';

export function TipBubble({ lay, safeTop }: { lay: Layout; safeTop: number }) {
  const colors = useColors();
  const shown = useTips((s) => s.shown);
  const covered = useTips((s) => s.covered);
  if (!shown || covered) return null;
  const p = placeTip(anchorRect(shown.anchor, lay, safeTop), lay.W, lay.H, lay.by + lay.cell * 2);
  return (
    <Animated.View key={shown.id} entering={FadeIn.duration(200)} style={{ position: 'absolute', left: p.left, width: p.width, top: p.top, bottom: p.bottom }}>
      <Pressable accessibilityRole="alert" onPress={dismissTip}
        style={{ padding: 14, paddingVertical: 12, borderRadius: radius.card - 4, backgroundColor: colors.text, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }}>
        <Text variant="title" style={{ fontSize: 17, lineHeight: 20, color: colors.panel, marginBottom: 2 }}>{shown.title}</Text>
        <Text style={{ fontSize: 15, lineHeight: 19, color: colors.panel }}>{shown.text}</Text>
        <Text style={{ marginTop: 6, fontSize: 12, fontFamily: fonts.display, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.panel, opacity: 0.6 }}>{tr('Touche pour fermer')}</Text>
      </Pressable>
      {p.side !== 'free' && (
        <View pointerEvents="none" style={{ position: 'absolute', left: p.arrow - 7, width: 14, height: 14, borderRadius: 3, backgroundColor: colors.text, transform: [{ rotate: '45deg' }], ...(p.side === 'below' ? { top: -6 } : { bottom: -6 }) }} />
      )}
    </Animated.View>
  );
}
