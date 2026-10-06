// Cubo Blocks — Generative music data and the step planner, pure (legacy audio/music.js, made softer).
// Generative loop, one song per world. Soft pad chords, a bass line, a music-box arpeggio high up, a
// legato lead melody and, for some, light drums. Song fields: bpm, chords [[bass root, chord tones]]
// (MIDI, one per bar of 8 eighth notes), arp (tone index per step, -1 = rest), lead (16 steps over two
// bars: tone index, played an octave up, -1 = hold the note before), pad / bass / bell { type, vol, cut },
// bass.steps, bell.oct (semitones up) and bell.len (in steps), drums { kick, snare, hat } step lists.
// Only sine and triangle waves: no square or saw buzz. Menus play the same song calm (no drums).
export type Wave = 'sine' | 'triangle';
export interface Voice { type: Wave; vol: number; cut: number }
export interface Song {
  bpm: number;
  chords: [number, number[]][];
  arp: number[];
  lead: number[];
  pad: Voice | null;
  bass: Voice & { steps: number[] };
  bell: Voice & { oct: number; len: number };
  drums?: Partial<Record<Drum, number[]>>;
}
export type Drum = 'kick' | 'snare' | 'hat';

const SONGS_BASE: Record<string, Song> = {
  // Toy: I - vi - IV - V in D, music box and a hummed tune.
  toy: { bpm: 84, chords: [[50, [62, 66, 69, 73]], [47, [59, 62, 66, 69]], [43, [59, 62, 67, 71]], [45, [61, 64, 69, 73]]],
    arp: [0, -1, 1, 3, -1, 2, -1, -1], lead: [2, -1, 1, 0, 1, -1, -1, -1, 3, -1, 2, 1, 2, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.04, cut: 900 }, bass: { type: 'sine', vol: 0.13, cut: 400, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.018, cut: 8000, oct: 24, len: 3 } },
  // Plaine: easy G major, I - V - vi - IV, a flute over a light pulse.
  plain: { bpm: 92, chords: [[43, [67, 71, 74, 79]], [50, [66, 69, 74, 78]], [52, [67, 71, 76, 79]], [48, [64, 67, 72, 76]]],
    arp: [0, -1, 2, -1, 3, -1, 1, -1], lead: [0, 1, 2, -1, 3, -1, 2, -1, 2, 1, 0, -1, 1, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.03, cut: 1100 }, bass: { type: 'triangle', vol: 0.12, cut: 500, steps: [0, 3, 4] },
    bell: { type: 'sine', vol: 0.016, cut: 5000, oct: 12, len: 2 }, drums: { hat: [2, 6], kick: [0] } },
  // Sous-marin: slow, dreamy major sevenths, long notes like whale song.
  sea: { bpm: 68, chords: [[51, [63, 67, 70, 74]], [56, [63, 68, 72, 75]], [48, [63, 67, 70, 74]], [53, [65, 68, 72, 75]]],
    arp: [0, -1, 2, -1, 3, -1, 1, -1], lead: [2, -1, -1, -1, 3, -1, -1, -1, 1, -1, -1, -1, 0, -1, -1, -1],
    pad: { type: 'sine', vol: 0.05, cut: 700 }, bass: { type: 'sine', vol: 0.12, cut: 300, steps: [0] },
    bell: { type: 'sine', vol: 0.02, cut: 1800, oct: 24, len: 4 } },
  // Espace: wide minor ninths, sparse high bells with long tails.
  space: { bpm: 62, chords: [[45, [60, 64, 67, 71]], [41, [60, 64, 69, 72]], [48, [62, 67, 71, 74]], [43, [62, 65, 71, 74]]],
    arp: [3, -1, -1, 1, -1, -1, 2, -1], lead: [3, -1, -1, -1, -1, -1, 2, -1, 1, -1, -1, -1, -1, -1, -1, -1],
    pad: { type: 'sine', vol: 0.045, cut: 650 }, bass: { type: 'sine', vol: 0.12, cut: 250, steps: [0] },
    bell: { type: 'sine', vol: 0.02, cut: 9000, oct: 24, len: 6 } },
  // Glace: crystal bells over E major sevenths.
  ice: { bpm: 76, chords: [[40, [63, 66, 68, 71]], [49, [61, 64, 68, 71]], [45, [61, 64, 68, 69]], [47, [63, 66, 71, 73]]],
    arp: [0, 2, -1, 3, -1, 1, 2, -1], lead: [3, -1, 2, -1, 1, -1, 2, -1, 3, -1, -1, 1, 0, -1, -1, -1],
    pad: { type: 'sine', vol: 0.045, cut: 1400 }, bass: { type: 'sine', vol: 0.12, cut: 350, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.02, cut: 10000, oct: 24, len: 4 } },
  // Forêt: A dorian, a wooden flute and soft shakers.
  forest: { bpm: 80, chords: [[45, [60, 64, 67, 69]], [50, [60, 62, 66, 69]], [45, [60, 64, 67, 72]], [43, [59, 62, 67, 71]]],
    arp: [0, -1, -1, 2, -1, -1, 3, -1], lead: [0, -1, 1, 2, -1, 1, 0, -1, 2, -1, 3, -1, 2, 1, -1, -1],
    pad: { type: 'triangle', vol: 0.035, cut: 800 }, bass: { type: 'triangle', vol: 0.13, cut: 420, steps: [0, 3, 6] },
    bell: { type: 'triangle', vol: 0.018, cut: 3000, oct: 12, len: 1.5 }, drums: { hat: [1, 5], kick: [0] } },
  // Rétro: a nod to old consoles, kept soft: triangle tune, C - Am - F - G.
  retro: { bpm: 108, chords: [[36, [60, 64, 67, 72]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 71]]],
    arp: [0, 1, 2, 3, 2, 1, 0, 2], lead: [0, 1, 2, 3, 2, -1, 1, -1, 3, 2, 1, 0, 1, -1, -1, -1],
    pad: null, bass: { type: 'triangle', vol: 0.11, cut: 700, steps: [0, 2, 4, 6] },
    bell: { type: 'triangle', vol: 0.014, cut: 2500, oct: 12, len: 0.9 }, drums: { hat: [2, 6], snare: [4] } },
  // Arcade: mellow synthwave, warm pad and a steady kick.
  arcade: { bpm: 96, chords: [[45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [48, [60, 64, 67, 72]], [43, [59, 62, 67, 71]]],
    arp: [0, 2, 1, 3, 0, 2, 1, 3], lead: [2, -1, 3, -1, 2, 1, 0, -1, 1, -1, 2, -1, 3, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.04, cut: 1000 }, bass: { type: 'triangle', vol: 0.12, cut: 500, steps: [0, 3, 4, 6] },
    bell: { type: 'sine', vol: 0.014, cut: 3500, oct: 24, len: 1 }, drums: { kick: [0, 4], snare: [4], hat: [2, 6] } },
  // Volcan: dark E minor, slow and heavy, low drums.
  volcano: { bpm: 84, chords: [[40, [55, 59, 64, 67]], [36, [55, 60, 64, 67]], [45, [57, 60, 64, 69]], [47, [59, 63, 66, 71]]],
    arp: [0, -1, 1, 2, -1, 1, 3, -1], lead: [0, -1, -1, 1, 2, -1, -1, -1, 3, -1, 2, -1, 1, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.04, cut: 500 }, bass: { type: 'sine', vol: 0.14, cut: 350, steps: [0, 3, 4] },
    bell: { type: 'triangle', vol: 0.016, cut: 2500, oct: 12, len: 1.8 }, drums: { kick: [0, 3], snare: [6] } },
};
// Halloween: A minor with a creepy diminished turn.
const halloween: Song = { bpm: 84, chords: [[45, [57, 60, 64, 68]], [41, [57, 60, 65, 69]], [44, [56, 59, 62, 65]], [45, [57, 60, 64, 67]]],
  arp: [0, 2, 3, 2, 1, -1, 3, -1], lead: [3, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1, -1, -1],
  pad: { type: 'triangle', vol: 0.035, cut: 600 }, bass: { type: 'triangle', vol: 0.12, cut: 380, steps: [0, 3, 4, 6] },
  bell: { type: 'sine', vol: 0.02, cut: 6000, oct: 24, len: 2.5 }, drums: { kick: [0, 4], hat: [2, 6] } };
