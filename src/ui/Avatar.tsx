// A friend's Cubo (one small Skia canvas): the Communauté list and the rankings.
import type { CuboLook } from '../mascot/looks';
import { CuboPose } from './CuboPose';

export function Avatar({ look, size }: { look: CuboLook; size: number }) {
  // The canvas keeps room for the sprout above the body (same proportions as the Profil header).
  return <CuboPose width={size} lw={128} lh={134} s={84} foot={8} look={look} mood="happy" />;
}
