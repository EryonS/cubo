// Compte block at the top of Paramètres (legacy renderAccount). Hidden until the Firebase config is filled.
import { useSyncExternalStore } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tr } from '../core/i18n';
import { accountInfo, deleteCloudAccount, signInWith, signOutCloud, subscribeAccount, syncedLabel } from '../game/account';
import { available } from '../platform/cloud';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Icon } from './Icon';
import { Group } from './Group';
import { ListRow } from './ListRow';
import { Text } from './Text';

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.5-9.4 6.5-16.1z" />
      <Path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C8 41.1 15.4 46 24 46z" />
      <Path fill="#FBBC05" d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.4C2.9 17.2 2 20.5 2 24s.9 6.8 2.4 9.8l7.3-5.7z" />
      <Path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8 6.9 4.4 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1z" />
    </Svg>
  );
}

function AppleMark({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill={color} d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
    </Svg>
  );
}

// The two marks share one column, so both labels start at the same place.
const Mark = ({ children }: { children: React.ReactNode }) => <View style={{ width: 20, alignItems: 'center' }}>{children}</View>;

export function AccountBlock() {
  const colors = useColors();
  const info = useSyncExternalStore(subscribeAccount, accountInfo, accountInfo);
  if (!available()) return null;
  if (!info) {
    return (
      <View style={{ gap: space.s }}>
        <Text variant="muted" style={{ marginHorizontal: space.xs }}>{tr('Retrouve ta progression sur tous tes appareils.')}</Text>
        {/* expo-apple-authentication is the native iOS sheet: no Apple sign-in on Android. */}
        <Group>
          <ListRow title={tr('Continuer avec Google')} icon={<Mark><GoogleMark /></Mark>} onPress={() => { void signInWith('google'); }} />
          {Platform.OS === 'ios' && <ListRow title={tr('Continuer avec Apple')} icon={<Mark><AppleMark color={colors.text} /></Mark>} onPress={() => { void signInWith('apple'); }} />}
        </Group>
      </View>
    );
  }
  const by = info.provider === 'apple' ? tr('Connecté avec Apple') : tr('Connecté avec Google');
  return (
    <Group>
      <ListRow title={by} sub={info.email ? `${info.email} · ${syncedLabel()}` : syncedLabel()} />
      <ListRow title={tr('Se déconnecter')} right="chevron" onPress={() => { void signOutCloud(); }} />
      <ListRow title={tr('Supprimer mon compte')} sub={tr('Efface ta sauvegarde en ligne')} onPress={() => { void deleteCloudAccount(); }}
        right={<Icon name="chevRight" size={16} color={colors.danger} />} />
    </Group>
  );
}
