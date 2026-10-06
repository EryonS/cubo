// Cubo Blocks — Sound on react-native-audio-api (WebAudio for React Native): the context, the Synth
// behind sfx.ts and the music scheduler (legacy audio/sfx.js and audio/music.js, same synthesis).
// Gated by Paramètres > Sons / Musique; everything stops while the app is not in front.
import { AppState } from 'react-native';
import { AudioContext, AudioManager, type AudioBuffer, type GainNode, type OscillatorNode } from 'react-native-audio-api';
import { useGame } from '../state/store';
import { createSfx, type BiquadType, type Synth } from './sfx';
import { SONGS, stepPlan, stepSeconds, type Drum, type Plan, type Wave } from './songs';

let ac: AudioContext | null = null;
let active = AppState.currentState === 'active';

// Created on first use (after the app has launched), mixing with other apps and obeying the silent switch.
function context(): AudioContext | null {
  if (!ac) {
    try {
      AudioManager.setAudioSessionOptions({ iosCategory: 'ambient', iosMode: 'default', iosAllowHaptics: true });
      ac = new AudioContext();
    } catch { ac = null; }
  }
  return ac;
}

const settings = () => useGame.getState().saved.settings;
const liveCtx = () => (active && settings().sfx ? context() : null);

function whiteNoise(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = new Float32Array(buf.length);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  buf.copyToChannel(d, 0);
  return buf;
}

let noiseBuf: AudioBuffer | null = null;
const synth: Synth = {
  pluck(freq, dur = 0.25, vol = 0.1, delay = 0, bright = 3.9) {
    const c = liveCtx();
    if (!c) return;
    const t = c.currentTime + delay;
    for (const [mul, v, d] of [[1, vol, dur], [bright, vol * 0.35, dur * 0.25]] as const) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * mul, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + d + 0.02);
    }
  },
  glide(f0, f1, dur, type = 'sine', vol = 0.08, delay = 0) {
    const c = liveCtx();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur, vol, f0, f1 = f0, type: BiquadType = 'bandpass', delay = 0, q = 1.2) {
    const c = liveCtx();
    if (!c) return;
    noiseBuf ??= whiteNoise(c, 1);
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = noiseBuf;
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  },
};
export const sfx = createSfx(synth);

// ---------- music ----------
// Scheduled ahead by a small lookahead timer so it keeps time while the JS thread is busy drawing.
// Chain: each song on its own gain (so a new song crossfades over the old one's tails) → the music
// bus → a gentle lowpass → speakers, plus a send into a soft reverb.
const LOOKAHEAD = 0.35;
const LEVEL = 0.5;
const CALM_LEVEL = 0.38; // menus play softer
let bus: GainNode | null = null;
let songBus: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextAt = 0;
let songId = 'toy';
let calm = true;
let hiss: AudioBuffer | null = null;

// A soft hall: two seconds of decaying stereo noise.
function hall(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 2.2);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = new Float32Array(len);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    buf.copyToChannel(d, ch);
  }
  return buf;
}

function musicBus(c: AudioContext): GainNode {
  if (bus) return bus;
  bus = c.createGain();
  bus.gain.value = 0;
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 5200;
  bus.connect(tone).connect(c.destination);
  try {
    const verb = c.createConvolver();
    verb.buffer = hall(c);
    const wet = c.createGain();
    wet.gain.value = 0.32;
    tone.connect(verb).connect(wet).connect(c.destination);
  } catch { /* dry only */ }
  return bus;
}

// An envelope: attack to vol, hold, release to silence; returns the end time.
function envelope(g: GainNode, at: number, vol: number, attack: number, hold: number, release: number) {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + attack);
  if (hold > attack) g.gain.setValueAtTime(vol, at + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(hold, attack) + release);
  return at + Math.max(hold, attack) + release;
}

function osc(c: AudioContext, type: Wave, freq: number, at: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  return o;
}

// One note, voiced by its role: pad = two detuned voices swelling in, bass = round sine, bell = music
// box (fundamental + a quick octave shimmer), lead = flute with a late vibrato.
function voice(c: AudioContext, out: GainNode, p: Extract<Plan, { kind: 'voice' }>, at: number, stepSec: number) {
  const dur = p.steps * stepSec;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = p.cut;
  const g = c.createGain();
  f.connect(g).connect(out);
  const oscs: OscillatorNode[] = []; // into the filter
  const mods: OscillatorNode[] = []; // modulators: started and stopped with the note
  let end = at + dur;
  if (p.role === 'pad') {
    for (const cents of [-7, 7]) {
      const o = osc(c, p.type, p.freq, at);
      o.detune.value = cents;
      oscs.push(o);
    }
    end = envelope(g, at, p.vol, Math.min(1.2, dur * 0.4), dur, 0.9);
  } else if (p.role === 'bass') {
    oscs.push(osc(c, p.type, p.freq, at));
    end = envelope(g, at, p.vol, 0.03, dur * 0.5, dur * 0.6);
  } else if (p.role === 'bell') {
    oscs.push(osc(c, p.type, p.freq, at));
    const shimmer = osc(c, 'sine', p.freq * 2, at);
    const sg = c.createGain();
    envelope(sg, at, p.vol * 0.25, 0.004, 0, 0.25);
    shimmer.connect(sg).connect(out);
    shimmer.start(at);
    shimmer.stop(at + 0.3);
    end = envelope(g, at, p.vol, 0.004, 0, dur);
  } else {
    const o = osc(c, p.type, p.freq, at);
    const lfo = osc(c, 'sine', 5, at);
    const depth = c.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(p.freq * 0.006, at + Math.min(0.35, dur * 0.6));
    lfo.connect(depth).connect(o.frequency);
    oscs.push(o);
    mods.push(lfo);
    end = envelope(g, at, p.vol, 0.06, dur * 0.85, 0.3);
  }
  for (const o of oscs) o.connect(f);
  for (const o of [...oscs, ...mods]) {
    o.start(at);
    o.stop(end + 0.05);
  }
}

