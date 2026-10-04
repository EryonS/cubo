# Cloud save with Google / Apple accounts — design

Date: 2026-10-04. Status: approved in brainstorm, spec under review.

## Goal
A player keeps their progression when they change device, including across platforms (iPhone ↔ Android ↔ web at `cuboblocks.app`). Without an account nothing changes: everything stays on the device, and a new device starts from zero. Linking a Google or Apple account is the only way to carry progression over.

## Decisions (from the brainstorm)
- Cross-platform → our own backend: **Firebase** (Auth + Firestore), free Spark plan.
- Account is **optional**, linked from Profil > Réglages. No account wall at launch.
- Synced: **profile + settings + language + records (`bests`)**. Not synced: the run in progress and the parked run.
- When the device and the account both have different progression: **the player chooses** which one to keep; the other is replaced. No automatic merge.
- Available on **web, iOS and Android**, Google and Apple on all three (Apple guideline 4.8: Sign in with Apple is required on iOS as soon as Google is offered).
- Device ids were rejected: an id alone carries nothing across devices, and iOS `identifierForVendor` changes on reinstall.

## Architecture
### Firebase JS SDK everywhere
- The game has no bundler. Use the **compat** builds of the `firebase` npm package (`firebase-app-compat.js`, `firebase-auth-compat.js`, `firebase-firestore-compat.js`), copied into `www/vendor/firebase/` by an npm script (pinned version, no CDN). They are listed in `ASSETS` in `www/sw.js` (bump `CACHE`).
- **Lazy-loaded**: the SDK (~500 KB) is injected with `<script>` tags only when the player has an account (`cuboblocks.sync` holds a `uid`) or opens the Compte block. A player without an account never downloads it at start-up.
- Firebase web config (`apiKey`, `projectId`...) lives in `www/src/platform/cloud.js`. It is public by design; Firestore rules protect the data.

### Sign-in per platform
- **Web**: `firebase.auth().signInWithPopup(GoogleAuthProvider | OAuthProvider('apple.com'))`.
- **iOS / Android**: OAuth popups do not work in the WebView. Use `@capacitor-firebase/authentication` (via `Capacitor.Plugins.FirebaseAuthentication`, like AdMob in `ads.js`) with `skipNativeAuth: true`: the native sheet returns an `idToken` (+ `nonce`/`accessToken` for Apple), turned into a credential and passed to `firebase.auth().signInWithCredential` in JS. Firestore is then reached through the JS SDK on every platform; no Firestore plugin.
- Auth persistence: the JS SDK's default (IndexedDB) on all platforms.

### New files
| File | Role |
|---|---|
| `www/src/core/sync.js` | Pure (no DOM, tested in node). `payload(profile, settings, lang, bests)`, `validate(doc)`, `decide(local, remote)`, `summary(profile)`, `isFresh(profile)`, `tooNew(doc)`. Exposed as a global like the other core modules. |
| `www/src/platform/cloud.js` | Firebase wrapper: `load()` (lazy SDK), `signIn('google' \| 'apple')`, `signOut()`, `deleteAccount()`, `user()`, `pull()`, `push(doc, expectedUpdatedAt)`, `schedule()`, and the launch / resume / online hooks. |
| `www/src/screens/account.js` | Compte block in Profil > Réglages, the choice dialog, the error toasts. |
| `firestore.rules` | Security rules, versioned in the repo. |
| `docs/features/account.md` | Feature file (template from `docs/CLAUDE.md`), plus a row in its table. |

### Touched files
- `www/src/platform/storage.js`: `saveProfile()`, and `save()` when `settings` or `bests` changed, call `cloud.schedule()`. A function that applies a pulled document (replace `profile`, `settings`, `bests`, refresh `best`, save locally).
- `www/src/core/meta.js`: export `PROFILE_VERSION` (used by `tooNew`).
- `www/src/i18n/setup.js`: the pulled language goes through the existing `CuboBlocksLang.apply()` (live switch) and the `cuboblocks.lang` key.
- `www/index.html`: `<script>` tags for `core/sync.js`, `platform/cloud.js`, `screens/account.js` at their place in the load order. Firebase SDK files are not in `index.html` (lazy).
- `www/src/i18n/en.js`: English for every new string.
- `docs/features/persistence.md`: mention the sync key and the cloud copy.

## Data
### Firestore document `users/{uid}`
```
{
  v: 1,                    // sync format version
  profile: { ... },        // cuboblocks.profile.v1 as is (carries its own PROFILE_VERSION)
  settings: { ... },       // the settings object of cuboblocks.v2
  bests: { ... },          // the bests object of cuboblocks.v2
  lang: 'auto' | 'fr' | 'en',
  updatedAt: <ms>          // set by the writing device
}
```
A pulled profile goes through `M.migrate` + `M.ensureDay`, like a local one.

### Local key `cuboblocks.sync`
```
{ uid: string | null, provider: 'google' | 'apple', email: string,
  syncedAt: <ms> | 0,      // updatedAt of the last cloud version this device wrote or applied
  dirty: boolean }         // a local change not yet pushed
```
New key, no migration of existing saves needed. Absent = no account. Stored through the same storage layer as the other keys (`@capacitor/preferences` on native once project A lands).

