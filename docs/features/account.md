# Cloud save (Google / Apple account)
Status: shipped (code), waiting for the Firebase project (see Setup)

## What it does
Optional. Profil > Réglages > Sauvegarde en ligne links a Google or Apple account; the profile, settings, records (`bests`) and language then follow the player on every device (web, iOS, Android). Without an account nothing changes and saves stay on the device. The run in progress is never synced.

- Sign-in: no cloud copy → the device's is sent. Device with no progression (`isFresh`) → the account's is applied silently. Different → the choice dialog (`#sync-choice`): two cards, then a confirm; the other side is replaced. Closing it at sign-in signs out again.
- Signed in: every `save()` / `saveProfile()` triggers a check 3 s later (`onSaved` hook); if the synced parts differ from the last cloud copy seen, they are pushed. Pushed too when the app goes to the background, and on `online`.
- Pull at launch and on return to foreground. A newer cloud copy is applied by writing it into the local saves and reloading the page (toast « Progression synchronisée. » after the reload). During a run it waits until a hub page shows.
- A push only writes if the cloud copy is still the one this device knows (Firestore transaction); otherwise refresh → pull, or the choice dialog if this device also has unsent changes.
- Sign-out keeps local progress. Account deletion signs in again (Firebase wants a recent sign-in, Apple's token is revoked), deletes the document then the account.
- Cloud copy from a newer app (`v` or `profile.version` too high) → never applied or overwritten, toast asks to update.

## Files
- `www/src/core/sync.js`: pure rules (`payload`, `validate`, `tooNew`, `isFresh`, `summary`, `same`, `decide`), `tests/sync.test.js`.
- `www/src/platform/cloud.js`: Firebase (lazy-loaded compat SDK from `www/vendor/firebase/`, `npm run vendor` refreshes it), `CONFIG` (empty `apiKey` = feature hidden). Native sign-in through `@capacitor-firebase/authentication` with `skipNativeAuth`, then `signInWithCredential` on the JS SDK.
- `www/src/screens/account.js`: Compte block (`renderAccount`, called from `renderSettings`), sign-in, sync, choice dialog. `startCloud()` runs from `boot.js`.
- `firestore.rules`, `capacitor.config.json` (`plugins.FirebaseAuthentication`).
- Spec: `docs/superpowers/specs/2026-10-04-cloud-save-design.md`.

## Saved state
- Local `cuboblocks.sync`: `{ uid, provider, email, syncedAt, dirty }`; absent = no account. Backed up like the other keys (`platform/store.js`).
- Firestore `users/{uid}`: `{ v, profile, settings, bests, lang, updatedAt }`; `profile`, `settings`, `bests` are stored as JSON text (Firestore refuses nested arrays and `undefined`), decoded in `cloud.js`.
- A synced field added to the profile needs nothing more (the whole profile travels); a new synced part outside the profile goes in `payload`, `same`, `validate`, `cloud.js` `PACKED` and the rules.

## Setup (owner, outside the repo)
1. Firebase project: iOS app `com.slapps.cubo`, Android app (same id, SHA-1 / SHA-256 of debug and release keys), web app. Copy the web config into `CONFIG` in `cloud.js`.
2. Auth providers Google and Apple. Authorized domains: `cuboblocks.app`, `localhost`.
3. Apple Developer: Sign in with Apple on the App ID (and the capability in Xcode); a Services ID + key for web and Android, with Firebase's return URL; domain verification for `cuboblocks.app`.
4. `GoogleService-Info.plist` into `ios/App/App/` (add to the target in Xcode) and its `REVERSED_CLIENT_ID` as a URL scheme in `Info.plist`; `google-services.json` into `android/app/`.
5. `firebase deploy --only firestore:rules`.
6. Privacy policy, App Store privacy labels, Play Data safety: user id + email, app functionality.

## Gotchas
- **Android crashes at launch without `google-services.json`**: the auth plugin calls `FirebaseAuth.getInstance()` when it loads. iOS only logs a warning without its plist.
- Free Spark plan: 20k Firestore writes a day. One push per settled change (3 s debounce), so roughly 1-2k daily signed-in players before Blaze is needed.
- Apple sign-in on Android goes through a web flow inside the plugin; check it on a device once the Services ID exists.
- The web SDK files are not in `ASSETS` (`sw.js`): players without an account never download them; the service worker caches them on first use.
