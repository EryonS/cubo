# Community (pseudo, friend code, friends)
Status: milestones 1-3 shipped (identity, friends, weekly score + friends ranking); leagues and moderation (report, hidden) are planned. Not yet tried on a device or with the deployed rules.

## What it does
Profil > Communauté needs the cloud save account (Google / Apple). Signed out it shows « Connecte-toi pour avoir un pseudo et des amis » with the sign-in rows. Signed in with no pseudo, the first open shows the pseudo sheet by itself.
- **Pseudo**: 3-16 characters, letters (Latin, accents), digits, space, `-` `_`; trimmed, spaces collapsed; a FR + EN blocklist (`core/social.ts`) that ignores case, accents, leetspeak (0 1 3 4 5 7 @ $) and repeated letters. Strong words match anywhere ("f u c k"), weak or short ones only as a whole word (Essex, Peacock stay allowed; a name containing "cunt" such as Scunthorpe is refused). Not unique: two equal pseudos show `Pseudo#K7Q` (first 3 characters of the code). Changeable once a week; the first pick is free (`nameChangedAt` 0).
- **Friend code**: generated once at the first pseudo, 6 characters of `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, shown `K7Q-4MP`. Reserved in `codes/{code}` by a transaction (new code on a collision, 8 tries). Typing a code accepts lowercase, no dash, spaces. The system share sheet (React Native `Share`) carries Copier; there is no clipboard module in the app yet.
- **Friends**: adding a code is mutual at once: it writes `players/{me}/friends/{fid}` and `inbox/{fid}/adds/{me}`; the other player's app moves the inbox entry into its own friends list (launch, return to the Communauté screen, after sign-in) and deletes it. Max 50 (checked by the client). Refused: invalid code, own code, unknown code, already friends.
- **Remove / block**: tap a friend, Retirer (confirm dialog) or Bloquer. Both delete my friend doc and the friend's doc on me (the rules let a player delete his own entry in another's list). Block adds the uid to `profile.blocked` (synced with the account, absent = none). An inbox entry from a blocked uid is deleted, and I delete myself from his list. Adding a blocked player's code again unblocks him.
- Sign-out clears the cached card (the community is hidden); account deletion removes friends, inbox, `codes/{code}` and `players/{uid}` before the account.

- **Week**: ISO week in Paris time (`2026-W41`), Monday 00:00 to Sunday 23:59 Europe/Paris for everyone. `weekId(ms)` / `weekEnd(ms)` in `core/social.ts` compute the Paris offset by the EU rule (last Sundays of March / October, 01:00 UTC), no Intl (Hermes).
- **Weekly tally**: `profile.week = { id, points, best, runs }`, updated by `settleRun` (and `dropParked`) through `addWeekRun`: a finished run in Classique, Chrono or Mondes with a score above 0 adds its score to `points` and 1 to `runs`; `best` is the best single Classique run. Not counted: Chill, Aventure (levels, daily, events), puzzles. A new week id starts from zero. It lives in the profile, so the Seconde chance (profile restored to before the settlement) undoes it and the cloud save carries it across devices. Absent = nothing yet, no migration.
- **Push**: `weeks/{week}/scores/{uid}` gets the absolute values ~3 s after a counted run (`weekCounted`), when the app goes to the background (`flushWeek`) and at launch. Only with a pseudo, never lower than what was already sent this week (`cuboblocks.social.sent` in MMKV), 10 s between two writes, +200000 points at most per write (a long offline stretch goes in steps). `players/{uid}.bestClassic` (all-time Classique best, from `bests.classic`) is updated in the same push when it grows. A refused or offline push is silent; the next one retries.
- **Friends ranking**: me + friends. For each friend `weeks/{week}/scores/{fid}` (missing = 0) and the `players/{fid}` card (name, look, `bestClassic`). Cached in the social store (`board`), refreshed at most every 60 s (Défis focus, Classement open) or by pull-to-refresh. Three boards (`Segmented`): Points de la semaine, Meilleur score (Classique, this week), Record (all-time Classique). Ties share a rank (`rankRows`: 1, 1, 3). My line is always computed from the local data.
- **Screens**: "Entre amis" card at the top of Défis (`screens/defis/FriendsCard.tsx`: rank, points, top 3, time left; signed out / no pseudo / no friend: one line and a button to Communauté) opening `screens/RankingScreen.tsx` (stack route `Ranking`). The game over card of a counted run shows « +N pts cette semaine » (only with a pseudo, no network).

## Files
- `src/core/social.ts` + `social.test.ts`: pseudo check / blocklist, rename delay, code make / parse / show, labels with collisions, block list helpers.
- `src/platform/social.ts`: Firestore calls (lazy, through `load()` exported by `platform/cloud.ts`).
- `src/game/social.ts`: state (`useSocial`: status, me, friends), cache, create / rename, add / remove / block, inbox sync, share, `deleteSocialData`. `game/account.ts` calls `startSocial` (launch, after sign-in), `resetSocial` (forget account) and passes `deleteSocialData` to `Cloud.deleteAccount`.
- `src/screens/CommunityScreen.tsx` (stack route `Community`), `src/ui/PseudoSheet.tsx`, `SignInRows` in `src/ui/AccountBlock.tsx`, the Communauté row in `src/screens/ProfileScreen.tsx`.
- `src/screens/RankingScreen.tsx` (route `Ranking`), `src/screens/defis/FriendsCard.tsx`, `src/ui/Avatar.tsx`, pull-to-refresh in `src/ui/Screen.tsx`.
- `firestore.rules`. Spec: `docs/superpowers/specs/2026-10-09-social-design.md`.

## Saved state
- Local MMKV `cuboblocks.social`: my card `{ uid, name, code, look, createdAt, nameChangedAt }` (Profil shows pseudo + code offline). Cleared at sign-out.
- `profile.week?: { id, points, best, runs }`: this week's tally (optional, absent = nothing).
- MMKV `cuboblocks.social.sent`: what the last week-score push wrote `{ uid, week, points, best, runs, at }`.
- `profile.blocked?: string[]` (uids, max 200): travels with the profile to the cloud. Optional, no migration (absent = none).
- Firestore:
  - `players/{uid}` `{ name, code, look: { cubo, hat }, createdAt, nameChangedAt, hidden? }`. `look.cubo` = equipped board theme key, `look.hat` = equipped wardrobe piece: the avatar is `cuboLookFor(cubo, hat)`. Refreshed at launch if the equipped look changed. `hidden` is set from the console only: the player shows as « Joueur ».
  - `players/{uid}.bestClassic` (int, only grows, optional).
  - `weeks/{week}/scores/{uid}` `{ name, look: { cubo, hat }, points, best, runs, at }` (flat, not under a group: milestone 4 adds a `group` field and queries by it).
  - `codes/{code}` `{ uid }`.
  - `players/{uid}/friends/{fid}` `{ since }`.
  - `inbox/{uid}/adds/{fid}` `{ at }`.

## Rules (`firestore.rules`)
- `players`: `get` for any signed-in player (no listing). Create/update only by the owner with `validPlayer` (keys, name length and character set, code format, look shape). Create reserves the code: `getAfter(codes/{code}).uid == uid`. Update keeps `code`, `createdAt` and `hidden`; a new name needs `nameChangedAt` within 10 minutes of the server time and at least a week after the previous (`0` = free).
- `players.bestClassic`: optional int 0..2000000 that never decreases.
- `weeks/{week}/scores/{uid}`: read by any signed-in player; create / update / delete by the owner only; `week` matches `YYYY-Www`; keys exactly `name look points best runs at`; `name` and `look` as in players; ints, `best <= points`, `best <= 500000`, `runs <= 100000`; on update `points`, `best` and `runs` never decrease and `points` gains at most 200000; `at` within 10 minutes of `request.time` and at least 10 s after the stored `at`; on create `points <= 200000`. The week in the path is not tied to the server date (a modified client can write another week's doc), and the score itself is client-reported: the caps only bound cheating.
- `codes`: `get` only (no listing), create by the owner of the matching `players` doc, never updated, delete by its owner.
- `friends`: read by the owner; create/update only by the owner (`since` int); delete by the owner or by `fid` (so remove / block also clears my entry in his list).
- `inbox/{uid}/adds/{fid}`: create/update only by `fid` (the sender), read/delete by `uid`.
- Not enforced by rules (client only): the 50-friends cap, the blocklist words, that the inbox sender really knows the code. A modified client can add anyone it knows the uid of; an inbox entry is only a request to be listed and the receiver can block.

## Gotchas
- Redeploy the rules for milestone 3 (`weeks/` is denied before).
- Device clock off by more than 10 minutes: week pushes are refused (rule on `at`); the week id itself uses the device clock too.
- Deploy the rules (`firebase deploy --only firestore:rules`) before testing, or every community call is denied.
- The name regex uses RE2 `\x{C0}` ranges; if the console refuses it at deploy, replace the class by `\p{L}`.
- Friend avatars are one small Skia canvas each (up to 50): fine so far, watch the list if it ever scrolls badly.
- Dates: a device clock more than 10 minutes off fails a rename (rule on `nameChangedAt`).
- Account deletion needs the Firestore reads and deletes to succeed; a failure stops the deletion (toast), the account stays.
