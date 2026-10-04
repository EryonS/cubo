// Cubo Blocks — Sound on react-native-audio-api (WebAudio for React Native): the context, the Synth
// behind sfx.ts and the music scheduler (legacy audio/sfx.js and audio/music.js, same synthesis).
// Gated by Réglages > Sons / Musique; everything stops while the app is not in front.
import { AppState } from 'react-native';
import { AudioContext, AudioManager, type AudioBuffer, type GainNode } from 'react-native-audio-api';
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
const LOOKAHEAD = 0.35;
let bus: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextAt = 0;
let songId = 'toy';
let hiss: AudioBuffer | null = null;

function voice(c: AudioContext, b: GainNode, p: Extract<Plan, { kind: 'voice' }>, at: number, stepSec: number) {
  const dur = p.steps * stepSec;
  const attack = p.attack ?? Math.min(0.4, dur * 0.3);
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = p.cut;
  o.type = p.type as Wave;
  o.frequency.value = p.freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(p.vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(f).connect(g).connect(b);
  o.start(at);
  o.stop(at + dur + 0.05);
}

// Drums: kick = pitch drop, snare / hat = filtered noise bursts.
function hit(c: AudioContext, b: GainNode, kind: Drum, at: number) {
  if (kind === 'kick') {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(0.22, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    o.connect(g).connect(b);
    o.start(at); o.stop(at + 0.25);
    return;
  }
  hiss ??= whiteNoise(c, 0.3);
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = hiss;
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const dur = kind === 'hat' ? 0.05 : 0.16;
  g.gain.setValueAtTime(kind === 'hat' ? 0.03 : 0.07, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(b);
  src.start(at); src.stop(at + dur + 0.02);
}

function schedule() {
  const c = ac;
  if (!c || !bus) return;
  const song = SONGS[songId];
  const stepSec = stepSeconds(song);
  while (nextAt < c.currentTime + LOOKAHEAD) {
    for (const p of stepPlan(song, step)) {
      if (p.kind === 'voice') voice(c, bus, p, nextAt, stepSec); else hit(c, bus, p.drum, nextAt);
    }
    nextAt += stepSec;
    step += 1;
  }
}

function startMusic() {
  const c = context();
  if (timer || !c) return;
  if (!bus) {
    bus = c.createGain();
    bus.gain.value = 0;
    bus.connect(c.destination);
  }
  bus.gain.cancelScheduledValues(c.currentTime);
  bus.gain.setTargetAtTime(0.5, c.currentTime, 0.4);
  nextAt = c.currentTime + 0.1;
  timer = setInterval(schedule, 90);
  schedule();
}

function stopMusic() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  if (ac && bus) bus.gain.setTargetAtTime(0, ac.currentTime, 0.15);
}

// A new world: switch song from its first bar (the menus play the equipped theme's song).
export function pickSong(id: string) {
  const next = SONGS[id] ? id : 'toy';
  if (next === songId) return;
  songId = next;
  step = 0;
}

// Brings the sound in line with the settings and the app state: music while the app is in front
// and Musique is on; the whole context asleep in the background.
export function syncAudio() {
  active = AppState.currentState === 'active';
  const c = context();
  if (!c) return;
  if (!active) {
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
  useGame.subscribe((s) => {
    const next = s.saved.settings;
    if (next.music !== last.music || next.sfx !== last.sfx) syncAudio();
    last = next;
  });
  syncAudio();
}