// Soft drums: kick = low thump, snare = brush, hat = shaker.
function hit(c: AudioContext, out: GainNode, kind: Drum, at: number) {
  if (kind === 'kick') {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(110, at);
    o.frequency.exponentialRampToValueAtTime(48, at + 0.14);
    g.gain.setValueAtTime(0.13, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    o.connect(g).connect(out);
    o.start(at); o.stop(at + 0.26);
    return;
  }
  hiss ??= whiteNoise(c, 0.3);
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = hiss;
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 6000 : 1200;
  const dur = kind === 'hat' ? 0.04 : 0.18;
  g.gain.setValueAtTime(kind === 'hat' ? 0.012 : 0.03, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at); src.stop(at + dur + 0.02);
}

function schedule() {
  const c = ac;
  if (!c || !songBus) return;
  const song = SONGS[songId];
  const stepSec = stepSeconds(song);
  while (nextAt < c.currentTime + LOOKAHEAD) {
    for (const p of stepPlan(song, step, calm)) {
      if (p.kind === 'voice') voice(c, songBus, p, nextAt, stepSec); else hit(c, songBus, p.drum, nextAt);
    }
    nextAt += stepSec;
    step += 1;
  }
}

// Starts the current song from its first bar on a fresh gain; the old one fades under it.
function freshSong(c: AudioContext) {
  const t = c.currentTime;
  const old = songBus;
  if (old) {
    old.gain.cancelScheduledValues(t);
    old.gain.setTargetAtTime(0, t, 0.25);
    setTimeout(() => old.disconnect(), 3000);
  }
  songBus = c.createGain();
  songBus.gain.setValueAtTime(0.0001, t);
  songBus.gain.setTargetAtTime(1, t + 0.1, 0.35);
  songBus.connect(musicBus(c));
  step = 0;
  nextAt = t + 0.08;
}

function startMusic() {
  const c = context();
  if (timer || !c) return;
  const b = musicBus(c);
  b.gain.cancelScheduledValues(c.currentTime);
  b.gain.setTargetAtTime(calm ? CALM_LEVEL : LEVEL, c.currentTime, 0.4);
  freshSong(c);
  timer = setInterval(schedule, 90);
  schedule();
}

function stopMusic() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  if (ac && bus) bus.gain.setTargetAtTime(0, ac.currentTime, 0.15);
}

// Which song plays: in a run, the theme being played; on the menus, the equipped theme's, calm.
let runTheme: string | null = null;
function retarget() {
  const id = runTheme ?? useGame.getState().profile.equipped.boards;
  const next = SONGS[id] ? id : 'toy';
  const nextCalm = runTheme == null;
  const c = ac;
  if (nextCalm !== calm) {
    calm = nextCalm;
    if (c && bus && timer) bus.gain.setTargetAtTime(calm ? CALM_LEVEL : LEVEL, c.currentTime, 0.5);
  }
  if (next === songId) return;
  songId = next;
  if (c && timer) freshSong(c);
}

// The game screen calls this with the run's theme while it is on screen (Pause and Paramètres from
// the pause keep it), and null when back on the menus.
export function musicScene(theme: string | null) {
  runTheme = theme;
  retarget();
}

let adHold = false;

// A rewarded ad is playing: the game's sound stays quiet until it closes (legacy ads onShow).
export function holdAudio(held: boolean) {
  adHold = held;
  syncAudio();
}

// Brings the sound in line with the settings and the app state: music while the app is in front
// and Musique is on; the whole context asleep in the background or under an ad.
export function syncAudio() {
  active = AppState.currentState === 'active';
  const c = context();
  if (!c) return;
  if (!active || adHold) {
    stopMusic();
    c.suspend().catch(() => {});
    return;
  }
  c.resume().catch(() => {});
  if (settings().music) startMusic(); else stopMusic();
}

// Wire once at start-up: app state and settings changes.
let wired = false;
export function wireAudio() {
  if (wired) return;
  wired = true;
  AppState.addEventListener('change', syncAudio);
  let last = settings();
  let board = useGame.getState().profile.equipped.boards;
  useGame.subscribe((s) => {
    const next = s.saved.settings;
    if (next.music !== last.music || next.sfx !== last.sfx) syncAudio();
    last = next;
    if (s.profile.equipped.boards !== board) { board = s.profile.equipped.boards; retarget(); }
  });
  retarget();
  syncAudio();
}
