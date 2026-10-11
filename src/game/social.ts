// Community glue (friends, pseudo, code). Rules in core/social.ts, Firestore in platform/social.ts.
// The player's own doc is cached in MMKV (cuboblocks.social) so Profil shows pseudo + code offline; sign-out
// clears it. Does not import game/account.ts (account.ts calls resetSocial / startSocial / deleteSocialData).
import { useMemo } from 'react';
import { Share } from 'react-native';
import { create } from 'zustand';
import { tr } from '../core/i18n';
import * as G from '../core/league';
import * as C from '../core/social';
import * as T from '../core/titles';
import { cuboLookFor, type CuboLook } from '../mascot/looks';
import { now as clock } from '../platform/clock';
import { mmkv, testMode } from '../platform/kv';
import * as Cloud from '../platform/cloud';
import * as Net from '../platform/social';
import { useGame } from '../state/store';
import { ask } from '../ui/dialog';
import { toast } from '../ui/Toast';

const CACHE_KEY = 'cuboblocks.social';
const REPORT_KEY = 'cuboblocks.social.report'; // a league result not shown yet
const SENT_KEY = 'cuboblocks.social.sent'; // what weeks/{week}/scores/{uid} holds after my last push
const REPORTED_KEY = 'cuboblocks.social.reported'; // uids reported from this device (one report each); kept at sign-out, dropped with the account

export interface Me extends Net.PlayerDoc { uid: string }
// title / mood: ids of the fixed lists (core/titles.ts), '' = none.
export interface Friend { uid: string; name: string; code: string; look: CuboLook; label: string; bestClassic: number; title: string; mood: string }
// A friend's line in the rankings: this week's score doc (missing = 0) + the card's all-time Classique best.
export interface BoardRow { uid: string; name: string; label: string; look: CuboLook; title: string; mood: string; me: boolean; points: number; best: number; record: number }
interface Board { week: string; at: number; rows: BoardRow[] }
// A line of my league group: the week's score doc (name = the raw pseudo, label = shown with #code on a collision).
// masked: a blocked player ("Joueur masqué", neutral Cubo); the row stays so the ranks are the claim's.
export interface LeagueRow { uid: string; name: string; label: string; look: CuboLook; title: string; mood: string; me: boolean; points: number; best: number; masked: boolean }
// hidden: the owner's `hidden` strings of the group's players cards (read with the board, refreshed every 10 min).
interface LeagueGroup { week: string; group: string; at: number; rows: { uid: string; name: string; look: Net.Look; points: number; best: number }[]; hidden: Record<string, string>; tags: Record<string, { title: string; mood: string }>; hiddenAt: number }
// off: signed out or nothing loaded; loading; ready; error: signed in but no answer and nothing cached.
type Status = 'off' | 'loading' | 'ready' | 'error';
interface State { status: Status; me: Me | null; friends: Friend[]; listing: boolean; board: Board | null; boarding: boolean; group: LeagueGroup | null; grouping: boolean; report: G.LeagueReport | null }

export const useSocial = create<State>(() => ({ status: 'off', me: readCache(), friends: [], listing: false, board: null, boarding: false, group: null, grouping: false, report: readReport() }));
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
function readReport(): G.LeagueReport | null {
  try { return JSON.parse(mmkv.get(REPORT_KEY) || 'null') as G.LeagueReport | null; } catch { return null; }
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
  set({ status: 'off', me: null, friends: [], listing: false, board: null, boarding: false, group: null, grouping: false, report: null });
  mmkv.remove(SENT_KEY);
  mmkv.remove(REPORT_KEY);
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
      void pushStatus();
      void claimLeague(); // a finished week: pay it before anything else
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
    void pushStatus();
    return {};
  } catch { return { error: failed() }; }
}

