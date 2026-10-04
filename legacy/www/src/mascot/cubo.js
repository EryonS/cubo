// Cubo Blocks — Cubo the mascot: looks per theme, moods, taps.
'use strict';

// ---------- mascot ----------
// Cubo, a mint jelly with a sprout, perched on the top-right corner of the board. Its base mood
// follows the game (watching the dragged piece, worried on a crowded board, asleep behind a menu,
// sad or partying at the end); events (clears, combos, bonuses, a broken combo) play short moods
// over it. Tap it: it bounces and throws hearts; tap it a lot and it gets dizzy.
const CUBO = { base: '#5ad9a8', dark: '#2f9f78', light: '#b7f5dc', ink: '#23313a', cheek: '#ff8fa8', leaf: '#7bcf52', leafDark: '#4f9e33' };
// Cubo dresses for the theme played (a world's in Aventure): colors over CUBO, plus a head piece.
// taps: the faces it pulls on the 1st..4th quick tap; burst: what flies out of it.
const CUBO_LOOKS = {
  toy: { hat: 'sprout', taps: ['happy', 'wow', 'love', 'star'], burst: 'heart' },
  plain: { hat: 'flower', taps: ['happy', 'wink', 'love', 'star'], burst: 'petal' },
  sea: { base: '#5cc8ef', dark: '#2f8fc0', light: '#c9f1ff', hat: 'starfish', taps: ['puff', 'wow', 'happy', 'puff'], burst: 'bubble' },
  space: { base: '#b9a2ff', dark: '#7a62d6', light: '#e8e0ff', hat: 'helmet', taps: ['wow', 'star', 'happy', 'star'], burst: 'star' },
  ice: { base: '#bfeaf7', dark: '#7fc4dc', light: '#ffffff', hat: 'beanie', taps: ['shiver', 'happy', 'shiver', 'wow'], burst: 'snow' },
  forest: { base: '#7ccf7a', dark: '#478f4c', light: '#d4f5c8', hat: 'mushroom', taps: ['happy', 'wink', 'happy', 'love'], burst: 'leaf' },
  retro: { base: '#8bac0f', dark: '#306230', light: '#c4d97a', ink: '#0f380f', cheek: '#306230', leaf: '#9bbc0f', leafDark: '#0f380f', hat: 'pixel', flat: true,
    taps: ['happy', 'wow', 'wink', 'happy'], burst: 'pixel' },
  arcade: { base: '#ff5fd0', dark: '#b02a92', light: '#ffc4ef', cheek: '#36f9ff', hat: 'headphones', taps: ['cool', 'happy', 'cool', 'star'], burst: 'note' },
  volcano: { base: '#ff9a4d', dark: '#d1562a', light: '#ffd6b0', cheek: '#ff5a5a', hat: 'flame', taps: ['hot', 'wow', 'hot', 'happy'], burst: 'spark' },
  newyear: { base: '#ffd86b', dark: '#d9a520', light: '#fff4c4', cheek: '#ff8fa8', hat: 'sequin', taps: ['star', 'wow', 'happy', 'star'], burst: 'star' },
  lunar: { base: '#ff6b5a', dark: '#c73a2e', light: '#ffd6c4', cheek: '#ffc94a', hat: 'dragon', taps: ['happy', 'wow', 'star', 'happy'], burst: 'spark' },
  valentine: { base: '#ff9ec0', dark: '#e0608f', light: '#ffe0ec', cheek: '#ff4d6d', hat: 'hearts', taps: ['love', 'happy', 'love', 'wink'], burst: 'heart' },
  easter: { base: '#c7b3ff', dark: '#8f74e0', light: '#efe8ff', cheek: '#ff8fb8', hat: 'bunny', taps: ['happy', 'wink', 'wow', 'love'], burst: 'petal' },
  beach: { base: '#5cd6e0', dark: '#2a9fb0', light: '#d4fbff', cheek: '#ff8f6a', hat: 'straw', taps: ['cool', 'happy', 'cool', 'wow'], burst: 'bubble' },
  xmas: { base: '#ff6b6b', dark: '#c73e4a', light: '#ffd4d4', cheek: '#ffffff', hat: 'santa', taps: ['happy', 'shiver', 'love', 'star'], burst: 'snow' },
  halloween: { base: '#ff9a3c', dark: '#cc6514', light: '#ffd9a8', cheek: '#ff5a5a', leaf: '#5fae3a', leafDark: '#3a7a22', hat: 'witch', taps: ['wow', 'happy', 'wink', 'star'], burst: 'bat' },
};
// The theme's look, wearing the wardrobe's head piece when one is equipped (Boutique tab Cubo).
const cuboLookFor = (themeKey, wear = profile.equipped.cubo) => {
  const look = { ...CUBO, ...(CUBO_LOOKS[themeKey] || CUBO_LOOKS.toy) };
  if (wear && wear !== 'auto') look.hat = wear;
  return look;
};
const cuboLook = () => cuboLookFor(themeId());
const cubo = { mood: null, until: 0, jumpAt: -1e9, jumpH: 0, taps: [], hearts: [], blinkAt: 0, dizzyUntil: 0 };

