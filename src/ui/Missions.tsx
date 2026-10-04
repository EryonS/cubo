// Today's missions: the live list shown in the sheet (legacy renderMissionList) and the pips on the
// home row / game over (renderMissionBadges, renderRunMissions).
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { MissionView } from '../core/meta';
import { locale, tr } from '../core/i18n';
import { colors, radius, space } from '../theme/tokens';
import { Text } from './Text';
import { Coin } from './Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

function Bar({ value }: { value: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(value, { duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }); }, [value, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.sunken, overflow: 'hidden', marginTop: 6 }}>
      <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: colors.accent }, style]} />
    </View>
  );
}

export function MissionList({ status }: { status: MissionView[] }) {
  const allDone = status.length > 0 && status.every((m) => m.done);
  return (
    <View style={{ gap: space.s }}>
      <Text variant="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 13 }}>
        {allDone ? tr('Missions du jour · nouvelles demain') : tr('Missions du jour')}
      </Text>
      {status.map((m) => (
        <View
          key={m.id}
          style={{ padding: 12, borderRadius: radius.card - 4, backgroundColor: colors.panel2, borderWidth: m.done ? 2 : 0, borderColor: colors.good }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 14 }}>{m.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 14, color: m.done ? colors.good : colors.text }}>+{m.reward}</Text>
              <Coin size={14} />
            </View>
          </View>
          {!m.done && <Bar value={m.current / m.target} />}
          <Text variant="muted" style={{ fontSize: 12, marginTop: 5 }}>{m.done ? tr('Terminée') : `${fmt(m.current)} / ${fmt(m.target)}`}</Text>
        </View>
      ))}
    </View>
  );
}

// One small bar per mission, filled by its progress (home) or just lit when done (game over).
export function Pips({ status, progress = true }: { status: MissionView[]; progress?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {status.map((m) => (
        <View key={m.id} style={{ width: 14, height: 6, borderRadius: 3, backgroundColor: !progress && m.done ? colors.good : colors.hairline, overflow: 'hidden' }}>
          {progress && <View style={{ height: '100%', width: `${(m.current / m.target) * 100}%`, backgroundColor: m.done ? colors.good : colors.accent }} />}
        </View>
      ))}
    </View>
  );
}
