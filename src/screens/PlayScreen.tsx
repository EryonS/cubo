// Jouer tab. Milestone 1 placeholder: live numbers from the core; the real home comes at milestone 4.
import { View } from 'react-native';
import { M, WD } from '../core';
import { locale, tr } from '../core/i18n';
import { useGame } from '../state/store';
import { levelName, nextAdventure } from '../state/progress';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Wallet } from '../ui/Wallet';
import { Screen } from '../ui/Screen';

export function PlayScreen() {
  const profile = useGame((s) => s.profile);
  const best = useGame((s) => s.saved.bests.classic || 0);
  const next = nextAdventure(profile);
  const maxStars = M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title">Cubo Blocks</Text>
        <Wallet coins={profile.coins} />
      </View>
      <Card>
        <Text variant="muted">{tr('Aventure')}</Text>
        <Text variant="title">{next ? `${WD.WORLDS[next[0]].name} · ${levelName(next[1])}` : tr('Carte des mondes')}</Text>
        <Text variant="muted">{tr('Étoiles')} : {M.totalStars(profile)} / {maxStars}</Text>
      </Card>
      <Card>
        <Text variant="muted">{tr('Partie libre')}</Text>
        <Text variant="title">{tr('Classique')}</Text>
        <Text variant="muted">{tr('Record')} : {best.toLocaleString(locale())}</Text>
      </Card>
    </Screen>
  );
}
