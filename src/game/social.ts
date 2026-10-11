// Community glue (friends, pseudo, code). Rules in core/social.ts, Firestore in platform/social.ts.
// The player's own doc is cached in MMKV (cuboblocks.social) so Profil shows pseudo + code offline; sign-out
// clears it. Does not import game/account.ts (account.ts calls resetSocial / startSocial / deleteSocialData).
import { useMemo } from 'react';
import { Share } from 'react-native';
import { create } from 'zustand';
import { tr } from '../core/i18n';
import * as C from '../core/social';
import { cuboLookFor, type CuboLook } from '../mascot/looks';
import { mmkv, testMode } from '../platform/kv';
import * as Cloud from '../platform/cloud';
import * as Net from '../platform/social';
import { useGame } from '../state/store';
import { ask } from '../ui/dialog';
import { toast } from '../ui/Toast';

const CACHE_KEY = 'cuboblocks.social';
const SENT_KEY = 'cuboblocks.social.sent'; // what weeks/{week}/scores/{uid} holds after my last push

export interface Me extends Net.PlayerDoc { uid: string }
export interface Friend { uid: string; name: string; code: string; look: CuboLook; label: string; bestClassic: number }
// A friend's line in the rankings: this week's score doc (missing = 0) + the card's all-time Classique best.
export interface BoardRow { uid: string; label: string; look: CuboLook; me: boolean; points: number; best: number; record: number }
interface Board { week: string; at: number; rows: BoardRow[] }
// off: signed out or nothing loaded; loading; ready; error: signed in but no answer and nothing cached.
type Status = 'off' | 'loading' | 'ready' | 'error';
interface State { status: Status; me: Me | null; friends: Friend[]; listing: boolean; board: Board | null; boarding: boolean }

export const useSocial = create<State>(() => ({ status: 'off', me: readCache(), friends: [], listing: false, board: null, boarding: false }));
const set = useSocial.setState;
const get = useSocial.getState;

function readCache(): Me | null {
  const raw = mmkv.get(CACHE_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Me;
    if (v && v.uid && typeof v.name === 'string' && typeof v.code === 'string') return v;
  } catch { /* absent */ }
  return null;
}
function keep(me: Me | null) {
  if (me) mmkv.set(CACHE_KEY, JSON.stringify(me)); else mmkv.remove(CACHE_KEY);
  set({ me });
}

// What the profile wears now, as stored in players/{uid}.look.
const wornLook = (): Net.Look => {
  const { equipped } = useGame.getState().profile;
  return { cubo: equipped.boards, hat: equipped.cubo };
};
export const lookOf = (l: Net.Look) => cuboLookFor(l.cubo, l.hat);
export const myLook = (me: Me) => lookOf(me.look);

const failed = () => tr('Connexion impossible, réessaie plus tard.');
const available = () => !testMode && Cloud.available();

export function resetSocial() {
  mmkv.remove(CACHE_KEY);
  set({ status: 'off', me: null, friends: [], listing: false, board: null, boarding: false });
  mmkv.remove(SENT_KEY);
}

// At launch, after sign-in and when the Communauté screen opens: reads my doc (if any), then the inbox.
let loadingMe: Promise<void> | null = null;
export function loadMe(): Promise<void> {
  if (!available()) return Promise.resolve();
  if (loadingMe) return loadingMe;
  loadingMe = (async () => {
    try {
      const who = await Cloud.user();
      if (!who) { resetSocial(); return; }
      if (get().me && get().me?.uid !== who.uid) resetSocial();
      if (!get().me) set({ status: 'loading' });
      const doc = await Net.getPlayer(who.uid);
      if (!doc) { keep(null); set({ status: 'ready' }); return; }
      const worn = wornLook();
      if (doc.look.cubo !== worn.cubo || doc.look.hat !== worn.hat) {
        doc.look = worn;
        await Net.updatePlayer(who.uid, { look: worn }).catch(() => {});
      }
      keep({ ...doc, uid: who.uid });
      set({ status: 'ready' });
      pushSoon(0); // bestClassic and a tally the last push missed
      await syncInbox(who.uid);
    } catch {
      set({ status: get().me ? 'ready' : 'error' }); // offline: the cached card stays
    } finally {
      loadingMe = null;
    }
  })();
  return loadingMe;
}

export const startSocial = () => { void loadMe(); };

export async function createMe(raw: string): Promise<{ error?: string }> {
  const checked = C.checkName(raw);
  if (!checked.ok) return { error: checked.error };
  try {
    const who = await Cloud.user();
    if (!who) return { error: failed() };
    // Math.random is fine here: a collision only costs a retry (codes/ is checked in the transaction).
    const doc = await Net.createPlayer(who.uid, checked.name, wornLook(), () => C.makeCode(Math.random));
    keep({ ...doc, uid: who.uid });
    set({ status: 'ready' });
    return {};
  } catch { return { error: failed() }; }
}

