// Cubo Blocks — Cubo's line of the day on the home screen (legacy mascot/say.js). Pure.
// One line a day (same all day, so it reads like Cubo's mood of the day). Some days have something to
// say first: a first visit, a streak to keep or just kept, a season event.
import { M } from '../core';
import { tr } from '../core/i18n';
import type { Profile } from '../core/types';

export interface SayLine { text: string; mood: string }

export const sayLines = (): SayLine[] => [
  { text: tr('Une ligne à la fois, et tout finit par rentrer.'), mood: 'happy' },
  { text: tr('Les combos, c’est mon dessert préféré.'), mood: 'love' },
  { text: tr('Garde une place pour la grande barre !'), mood: 'wink' },
  { text: tr('Pas de panique : la Bombe est là pour ça.'), mood: 'cool' },
  { text: tr('Aujourd’hui, je sens un record.'), mood: 'star' },
  { text: tr('Les coins de la grille, c’est sacré.'), mood: 'wink' },
  { text: tr('J’ai fait briller tous les blocs ce matin.'), mood: 'happy' },
  { text: tr('Vider toute la grille… quel bonheur !'), mood: 'wow' },
  { text: tr('Tu as vu ma pousse ? Elle a grandi.'), mood: 'happy' },
  { text: tr('Une forme te gêne ? Garde-la en bas pour la jeter.'), mood: 'wink' },
  { text: tr('Les mondes de l’Aventure ont chacun leurs pièges.'), mood: 'wow' },
  { text: tr('Petite partie ? Promis, juste une.'), mood: 'wink' },
  { text: tr('Deux lignes d’un coup, ça rapporte gros.'), mood: 'star' },
  { text: tr('Je garde les pièces au chaud pour la Boutique.'), mood: 'happy' },
];
export const dayHash = (day: string) => [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function cuboLine(profile: Profile, day: string): SayLine {
  if (!(profile.lifetime && profile.lifetime.games)) return { text: tr('Salut, moi c’est Cubo ! On pose des blocs ?'), mood: 'happy' };
  const streak = M.streakNow(profile, day);
  const done = M.dailyOf(profile, day).stars !== undefined;
  if (streak >= 2 && !done) return { text: tr`Ta série de ${streak} jours t’attend dans Défis !`, mood: 'worried' };
  if (streak >= 2 && done) return { text: tr`${streak} jours d’affilée, je suis fier de toi !`, mood: 'star' };
  const ev = M.eventsFor(day).find((e) => M.eventCleared(profile, e.id, day) < e.levels);
  if (ev && dayHash(day) % 2) return { text: tr`${ev.name} est là : ${ev.levels} niveaux et un trophée à gagner !`, mood: 'wow' };
  const lines = sayLines();
  return lines[dayHash(day) % lines.length];
}