export async function renameMe(raw: string): Promise<{ error?: string }> {
  const me = get().me;
  if (!me) return { error: failed() };
  const wait = flagged(me) ? 0 : C.renameWait(me.nameChangedAt, Date.now()); // a reported pseudo may always be replaced
  if (wait > 0) return { error: tr`Tu pourras changer de pseudo ${C.waitText(wait)}.` };
  const checked = C.checkName(raw);
  if (!checked.ok) return { error: checked.error };
  if (checked.name === me.name) return {};
  const now = Date.now();
  try {
    await Net.updatePlayer(me.uid, { name: checked.name, nameChangedAt: now });
    keep({ ...me, name: checked.name, nameChangedAt: now });
    void Net.renameWeekScore(me.uid, C.weekId(clock()), checked.name).catch(() => {}); // no score doc yet, or < 10 s since the last push: the next push carries the name
    return {};
  } catch { return { error: failed() }; }
}

// The owner hid my current pseudo: the app asks for a new one (Communauté, Défis).
export const flagged = (me: Me | null) => !!me && C.isHidden(me.name, me.hidden);

export function shareCode() {
  const me = get().me;
  if (!me) return;
  const code = C.showCode(me.code);
  Share.share({ message: tr`Ajoute-moi sur Cubo Blocks avec mon code ami : ${code}` }).catch(() => {});
}

// ---------- title and mood ----------

// What the profile shows ('' = none; an id not in the lists counts as none).
export const mineTitle = (p: { title?: string }) => (T.validTitle(p.title) ? p.title : '');
export const mineMood = (p: { mood?: string }) => (T.validMood(p.mood) ? p.mood : '');

// Mirrors profile.title / profile.mood on players/{uid} when they differ (a pick, a cloud save from another device).
// Offline or refused: silent, the next launch / return to the foreground tries again.
async function pushStatus() {
  const me = get().me;
  if (!me || !available()) return;
  const { profile } = useGame.getState();
  const title = mineTitle(profile);
  const mood = mineMood(profile);
  if ((me.title || '') === title && (me.mood || '') === mood) return;
  try {
    await Net.updatePlayer(me.uid, { title, mood });
    keep({ ...(get().me ?? me), title, mood });
  } catch { /* later */ }
}

