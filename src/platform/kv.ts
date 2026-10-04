// Cubo Blocks — Key-value storage. The app writes through `KV` so pure code and tests can swap
// MMKV for a Map (see memoryKV).
import { createMMKV } from 'react-native-mmkv';

export interface KV {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const store = createMMKV({ id: 'cuboblocks' });
export const mmkv: KV = {
  get: (key) => store.getString(key),
  set: (key, value) => store.set(key, value),
  remove: (key) => { store.remove(key); },
};
