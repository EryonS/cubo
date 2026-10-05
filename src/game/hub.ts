// Whether a run is on screen. A cloud copy that arrives during a run waits for a menu.
let open = false;
const waiters = new Set<() => void>();

export const runOpen = () => open;

export function setRunOpen(next: boolean) {
  open = next;
  if (next) return;
  waiters.forEach((w) => w());
  waiters.clear();
}

export function whenHub(): Promise<void> {
  if (!open) return Promise.resolve();
  return new Promise((resolve) => { waiters.add(resolve); });
}