export async function renameMe(raw: string): Promise<{ error?: string }> {
  const me = get().me;
  if (!me) return { error: failed() };
  const wait = C.renameWait(me.nameChangedAt, Date.now());
  if (wait > 0) return { error: tr`Tu pourras changer de pseudo ${C.waitText(wait)}.` };
  const checked = C.checkName(raw);
  if (!checked.ok) return { error: checked.error };
  if (checked.name === me.name) return {};
  const now = Date.now();
  try {
    await Net.updatePlayer(me.uid, { name: checked.name, nameChangedAt: now });
    keep({ ...me, name: checked.name, nameChangedAt: now });
    return {};
  } catch { return { error: failed() }; }
}

export function shareCode() {
  const me = get().me;
  if (!me) return;
  const code = C.showCode(me.code);
  Share.share({ message: tr`Ajoute-moi sur Cubo Blocks avec mon code ami : ${code}` }).catch(() => {});
}

// ---------- friends ----------

const blockedList = () => useGame.getState().profile.blocked;
function setBlocked(list: string[]) {
  const { profile, setProfile } = useGame.getState();
  setProfile({ ...profile, blocked: list.length ? list : undefined });
}

// Friends who added me since the last time: into my list, except blocked players (dropped, and off their list).
async function syncInbox(uid: string) {
  const ids = await Net.inboxIds(uid);
  if (!ids.length) return;
  const list = blockedList();
  const refuse = ids.filter((id) => C.isBlocked(list, id));
  const room = Math.max(0, C.MAX_FRIENDS - (await Net.friendIds(uid)).length);
  const take = ids.filter((id) => !C.isBlocked(list, id)).slice(0, room);
  await Net.moveInbox(uid, take, refuse);
}

export async function refreshFriends(quiet = false): Promise<boolean> {
  const me = get().me;
  if (!me || !available()) return false;
  set({ listing: true });
  try {
    await syncInbox(me.uid);
    const ids = await Net.friendIds(me.uid);
    const docs = await Net.getPlayers(ids);
    const people: (C.Person & { look: Net.Look; hidden: boolean; best: number })[] = [];
    for (const id of ids) {
      const d = docs[id];
      if (d === undefined) continue; // unreadable now: skipped, not deleted
      if (d === null) { void Net.dropFriend(me.uid, id).catch(() => {}); continue; } // account deleted
      if (C.isBlocked(blockedList(), id)) continue;
      people.push({ uid: id, name: d.hidden ? tr('Joueur') : d.name, code: d.code, look: d.look, hidden: !!d.hidden, best: d.bestClassic || 0 });
    }
    const names = C.labels([{ uid: me.uid, name: me.name, code: me.code }, ...people]);
    const friends = people.map((p): Friend => ({ uid: p.uid, name: p.name, code: p.code, look: lookOf(p.look), label: names[p.uid], bestClassic: p.best }));
    friends.sort((a, b) => a.label.localeCompare(b.label));
    set({ friends });
    return true;
  } catch {
    if (!quiet) toast(failed());
    return false;
  } finally {
    set({ listing: false });
  }
}

export async function addByCode(raw: string): Promise<{ error?: string }> {
  const me = get().me;
  if (!me) return { error: failed() };
  const code = C.parseCode(raw);
  if (!code) return { error: tr('Ce code n’est pas valide.') };
  if (code === me.code) return { error: tr('C’est ton propre code.') };
  try {
    const uid = await Net.uidOfCode(code);
    const other = uid ? await Net.getPlayer(uid) : null;
    if (!uid || !other) return { error: tr('Aucun joueur avec ce code.') };
    const ids = await Net.friendIds(me.uid);
    if (ids.includes(uid)) return { error: tr('Vous êtes déjà amis.') };
    if (ids.length >= C.MAX_FRIENDS) return { error: tr`Tu as déjà ${C.MAX_FRIENDS} amis.` };
    // Adding a blocked player by his code is a choice: he is unblocked.
    if (C.isBlocked(blockedList(), uid)) setBlocked(C.withoutBlocked(blockedList(), uid));
    await Net.addFriend(me.uid, uid);
    toast(tr`${other.hidden ? tr('Joueur') : other.name} est ton ami.`);
    await refreshFriends();
    return {};
  } catch { return { error: failed() }; }
}

export async function removeFriend(f: Friend) {
  const me = get().me;
  if (!me) return;
  const sure = await ask({ title: tr('Retirer cet ami ?'), text: tr`${f.label} ne sera plus dans ta liste d’amis.`, ok: tr('Retirer'), danger: true });
  if (!sure) return;
  try {
    await Net.dropFriend(me.uid, f.uid);
    set({ friends: get().friends.filter((x) => x.uid !== f.uid) });
  } catch { toast(failed()); }
}

export async function blockFriend(f: Friend) {
  const me = get().me;
  if (!me) return;
  const sure = await ask({
    title: tr('Bloquer ce joueur ?'),
    text: tr`${f.label} ne pourra plus t’ajouter. Pour le débloquer, ajoute à nouveau son code.`,
    ok: tr('Bloquer'),
    danger: true,
  });
  if (!sure) return;
  setBlocked(C.withBlocked(blockedList(), f.uid)); // first: the block holds even if the network fails
  set({ friends: get().friends.filter((x) => x.uid !== f.uid) });
  await Net.dropFriend(me.uid, f.uid).catch(() => toast(failed()));
}

