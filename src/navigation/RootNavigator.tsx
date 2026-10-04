// Tab bar: Jouer, Défis, Boutique, Profil (as the web build's #tabbar).
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tr } from '../core/i18n';
import { DefisScreen } from '../screens/DefisScreen';
import { PlayScreen } from '../screens/PlayScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/fonts';
import { Icon, type IconName } from '../ui/Icon';
import type { TabParams } from './types';

const Tab = createBottomTabNavigator<TabParams>();

const icon = (name: IconName) => ({ color, size }: { color: string; size: number }) => <Icon name={name} color={color} size={size} />;

export function RootNavigator() {
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
      <Tab.Screen name="Defis" component={DefisScreen} options={{ title: tr('Défis'), tabBarIcon: icon('defis') }} />
      <Tab.Screen name="Shop" component={ShopScreen} options={{ title: tr('Boutique'), tabBarIcon: icon('shop') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: tr('Profil'), tabBarIcon: icon('profile') }} />
    </Tab.Navigator>
  );
}
