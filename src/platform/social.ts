// Firestore side of the community (friends, pseudo, code). No game logic: core/social.ts decides,
// game/social.ts drives. Paths and rules: docs/features/social.md, firestore.rules.
// players/{uid}, codes/{code}, players/{uid}/friends/{fid}, inbox/{uid}/adds/{fid}, weeks/{week}/scores/{uid},
// weeks/{week}/leagues/{tier} (the group being filled).
import { load } from './cloud';

export interface Look { cubo: string; hat: string } // boards theme key + wardrobe head piece: cuboLookFor(cubo, hat)
export interface PlayerDoc { name: string; code: string; look: Look; createdAt: number; nameChangedAt: number; bestClassic?: number; league?: number; leagueWeek?: string; hidden?: boolean }

function coded(code: string) {
  const e = new Error(code) as Error & { code: string };
  e.code = code;
  return e;
}

const store = async () => {
  const fs = await import('firebase/firestore');
  const { db } = await load();
  return { fs, db };
};

function toPlayer(data: Record<string, unknown> | undefined): PlayerDoc | null {
  if (!data || typeof data.name !== 'string' || typeof data.code !== 'string') return null;
  const look = (data.look || {}) as Partial<Look>;
  return {
    name: data.name, code: data.code, createdAt: Number(data.createdAt) || 0, nameChangedAt: Number(data.nameChangedAt) || 0, bestClassic: Number(data.bestClassic) || 0,
    look: { cubo: typeof look.cubo === 'string' ? look.cubo : 'toy', hat: typeof look.hat === 'string' ? look.hat : 'auto' },
    league: Number(data.league) || 0, leagueWeek: typeof data.leagueWeek === 'string' ? data.leagueWeek : '',
    hidden: data.hidden === true,
  };
}

export async function getPlayer(uid: string): Promise<PlayerDoc | null> {
  const { fs, db } = await store();
  const snap = await fs.getDoc(fs.doc(db, 'players', uid));
  return snap.exists() ? toPlayer(snap.data()) : null;
}

export async function getPlayers(uids: string[]): Promise<Record<string, PlayerDoc | null>> {
  const got = await Promise.all(uids.map((u) => getPlayer(u).catch(() => undefined)));
  const out: Record<string, PlayerDoc | null> = {};
  uids.forEach((u, i) => { if (got[i] !== undefined) out[u] = got[i] as PlayerDoc | null; }); // failed reads stay unknown
  return out;
}

// Creates the player once: the code is reserved in codes/ in the same transaction, retried with a new code on a
// collision. Returns the existing doc when the player already has one.
export async function createPlayer(uid: string, name: string, look: Look, newCode: () => string): Promise<PlayerDoc> {
  const { fs, db } = await store();
  const mine = fs.doc(db, 'players', uid);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = newCode();
    const doc: PlayerDoc = { name, code, look, createdAt: Date.now(), nameChangedAt: 0 };
    try {
      const made = await fs.runTransaction(db, async (tx) => {
        const had = await tx.get(mine);
        if (had.exists()) return toPlayer(had.data());
        const taken = await tx.get(fs.doc(db, 'codes', code));
        if (taken.exists()) throw coded('taken');
        tx.set(fs.doc(db, 'codes', code), { uid });
        tx.set(mine, { name: doc.name, code, look: doc.look, createdAt: doc.createdAt, nameChangedAt: 0 });
        return doc;
      });
      if (made) return made;
    } catch (err) {
      if ((err as { code?: string })?.code !== 'taken') throw err;
    }
  }
  throw coded('no-code');
}

export async function updatePlayer(uid: string, patch: Partial<Pick<PlayerDoc, 'name' | 'look' | 'nameChangedAt' | 'bestClassic' | 'league' | 'leagueWeek'>>) {
  const { fs, db } = await store();
  await fs.updateDoc(fs.doc(db, 'players', uid), patch);
}

export async function uidOfCode(code: string): Promise<string | null> {
  const { fs, db } = await store();
  const snap = await fs.getDoc(fs.doc(db, 'codes', code));
  const uid = snap.exists() ? snap.data().uid : null;
  return typeof uid === 'string' ? uid : null;
}

export async function friendIds(uid: string): Promise<string[]> {
  const { fs, db } = await store();
  const snap = await fs.getDocs(fs.collection(db, 'players', uid, 'friends'));
  return snap.docs.map((d) => d.id);
}

// Mutual at once: my list gets them, their inbox gets me (their app moves it into their list).
export async function addFriend(me: string, fid: string) {
  const { fs, db } = await store();
  const batch = fs.writeBatch(db);
  batch.set(fs.doc(db, 'players', me, 'friends', fid), { since: Date.now() });
  batch.set(fs.doc(db, 'inbox', fid, 'adds', me), { at: Date.now() });
  await batch.commit();
}

// Both lists. The other side's delete is allowed by the rules for the friend himself; if it fails it is not an error.
export async function dropFriend(me: string, fid: string) {
  const { fs, db } = await store();
  await fs.deleteDoc(fs.doc(db, 'players', me, 'friends', fid));
  await fs.deleteDoc(fs.doc(db, 'players', fid, 'friends', me)).catch(() => {});
  await fs.deleteDoc(fs.doc(db, 'inbox', me, 'adds', fid)).catch(() => {});
}

