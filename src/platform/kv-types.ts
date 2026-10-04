// Key-value storage as the app sees it: MMKV on device (platform/kv.ts), a Map in tests.
export interface KV {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}
