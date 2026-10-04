// Défis tab. Milestone 1 placeholder: today's missions and the streak.
import { View } from 'react-native';
import { M } from '../core';
import { tr } from '../core/i18n';
import { useGame } from '../state/store';
import { today } from '../state/persist';
import { colors } from '../theme/tokens';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Screen } from '../ui/Screen';

export function DefisScreen() {
  const profile = useGame((s) => s.profile);
  const streak = M.streakNow(profile, today());
  return (
    <Screen>
      <Text variant="title">{tr('Défis')}</Text>
      <Card>
        <Text variant="muted">{tr('Missions du jour')}</Text>
        {profile.missions.map((m) => (
          <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ flex: 1, color: m.done ? colors.good : colors.text }}>{M.missionText(m)}</Text>
            <Text variant="muted">{Math.min(m.progress, m.target)} / {m.target}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text variant="muted">{tr('Série')}</Text>
        <Text variant="big">{streak}</Text>
      </Card>
    </Screen>
  );
}
