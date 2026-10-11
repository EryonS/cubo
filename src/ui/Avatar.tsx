// A friend's Cubo (one small Skia canvas): the Communauté list and the rankings. `mood`: the player's chosen mood id
// (core/titles.ts), his face; none or unknown = the usual smile.
import { moodFace } from '../core/titles';
import type { CuboLook } from '../mascot/looks';
import { CuboPose } from './CuboPose';

export function Avatar({ look, size, mood }: { look: CuboLook; size: number; mood?: string }) {
  // The canvas keeps room for the sprout above the body (same proportions as the Profil header).
  return <CuboPose width={size} lw={128} lh={134} s={84} foot={8} look={look} mood={moodFace(mood)} />;
}
