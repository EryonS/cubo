// Firestore side of the community (friends, pseudo, code). No game logic: core/social.ts decides,
// game/social.ts drives. Paths and rules: docs/features/social.md, firestore.rules.
// players/{uid}, codes/{code}, players/{uid}/friends/{fid}, inbox/{uid}/adds/{fid}.
import { load } from './cloud';

export interface Look { cubo: string; hat: string } // boards theme key + wardrobe head piece: cuboLookFor(cubo, hat)
export interface PlayerDoc { name: string; code: string; look: Look; createdAt: number; nameChangedAt: number; hidden?: boolean }

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
    name: data.name, code: data.code, createdAt: Number(data.createdAt) || 0, nameChangedAt: Number(data.nameChangedAt) || 0,
    look: { cubo: typeof look.cubo === 'string' ? look.cubo : 'toy', hat: typeof look.hat === 'string' ? look.hat : 'auto' },
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

export async function updatePlayer(uid: string, patch: Partial<Pick<PlayerDoc, 'name' | 'look' | 'nameChangedAt'>>) {
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

// Account deletion: friends, inbox, the code, the player. Called while still signed in.
export async function deleteAll(uid: string) {
  const { fs, db } = await store();
  const code = (await getPlayer(uid).catch(() => null))?.code;
  for (const path of [['players', uid, 'friends'], ['inbox', uid, 'adds']]) {
    const snap = await fs.getDocs(fs.collection(db, path[0], path[1], path[2]));
    await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref)));
  }
  if (code) await fs.deleteDoc(fs.doc(db, 'codes', code)).catch(() => {});
  await fs.deleteDoc(fs.doc(db, 'players', uid));
}
