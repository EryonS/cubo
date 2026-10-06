import type { ExpoConfig } from 'expo/config';

// The only place the store identity is written.
const IDENTITY = { name: 'Cubo', slug: 'cuboblocks', bundleId: 'com.slapps.cuboblocks' } as const;
// Toy pink (DESIGN.md toy-pink): splash, window and launch background.
const BG = '#ffeef4';
// Themes with their own app icon (APP_ICONS in src/render/app-icon.ts, minus Jouet).
const ALT_ICONS = ['plain', 'sea', 'space', 'ice', 'forest', 'retro', 'arcade', 'volcano',
  'newyear', 'lunar', 'valentine', 'easter', 'beach', 'xmas', 'halloween'];

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
    // One per upload to App Store Connect: bump it (and CURRENT_PROJECT_VERSION in the Xcode project) before each archive.
    buildNumber: '2',
    // Signing team, so a prebuild keeps it in the Xcode project.
    appleTeamId: '853SGV2WKU',
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
    // Data the app's own code sends: the optional online save (Firebase JS SDK, which ships no
    // manifest). AdMob declares its own in its pod. Keep in line with site/privacy.html and the
    // App Store Connect privacy answers.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyCollectedDataTypes: [
        'NSPrivacyCollectedDataTypeEmailAddress',
        'NSPrivacyCollectedDataTypeUserID',
        'NSPrivacyCollectedDataTypeGameplayContent',
      ].map((type) => ({
        NSPrivacyCollectedDataType: type,
        NSPrivacyCollectedDataTypeLinked: true,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
      })),
    },
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
    // The microphone text is never shown (Cubo never records), but the library links the recording API and
    // App Store processing rejects a build without it (ITMS-90683).
    ['react-native-audio-api', {
      iosBackgroundMode: false, androidForegroundService: false, androidPermissions: [], disableFFmpeg: true,
      iosMicrophonePermission: 'Cubo Blocks never records sound. Its audio library asks this of every app that uses it.',
    }],
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
    // One home-screen icon per theme (Paramètres > Icône de l'app), drawn by scripts/icons/app-icons.ts.
    // Jouet is the app's own icon.
    ['expo-alternate-app-icons', ALT_ICONS.map((id) => ({
      name: id[0].toUpperCase() + id.slice(1), // appIconName in render/app-icon.ts
      ios: `./assets/icons/${id}.png`,
      android: { foregroundImage: `./assets/icons/android/${id}-fg.png`, backgroundImage: `./assets/icons/android/${id}-bg.png` },
    }))],
    // Google sign-in on iOS returns to the reversed iOS OAuth client id (CONFIG.iosClientId in platform/cloud.ts).
    ['@react-native-google-signin/google-signin', { iosUrlScheme: 'com.googleusercontent.apps.779075128285-9ajv2baduf9tdherm72d9qnn5ahkihh8' }],
  ],
};

export default config;
