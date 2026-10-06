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
    // Signing team, so a prebuild keeps it in the Xcode project.
    appleTeamId: '853SGV2WKU',
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
    // Sounds only while the app is in front: no background audio mode, no foreground service, no FFmpeg (nothing is decoded).
    ['react-native-audio-api', { iosBackgroundMode: false, androidForegroundService: false, androidPermissions: [], disableFFmpeg: true }],
    ['expo-splash-screen', { backgroundColor: BG, image: './assets/splash.png', imageWidth: 220 }],
    // Google's test app ids until the AdMob account exists. Replace them, and the unit ids in
    // platform/ads.ts, before release.
    ['react-native-google-mobile-ads', {
      androidAppId: 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: 'ca-app-pub-3940256099942544~1458002511',
    }],
    ['expo-tracking-transparency', {
      userTrackingPermission: 'Your choice only changes which ads you see when you watch one for a reward. Cubo Blocks works the same either way.',
    }],
    // Android 3-button bar: no white contrast scrim over the game; App.tsx sets the button color per theme.
    ['expo-navigation-bar', { enforceContrast: false }],
    'expo-apple-authentication',
    // Google sign-in on iOS returns to the reversed iOS OAuth client id (CONFIG.iosClientId in platform/cloud.ts).
    ['@react-native-google-signin/google-signin', { iosUrlScheme: 'com.googleusercontent.apps.779075128285-9ajv2baduf9tdherm72d9qnn5ahkihh8' }],
  ],
};

export default config;
