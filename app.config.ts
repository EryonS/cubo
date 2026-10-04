import type { ExpoConfig } from 'expo/config';

// The only place the store identity is written.
const IDENTITY = { name: 'Cubo', slug: 'cuboblocks', bundleId: 'com.slapps.cubo' } as const;
// Toy pink (DESIGN.md toy-pink): splash, window and launch background.
const BG = '#ffeef4';

const config: ExpoConfig = {
  name: IDENTITY.name,
  slug: IDENTITY.slug,
  scheme: IDENTITY.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: BG,
  ios: {
    supportsTablet: false,
    bundleIdentifier: IDENTITY.bundleId,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: IDENTITY.bundleId,
    adaptiveIcon: { backgroundColor: '#ffe3ee', foregroundImage: './assets/icon-foreground.png' },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    // File names are the fonts' PostScript names, so one fontFamily works on iOS and Android.
    ['expo-font', {
      fonts: [
        './assets/fonts/Baloo2-SemiBold.ttf',
        './assets/fonts/Baloo2-Bold.ttf',
        './assets/fonts/Baloo2-ExtraBold.ttf',
        './assets/fonts/PressStart2P-Regular.ttf',
      ],
    }],
    'expo-localization',
    ['expo-splash-screen', { backgroundColor: BG, image: './assets/splash.png', imageWidth: 220 }],
  ],
};

export default config;