export async function inboxIds(me: string): Promise<string[]> {
  const { fs, db } = await store();
  const snap = await fs.getDocs(fs.collection(db, 'inbox', me, 'adds'));
  return snap.docs.map((d) => d.id);
}

// Accepts the inbox entries `take` (into my friends) and drops `refuse`d ones (a blocked player: also off his list).
export async function moveInbox(me: string, take: string[], refuse: string[]) {
  const { fs, db } = await store();
  const batch = fs.writeBatch(db);
  for (const fid of take) {
    batch.set(fs.doc(db, 'players', me, 'friends', fid), { since: Date.now() });
    batch.delete(fs.doc(db, 'inbox', me, 'adds', fid));
  }
  for (const fid of refuse) batch.delete(fs.doc(db, 'inbox', me, 'adds', fid));
  await batch.commit();
  for (const fid of refuse) await fs.deleteDoc(fs.doc(db, 'players', fid, 'friends', me)).catch(() => {});
}

// ---------- weekly scores: weeks/{week}/scores/{uid} ----------

export interface WeekDoc { points: number; best: number; runs: number; at: number }

// Absolute values from the local tally; the rules only let points / best / runs grow, 10 s apart.
// `league` (group + tier) rides along from the week's first push on; the rules fix it once set.
export async function putWeekScore(uid: string, week: string, name: string, look: Look, tally: { points: number; best: number; runs: number }, at: number, league?: { group: string; tier: number }) {
  const { fs, db } = await store();
  await fs.setDoc(fs.doc(db, 'weeks', week, 'scores', uid), { name, look, points: tally.points, best: tally.best, runs: tally.runs, at, ...(league || {}) });
}

// A missing doc = 0 this week; an unreadable one stays out of the answer (unknown).
export async function getWeekScores(week: string, uids: string[]): Promise<Record<string, WeekDoc>> {
  const { fs, db } = await store();
  const got = await Promise.all(uids.map((u) => fs.getDoc(fs.doc(db, 'weeks', week, 'scores', u)).catch(() => undefined)));
  const out: Record<string, WeekDoc> = {};
  uids.forEach((u, i) => {
    const snap = got[i];
    if (snap === undefined) return;
    const d = snap.exists() ? snap.data() : {};
    out[u] = { points: Number(d.points) || 0, best: Number(d.best) || 0, runs: Number(d.runs) || 0, at: Number(d.at) || 0 };
  });
  return out;
}

// ---------- leagues: weeks/{week}/leagues/{tier} pointer, groups are the `group` field of the score docs ----------

// The group I already hold this week (a restored profile forgot it), else a seat in the group being filled: a
// transaction on the pointer { open, size } takes a seat (size < 30) or opens the next group.
export async function joinGroup(uid: string, week: string, tier: number, limit: number): Promise<{ group: string; tier: number }> {
  const { fs, db } = await store();
  const own = await fs.getDoc(fs.doc(db, 'weeks', week, 'scores', uid));
  const g = own.exists() ? own.data().group : null;
  if (typeof g === 'string' && typeof own.data()?.tier === 'number') return { group: g, tier: own.data()?.tier };
  const ref = fs.doc(db, 'weeks', week, 'leagues', String(tier));
  const open = await fs.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? snap.data() : null;
    if (!cur) { tx.set(ref, { open: 1, size: 1 }); return 1; }
    const n = Number(cur.open) || 1;
    const size = Number(cur.size) || 0;
    if (size < limit) { tx.update(ref, { open: n, size: size + 1 }); return n; }
    tx.update(ref, { open: n + 1, size: 1 });
    return n + 1;
  });
  return { group: `${tier}-${open}`, tier };
}

// One query: the score docs of a group (at most `limit`).
export async function getGroup(week: string, group: string, limit: number): Promise<{ uid: string; name: string; look: Look; points: number; best: number }[]> {
  const { fs, db } = await store();
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'weeks', week, 'scores'), fs.where('group', '==', group), fs.limit(limit)));
  return snap.docs.map((d) => {
    const x = d.data();
    const look = (x.look || {}) as Partial<Look>;
    return {
      uid: d.id, name: typeof x.name === 'string' ? x.name : '', points: Number(x.points) || 0, best: Number(x.best) || 0,
      look: { cubo: typeof look.cubo === 'string' ? look.cubo : 'toy', hat: typeof look.hat === 'string' ? look.hat : 'auto' },
    };
  });
}

// Account deletion: friends, inbox, the code, the player. Called while still signed in.
export async function deleteAll(uid: string, weeks: string[] = []) {
  const { fs, db } = await store();
  for (const w of weeks) await fs.deleteDoc(fs.doc(db, 'weeks', w, 'scores', uid)).catch(() => {});
  const code = (await getPlayer(uid).catch(() => null))?.code;
  for (const path of [['players', uid, 'friends'], ['inbox', uid, 'adds']]) {
    const snap = await fs.getDocs(fs.collection(db, path[0], path[1], path[2]));
    await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref)));
  }
  if (code) await fs.deleteDoc(fs.doc(db, 'codes', code)).catch(() => {});
  await fs.deleteDoc(fs.doc(db, 'players', uid));
}