## Flows
### Compte block (Profil > Réglages)
- **Signed out**: title « Sauvegarde en ligne », line « Retrouve ta progression sur tous tes appareils », buttons « Continuer avec Google » and « Continuer avec Apple ».
- **Signed in**: « Connecté avec Google · <email> », « Synchronisé il y a 2 min » (relative time through `locale()`), « Se déconnecter », « Supprimer mon compte ».
- Icons drawn in SVG (no emoji). Visual work follows `DESIGN.md`.

### Sign-in
1. Sign in with the provider. Cancelled → nothing happens, no message.
2. `pull()` the document. Then `decide`:
   - no document → push local; `syncedAt = updatedAt`.
   - local `isFresh` (no progression yet) → apply remote silently.
   - same content (payload deep-equal, ignoring `updatedAt`) → `syncedAt = remote.updatedAt`.
   - otherwise → **choice dialog**.
3. Choice dialog: two cards, « Cet appareil » and « Compte », each with coins, stars, stickers, date of last play (`summary`). Picking one asks a confirmation (« L'autre progression sera remplacée. »). Device picked → push it (overwrites the account). Account picked → apply it locally. Closing the dialog without picking signs out again (no half-linked state).

### Ongoing sync (signed in)
- **Push**: any profile / settings / bests / language change sets `dirty` and debounces a push 3 s later; also pushed when the app goes to the background (`visibilitychange` hidden). The push is a Firestore **transaction**: it writes only if the remote `updatedAt` still equals `syncedAt`; then `syncedAt = new updatedAt`, `dirty = false`. If the remote moved on → conflict.
- **Pull**: at launch and on return to foreground. Remote `updatedAt > syncedAt` and not `dirty` → apply remote. If a run is in progress (game screen, run not over), the apply waits until the player is back on a menu.
- **Conflict** (remote moved on and local `dirty`, i.e. two devices played offline): same choice dialog.
- **Offline**: nothing blocks; `dirty` stays set and the push is retried at next launch, foreground, or `online` event.

### Sign-out
Local progression stays on the device. `cuboblocks.sync` is cleared, sync stops.

### Account deletion (App Store requirement)
Confirmation dialog → delete `users/{uid}` → delete the Firebase user. If Firebase answers `requires-recent-login`, ask the player to sign in again, then retry. For Apple, revoke the token (`revokeAccessToken` with a fresh authorization code). Local progression stays on the device; `cuboblocks.sync` is cleared.

## Errors
- Network / Firebase error → toast « Connexion impossible, réessaie plus tard. »; the game goes on.
- Remote document from a newer app (`doc.v` above the app's sync version, or `profile.version` above `PROFILE_VERSION`) → never applied and never overwritten; toast « Mets à jour Cubo Blocks pour synchroniser. »
- Remote document that fails `validate` → ignored, local kept, no overwrite without the choice dialog.

## Security and privacy
Firestore rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read, delete: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['v', 'profile', 'settings', 'bests', 'lang', 'updatedAt'])
        && request.resource.data.v is int;
    }
  }
}
```
Firestore's own 1 MiB document cap bounds the size. App Check is out of scope for now.

Data collected: Firebase user id and email, linked to the player, for app functionality only. Declare in App Store privacy labels, Play Data safety and the privacy policy. Signing in has nothing to do with ad tracking (ATT is unaffected).

## Setup checklist (owner, outside the repo)
1. Firebase project: add the iOS app (`com.slapps.cubo`), the Android app (same id, with SHA-1 / SHA-256 of debug and release keys) and a web app.
2. Auth providers: Google, Apple. Authorized domains: `cuboblocks.app` (+ `localhost` for `npm run serve`).
3. Apple Developer: enable Sign in with Apple on the App ID; create a Services ID + key for Apple on web and Android; set Firebase's return URL on the Services ID; domain verification for `cuboblocks.app`.
4. Download `GoogleService-Info.plist` (into `ios/App/App/`) and `google-services.json` (into `android/app/`).
5. Deploy `firestore.rules` (`firebase deploy --only firestore:rules`).
6. Privacy policy, App Store privacy labels, Play Data safety updated.

## Testing
- `tests/sync.test.js`: every `decide` branch, `payload` shape, `summary`, `isFresh`, `tooNew`, `validate` (missing fields, wrong types, extra keys).
- `tests/i18n.test.js` covers the new strings.
- Manual, on web (`npm run serve`), iOS simulator, Android emulator: sign in with an empty account; sign in with an account that has progression on a fresh device; conflict dialog both ways; two devices taking turns; offline play then reconnect; sign-out; account deletion including re-login; language and settings following.

## Out of scope
Email / password sign-in, anonymous Firebase accounts, automatic merge, syncing the run in progress, App Check, iCloud / Play Games saves.

## Order
Project A (native plugins: haptics, preferences, share, status bar, back button; ATT prompt) comes first, with its own short design. This spec is implemented after it, through an implementation plan.

## Implementation notes (2026-10-04)
- `profile`, `settings` and `bests` are stored in Firestore as JSON text (Firestore refuses nested arrays and `undefined`); rules check them as strings.
- The Firebase SDK files are not in `ASSETS`: the service worker caches them on first use, so players without an account never download them.
- A pulled copy is applied by writing the local saves and reloading the page.
