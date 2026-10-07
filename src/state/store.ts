// Cubo Blocks — App state: the saves (persist.ts) in one zustand store. Every setter saves at once,
// as the web build did after each move. Animation state never goes through here (see the spec).
import { create } from 'zustand';
import { mmkv, testMode } from '../platform/kv';
import type { Profile } from '../core/types';
import { tutActive } from '../game/tut-state';
import { notifySaved } from '../platform/saved';
import { loadProfile, loadSaved, rollDay, saveProfile, saveRun, today, type Saved } from './persist';

interface GameStore {
  saved: Saved;
  profile: Profile;
  // Coins refunded by a profile migration, to announce once.
  refund: number;
  setSaved(next: Saved): void;
  setProfile(next: Profile): void;
  // Midnight rollover: call when the app comes back to the foreground.
  rollDay(): void;
}

// Test mode's profile opens everything and starts rich (game/devmode.ts).
export const TEST_COINS = 100000;
const first = loadProfile(mmkv, today());
if (testMode && !first.profile.dev) first.profile = { ...first.profile, dev: true, coins: Math.max(first.profile.coins, TEST_COINS) };
saveProfile(mmkv, first.profile);

export const useGame = create<GameStore>((set, get) => ({
  saved: loadSaved(mmkv, Date.now()),
  profile: first.profile,
  refund: first.refund,
  setSaved(next) {
    if (!tutActive()) { saveRun(mmkv, next); notifySaved(); } // the scripted tutorial board is never saved
    set({ saved: next });
  },
  setProfile(next) {
    saveProfile(mmkv, next);
    set({ profile: next });
    notifySaved();
  },
  rollDay() {
    const rolled = rollDay(get().profile, today());
    if (rolled) get().setProfile(rolled);
  },
}));
