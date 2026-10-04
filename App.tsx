// Cubo Blocks — Root: gestures, safe area, navigation. The language is already set (index.ts).
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { wireAudio } from './src/audio/engine';
import { useGame } from './src/state/store';
import { colors } from './src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.accent, card: colors.panel, text: colors.text } };

export default function App() {
  useEffect(() => { wireAudio(); }, []);
  // Back from the background past midnight: today's missions.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') useGame.getState().rollDay(); });
    return () => sub.remove();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <NavigationContainer theme={theme} onReady={() => SplashScreen.hideAsync().catch(() => {})}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