function cuboReact(mood, ms, jump = 0) {
  if (!settings.mascot) return;
  const t = now();
  if (t < cubo.dizzyUntil) return;
  cubo.mood = mood;
  cubo.until = t + ms;
  if (jump && !calm()) { cubo.jumpAt = t; cubo.jumpH = jump; }
}

// Where Cubo sits: bottom center on the board frame, and its size.
// In a puzzle it stands on the drawing's rightmost column, on its top cell (clear of the score sign).
function cuboSpot() {
  const s = Math.max(34, Math.min(58, lay.cell * 1.15));
  if (state.puzzle) {
    for (let c = SIZE - 1; c >= 0; c--) {
      for (let r = 0; r < SIZE; r++) {
        if (isVoid(r * SIZE + c)) continue;
        return { x: lay.bx + (c + 1) * lay.cell - s * 0.5 + 2, y: lay.by + r * lay.cell - 10, s };
      }
    }
  }
  return { x: lay.bx + lay.board - s * 0.5 + 2, y: lay.by - 10, s };
}

function cuboHit(x, y) {
  if (!settings.mascot || tut) return false;
  const m = cuboSpot();
  return Math.abs(x - m.x) < m.s * 0.7 && y > m.y - m.s * 1.2 && y < m.y + 6;
}

function cuboTap() {
  const t = now();
  cubo.taps = cubo.taps.filter((x) => t - x < 1600).concat(t);
  const m = cuboSpot();
  if (cubo.taps.length >= 5) {
    cubo.taps = [];
    cuboReact('dizzy', 2200, 0.5);
    cubo.dizzyUntil = now() + 2200;
    sfx.fizzle();
  } else {
    const look = cuboLook();
    cuboReact((look.taps || ['happy', 'wow', 'happy', 'star'])[cubo.taps.length - 1] || 'happy', 900, 0.6);
    sfx.pop();
  }
  for (let k = 0; k < 3; k++) cubo.hearts.push({ x: m.x + (k - 1) * m.s * 0.3, y: m.y - m.s, t0: t + k * 90, dx: (k - 1) * 18, spin: (k - 1) * 0.6 });
  haptic('tap');
}

// Base mood when no event mood is playing.
function cuboBaseMood() {
  if (pausedByUi() && !state.over) return 'sleep';
  if (state.over) {
    const won = (state.puzzle && state.puzzle.won) || (state.stage && state.stage.won);
    return won ? 'party' : 'sad';
  }
  if (state.stuck) return 'worried';
  let cells = 0;
  let full = 0;
  for (let i = 0; i < state.board.length; i++) {
    if (state.special && state.special[i] && state.special[i].kind === 'void') continue;
    cells += 1;
    if (state.board[i]) full += 1;
  }
  if (state.mode !== 'puzzle' && full / cells >= 0.7) return 'worried';
  return drag ? 'watch' : 'idle';
}
