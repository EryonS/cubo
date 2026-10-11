# Moderation runbook (owner)

Cubo Blocks has no chat: the only user text is the pseudo. Apple 1.2 asks for a filter, a way to report, a way to block and the developer acting on reports. All of it is in the app; this page is what you do in the Firebase console (project `cuboblocks`, Firestore Database). Spec: `docs/superpowers/specs/2026-10-09-social-design.md`.

## Read the reports
1. Console > Firestore Database > collection `reports`. Clients can only create there (rules), so this is your inbox.
2. Each doc: `from` (reporter uid), `target` (reported uid), `name` (the pseudo as it was shown), `reason` (`insult`, `inappropriate`, `other`), `at` (ms). Sort by `at` desc.
3. Several reports on the same `target` are the signal. Open `players/{target}` to see the current pseudo (it may have changed since `name`).
4. Check at least once a week while the app is young; Apple expects a prompt answer (a day is the usual promise in the review notes' spirit).
5. Delete the report docs you handled (console only), so the list stays readable.

## Hide a pseudo (the player stays, must rename)
1. `players/{target}` > add field `hidden`, type **string**, value = the exact offending pseudo (copy the `name` field).
2. Effect: wherever the player's current name equals `hidden` the app shows « Joueur » (friends lists, friends ranking at the next refresh, league boards within 10 minutes). The player's own app asks for a new pseudo (« Ton pseudo a été signalé, choisis-en un autre. ») on Communauté and Défis, and the rename is allowed at once, whatever the weekly limit.
3. Once they pick another name it shows normally again (the old `hidden` string just stays there; you can delete the field).
4. Never set `hidden` to a boolean: the rules and the app ignore anything but a string.

## Remove a player entirely
1. Delete `players/{target}` and `codes/{code}` (the `code` field of the player doc; do it first, then the doc).
2. Optionally delete `weeks/{week}/scores/{target}` for the current week (their row leaves the league board; ranks of that week shift, which is fine before the claim, not after).
3. Their friends' lists drop the entry on the next refresh ("account deleted" path). The Firebase Auth user can be disabled in Authentication > Users.
4. The account cannot rejoin with the same code: its code is gone, and a new pseudo makes a new player card with a new code, so disable the Auth user if you want a real ban. The app of a removed player offers a new pseudo as if it were new.

## What to answer Apple review
- "Where is the report / block?" Tap any other player's line in Défis > Classement (Ligue / Amis) or Profil > Communauté (friends list): « Signaler ce pseudo » (Insultant, Inapproprié, Autre) and « Bloquer ce joueur ».
- "Who handles reports and how fast?" The developer, from a private Firestore collection only the developer can read; offending pseudos are hidden (player shown as « Joueur », forced to rename) or the player is removed, within 24 hours of a report on working days. contact@slapps.dev.
- "How is objectionable content prevented?" Pseudo filter (FR + EN blocklist, leetspeak and accent aware) on the client, and the server rules limit length and characters. No chat, no images, avatars come from in-app items.
- "Account deletion?" Profil > Paramètres > Supprimer mon compte, removes the account and all community data.
- A test account is in the App Review notes (`docs/store/app-store.md`).

## Housekeeping
- Deploy rules after any change: `firebase deploy --only firestore:rules`.
- Blocking is local to the blocker (`profile.blocked`); there is no server-side ban list besides the steps above.
