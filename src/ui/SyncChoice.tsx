// Which progress to keep when the device and the account differ (legacy #sync-choice).
import { Modal, Pressable, View } from 'react-native';
import { create } from 'zustand';
import { locale, tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from './Button';
import { Text } from './Text';
import { Coin } from './Wallet';

export interface SideSummary { coins: number; stars: number; stickers: number; day: string | null }

interface Choice { local: SideSummary; remote: SideSummary; done: (v: 'device' | 'account' | null) => void }
const useChoice = create<{ choice: Choice | null }>(() => ({ choice: null }));

export function askSide(local: SideSummary, remote: SideSummary): Promise<'device' | 'account' | null> {
  return new Promise((resolve) => {
    useChoice.setState({
      choice: { local, remote, done: (v) => { useChoice.setState({ choice: null }); resolve(v); } },
    });
  });
}

const fmt = (n: number) => n.toLocaleString(locale());

function Card({ title, s, onPress }: { title: string; s: SideSummary; onPress: () => void }) {
  const colors = useColors();
  const day = s.day ? new Date(s.day + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : '–';
  const row = (label: string, value: string, coin?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
      <Text variant="muted" style={{ fontSize: 14 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 15 }}>{value}</Text>
        {coin && <Coin size={14} />}
      </View>
    </View>
  );
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ padding: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel2, borderBottomWidth: 4, borderBottomColor: colors.edge }}>
      <Text variant="title" style={{ fontSize: 18, textTransform: 'uppercase' }}>{title}</Text>
      {row(tr('Pièces'), fmt(s.coins), true)}
      {row(tr('Étoiles'), fmt(s.stars))}
      {row(tr('Stickers'), fmt(s.stickers))}
      <Text variant="muted" style={{ fontSize: 12, marginTop: 8 }}>{tr`Dernière partie : ${day}`}</Text>
    </Pressable>
  );
}

export function SyncChoiceHost() {
  const colors = useColors();
  const choice = useChoice((s) => s.choice);
  if (!choice) return null;
  const done = (v: 'device' | 'account' | null) => { sfx.turn(); choice.done(v); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => done(null)}>
      <Pressable accessibilityRole="button" onPress={() => done(null)} style={{ flex: 1, backgroundColor: 'rgba(74,58,102,0.45)', justifyContent: 'center', padding: space.xl }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.panel, borderRadius: radius.card + 8, padding: space.xl, borderBottomWidth: 6, borderBottomColor: colors.edge, gap: 12 }}>
          <Text variant="title" style={{ fontSize: 22, textTransform: 'uppercase', textAlign: 'center' }}>{tr('Quelle progression garder ?')}</Text>
          <Text variant="muted" style={{ fontSize: 14, lineHeight: 19, textAlign: 'center' }}>{tr('Cet appareil et ton compte n’ont pas la même progression. Choisis celle à garder : l’autre sera remplacée.')}</Text>
          <Card title={tr('Cet appareil')} s={choice.local} onPress={() => done('device')} />
          <Card title={tr('Compte')} s={choice.remote} onPress={() => done('account')} />
          <Button kind="ghost" label={tr('Plus tard')} onPress={() => done(null)} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
