// Cubo Blocks — What the share picture of an end card shows (render/share-card.ts draws it): a free run's
// score and summary, a won daily level's stars, moves to spare and streak, on the board the run ended on.
import { LV, WD } from '../core';
import { locale, tr } from '../core/i18n';
import type { RunState } from '../core/types';
import { cuboLookFor } from '../mascot/looks';
import { playedTheme, themeFor } from '../render/board-themes';
import type { ShareCard } from '../render/share-card';
import { dailyWord } from './daily';
import { levelMood } from './levelend';
import { modeLabel } from './modes';
import type { RunEnd } from './run';
import { runSummary } from './summary';
import { useGame } from '../state/store';

// The player's look: equipped board (a free run's own theme or the level's world wins), block skin, Motifs, Cubo's outfit.
export interface Wardrobe { board: string; skin: string; patterns: boolean; wear: string }
export function wardrobe(): Wardrobe {
  const { profile, saved } = useGame.getState();
  return { board: profile.equipped.boards, skin: profile.equipped.blocks, patterns: saved.settings.patterns, wear: profile.equipped.cubo };
}

function base(st: RunState, w: Wardrobe, mood: string) {
  const played = playedTheme(st, w.board);
  return { th: themeFor({ theme: played }, w.board, w.skin, w.patterns), look: cuboLookFor(played, w.wear), mood, state: st };
}

export function runShareCard(st: RunState, end: RunEnd, w: Wardrobe): ShareCard {
  return {
    ...base(st, w, end.record ? 'star' : end.score >= end.best / 2 ? 'happy' : 'oops'),
    kicker: modeLabel(st),
    score: end.score,
    scoreText: end.score.toLocaleString(locale()),
    record: end.record ? tr('NOUVEAU RECORD') : undefined,
    // Three tags fit the board's width: lines, best combo, then most at once or shapes.
    chips: runSummary(end).filter((x) => x.value !== '–').slice(0, 3).map((x) => ({ label: x.label, value: x.value })),
  };
}

export function dailyShareCard(st: RunState, stage: NonNullable<RunState['stage']>, day: string, today: string, streak: number, w: Wardrobe): ShareCard {
  const chips: ShareCard['chips'] = [];
  if (stage.movesLeft > 0) chips.push({ label: tr('coups en rab'), value: String(stage.movesLeft) });
  if (streak > 0) chips.push({ label: tr('série'), value: tr`${streak} jour${streak > 1 ? 's' : ''}` });
  return {
    ...base(st, w, levelMood(true, stage.stars)),
    kicker: `${dailyWord(day, today)} #${LV.dayNumber(day)} · ${WD.WORLDS[stage.world].name}`,
    stars: stage.stars,
    chips,
  };
}
