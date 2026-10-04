// Cubo Blocks — Key-value storage on device (MMKV). Pure code takes a `KV` (kv-types.ts).
import { createMMKV } from 'react-native-mmkv';
import type { KV } from './kv-types';

const store = createMMKV({ id: 'cuboblocks' });
export const mmkv: KV = {
  get: (key) => store.getString(key),
  set: (key, value) => store.set(key, value),
  remove: (key) => { store.remove(key); },
};
