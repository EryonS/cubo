# Cloud save (Google / Apple account)
Status: shipped, Firebase config filled (project `cubo-blocks`); not yet tried on a device

## What it does
Optional. Profil > Sauvegarde en ligne links a Google or Apple account; the profile, settings, records (`bests`) and language then follow the player on every device (iOS, Android). Without an account nothing changes and saves stay on the device. The run in progress is never synced.

- Sign-in: no cloud copy → the device's is sent. Device with no progression (`isFresh`) → the account's is applied silently. Different → the choice dialog (`src/ui/SyncChoice.tsx`, `askSide`): two cards, then a confirm; the other side is replaced. Closing it at sign-in signs out again.
- Signed in: every save to the MMKV keys (`src/state/persist.ts`) triggers a check 3 s later (`setOnSaved` hook, `src/platform/saved.ts`); if the synced parts differ from the last cloud copy seen, they are pushed. Pushed too when the app goes to the background or inactive (`AppState`). There is no `online` listener.
- Pull at launch and on return to foreground. A newer cloud copy is applied by writing it into the local saves and reloading the app (`applyCloud`, `reloadAppAsync`; toast « Progression synchronisée. » after the reload). During a run it waits until a hub page shows.
- A push only writes if the cloud copy is still the one this device knows (Firestore transaction); otherwise refresh → pull, or the choice dialog if this device also has unsent changes.
- Sign-out keeps local progress. Account deletion signs in again (Firebase wants a recent sign-in, Apple's token is revoked), deletes the document then the account.
- Cloud copy from a newer app (`v` or `profile.version` too high) → never applied or overwritten, toast asks to update.

## Files
- `src/core/sync.ts`: pure rules (`payload`, `validate`, `tooNew`, `isFresh`, `summary`, `same`, `decide`), `src/core/sync.test.ts`.
- `src/platform/cloud.ts`: Firebase JS SDK (lazy `import()`, React Native auth persistence on AsyncStorage), `CONFIG` (empty `apiKey` = feature hidden; `webClientId` / `iosClientId` for Google). Apple sign-in through `expo-apple-authentication` (iOS only, the Apple row is hidden on Android), Google through `@react-native-google-signin/google-signin` (native sheet, ID token whose audience is the Web client), then `signInWithCredential`. `src/platform/cloud-doc.ts` (`encodeDoc` / `decodeDoc`, test `cloud-doc.test.ts`).
- `src/game/account.ts`: sign-in, push / pull, choice, sign-out, deletion (`signInWith`, `signOutCloud`, `deleteCloudAccount`, `syncedLabel`). `startAccount()` runs at launch from `App.tsx`.
- `src/ui/AccountBlock.tsx`: Compte block on the Profil tab (`src/screens/ProfileScreen.tsx`), `src/ui/SyncChoice.tsx`: the choice dialog.
- `firestore.rules`.
- Spec: `docs/superpowers/specs/2026-10-04-cloud-save-design.md`.

## Saved state
- Local MMKV key `cuboblocks.sync`: `{ uid, provider, email, syncedAt, dirty }`; absent = no account. Backed up like the other keys (`src/platform/kv.ts`, MMKV).
- Firestore `users/{uid}`: `{ v, profile, settings, bests, lang, updatedAt }`; `profile`, `settings`, `bests` are stored as JSON text (Firestore refuses nested arrays and `undefined`), decoded in `src/platform/cloud-doc.ts`.
- A synced field added to the profile needs nothing more (the whole profile travels); a new synced part outside the profile goes in `payload`, `same`, `validate` (`src/core/sync.ts`), `cloud-doc.ts` and the rules.

## Setup (owner, outside the repo)
1. Firebase project: iOS app `com.slapps.cubo`, Android app (same id, SHA-1 / SHA-256 of debug and release keys), web app. Copy the web config into `CONFIG` in `src/platform/cloud.ts`, plus the Google OAuth client ids: Web (`webClientId`, auto created by Firebase) and iOS (`iosClientId`). Android needs an Android OAuth client (package + SHA-1) in the same Google Cloud project, one per signing key (debug, Play App Signing); it is not in the code.
2. Auth providers Google and Apple. Authorized domains: `cuboblocks.app`.
3. Apple Developer: Sign in with Apple on the App ID (and the capability in Xcode); a Services ID + key for web and Android, with Firebase's return URL; domain verification for `cuboblocks.app`.
4. iOS Google sign-in: the `@react-native-google-signin/google-signin` config plugin in `app.config.ts` with `iosUrlScheme` = the reversed iOS client id (`com.googleusercontent.apps.…`), then prebuild. No `GoogleService-Info.plist` / `google-services.json`: the app uses the Firebase JS SDK, not the native one.
5. `firebase deploy --only firestore:rules`.
6. Privacy policy, App Store privacy labels, Play Data safety: user id + email, app functionality.

## Gotchas
- Free Spark plan: 20k Firestore writes a day. One push per settled change (3 s debounce), so roughly 1-2k daily signed-in players before Blaze is needed.
- `expo-apple-authentication` is the native Apple sheet (iOS only), so the Compte block hides Apple on Android.
- Google `DEVELOPER_ERROR` on Android = no Android OAuth client matching the package + the SHA-1 that signed the build, in the Web client's project.
- The Firebase SDK is loaded with dynamic `import()` only when the feature is available, so players without a `CONFIG.apiKey` never run it.
- The Firestore cache is memory only (`memoryLocalCache`), not persisted.
