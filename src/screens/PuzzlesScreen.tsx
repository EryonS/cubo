// Puzzles (legacy #puzzles): the packs of ten drawings to fill, each with its stars (a solved one shows its
// drawing instead of its number), a pack not reached yet as a single locked line, and the Puzzle surprise card.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { L, M, PZ } from '../core';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { allStars, maskOf, packRows } from '../game/puzzle';
import { startPuzzle, startSurprise } from '../game/run';
import { haptic } from '../platform/haptics';
import { useGame } from '../state/store';
import type { RootParams } from '../navigation/types';
import { fonts } from '../theme/fonts';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Icon } from '../ui/Icon';
import { LStar, StarRow } from '../ui/Stars';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());
const GAP = 8;
const SIZE = L.SIZE;

// Small silhouette of a solved puzzle's drawing, in the accent color (legacy puzzleThumb).
function Thumb({ n, color }: { n: number; color: string }) {
  const d = useMemo(() => {
    const out: string[] = [];
    maskOf(n).forEach((on, i) => { if (on) out.push(`M${(i % SIZE) + 0.04} ${Math.floor(i / SIZE) + 0.04}h0.92v0.92h-0.92z`); });
    return out.join('');
  }, [n]);
  return <Svg width={32} height={32} viewBox={`0 0 ${SIZE} ${SIZE}`}><Path d={d} fill={color} /></Svg>;
}

// The Puzzle surprise gift box (legacy SURPRISE_SVG).
function Gift({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5.5 9h13a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z" fill={color} />
      <Path d="M3.9 6.5h16.2a1.4 1.4 0 0 1 1.4 1.4v1.2a1.4 1.4 0 0 1-1.4 1.4H3.9a1.4 1.4 0 0 1-1.4-1.4V7.9a1.4 1.4 0 0 1 1.4-1.4z" fill={color} opacity={0.8} />
      <Path d="M12 6.5v14" stroke="#fff" strokeWidth={2.4} />
      <Path d="M12 6.3C10.5 3 7 2.8 7.2 5c.2 1.6 3 1.5 4.8 1.3M12 6.3c1.5-3.3 5-3.5 4.8-1.3-.2 1.6-3 1.5-4.8 1.3" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function Cell({ n, cw }: { n: number; cw: number }) {
  const colors = useColors();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const profile = useGame((s) => s.profile);
  const open = M.puzzleOpen(profile, n);
  const stars = M.puzzleStarsOf(profile, n);
  const done = stars !== undefined;
  const go = () => {
    if (!open) { sfx.nope(); haptic('nope'); return; }
    sfx.turn();
    startPuzzle(n);
    nav.navigate('Game');
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr`Puzzle ${n}` + (done ? ', ' + (PZ.puzzle(n)?.name ?? '') : '') + (open ? '' : tr(', verrouillé'))} onPress={go}
      style={({ pressed }) => ({ width: cw, height: 70, borderRadius: radius.card - 6, backgroundColor: done || !open ? colors.panel2 : colors.accent, borderWidth: 2, borderColor: done ? colors.good : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 3, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      <View style={{ height: 32, alignItems: 'center', justifyContent: 'center' }}>
        {done ? <Thumb n={n} color={colors.accent} />
          : open ? <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 30, color: colors.onAccent }}>{n}</Text>
            : <Icon name="lock" size={18} color={colors.muted} />}
      </View>
      <StarRow n={stars || 0} size={12} />
    </Pressable>
  );
}

function SurpriseCard() {
  const colors = useColors();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const profile = useGame((s) => s.profile);
  const open = M.surpriseOpen(profile);
  const solved = M.surprisesSolved(profile);
  const go = () => {
    if (!open) { sfx.nope(); haptic('nope'); return; }
    sfx.turn();
    startSurprise();
    nav.navigate('Game');
  };
  return (
    <Pressable accessibilityRole="button" onPress={go}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 22, borderRadius: radius.card, backgroundColor: colors.panel2, opacity: open ? 1 : 0.7, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' }}>
        {open ? <Gift size={30} color={colors.accent} /> : <Icon name="lock" size={22} color={colors.muted} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" style={{ fontSize: 20, lineHeight: 24 }}>{tr('Puzzle surprise')}</Text>
        <Text variant="muted" style={{ fontSize: 13, lineHeight: 17 }}>
          {open ? tr`Un dessin au hasard, ${PZ.SURPRISE_MIN} à ${PZ.SURPRISE_MAX} formes à placer toutes ensemble. Tu peux déplacer celles déjà posées.`
            : tr`Finis le pack ${PZ.PACKS[3].name} pour l’ouvrir : un dessin au hasard, toutes les formes d’un coup.`}
        </Text>
      </View>
      {open && (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text variant="muted" style={{ fontSize: 13 }}>{solved ? tr`${fmt(solved)} réussi${solved > 1 ? 's' : ''}` : tr('Nouveau')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text variant="title" style={{ fontSize: 16, lineHeight: 20 }}>+{M.SURPRISE_COINS}</Text><Coin size={14} /></View>
        </View>
      )}
    </Pressable>
  );
}

export function PuzzlesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const [width, setWidth] = useState(0);
  const cw = (width - 4 * GAP) / 5;
  const packs = packRows(profile);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.l, paddingTop: 8, paddingBottom: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Retour')} onPress={() => { sfx.turn(); nav.goBack(); }} hitSlop={8}
          style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
          <Icon name="chevLeft" size={16} color={colors.text} />
        </Pressable>
        <Text variant="title" style={{ flex: 1, fontSize: 28, lineHeight: 34, textTransform: 'uppercase' }}>{tr('Puzzles')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.panel2 }}>
          <LStar size={18} on />
          <Text variant="title" style={{ fontSize: 18, lineHeight: 24 }}>{fmt(allStars(profile))} / {PZ.COUNT * 3}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.l, paddingBottom: 40 }}>
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {packs.map((p) => (
            <View key={p.index} style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text variant="title" style={{ fontSize: 22, lineHeight: 28 }}>{p.name}</Text>
                <Text variant="muted" style={{ fontSize: 13 }}>{tr`${p.solved} / ${PZ.PER_PACK} · ${p.quotas[0]} à ${p.quotas[1]} formes`}</Text>
              </View>
              {/* A pack not reached yet is a single line instead of ten padlocks. */}
              {!p.open ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
                  <Icon name="lock" size={18} color={colors.muted} />
                  <Text variant="muted" style={{ flex: 1, fontSize: 14 }}>{p.gate}</Text>
                </View>
              ) : width > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                  {Array.from({ length: PZ.PER_PACK }, (_, i) => <Cell key={i} n={p.first + i} cw={cw} />)}
                </View>
              )}
            </View>
          ))}
          <SurpriseCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
