// Cubo Blocks — App state: the saves (persist.ts) in one zustand store. Every setter saves at once,
// as the web build did after each move. Animation state never goes through here (see the spec).
import { create } from 'zustand';
import { mmkv } from '../platform/kv';
import type { Profile } from '../core/types';
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

const first = loadProfile(mmkv, today());
saveProfile(mmkv, first.profile);

export const useGame = create<GameStore>((set, get) => ({
  saved: loadSaved(mmkv, Date.now()),
  profile: first.profile,
  refund: first.refund,
  setSaved(next) {
    saveRun(mmkv, next);
    set({ saved: next });
  },
  setProfile(next) {
    saveProfile(mmkv, next);
    set({ profile: next });
  },
  rollDay() {
    const rolled = rollDay(get().profile, today());
    if (rolled) get().setProfile(rolled);
  },
}));