// The player picked a title / mood ('' = none): the profile first (it follows the account), then the card.
export function setMyStatus(kind: 'title' | 'mood', id: string) {
  const { profile, setProfile } = useGame.getState();
  setProfile({ ...profile, [kind]: id || undefined });
  void pushStatus();
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
    const people: (C.Person & { look: Net.Look; hidden: boolean; best: number; title: string; mood: string })[] = [];
    for (const id of ids) {
      const d = docs[id];
      if (d === undefined) continue; // unreadable now: skipped, not deleted
      if (d === null) { void Net.dropFriend(me.uid, id).catch(() => {}); continue; } // account deleted
      if (C.isBlocked(blockedList(), id)) continue;
      people.push({ uid: id, name: C.isHidden(d.name, d.hidden) ? tr('Joueur') : d.name, code: d.code, look: d.look, hidden: C.isHidden(d.name, d.hidden), best: d.bestClassic || 0, title: C.isHidden(d.name, d.hidden) ? '' : d.title || '', mood: C.isHidden(d.name, d.hidden) ? '' : d.mood || '' });
    }
    const names = C.labels([{ uid: me.uid, name: me.name, code: me.code }, ...people]);
    const friends = people.map((p): Friend => ({ uid: p.uid, name: p.name, code: p.code, look: lookOf(p.look), label: names[p.uid], bestClassic: p.best, title: p.title, mood: p.mood }));
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
    toast(tr`${C.isHidden(other.name, other.hidden) ? tr('Joueur') : other.name} est ton ami.`);
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

// A friend, a league rival or a friends-board line: the block hides him everywhere and drops the friendship if any.
export async function blockPlayer(uid: string, label: string) {
  const me = get().me;
  if (!me || uid === me.uid) return;
  const sure = await ask({
    title: tr('Bloquer ce joueur ?'),
    text: tr`${label} ne pourra plus t’ajouter. Pour le débloquer, ajoute à nouveau son code.`,
    ok: tr('Bloquer'),
    danger: true,
  });
  if (!sure) return;
  setBlocked(C.withBlocked(blockedList(), uid)); // first: the block holds even if the network fails
  set({ friends: get().friends.filter((x) => x.uid !== uid) });
  await Net.dropFriend(me.uid, uid).catch(() => toast(failed()));
}
export const blockFriend = (f: Friend) => blockPlayer(f.uid, f.label);

// ---------- reports ----------

const reportedSet = (): string[] => {
  try { const v = JSON.parse(mmkv.get(REPORTED_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const wasReported = (uid: string) => reportedSet().includes(uid);

// reports/{id}: who, whom, the pseudo as it was shown, why. One per target per device.
export async function reportPlayer(uid: string, name: string, reason: C.ReportReason) {
  const me = get().me;
  if (!me || uid === me.uid) return;
  if (wasReported(uid)) { toast(tr('Tu l’as déjà signalé, merci.')); return; }
  try {
    await Net.sendReport(me.uid, uid, name.slice(0, 32), reason);
    mmkv.set(REPORTED_KEY, JSON.stringify([...reportedSet(), uid].slice(-500)));
    toast(tr('Merci, on va regarder.'));
  } catch { toast(failed()); }
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
let pushing = false;
async function pushNow() {
  const me = get().me;
  if (!me || !available()) return;
  if (pushing) { pushSoon(2000); return; } // one push at a time: two joins would take two seats
  pushing = true;
  try { await push(me); } finally { pushing = false; }
}

async function push(me: Me) {
  const { profile, saved } = useGame.getState();
  const now = Date.now(); // the server's clock rules (`at`); the week itself follows the game clock
  const w = C.weekOf(profile.week, clock());
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
    const league = await leagueFor(me, w.id);
    if (!league) return; // a finished week is still to claim (offline): no join, try again later
    await Net.putWeekScore(me.uid, w.id, me.name, wornLook(), tally, now, league);
    mmkv.set(SENT_KEY, JSON.stringify({ uid: me.uid, week: w.id, ...tally, at: now }));
    if (points < w.points) pushSoon(C.PUSH_GAP + 500);
  } catch { /* offline or refused: the next counted run, launch or return to the background tries again */ }
}

// ---------- leagues ----------

const GROUP_TTL = 60000;
const HIDDEN_TTL = 600000;

// The group of this week: the one in the profile, else claim the finished week first, then take a seat in my tier.
// null = could not (offline, claim pending): the score is not sent yet.
async function leagueFor(me: Me, week: string): Promise<{ group: string; tier: number } | null> {
  const known = useGame.getState().profile.league?.last;
  if (known && known.week === week) return { group: known.group, tier: G.groupTier(known.group) };
  if (G.claimable(useGame.getState().profile, clock()) && !(await claimLeague())) return null;
  const mine = get().me ?? me;
  const joined = await Net.joinGroup(me.uid, week, G.clampTier(mine.league ?? 0), G.GROUP_SIZE);
  const { profile, setProfile } = useGame.getState();
  setProfile({ ...profile, league: { ...profile.league, tier: joined.tier, last: { week, group: joined.group } } });
  return joined;
}

// A finished week to settle: read the group once (never pay without it), pay, move the tier, mirror it on the
// player card, then show the result. true = nothing left to claim. Offline or refused: false, tried again later.
let claiming: Promise<boolean> | null = null;
export function claimLeague(): Promise<boolean> {
  if (claiming) return claiming;
  const me = get().me;
  if (!me || !available()) return Promise.resolve(false);
  if (!G.claimable(useGame.getState().profile, clock())) return Promise.resolve(true);
  claiming = (async () => {
    try {
      const now = clock();
      const last = useGame.getState().profile.league!.last!;
      const [rows, card] = await Promise.all([Net.getGroup(last.week, last.group, G.GROUP_SIZE), Net.getPlayer(me.uid)]);
      const { profile, setProfile } = useGame.getState();
      if (!G.claimable(profile, now)) return true;
      // Another device settled that week already: take its tier, pay nothing twice.
      if (card && card.leagueWeek && card.leagueWeek >= last.week) {
        const tier = G.clampTier(card.league ?? 0);
        setProfile({ ...profile, league: { ...profile.league!, tier, best: Math.max(profile.league!.best ?? 0, tier), claimed: last.week } });
        keep({ ...me, ...card, uid: me.uid });
        return true;
      }
      const done = G.claim(profile, me.uid, rows.map((r) => ({ uid: r.uid, name: r.name, points: r.points, best: r.best })), now);
      if (!done) return true;
      const tier = done.profile.league!.tier;
      await Net.updatePlayer(me.uid, { league: tier, leagueWeek: last.week });
      setProfile(done.profile);
      keep({ ...(get().me ?? me), league: tier, leagueWeek: last.week });
      if (done.report) { mmkv.set(REPORT_KEY, JSON.stringify(done.report)); set({ report: done.report }); }
      set({ group: null });
      return true;
    } catch {
      return false;
    } finally {
      claiming = null;
    }
  })();
  return claiming;
}

// The result sheet was shown.
export function dismissReport() {
  mmkv.remove(REPORT_KEY);
  set({ report: null });
}

// Back in the foreground (or a dev clock change): settle a finished week. Cheap when there is nothing to do.
export const resumeSocial = () => { void pushStatus(); void claimLeague().then(() => { if (get().me) pushSoon(0); }); };

// The score docs of my group this week, cached 60 s; `force` (pull-to-refresh) skips the wait. Not joined: nothing.
export async function refreshGroup(force = false) {
  const me = get().me;
  if (!me || !available() || get().grouping) return;
  const now = Date.now();
  const week = C.weekId(clock());
  const last = useGame.getState().profile.league?.last;
  if (!last || last.week !== week) { if (get().group) set({ group: null }); return; }
  const had = get().group;
  if (!force && had && had.group === last.group && had.week === week && now - had.at < GROUP_TTL) return;
  set({ grouping: true });
  try {
    const rows = await Net.getGroup(week, last.group, G.GROUP_SIZE);
    // Score docs carry their own pseudo: the owner's `hidden` is read from the players cards (<= 29 reads, every 10 min).
    const same = had && had.group === last.group && had.week === week;
    let hidden = same ? had.hidden : {};
    let tags = same ? had.tags : {};
    let hiddenAt = same ? had.hiddenAt : 0;
    if (!same || now - hiddenAt >= HIDDEN_TTL || rows.some((r) => !(r.uid in hidden) && r.uid !== me.uid)) {
      const docs = await Net.getPlayers(rows.filter((r) => r.uid !== me.uid).map((r) => r.uid)).catch(() => null);
      if (docs) {
        hidden = {};
        tags = {};
        for (const [u, d] of Object.entries(docs)) { hidden[u] = d?.hidden || ''; tags[u] = { title: d?.title || '', mood: d?.mood || '' }; }
        hiddenAt = now;
      }
    }
    set({ group: { week, group: last.group, at: Date.now(), rows, hidden, tags, hiddenAt } });
  } catch { /* offline: the last group stays */ } finally {
    set({ grouping: false });
  }
}

// The Cubo of a masked (blocked) player: grey, no look of his own.
const NEUTRAL: CuboLook = { ...cuboLookFor('toy'), base: '#9aa3ad', dark: '#79828c', light: '#d3d8de', cheek: '#b4bcc5', leaf: '#aab2bb', leafDark: '#8a929b' };

// My group with my line from the local tally (always fresh). null when not joined this week or not loaded yet.
export function useLeagueRows(): LeagueRow[] | null {
  const me = useSocial((s) => s.me);
  const group = useSocial((s) => s.group);
  const profile = useGame((s) => s.profile);
  return useMemo(() => {
    const last = profile.league?.last;
    if (!me || !group || !last || group.group !== last.group || group.week !== last.week) return null;
    const w = C.weekOf(profile.week, clock());
    const rest = group.rows.filter((r) => r.uid !== me.uid); // strangers all count: the ranks must be the claim's
    const old = group.rows.find((r) => r.uid === me.uid);
    const mine = { uid: me.uid, name: me.name, look: lookOf(me.look), title: mineTitle(profile), mood: mineMood(profile), points: Math.max(w.points, old?.points || 0), best: Math.max(w.best, old?.best || 0) };
    const shown = (r: { uid: string; name: string }) => (C.isBlocked(profile.blocked, r.uid) ? 'masked' : C.isHidden(r.name, group.hidden[r.uid]) ? 'hidden' : 'ok');
    const people = [...rest.filter((r) => shown(r) === 'ok').map((r) => ({ uid: r.uid, name: r.name, code: r.uid.slice(0, 3).toUpperCase() })), { uid: me.uid, name: me.name, code: me.code }];
    const names = C.labels(people);
    const line = (r: (typeof rest)[number]): LeagueRow => {
      const how = shown(r);
      const tag = group.tags[r.uid];
      const base = { uid: r.uid, name: r.name, me: false, points: r.points, best: r.best, title: tag?.title || '', mood: tag?.mood || '' };
      if (how === 'masked') return { ...base, title: '', mood: '', look: NEUTRAL, label: tr('Joueur masqué'), masked: true };
      if (how === 'hidden') return { ...base, title: '', mood: '', look: lookOf(r.look), label: tr('Joueur'), masked: false };
      return { ...base, look: lookOf(r.look), label: names[r.uid], masked: false };
    };
    return [{ ...mine, me: true, label: names[me.uid], masked: false }, ...rest.map(line)];
  }, [me, group, profile.league, profile.week, profile.blocked]);
}

// ---------- friends ranking ----------

const BOARD_TTL = 60000;
// Me + my friends for this week. Cached 60 s; `force` (pull-to-refresh) skips the wait.
export async function refreshBoard(force = false) {
  const me = get().me;
  if (!me || !available() || get().boarding) return;
  const now = Date.now();
  const week = C.weekId(clock());
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
      return { uid: f.uid, name: f.name, label: f.label, look: f.look, title: f.title, mood: f.mood, me: false, points: s ? s.points : 0, best: s ? s.best : 0, record: f.bestClassic };
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
    const w = C.weekOf(profile.week, clock());
    const mine: BoardRow = { uid: me.uid, name: me.name, label: me.name, look: lookOf(me.look), title: mineTitle(profile), mood: mineMood(profile), me: true, points: w.points, best: w.best, record: Math.max(classic, me.bestClassic || 0) };
    return [mine, ...board.rows.filter((r) => !C.isBlocked(profile.blocked, r.uid))];
  }, [me, board, profile.week, profile.blocked, classic]);
}

// Account deletion (called by cloud.deleteAccount while still signed in). Failures stop the deletion.
// Score docs: this week, the last one, the last group joined and the last week pushed (the player may have stopped).
export async function deleteSocialData(uid: string) {
  const now = clock();
  const weeks = new Set([C.weekId(now), C.weekId(now - 7 * 86400000)]);
  const joined = useGame.getState().profile.league?.last?.week;
  if (joined) weeks.add(joined);
  try { const v = JSON.parse(mmkv.get(SENT_KEY) || 'null') as Sent | null; if (v && v.uid === uid && v.week) weeks.add(v.week); } catch { /* none */ }
  await Net.deleteAll(uid, [...weeks]);
  resetSocial();
  mmkv.remove(REPORTED_KEY);
}
