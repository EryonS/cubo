// Star chests of a world (legacy renderChests): a bar of the world's stars with 3 chests sitting on it;
// a ready one opens on tap and shows its reward.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { M } from '../../core';
import { tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { haptic } from '../../platform/haptics';
import { useGame } from '../../state/store';
import { useColors } from '../../theme/useColors';
import { ChestIcon, LStar } from '../../ui/Stars';
import { Text } from '../../ui/Text';
import { Coin } from '../../ui/Wallet';

const WORLD_MAX = M.LEVELS_PER_WORLD * 3;
const pct = (v: number) => Math.min(100, (v / WORLD_MAX) * 100);

type Reward = { coins?: number; bombs?: number };
function Reward({ c, plus = false, color }: { c: Reward; plus?: boolean; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {c.coins ? <><Text style={{ fontSize: 12, color }}>{plus ? '+' : ''}{c.coins}</Text><Coin size={11} /></> : null}
      {c.coins && c.bombs ? <Text style={{ fontSize: 12, color }}> + </Text> : null}
      {c.bombs ? <Text style={{ fontSize: 12, color }}>{plus && !c.coins ? '+' : ''}{tr`${c.bombs} Bombes offertes`}</Text> : null}
    </View>
  );
}

function Chest({ i, left, state, onTap, peek, got }: { i: number; left: number; state: string; onTap: () => void; peek: boolean; got: Reward | null }) {
  const colors = useColors();
  const c = M.CHESTS[i];
  const wiggle = useSharedValue(0);
  const bump = useSharedValue(1);
  useEffect(() => {
    if (state === 'ready') wiggle.value = withRepeat(withSequence(withDelay(1000, withTiming(-9, { duration: 110 })), withTiming(8, { duration: 110 }), withTiming(-4, { duration: 100 }), withTiming(0, { duration: 80 })), -1);
    else wiggle.value = 0;
  }, [state, wiggle]);
  useEffect(() => { if (got) bump.value = withSequence(withTiming(1.35, { duration: 140 }), withTiming(1, { duration: 240 })); }, [got, bump]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }, { scale: bump.value }] }));
  const muted = colors.muted;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr`Coffre ${c.stars} étoiles : ${[c.coins ? c.coins + tr(' pièces') : '', c.bombs ? tr`${c.bombs} Bombes offertes` : ''].filter(Boolean).join(' + ')}`} onPress={onTap}
      style={{ position: 'absolute', top: 0, left: left - 40, width: 80, alignItems: 'center', gap: 2 }}>
      <Animated.View style={style}><ChestIcon grey={state === 'locked'} /></Animated.View>
      {got ? <Reward c={got} plus color={colors.good} />
        : state === 'open' ? <Text style={{ fontSize: 12, color: muted }}>{tr('Ouvert')}</Text>
          : state === 'ready' ? <Text style={{ fontSize: 12, color: colors.accent }}>{tr('Ouvrir !')}</Text>
            : peek ? <Reward c={c} color={muted} />
              : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><LStar size={10} on /><Text style={{ fontSize: 12, color: muted }}>{c.stars}</Text></View>}
    </Pressable>
  );
}

export function Chests({ w }: { w: string }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const [width, setWidth] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
  const [got, setGot] = useState<{ i: number; reward: Reward } | null>(null);
  const stars = M.worldStars(profile, w);
  const tap = (i: number) => {
    const { profile: p, setProfile } = useGame.getState();
    const res = M.openChest(p, w, i);
    if (!res) {
      sfx.nope(); haptic('nope');
      if (M.chestState(p, w, i) === 'locked') setPeek(i);
      return;
    }
    setProfile(res.profile);
    sfx.buy(); haptic('buy');
    setGot({ i, reward: res.reward });
  };
  return (
    <View style={{ height: 62, marginHorizontal: 22, marginTop: 4, marginBottom: 14 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 8, borderRadius: 4, backgroundColor: colors.sunken, overflow: 'hidden' }}>
        <View style={{ width: `${pct(stars)}%`, height: '100%', borderRadius: 4, backgroundColor: '#ffb84d' }} />
      </View>
      {width > 0 && M.CHESTS.map((c, i) => (
        <Chest key={i} i={i} left={(pct(c.stars) / 100) * width} state={M.chestState(profile, w, i)} onTap={() => tap(i)}
          peek={peek === i} got={got && got.i === i ? got.reward : null} />
      ))}
    </View>
  );
}
