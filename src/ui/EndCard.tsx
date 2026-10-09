// The shared parts of the end cards (GameOver, LevelEnd, PuzzleEnd): the scrim and the card inside the safe
// area (it scrolls when long, the buttons stay at the bottom), the coin lines, the coin total, a green
// "unlocked" note and the button row. The card is raised like any card: on dark worlds its hairline keeps
// the edge readable over the dimmed board.
import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locale, tr } from '../core/i18n';
import type { Earned } from '../core/meta';
import { fonts } from '../theme/fonts';
import { raised } from '../theme/elevation';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Text } from './Text';
import { Coin } from './Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

export function EndShell({ children, footer, content }: { children: ReactNode; footer: ReactNode; content?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, justifyContent: 'center', paddingHorizontal: space.m, paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.s }}>
      <Animated.View entering={ZoomIn.duration(260)} style={{ maxHeight: '100%', borderRadius: radius.card + 8, backgroundColor: colors.panel, ...raised(colors) }}>
        {/* overflow hidden on its own view: on the raised one it would cut the shadow. */}
        <View style={{ borderRadius: radius.card + 8, overflow: 'hidden', flexShrink: 1 }}>
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={[{ padding: space.xl, paddingBottom: space.m, alignItems: 'center', gap: 2 }, content]}>
            {children}
          </ScrollView>
          {footer}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// The buttons under the card. One of them is always the main action: when the caller left none primary
// (3 stars on the last level, no tries left...), the last one is.
export function EndActions({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ kind?: string }>[];
  const lead = items.some((b) => (b.props.kind ?? 'primary') === 'primary');
  return (
    <View style={[{ flexDirection: 'row', gap: space.s, paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.xl }, style]}>
      {items.map((b, i) => (!lead && i === items.length - 1 ? cloneElement(b, { kind: 'primary' }) : b))}
    </View>
  );
}

// The coin lines, one after the other (shown: how many are in already, for GameOver's count-up).
export function CoinLines({ lines, shown = lines.length, pad = 5, stagger = 90 }: { lines: Earned[]; shown?: number; pad?: number; stagger?: number }) {
  return (
    <>
      {lines.slice(0, shown).map((l, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(i * stagger).duration(250)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.s, paddingVertical: pad, paddingHorizontal: space.xxs }}>
          <Text variant="muted" numberOfLines={1} style={{ flex: 1 }}>{l.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Text style={{ fontSize: 14 }}>+{l.coins}</Text><Coin size={14} />
          </View>
        </Animated.View>
      ))}
    </>
  );
}

// "Pièces" and an amount (+total on a level, the wallet counting up on a free run).
export function CoinTotal({ value, pad = 11, style }: { value: string; pad?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View style={[{ alignSelf: 'stretch', paddingVertical: pad, paddingHorizontal: space.l, borderRadius: radius.tile, backgroundColor: colors.panel2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, style]}>
      <Text>{tr('Pièces')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
        <Text variant="title" style={{ fontSize: 26, lineHeight: 30 }}>{value}</Text><Coin size={20} />
      </View>
    </View>
  );
}

export const plus = (n: number) => `+${fmt(n)}`;

// Something won by this run (a theme, a hat, a trophy): a green note.
export function Unlock({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ alignSelf: 'stretch', marginTop: space.s, paddingVertical: space.s + 2, paddingHorizontal: space.m, borderRadius: radius.tile, borderWidth: 2, borderColor: colors.good }}>
      <Text style={{ color: colors.good, fontFamily: fonts.display }}>{children}</Text>
    </View>
  );
}
