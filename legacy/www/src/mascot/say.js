// Cubo Blocks — Cubo on the home screen: a line of the day in a speech bubble.
'use strict';

// One line a day (same all day, so it reads like Cubo's mood of the day). Some days have
// something to say first: a first visit, a streak to keep or just kept, a season event.
const sayEl = document.getElementById('menu-cubo');
const sayCv = sayEl.querySelector('canvas');
const sayText = document.getElementById('menu-cubo-say');
const SAY_LINES = () => [
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
const dayHash = (day) => [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function cuboLine() {
  const t = today();
  if (!(profile.lifetime && profile.lifetime.games)) return { text: tr('Salut, moi c’est Cubo ! On pose des blocs ?'), mood: 'happy' };
  const streak = M.streakNow(profile, t);
  const done = M.dailyOf(profile, t).stars !== undefined;
  if (streak >= 2 && !done) return { text: tr`Ta série de ${streak} jours t’attend dans Défis !`, mood: 'worried' };
  if (streak >= 2 && done) return { text: tr`${streak} jours d’affilée, je suis fier de toi !`, mood: 'star' };
  const ev = M.eventsFor(t).find((e) => M.eventCleared(profile, e.id, t) < e.levels);
  if (ev && dayHash(t) % 2) return { text: tr`${ev.name} est là : ${ev.levels} niveaux et un trophée à gagner !`, mood: 'wow' };
  const lines = SAY_LINES();
  return lines[dayHash(t) % lines.length];
}

let sayMood = 'happy';
function paintSay(mood = sayMood) {
  const g = sayCv.getContext('2d');
  g.clearRect(0, 0, sayCv.width, sayCv.height);
  const prev = ctx;
  ctx = g;
  // The tallest head pieces (bunny ears, witch hat) reach 1.42 s above the feet, 0.71 s each side.
  drawCubo(0, { x: sayCv.width / 2, y: sayCv.height - 9, s: 100, C: cuboLookFor(profile.equipped.boards), mood });
  ctx = prev;
}
function renderCuboSay() {
  const line = cuboLine();
  sayMood = line.mood;
  sayText.textContent = line.text;
  paintSay();
}
// Tap: the theme's tap faces in turn and a hop, like on the board.
let sayTaps = 0;
let sayTimer = 0;
sayEl.addEventListener('click', () => {
  unlockAudio();
  const look = cuboLookFor(profile.equipped.boards);
  paintSay(look.taps[sayTaps++ % look.taps.length]);
  sfx.pop();
  haptic('pick');
  sayCv.classList.remove('hop');
  void sayCv.offsetWidth; // restart the animation
  sayCv.classList.add('hop');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => paintSay(), 900);
});

// End of a game: Cubo above the result, in a pose that matches it (off with the Mascotte setting).
// Free run: star on a record, happy past half the record, oops below. Levels: star with 3 stars,
// party on a win, sad on a loss.
function endCubo(card, mood) {
  let cv = card.querySelector('.end-cubo');
  if (!cv) {
    cv = document.createElement('canvas');
    cv.className = 'end-cubo';
    cv.width = 224;
    cv.height = 236;
    cv.setAttribute('aria-hidden', 'true');
    card.prepend(cv);
  }
  cv.hidden = !settings.mascot;
  if (cv.hidden) return;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  const prev = ctx;
  ctx = g;
  drawCubo(0, { x: cv.width / 2, y: cv.height - 13, s: 150, C: cuboLookFor(themeId()), mood });
  ctx = prev;
  cv.classList.remove('pop');
  void cv.offsetWidth; // restart the animation
  cv.classList.add('pop');
}
const stageMood = (stage) => (!stage.won ? 'sad' : stage.stars >= 3 ? 'star' : 'party');
