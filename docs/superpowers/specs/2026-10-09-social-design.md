# Friends, weekly leagues and friend rankings — design

Date: 2026-10-09. Status: draft, to review with the owner before any code.

## Goal
Give Cubo Blocks a light community layer: a player has a **pseudo** and a **friend code**, adds friends with
that code, and competes every week in a **league** (strangers of about the same level) and in a **friends
ranking**. Rewards are coins and promotion to the next league. Nothing is required to play: the game works
offline and without an account as today.

## Owner feedback (2026-10-09)
- « Ajouter qqn en ami avec un code ami, ainsi qu'un surnom, pour créer des users et un aspect communauté. »
- « Un classement hebdomadaire des meilleurs scores avec des récompenses à la clé, ou des ligues, de ceux qui marquent le plus de points. »
- « Des classements entre amis aussi, pour se tirer la bourre, comme le classement hebdo mais entre potes. »

## Decisions proposed (to confirm)
1. **Backend: Firebase only, Spark plan, no Cloud Functions.** Cloud Functions need the paid Blaze plan; every
   rule below works with Firestore rules + client logic. Cheating stays possible (client-reported scores) and is
   bounded by rules; acceptable for a casual game with coin rewards only.
2. **Identity: Firebase anonymous auth** the first time a player opens the community features, so nobody needs a
   Google / Apple account to have friends. A player who already uses the cloud save keeps their uid. Signing in
   to Google / Apple later **links** the anonymous account (`linkWithCredential`), so friends and league follow.
   An anonymous player who reinstalls loses their pseudo and friends (said in the UI, with a nudge to link an
   account).
3. **Opt-in.** Profil gets a "Communauté" entry; first open asks for a pseudo (and shows the privacy line). No
   pseudo = nothing is sent, no league.
