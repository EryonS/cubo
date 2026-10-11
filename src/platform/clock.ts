// The game's "now" for weeks and leagues: the device clock, plus a developer offset (Paramètres > Développeur >
// Décalage d'horloge) to see a week change without waiting. Firestore timestamps (`at`) keep the real clock.
import { bootKv } from './kv';

const KEY = 'cuboblocks.dev.clockdays';
const DAY = 86400000;
let days = Number(bootKv.get(KEY)) || 0;

export const now = () => Date.now() + days * DAY;
export const clockDays = () => days;
export function setClockDays(d: number) {
  days = d;
  if (d) bootKv.set(KEY, String(d)); else bootKv.remove(KEY);
}
