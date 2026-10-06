// Cubo Blocks — Vibrations on expo-haptics, gated by Paramètres > Vibrations (legacy platform/haptics.js).
import * as Haptics from 'expo-haptics';
import { useGame } from '../state/store';
import { HAPTICS, impactSchedule, linesPattern, type Impact, type Pattern } from './haptic-pattern';

const STYLES: Record<Impact, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

function buzz(p: Pattern | undefined) {
  if (p === undefined || !useGame.getState().saved.settings.vibrate) return;
  for (const { at, style } of impactSchedule(p)) {
    const go = () => { Haptics.impactAsync(STYLES[style]).catch(() => {}); };
    if (at === 0) go(); else setTimeout(go, at);
  }
}

let coinBuzzAt = 0;
// haptic('lines', lines, combo): longer for more lines at once, one more pulse for a big combo.
export function haptic(kind: string, lines = 0, combo = 0) {
  if (kind === 'coin') {
    const t = performance.now();
    if (t - coinBuzzAt < 90) return; // a shower of coins stays a light patter
    coinBuzzAt = t;
  }
  buzz(kind === 'lines' ? linesPattern(lines, combo) : HAPTICS[kind]);
}
