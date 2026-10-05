// Compte block in Réglages (legacy renderAccount). Hidden until the Firebase config is filled.
import { useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { accountInfo, deleteCloudAccount, signInWith, signOutCloud, subscribeAccount, syncedLabel } from '../game/account';
import { available } from '../platform/cloud';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Icon } from './Icon';
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

export function AccountBlock() {
  const colors = useColors();
  const info = useSyncExternalStore(subscribeAccount, accountInfo, accountInfo);
  if (!available()) return null;
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginTop: space.s, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel2 };
  if (!info) {
    return (
      <View>
        <Text variant="muted" style={{ fontSize: 13, marginTop: space.s, marginBottom: 4 }}>{tr('Retrouve ta progression sur tous tes appareils.')}</Text>
        <Pressable accessibilityRole="button" onPress={() => { sfx.turn(); void signInWith('google'); }} style={row}>
          <GoogleMark />
          <Text style={{ fontSize: 16, flex: 1 }}>{tr('Continuer avec Google')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => { sfx.turn(); void signInWith('apple'); }} style={row}>
          <AppleMark color={colors.text} />
          <Text style={{ fontSize: 16, flex: 1 }}>{tr('Continuer avec Apple')}</Text>
        </Pressable>
      </View>
    );
  }
  const by = info.provider === 'apple' ? tr('Connecté avec Apple') : tr('Connecté avec Google');
  return (
    <View>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16 }}>{by}</Text>
          <Text variant="muted" style={{ fontSize: 12 }}>{info.email ? `${info.email} · ${syncedLabel()}` : syncedLabel()}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => { sfx.turn(); void signOutCloud(); }} style={row}>
        <Text style={{ fontSize: 16, flex: 1 }}>{tr('Se déconnecter')}</Text>
        <Icon name="chevRight" size={16} color={colors.accent} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => { sfx.turn(); void deleteCloudAccount(); }} style={row}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, color: colors.danger }}>{tr('Supprimer mon compte')}</Text>
          <Text variant="muted" style={{ fontSize: 12 }}>{tr('Efface ta sauvegarde en ligne')}</Text>
        </View>
        <Icon name="chevRight" size={16} color={colors.danger} />
      </Pressable>
    </View>
  );
}