// ---------- weekly score ----------

interface Sent { uid: string; week: string; points: number; best: number; runs: number; at: number }
function readSent(uid: string, week: string): Sent {
  try {
    const v = JSON.parse(mmkv.get(SENT_KEY) || 'null') as Sent | null;
    if (v && v.uid === uid && v.week === week) return v;
  } catch { /* absent */ }
  return { uid, week, points: 0, best: 0, runs: 0, at: 0 };
}

// A counted run just settled (game/run.ts): the tally goes up 3 s later, like the cloud save.
export const weekCounted = () => pushSoon(3000);

let pushTimer: ReturnType<typeof setTimeout> | null = null;
function pushSoon(ms: number) {
  if (!get().me || !available()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; void pushNow(); }, ms);
}
// The app goes to the background: a push waiting for its 3 s goes now.
export function flushWeek() {
  if (!pushTimer) return;
  clearTimeout(pushTimer);
  pushTimer = null;
  void pushNow();
}

// Absolute values from the profile's tally, never lower than what was already sent this week. Needs a pseudo.
async function pushNow() {
  const me = get().me;
  if (!me || !available()) return;
  const { profile, saved } = useGame.getState();
  const now = Date.now();
  const w = C.weekOf(profile.week, now);
  const sent = readSent(me.uid, w.id);
  try {
    const classic = Math.min(C.MAX_RECORD, Math.max(saved.bests.classic || 0, w.best, me.bestClassic || 0));
    if (classic > (me.bestClassic || 0)) {
      await Net.updatePlayer(me.uid, { bestClassic: classic });
      keep({ ...me, bestClassic: classic });
    }
    if (w.runs <= 0 || (w.points <= sent.points && w.best <= sent.best && w.runs <= sent.runs)) return;
    const wait = sent.at + C.PUSH_GAP - now; // the rules want 10 s between two writes
    if (wait > 0) { pushSoon(wait + 500); return; }
    // The rules allow +200000 points a write (a long offline stretch is sent in steps); best never passes points.
    const points = Math.min(Math.max(w.points, sent.points), sent.points + C.PUSH_STEP);
    const tally = { points, best: Math.min(points, Math.max(w.best, sent.best)), runs: Math.max(w.runs, sent.runs) };
    await Net.putWeekScore(me.uid, w.id, me.name, wornLook(), tally, now);
    mmkv.set(SENT_KEY, JSON.stringify({ uid: me.uid, week: w.id, ...tally, at: now }));
    if (points < w.points) pushSoon(C.PUSH_GAP + 500);
  } catch { /* offline or refused: the next counted run, launch or return to the background tries again */ }
}

// ---------- friends ranking ----------

const BOARD_TTL = 60000;
// Me + my friends for this week. Cached 60 s; `force` (pull-to-refresh) skips the wait.
export async function refreshBoard(force = false) {
  const me = get().me;
  if (!me || !available() || get().boarding) return;
  const now = Date.now();
  const week = C.weekId(now);
  const had = get().board;
  if (!force && had && had.week === week && now - had.at < BOARD_TTL) return;
  set({ boarding: true });
  try {
    await refreshFriends(true);
    const friends = get().friends;
    const scores = await Net.getWeekScores(week, friends.map((f) => f.uid));
    const old = had && had.week === week ? had.rows : [];
    const rows: BoardRow[] = friends.map((f) => {
      const s = scores[f.uid] || old.find((r) => r.uid === f.uid); // an unreadable doc keeps its last value
      return { uid: f.uid, label: f.label, look: f.look, me: false, points: s ? s.points : 0, best: s ? s.best : 0, record: f.bestClassic };
    });
    set({ board: { week, at: Date.now(), rows } });
  } catch { /* offline: the last board stays */ } finally {
    set({ boarding: false });
  }
}

// The board with my line from the local data (always fresh), friends from the cache.
export function useBoardRows(): BoardRow[] | null {
  const me = useSocial((s) => s.me);
  const board = useSocial((s) => s.board);
  const profile = useGame((s) => s.profile);
  const classic = useGame((s) => s.saved.bests.classic || 0);
  return useMemo(() => {
    if (!me || !board) return null;
    const w = C.weekOf(profile.week, Date.now());
    const mine: BoardRow = { uid: me.uid, label: me.name, look: lookOf(me.look), me: true, points: w.points, best: w.best, record: Math.max(classic, me.bestClassic || 0) };
    return [mine, ...board.rows];
  }, [me, board, profile.week, classic]);
}

// Account deletion (called by cloud.deleteAccount while still signed in). Failures stop the deletion.
export async function deleteSocialData(uid: string) {
  const now = Date.now();
  await Net.deleteAll(uid, [C.weekId(now), C.weekId(now - 7 * 86400000)]);
  resetSocial();
}