// Season events: Nouvel An swing with bells, Nouvel An chinois a pentatonic tune, Saint-Valentin soft
// major sevenths, Pâques a bright pastoral loop, Plage a lazy island groove, Noël sleigh bells over a I-vi-IV-V.
const SEASONS: Record<string, Song> = {
  newyear: { bpm: 100, chords: [[41, [57, 60, 64, 69]], [38, [57, 62, 65, 69]], [43, [59, 62, 67, 71]], [36, [60, 64, 67, 72]]],
    arp: [0, 2, 1, 3, 2, 1, 3, 2], lead: [0, 1, 2, -1, 3, -1, 2, 1, 2, -1, 1, -1, 0, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.035, cut: 1300 }, bass: { type: 'triangle', vol: 0.12, cut: 500, steps: [0, 2, 4, 6] },
    bell: { type: 'sine', vol: 0.02, cut: 9000, oct: 24, len: 1.6 }, drums: { kick: [0, 4], snare: [4], hat: [2, 6] } },
  lunar: { bpm: 90, chords: [[38, [62, 64, 67, 69]], [45, [64, 67, 69, 74]], [43, [62, 67, 69, 71]], [38, [62, 64, 69, 74]]],
    arp: [0, 1, 2, 3, 2, -1, 1, -1], lead: [0, 1, 2, -1, 3, -1, 2, -1, 1, -1, 0, -1, 1, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.03, cut: 1200 }, bass: { type: 'triangle', vol: 0.12, cut: 450, steps: [0, 4] },
    bell: { type: 'triangle', vol: 0.016, cut: 3000, oct: 12, len: 0.9 }, drums: { kick: [0], hat: [3, 6] } },
  valentine: { bpm: 72, chords: [[41, [57, 60, 64, 69]], [43, [59, 62, 65, 71]], [40, [55, 59, 64, 67]], [45, [57, 60, 64, 67]]],
    arp: [0, 1, 2, 3, 2, 1, -1, -1], lead: [2, -1, -1, 1, 2, -1, 3, -1, 1, -1, -1, 0, 1, -1, -1, -1],
    pad: { type: 'sine', vol: 0.05, cut: 1200 }, bass: { type: 'sine', vol: 0.12, cut: 350, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.018, cut: 6000, oct: 24, len: 2.5 } },
  easter: { bpm: 92, chords: [[43, [59, 62, 67, 71]], [48, [60, 64, 67, 72]], [40, [59, 64, 67, 71]], [50, [57, 62, 66, 69]]],
    arp: [0, -1, 2, 1, 3, -1, 1, -1], lead: [0, 1, 2, 1, 3, -1, 2, -1, 1, 2, 3, -1, 2, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.035, cut: 1500 }, bass: { type: 'triangle', vol: 0.12, cut: 450, steps: [0, 3, 4] },
    bell: { type: 'sine', vol: 0.018, cut: 5000, oct: 24, len: 1.2 }, drums: { hat: [2, 6] } },
  beach: { bpm: 86, chords: [[38, [57, 62, 66, 69]], [43, [59, 62, 67, 71]], [45, [57, 61, 64, 69]], [43, [59, 62, 67, 71]]],
    arp: [-1, 0, -1, 2, -1, 1, 3, -1], lead: [2, -1, 3, -1, -1, 2, 1, -1, 0, -1, 1, -1, 2, -1, -1, -1],
    pad: { type: 'sine', vol: 0.045, cut: 1000 }, bass: { type: 'sine', vol: 0.13, cut: 400, steps: [0, 3, 6] },
    bell: { type: 'triangle', vol: 0.018, cut: 3500, oct: 12, len: 1.4 }, drums: { kick: [0], hat: [2, 6] } },
  xmas: { bpm: 98, chords: [[36, [60, 64, 67, 72]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 71]]],
    arp: [0, 1, 2, 3, 2, 1, 0, -1], lead: [0, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 0, -1, -1, -1],
    pad: { type: 'triangle', vol: 0.035, cut: 1400 }, bass: { type: 'triangle', vol: 0.12, cut: 500, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.022, cut: 10000, oct: 24, len: 2 }, drums: { hat: [1, 3, 5, 7] } },
};
export const SONGS: Record<string, Song> = { ...SONGS_BASE, halloween, ...SEASONS };

