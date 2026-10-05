// One hook the store calls after a profile or a run is written. The cloud save listens.
let hook: (() => void) | null = null;
export const setOnSaved = (fn: (() => void) | null) => { hook = fn; };
export const notifySaved = () => hook?.();
