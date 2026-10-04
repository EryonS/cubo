// Root stack: the tab bar (Jouer, Défis, Boutique, Profil, as the web build's #tabbar) and the
// game, full screen above it.
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AlbumScreen } from '../screens/album/AlbumScreen';
import { AdventureScreen } from '../screens/AdventureScreen';
import { GameScreen } from '../screens/GameScreen';
import { tr } from '../core/i18n';
import { DefisScreen } from '../screens/DefisScreen';
import { PlayScreen } from '../screens/PlayScreen';
import { PuzzlesScreen } from '../screens/PuzzlesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { defisDot } from '../game/daily';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { useColors } from '../theme/useColors';
import { fonts } from '../theme/fonts';
import { Icon, type IconName } from '../ui/Icon';
import type { RootParams, TabParams } from './types';

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootParams>();

const icon = (name: IconName) => ({ color, size }: { color: string; size: number }) => <Icon name={name} color={color} size={size} />;

// Défis tab icon with a dot while today's daily level is open (legacy #tabbar .dot).
function DefisIcon({ color, size }: { color: string; size: number }) {
  const colors = useColors();
  const dot = useGame((s) => defisDot(s.profile, today()));
  return (
    <View>
      <Icon name="defis" color={color} size={size} />
      {dot && <View style={{ position: 'absolute', top: -1, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.panel }} />}
    </View>
  );
}

function Tabs() {
  const colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.edge },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
      }}
    >
      <Tab.Screen name="Play" component={PlayScreen} options={{ title: tr('Jouer'), tabBarIcon: icon('play') }} />
      <Tab.Screen name="Defis" component={DefisScreen} options={{ title: tr('Défis'), tabBarIcon: (p) => <DefisIcon {...p} /> }} />
      <Tab.Screen name="Shop" component={ShopScreen} options={{ title: tr('Boutique'), tabBarIcon: icon('shop') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: tr('Profil'), tabBarIcon: icon('profile') }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Game" component={GameScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="Adventure" component={AdventureScreen} />
      <Stack.Screen name="Puzzles" component={PuzzlesScreen} />
      <Stack.Screen name="Album" component={AlbumScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
