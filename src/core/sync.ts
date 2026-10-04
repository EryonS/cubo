/*
 * Cubo Blocks — cloud save rules: what is sent, how a cloud copy is checked, and what to do when
 * the device and the account differ. Pure, no DOM. The Firebase side is platform/cloud.js.
 * A cloud document: { v, profile, settings, bests, lang, updatedAt }.
 */
import * as M from './meta';
import type { Profile } from './types';

// What travels to the cloud. settings / bests / lang are app shapes the core does not look into.
export interface SyncData { profile: Profile; settings: object; bests: Record<string, number>; lang: string }
export interface SyncDoc extends SyncData { v: number; updatedAt: number }
export interface SyncState { syncedAt: number; dirty: boolean }
type Obj = Record<string, unknown>;

const SYNC_VERSION = 1;
const LANGS = ['auto', 'fr', 'en'];

const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);

// data: { profile, settings, bests, lang }; anything else (the run in progress) stays local.
const payload = ({ profile, settings, bests, lang }: SyncData, updatedAt: number): SyncDoc =>
  ({ v: SYNC_VERSION, profile, settings, bests, lang, updatedAt });

const validate = (doc: unknown): doc is SyncDoc => isObj(doc) && Number.isInteger(doc.v) && isObj(doc.profile)
  && typeof doc.profile.coins === 'number' && isObj(doc.settings) && isObj(doc.bests)
  && LANGS.includes(doc.lang as string) && typeof doc.updatedAt === 'number';

// Written by a newer app: never applied, never overwritten.
const tooNew = (doc: SyncDoc) => doc.v > SYNC_VERSION || (doc.profile.version || 0) > M.PROFILE_VERSION;

const count = (x: unknown) => (isObj(x) ? Object.keys(x).length : 0);
// No progression yet: a new device (or a new player) takes the account's without asking.
const isFresh = (profile: Profile) => !profile.games && !profile.coins && !M.totalStars(profile)
  && !count(profile.stickers) && !count(profile.daily) && !count(profile.puzzles);

// What the choice dialog shows for each side.
const summary = (profile: Profile) => ({
  coins: profile.coins || 0, stars: M.totalStars(profile), stickers: count(profile.stickers), day: profile.day || null,
});

// Same content whatever the key order and the time stamp.
const stable = (x: unknown): string => (Array.isArray(x) ? `[${x.map(stable).join(',')}]`
  : isObj(x) ? `{${Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + stable(x[k])).join(',')}}`
    : JSON.stringify(x));
const same = (a: SyncData, b: SyncData) => (['profile', 'settings', 'bests', 'lang'] as const).every((k) => stable(a[k]) === stable(b[k]));

// local: { profile, settings, bests, lang }. remote: the cloud document, or null if none.
// sync: null at sign-in, else { syncedAt, dirty } (last cloud version this device knows, and
// whether it has changes not sent yet).
// Returns 'push' (send local), 'pull' (apply remote), 'ask' (the player picks), 'same' (nothing
// to move, note the remote time), 'none', 'keep' (remote unreadable) or 'update-app'.
export type SyncDecision = 'push' | 'pull' | 'ask' | 'same' | 'none' | 'keep' | 'update-app';
function decide({ local, remote, sync }: { local: SyncData; remote: unknown; sync: SyncState | null }): SyncDecision {
  if (remote === null || remote === undefined) return 'push';
  if (!validate(remote)) return 'keep';
  if (tooNew(remote)) return 'update-app';
  const mine = payload(local, 0);
  if (!sync) {
    if (same(mine, remote)) return 'same';
    return isFresh(local.profile) ? 'pull' : 'ask';
  }
  if (remote.updatedAt === sync.syncedAt) return sync.dirty ? 'push' : 'none';
  if (same(mine, remote)) return 'same';
  return sync.dirty ? 'ask' : 'pull';
}

export { SYNC_VERSION, payload, validate, tooNew, isFresh, summary, same, decide };