4. **Pseudo: free text, filtered** (3-16 characters, letters / digits / space / `-_`, a FR + EN word blocklist,
   unique not required: display is `Pseudo#K7Q` with the code's first 3 characters when two collide).
   Apple guideline 1.2 (user-generated content) then requires: a filter, a way to **report** a pseudo, a way to
   **block** a player, and the owner acting on reports. See Moderation.
   Alternative to decide: **generated pseudos** (adjective + animal + number, "Renard Malin 42", picked from 3
   proposals, can reroll): zero moderation, kid-safe, store-safe. Owner asked for a « surnom »; free text is the
   default here, generated names are the fallback if moderation feels too heavy.
5. **Friend code**: 6 characters from an unambiguous alphabet (no 0/O/1/I), shown as `K7Q-4MP`, shareable with
   the share sheet. Adding a code makes the friendship **mutual at once** (no request to accept): knowing the code
   means the other player shared it. Remove and block are always possible. Max 50 friends.
6. **What the week counts: points.** Owner: « ceux qui marquent le plus de points ». The weekly total is the sum
   of the scores of every finished run in **Classique, Chrono and Mondes** (not Chill: it does not end on its own
   and would be farmed; not Aventure / daily / events / puzzles: their scores are not comparable). Weeks run
   Monday 00:00 to Sunday 23:59, **Paris time** for everyone (one shared week, simpler than per-device weeks).
   Alternative: best single Classique score of the week (skill over time spent). Leagues work better with a
   cumulative total; the friends ranking shows both (week total, and all-time best Classique).
7. **Leagues** (Duolingo-like): Bronze, Argent, Or, Saphir, Rubis, Diamant. Each week a player who scored at
   least once is put in a **group of up to 30** of their league. End of week: top 5 go up, bottom 5 go down
   (none down from Bronze, none up from Diamant), the rest stay. A week without any run keeps the league.
   Rewards (coins, in line with the lowered economy): 1st 60, 2nd 40, 3rd 30, 4th-10th 15, promotion +20.
   A sticker page "Ligues" later (first promotion, reach Or, reach Diamant, win a group).
8. **Friends ranking**: the same weekly total among friends + me, plus a tab for all-time best Classique.
   No rewards there (it is for bragging), but a toast / Cubo line when a friend passes you.

## Data model (Firestore)
| Path | Content | Rules |
|---|---|---|
| `players/{uid}` | `{ name, code, look: { cubo, hat, color }, league, createdAt, hidden? }` | read: signed in; write own doc only; `name` matches the pattern; `league` only moves by the claim below; `hidden` owner-only (console) |
| `codes/{code}` | `{ uid }` | read: signed in; create only, `uid == auth.uid`, never updated |
| `players/{uid}/friends/{fid}` | `{ since }` | read / write: owner only |
| `inbox/{uid}/adds/{fid}` | `{ at }` | create: `fid == auth.uid`; read / delete: `uid` only. The added player's app moves these into its own `friends` at launch (mutual friendship without server code) |
| `weeks/{week}/groups/{league}-{n}` | `{ size }` | joined by transaction: first group of the league with `size < 30`, else a new one |
| `weeks/{week}/groups/{g}/scores/{uid}` | `{ name, look, points, best, runs, at }` | read: signed in; write own; `points` only grows, by at most a cap per write (e.g. 60 000), writes at least 10 s apart (`at` checked against `request.time`) |
| `weeks/{week}/players/{uid}` | `{ group }` | where a player is this week (friends ranking reads these) |
| `reports/{id}` | `{ from, target, reason, at }` | create only |

- `week` = ISO week id `2026-W41`. The client pushes its weekly score with the same debounce as the cloud save
  (after a finished counted run, 3 s later, or at background). Offline runs are queued and sent later in the
  same week only.
- End of week, **claimed by the client**: on the first launch of a new week, the app reads its last week's
  group, computes its rank, pays the reward into the profile (`profile.leagueClaim = week`, once), moves its
  league up / down and writes it to `players/{uid}`. A rule checks the move is at most one step.
- Reads per player per day stay small: one group (≤ 30 docs), friends' `weeks/{week}/players` + score docs
  (≤ 2 × 50). Spark gives 50k reads / 20k writes a day: fine for the first thousands of players.

## Moderation (needed for free-text pseudos)
- Blocklist check on the client and a simple regex in the rules (length, characters).
- Long-press / "…" on a ranking row: **Signaler ce pseudo** (writes `reports/`), **Bloquer** (local hide list in
  the profile, removes the friendship if any).
- Owner side: Firebase console, set `hidden: true` on a player → their rows show « Joueur » and they are asked to
  pick a new pseudo. A short `docs/` runbook.
- App Store review notes mention the report / block flow.

## Screens
- **Défis tab** gets a "Ligue de la semaine" card at the top (league badge, my rank, time left, top 3 of my
  group), opening the full group ranking (30 rows, up / down zones colored). Friends ranking is a second segment
  of that screen (`Segmented`: Ligue / Amis).
- **Profil tab**: my pseudo + Cubo, my friend code (copy / share), "Amis" list (add by code, remove, block).
- End of a counted run: one line on the game over card « +4 210 pts pour ta ligue · 7e ».
- New week: a sheet with last week's result, reward and promotion (like the level end card).

## Privacy and stores
- New data: anonymous user id, pseudo, scores, friend links. Update the privacy policy, App Store privacy labels
  (User ID, Gameplay content, linked to the user), Play Data safety, and account deletion (delete `players/`,
  `codes/`, friends, inbox, this week's score docs).
- Age rating questionnaire: user-generated content = yes (pseudos), unrestricted communication = no.

## Milestones
1. Identity: anonymous auth, pseudo sheet + filter, friend code, Communauté entry in Profil. Rules + tests.
2. Friends: add by code, inbox sync, list, remove, block, share code.
3. Weekly score push + friends ranking (week total, all-time best).
4. Leagues: groups, ranking screen, end-of-week claim, rewards, promotion sheet.
5. Moderation (report, hidden), privacy / store updates, account deletion.
Pure rules (week id, league moves, rewards, pseudo validation, ranking with ties) in `src/core/social.ts`
with tests; Firebase calls in `src/platform/social.ts`; app glue in `src/game/social.ts`.

## Open questions for the owner
1. Free-text pseudo with report / block (as asked) or generated pseudos (no moderation)?
2. Week metric: total points (Classique + Chrono + Mondes), or best single Classique score?
3. Reward amounts and league names OK?
4. Where: Défis tab (proposed) or a new 5th tab "Amis"?
5. Leagues need enough active players to fill groups; until then, should the league be a single global weekly
   ranking (top 100) and switch to groups later?
