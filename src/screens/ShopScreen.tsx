// Boutique tab. Milestone 1 placeholder: owned themes and blocks, the equipped one marked.
import { View } from 'react-native';
import { M } from '../core';
import { tr } from '../core/i18n';
import type { SkinKind } from '../core/types';
import { useGame } from '../state/store';
import { colors } from '../theme/tokens';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Wallet } from '../ui/Wallet';
import { Screen } from '../ui/Screen';

function Owned({ kind, title }: { kind: SkinKind; title: string }) {
  const profile = useGame((s) => s.profile);
  return (
    <Card>
      <Text variant="muted">{title}</Text>
      {M.SKINS[kind].filter((s) => profile.owned[kind].includes(s.id)).map((s) => (
        <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>{s.name}</Text>
          {profile.equipped[kind] === s.id && <Text style={{ color: colors.good }}>{tr('Équipé')}</Text>}
        </View>
      ))}
    </Card>
  );
}

export function ShopScreen() {
  const coins = useGame((s) => s.profile.coins);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title">{tr('Boutique')}</Text>
        <Wallet coins={coins} />
      </View>
      <Owned kind="boards" title={tr('Thèmes')} />
      <Owned kind="blocks" title={tr('Blocs')} />
    </Screen>
  );
}
