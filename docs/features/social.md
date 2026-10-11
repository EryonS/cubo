# Community (pseudo, friend code, friends)
Status: milestones 1-2 shipped (identity, friends); rankings, leagues and moderation (report, hidden) are planned. Not yet tried on a device or with the deployed rules.

## What it does
Profil > Communauté needs the cloud save account (Google / Apple). Signed out it shows « Connecte-toi pour avoir un pseudo et des amis » with the sign-in rows. Signed in with no pseudo, the first open shows the pseudo sheet by itself.
- **Pseudo**: 3-16 characters, letters (Latin, accents), digits, space, `-` `_`; trimmed, spaces collapsed; a FR + EN blocklist (`core/social.ts`) that ignores case, accents, leetspeak (0 1 3 4 5 7 @ $) and repeated letters. Strong words match anywhere ("f u c k"), weak or short ones only as a whole word (Essex, Peacock stay allowed; a name containing "cunt" such as Scunthorpe is refused). Not unique: two equal pseudos show `Pseudo#K7Q` (first 3 characters of the code). Changeable once a week; the first pick is free (`nameChangedAt` 0).
- **Friend code**: generated once at the first pseudo, 6 characters of `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, shown `K7Q-4MP`. Reserved in `codes/{code}` by a transaction (new code on a collision, 8 tries). Typing a code accepts lowercase, no dash, spaces. The system share sheet (React Native `Share`) carries Copier; there is no clipboard module in the app yet.
- **Friends**: adding a code is mutual at once: it writes `players/{me}/friends/{fid}` and `inbox/{fid}/adds/{me}`; the other player's app moves the inbox entry into its own friends list (launch, return to the Communauté screen, after sign-in) and deletes it. Max 50 (checked by the client). Refused: invalid code, own code, unknown code, already friends.
- **Remove / block**: tap a friend, Retirer (confirm dialog) or Bloquer. Both delete my friend doc and the friend's doc on me (the rules let a player delete his own entry in another's list). Block adds the uid to `profile.blocked` (synced with the account, absent = none). An inbox entry from a blocked uid is deleted, and I delete myself from his list. Adding a blocked player's code again unblocks him.
- Sign-out clears the cached card (the community is hidden); account deletion removes friends, inbox, `codes/{code}` and `players/{uid}` before the account.

## Files
- `src/core/social.ts` + `social.test.ts`: pseudo check / blocklist, rename delay, code make / parse / show, labels with collisions, block list helpers.
- `src/platform/social.ts`: Firestore calls (lazy, through `load()` exported by `platform/cloud.ts`).
- `src/game/social.ts`: state (`useSocial`: status, me, friends), cache, create / rename, add / remove / block, inbox sync, share, `deleteSocialData`. `game/account.ts` calls `startSocial` (launch, after sign-in), `resetSocial` (forget account) and passes `deleteSocialData` to `Cloud.deleteAccount`.
- `src/screens/CommunityScreen.tsx` (stack route `Community`), `src/ui/PseudoSheet.tsx`, `SignInRows` in `src/ui/AccountBlock.tsx`, the Communauté row in `src/screens/ProfileScreen.tsx`.
- `firestore.rules`. Spec: `docs/superpowers/specs/2026-10-09-social-design.md`.

## Saved state
- Local MMKV `cuboblocks.social`: my card `{ uid, name, code, look, createdAt, nameChangedAt }` (Profil shows pseudo + code offline). Cleared at sign-out.
- `profile.blocked?: string[]` (uids, max 200): travels with the profile to the cloud. Optional, no migration (absent = none).
- Firestore:
  - `players/{uid}` `{ name, code, look: { cubo, hat }, createdAt, nameChangedAt, hidden? }`. `look.cubo` = equipped board theme key, `look.hat` = equipped wardrobe piece: the avatar is `cuboLookFor(cubo, hat)`. Refreshed at launch if the equipped look changed. `hidden` is set from the console only: the player shows as « Joueur ».
  - `codes/{code}` `{ uid }`.
  - `players/{uid}/friends/{fid}` `{ since }`.
  - `inbox/{uid}/adds/{fid}` `{ at }`.

## Rules (`firestore.rules`)
- `players`: `get` for any signed-in player (no listing). Create/update only by the owner with `validPlayer` (keys, name length and character set, code format, look shape). Create reserves the code: `getAfter(codes/{code}).uid == uid`. Update keeps `code`, `createdAt` and `hidden`; a new name needs `nameChangedAt` within 10 minutes of the server time and at least a week after the previous (`0` = free).
- `codes`: `get` only (no listing), create by the owner of the matching `players` doc, never updated, delete by its owner.
- `friends`: read by the owner; create/update only by the owner (`since` int); delete by the owner or by `fid` (so remove / block also clears my entry in his list).
- `inbox/{uid}/adds/{fid}`: create/update only by `fid` (the sender), read/delete by `uid`.
- Not enforced by rules (client only): the 50-friends cap, the blocklist words, that the inbox sender really knows the code. A modified client can add anyone it knows the uid of; an inbox entry is only a request to be listed and the receiver can block.

## Gotchas
- Deploy the rules (`firebase deploy --only firestore:rules`) before testing, or every community call is denied.
- The name regex uses RE2 `\x{C0}` ranges; if the console refuses it at deploy, replace the class by `\p{L}`.
- Friend avatars are one small Skia canvas each (up to 50): fine so far, watch the list if it ever scrolls badly.
- Dates: a device clock more than 10 minutes off fails a rename (rule on `nameChangedAt`).
- Account deletion needs the Firestore reads and deletes to succeed; a failure stops the deletion (toast), the account stays.
