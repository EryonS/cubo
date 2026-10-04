// Cubo Blocks — Cubo's looks: colors, head piece, tap faces and burst per theme (legacy mascot/cubo.js).
// Pure. Only the Jouet look is in use until the world themes arrive (milestone 6); the lookup is ready.

export interface CuboLook {
  base: string; dark: string; light: string; ink: string; cheek: string; leaf: string; leafDark: string;
  hat: string; taps: string[]; burst: string; flat?: boolean;
}
type LookDef = Partial<CuboLook> & { hat: string; taps: string[]; burst: string };

export const CUBO = { base: '#5ad9a8', dark: '#2f9f78', light: '#b7f5dc', ink: '#23313a', cheek: '#ff8fa8', leaf: '#7bcf52', leafDark: '#4f9e33' };
// Cubo dresses for the theme played (a world's in Aventure): colors over CUBO, plus a head piece.
// taps: the faces it pulls on the 1st..4th quick tap; burst: what flies out of it.
export const CUBO_LOOKS: Record<string, LookDef> = {
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
export function cuboLookFor(themeKey: string, wear: string = 'auto'): CuboLook {
  const look = { ...CUBO, ...(CUBO_LOOKS[themeKey] || CUBO_LOOKS.toy) } as CuboLook;
  if (wear && wear !== 'auto') look.hat = wear;
  return look;
}
