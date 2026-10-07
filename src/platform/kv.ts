// Cubo Blocks — Key-value storage on device (MMKV). Pure code takes a `KV` (kv-types.ts).
// Test mode (Paramètres > Développeur) swaps the saves for a second store, so the real profile and
// its cloud account never see it. The switch and the language stay in the main store (`bootKv`).
import { createMMKV } from 'react-native-mmkv';
import type { KV } from './kv-types';

const wrap = (id: string): KV & { clearAll(): void } => {
  const store = createMMKV({ id });
  return {
    get: (key) => store.getString(key),
    set: (key, value) => store.set(key, value),
    remove: (key) => { store.remove(key); },
    clearAll: () => store.clearAll(),
  };
};

const main = wrap('cuboblocks');
const TEST_KEY = 'cuboblocks.testmode';
const DEV_KEY = 'cuboblocks.dev';

export const bootKv: KV = main;
// Read once: switching reloads the app.
export const testMode = main.get(TEST_KEY) === '1';
const test = testMode ? wrap('cuboblocks-test') : null;
export const mmkv: KV = test ?? main;

export const setTestMode = (on: boolean) => { if (on) main.set(TEST_KEY, '1'); else main.remove(TEST_KEY); };
// Wipes the test store (the next launch seeds a fresh test profile).
export const clearTestStore = () => test?.clearAll();

// The Développeur section in Paramètres: always in a dev build, else after tapping the version.
export const devShown = () => __DEV__ || testMode || main.get(DEV_KEY) === '1';
export const showDev = () => main.set(DEV_KEY, '1');