export const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const stepSeconds = (song: Song) => 60 / song.bpm / 2; // eighth notes

// The lead: a flute-like voice, one octave above the chord tones.
export const LEAD: Voice = { type: 'triangle', vol: 0.045, cut: 2200 };

// What starts on one eighth-note step: tone voices (duration in steps, role = which instrument) and
// drum hits. calm (menus): no drums, a lighter lead.
export type Role = 'pad' | 'bass' | 'bell' | 'lead';
export type Plan =
  | { kind: 'voice'; role: Role; freq: number; steps: number; type: Wave; vol: number; cut: number }
  | { kind: 'hit'; drum: Drum };

// Steps a lead note lasts: itself and the holds after it, within the 16-step phrase.
function leadLen(lead: number[], at: number) {
  let n = 1;
  while (at + n < lead.length && lead[at + n] === -1) n++;
  return n;
}

export function stepPlan(song: Song, step: number, calm = false): Plan[] {
  const out: Plan[] = [];
  const bar = Math.floor(step / 8) % song.chords.length;
  const [root, tones] = song.chords[bar];
  const i = step % 8;
  if (i === 0 && song.pad) {
    for (const n of tones.slice(0, 3)) out.push({ kind: 'voice', role: 'pad', freq: hz(n), steps: 8, type: song.pad.type, vol: song.pad.vol, cut: song.pad.cut });
  }
  const b = song.bass;
  if (b.steps.includes(i)) out.push({ kind: 'voice', role: 'bass', freq: hz(root), steps: b.steps.length > 3 ? 1.6 : 3, type: b.type, vol: b.vol, cut: b.cut });
  // Music-box arpeggio high up; every 4th bar thins out.
  const a = song.arp[i];
  const bell = song.bell;
  if (a >= 0 && (step % 32 < 24 || i % 2 === 0)) out.push({ kind: 'voice', role: 'bell', freq: hz(tones[a] + bell.oct), steps: bell.len, type: bell.type, vol: bell.vol, cut: bell.cut });
  const at = step % 16;
  const l = song.lead[at];
  if (l >= 0) out.push({ kind: 'voice', role: 'lead', freq: hz(tones[l] + 12), steps: leadLen(song.lead, at), type: LEAD.type, vol: LEAD.vol * (calm ? 0.75 : 1), cut: LEAD.cut });
  if (song.drums && !calm) for (const [drum, hits] of Object.entries(song.drums) as [Drum, number[]][]) if (hits.includes(i)) out.push({ kind: 'hit', drum });
  return out;
}
