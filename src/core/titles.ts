/*
 * Cubo Blocks — community statuses: earned titles (shown under the pseudo) and chosen moods (a phrase + Cubo's face).
 * Fixed lists, ids stored in profile.title / profile.mood and mirrored on players/{uid}; the ids are the only thing
 * that travels, names and phrases are local. Pure; the banner and pickers are in ui/.
 */
import { tr } from './i18n';
import { EVENTS, LEVELS_PER_WORLD, WORLD_ORDER, levelCleared, puzzlesSolved, streakOf } from './meta';
import type { Profile } from './types';

const lt = (p: Profile, k: string) => ((p.lifetime && (p.lifetime[k] as number)) || 0);
const lg = (p: Profile) => p.league || { tier: 0 };
// Free-play records per mode (saved.bests), passed by the caller.
export type Bests = Record<string, number>;

export interface Title { id: string; name: string; how: string; test: (p: Profile, bests: Bests) => boolean }

// A year where every season event has its trophy.
const allEvents = (p: Profile) => {
  const years: Record<string, number> = {};
  for (const k of Object.keys(p.trophies || {})) {
    const m = /^(.+)-(\d{4})$/.exec(k);
    if (m && EVENTS.some((e) => e.id === m[1])) years[m[2]] = (years[m[2]] || 0) + 1;
  }
  return Object.values(years).some((n) => n >= EVENTS.length);
};
const tierTitle = (id: string, name: string, tier: number, tierName: string): Title => ({
  id, name, how: tr`Atteins la ligue ${tierName}`, test: (p) => Math.max(lg(p).tier, lg(p).best ?? 0) >= tier,
});

export const TITLES: Title[] = [
  { id: 'newbie', name: tr('Nouveau venu'), how: tr('Installe le jeu'), test: () => true },
  { id: 'king', name: tr('Roi de la semaine'), how: tr('Finis 1er aux points d’une ligue de 5 joueurs ou plus'), test: (p) => (lg(p).wins ?? 0) >= 1 },
  { id: 'topshot', name: tr('Meilleur coup'), how: tr('Fais le meilleur score d’une semaine dans une ligue de 5 joueurs ou plus'), test: (p) => (lg(p).bestWins ?? 0) >= 1 },
  { id: 'riser', name: tr('Remonté'), how: tr('Monte d’une ligue'), test: (p) => (lg(p).ups ?? 0) >= 1 },
  tierTitle('gold', tr('Or massif'), 2, tr('Or')),
  tierTitle('sapphire', tr('Saphir étincelant'), 3, tr('Saphir')),
  tierTitle('ruby', tr('Rubis sur l’ongle'), 4, tr('Rubis')),
  tierTitle('diamond', tr('Diamant brut'), 5, tr('Diamant')),
  { id: 'combo', name: tr('Pro du combo'), how: tr('Atteins un combo ×8'), test: (p) => lt(p, 'bestCombo') >= 8 },
  { id: 'quad', name: tr('Quatre d’un coup'), how: tr('Efface 4 lignes d’un coup'), test: (p) => lt(p, 'bestMulti') >= 4 },
  { id: 'tidy', name: tr('Maniaque du rangement'), how: tr('Vide toute la grille'), test: (p) => lt(p, 'perfects') >= 1 },
  { id: 'tightrope', name: tr('Funambule'), how: tr('Fais 3 000 points sans annuler ni jeter de forme'), test: (p) => lt(p, 'cleanScore') >= 3000 },
  { id: 'bomber', name: tr('Artificier'), how: tr('Fais sauter 21 blocs avec une seule Bombe'), test: (p) => lt(p, 'bestBomb') >= 21 },
  { id: 'summit', name: tr('Tutoyer les sommets'), how: tr('Fais 10 000 points en Classique'), test: (_, b) => (b.classic || 0) >= 10000 },
  { id: 'chrono', name: tr('Accro au Chrono'), how: tr('Joue 100 parties en Chrono'), test: (p) => ((p.modes?.chrono?.games) || 0) >= 100 },
  { id: 'puzzles', name: tr('Maître des puzzles'), how: tr('Résous 60 puzzles'), test: (p) => puzzlesSolved(p) >= 60 },
  { id: 'faithful', name: tr('Fidèle au poste'), how: tr('Tiens une série de 30 jours'), test: (p) => streakOf(p).best >= 30 },
  { id: 'hero', name: tr('Héros de l’Aventure'), how: tr('Finis les 20 niveaux de chaque monde'), test: (p) => WORLD_ORDER.every((w) => levelCleared(p, w, LEVELS_PER_WORLD)) },
  { id: 'seasons', name: tr('Calendrier complet'), how: tr('Décroche un trophée à chaque événement d’une même année'), test: allEvents },
  { id: 'piggy', name: tr('Pique-sous'), how: tr('Gagne 5 000 pièces au total'), test: (p) => lt(p, 'coinsEarned') >= 5000 },
];
const titleById = (id: string | undefined) => TITLES.find((t) => t.id === id) || null;

export const earnedTitles = (p: Profile, bests: Bests = {}) => TITLES.filter((t) => t.test(p, bests));
export const isEarned = (p: Profile, id: string, bests: Bests = {}) => !!titleById(id)?.test(p, bests);
// The id to show for a title id from anywhere (unknown id = nothing, never a raw string).
export const titleName = (id: string | undefined | null) => titleById(id || undefined)?.name ?? '';
// Titles earned and not announced yet (the player's `titlesSeen`), plus the profile with them marked seen.
export function freshTitles(p: Profile, bests: Bests = {}): { profile: Profile; fresh: Title[] } {
  const seen = p.titlesSeen || [];
  const fresh = earnedTitles(p, bests).filter((t) => !seen.includes(t.id));
  if (!fresh.length) return { profile: p, fresh };
  return { profile: { ...p, titlesSeen: [...seen, ...fresh.map((t) => t.id)] }, fresh };
}

// Moods: a phrase tied to one of Cubo's faces (mascot/body.ts moods).
export interface Mood { id: string; text: string; face: string }
export const MOODS: Mood[] = [
  { id: 'fire', text: tr('En feu'), face: 'hot' },
  { id: 'comeback', text: tr('Je reviens plus fort'), face: 'puff' },
  { id: 'nope', text: tr('Pas aujourd’hui'), face: 'sad' },
  { id: 'combo', text: tr('Chasseur de combos'), face: 'star' },
  { id: 'zen', text: tr('Zen'), face: 'sleep' },
  { id: 'tryhard', text: tr('Mode tryhard'), face: 'worried' },
  { id: 'onemore', text: tr('Juste une dernière'), face: 'wink' },
  { id: 'watching', text: tr('Je vous vois'), face: 'wow' },
  { id: 'cool', text: tr('Trop cool'), face: 'cool' },
  { id: 'party', text: tr('C’est la fête'), face: 'party' },
  { id: 'love', text: tr('Fan de blocs'), face: 'love' },
  { id: 'dizzy', text: tr('La tête qui tourne'), face: 'dizzy' },
];
export const moodById = (id: string | undefined | null) => MOODS.find((m) => m.id === id) || null;
// Cubo's face for a mood id (unknown / none = the usual smile).
export const moodFace = (id: string | undefined | null) => moodById(id)?.face ?? 'happy';
export const moodText = (id: string | undefined | null) => moodById(id)?.text ?? '';
// An id that may travel to Firestore (rules: ^[a-z0-9-]{1,24}$ and in the fixed list).
export const validTitle = (id: unknown): id is string => typeof id === 'string' && !!titleById(id);
export const validMood = (id: unknown): id is string => typeof id === 'string' && !!moodById(id);
