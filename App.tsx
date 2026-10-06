// Cubo Blocks — Root: gestures, safe area, navigation. The language is already set (index.ts).
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { wireAudio } from './src/audio/engine';
import { preloadFonts } from './src/render/font';
import { startAccount } from './src/game/account';
import { M } from './src/core';
import { startTutorial } from './src/game/tutorial';
import { useGame } from './src/state/store';
import { AskHost } from './src/ui/dialog';
import { SyncChoiceHost } from './src/ui/SyncChoice';
import { ToastHost } from './src/ui/Toast';
import { StickerBannerHost } from './src/ui/StickerBanner';
import { colorsFor, darkBg } from './src/theme/useColors';

SplashScreen.preventAutoHideAsync().catch(() => {});
preloadFonts();

// First launch: the guided first game, on the game screen above the home tabs (legacy boot.js).
const firstGame = M.needsTutorial(useGame.getState().profile);
if (firstGame) startTutorial();

export default function App() {
  const menu = colorsFor(useGame((s) => s.profile.equipped.boards));
  const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: menu.bg, primary: menu.accent, card: menu.panel, text: menu.text } };
  useEffect(() => { wireAudio(); startAccount(); }, []);
  // Back from the background past midnight: today's missions.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') useGame.getState().rollDay(); });
    return () => sub.remove();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: menu.bg }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <NavigationContainer theme={theme} initialState={firstGame ? { index: 1, routes: [{ name: 'Tabs' }, { name: 'Game' }] } : undefined} onReady={() => SplashScreen.hideAsync().catch(() => {})}>
            <StatusBar style={darkBg(menu.bg) ? 'light' : 'dark'} />
            {/* Android button bar: style is the buttons' color, as for the status bar. */}
            {Platform.OS === 'android' && <NavigationBar style={darkBg(menu.bg) ? 'light' : 'dark'} hidden={false} />}
            <RootNavigator />
          </NavigationContainer>
          <StickerBannerHost />
          <AskHost />
          <SyncChoiceHost />
          <ToastHost />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
