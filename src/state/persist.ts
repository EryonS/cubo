// Cubo Blocks — Saves: the run in progress (with records, settings, last menu choice) and the
// profile, as JSON under two keys. Pure: takes a KV, so tests use a Map.
import { L, M } from '../core';
import type { KV } from '../platform/kv-types';
import type { Level, Mode, Profile, RunState } from '../core/types';

export const RUN_KEY = 'cuboblocks.v2';
export const PROFILE_KEY = 'cuboblocks.profile.v1';

// patterns: a symbol per block color (color-blind marks). mascot: Cubo shown on screens.
export interface Settings { sfx: boolean; music: boolean; vibrate: boolean; patterns: boolean; mascot: boolean }
export const DEFAULT_SETTINGS: Settings = { sfx: true, music: true, vibrate: true, patterns: false, mascot: true };

// state: the run on screen. parked: a free run (Classique, Chrono, Chill, Mondes) set aside while
// the player does a level, a daily or a puzzle. bests: free-play records per mode
// (Mondes: 'worlds-<id>'). prefs: the last free-game choice on the menu.
export interface Saved {
  state: RunState;
  parked: RunState | null;
  bests: Record<string, number>;
  settings: Settings;
  prefs: { mode: Mode; level: Level };
}

// A value that does not parse is kept under <key>.broken (for a bug report) and treated as absent.
function readJSON(kv: KV, key: string): Record<string, unknown> {
  const raw = kv.get(key);
  if (raw == null) return {};
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object') return v;
  } catch { /* falls through */ }
  kv.set(key + '.broken', raw);
  kv.remove(key);
  return {};
}

const resumable = (s: unknown): s is RunState => !!s && typeof s === 'object' && !!(s as RunState).effects && !(s as RunState).over;

// seed: for the fresh run when there is nothing to resume (Date.now() in the app).
export function loadSaved(kv: KV, seed: number): Saved {
  const saved = readJSON(kv, RUN_KEY) as Partial<Saved>;
  return {
    state: resumable(saved.state) ? saved.state : L.createGame(seed),
    parked: resumable(saved.parked) ? saved.parked : null,
    bests: { ...(saved.bests || {}) },
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
    prefs: { mode: 'classic', level: 'normal', ...(saved.prefs || {}) },
  };
}

// refund: coins given back by a migration (announced once on the home screen).
export function loadProfile(kv: KV, day: string): { profile: Profile; refund: number } {
  const stored = readJSON(kv, PROFILE_KEY) as unknown as Profile;
  const { profile, refund } = M.migrate(stored.owned ? stored : M.createProfile(day));
  return { profile: M.ensureDay(profile, day), refund };
}

export const saveRun = (kv: KV, saved: Saved) => kv.set(RUN_KEY, JSON.stringify(saved));
export const saveProfile = (kv: KV, profile: Profile) => kv.set(PROFILE_KEY, JSON.stringify(profile));

// Local calendar day; daily missions roll over at local midnight.
export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The app can stay open (or asleep in the background) past midnight: the new day's missions.
// Null when the day did not change.
export function rollDay(profile: Profile, day: string): Profile | null {
  const rolled = M.ensureDay(profile, day);
  return rolled === profile ? null : rolled;
}
