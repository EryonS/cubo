// Today's missions: the live list shown in the sheet (legacy renderMissionList) and the pips on the
// home row / game over (renderMissionBadges, renderRunMissions).
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { MissionView } from '../core/meta';
import { locale, tr } from '../core/i18n';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { ListRow } from './ListRow';
import { SectionLabel } from './SectionLabel';
import { Text } from './Text';
import { Coin } from './Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

function Bar({ value }: { value: number }) {
  const colors = useColors();
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(value, { duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }); }, [value, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.sunken, overflow: 'hidden', marginTop: space.s }}>
      <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: colors.accent }, style]} />
    </View>
  );
}

// inset: inside a card or sheet (rows on panel2); else rows are small cards on the background.
export function MissionList({ status, inset, label = true }: { status: MissionView[]; inset?: boolean; label?: boolean }) {
  const colors = useColors();
  const allDone = status.length > 0 && status.every((m) => m.done);
  return (
    <View style={{ gap: space.s }}>
      {label && <SectionLabel>{allDone ? tr('Missions du jour · nouvelles demain') : tr('Missions du jour')}</SectionLabel>}
      {status.map((m) => (
        <ListRow key={m.id} inset={inset} done={m.done} title={m.text} label={`${m.text}, ${m.done ? tr('Terminée') : `${fmt(m.current)} / ${fmt(m.target)}`}`}
          right={(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start' }}>
              <Text style={{ color: m.done ? colors.good : colors.text }}>+{m.reward}</Text>
              <Coin size={15} />
            </View>
          )}>
          {!m.done && <Bar value={m.current / m.target} />}
          <Text variant="caption" style={{ marginTop: space.xs }}>{m.done ? tr('Terminée') : `${fmt(m.current)} / ${fmt(m.target)}`}</Text>
        </ListRow>
      ))}
    </View>
  );
}

// One small bar per mission, filled by its progress (home) or just lit when done (game over).
export function Pips({ status, progress = true }: { status: MissionView[]; progress?: boolean }) {
  const colors = useColors();
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
