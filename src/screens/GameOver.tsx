// End of a free run: score, record, coins earned (legacy screens/gameover.js, without the summary
// and Cubo yet: those come with milestones 4-5).
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { locale, tr } from '../core/i18n';
import type { RunEnd } from '../game/run';
import { colors, space } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

export function GameOver({ end, onAgain, onMenu }: { end: RunEnd; onAgain: () => void; onMenu: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(74,58,102,0.45)', justifyContent: 'center', padding: space.xl }}>
      <Animated.View entering={ZoomIn.duration(260)}>
        <Card style={{ alignItems: 'center', gap: space.m, padding: space.xl }}>
          <Text variant="title">{end.record ? tr('Nouveau record !') : tr('Plus de place !')}</Text>
          <Text variant="big" style={{ fontSize: 56 }}>{fmt(end.score)}</Text>
          <Text variant="muted">{tr('Record : ') + fmt(end.best)}</Text>
          {end.earned.length > 0 && (
            <View style={{ alignSelf: 'stretch', gap: space.xs }}>
              {end.earned.map((line, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ flex: 1 }}>{line.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: colors.good }}>+{line.coins}</Text>
                    <Coin size={16} />
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: space.m, alignSelf: 'stretch' }}>
            <Button kind="ghost" label="Menu" onPress={onMenu} style={{ flex: 1 }} />
            <Button label={tr('Rejouer')} onPress={onAgain} style={{ flex: 1 }} />
          </View>
        </Card>
      </Animated.View>
    </Animated.View>
  );
}
