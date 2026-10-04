// Cubo Blocks — Sound effects: the WebAudio context, synth voices and sfx.*.
'use strict';

// ---------- audio ----------
let ac = null;
function unlockAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume();
  music.sync();
}
// The game goes quiet while a native ad plays its own sound.
CuboBlocksAds.onShow = (showing) => { if (ac) (showing ? ac.suspend() : ac.resume()); };
const semis = (base, n) => base * Math.pow(2, n / 12);
const live = () => settings.sfx && ac;

// Toy instruments. pluck: xylophone / music-box bar (fundamental + a bright partial that dies fast).
function pluck(freq, dur = 0.25, vol = 0.1, delay = 0, bright = 3.9) {
  if (!live()) return;
  const t = ac.currentTime + delay;
  for (const [mul, v, d] of [[1, vol, dur], [bright, vol * 0.35, dur * 0.25]]) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * mul, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  }
}
// Pitch slide: slide whistle, boing, pop.
function glide(f0, f1, dur, type = 'sine', vol = 0.08, delay = 0) {
  if (!live()) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
// Filtered noise: clicks, cracks, whooshes, sizzles. f0 -> f1 sweeps the filter.
let noiseBuf = null;
function noise(dur, vol, f0, f1 = f0, type = 'bandpass', delay = 0, q = 1.2) {
  if (!live()) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  src.buffer = noiseBuf;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const sfx = {
  pick: () => pluck(1046, 0.06, 0.05),
  // Wooden toy block on a table.
  place: () => { pluck(262, 0.12, 0.2, 0, 2.76); noise(0.025, 0.05, 2500, 2500, 'highpass'); },
  toss: () => glide(700, 180, 0.2, 'triangle', 0.07),
  undo: () => glide(380, 760, 0.14, 'sine', 0.08),
  tick: (hi) => pluck(hi ? 1568 : 1175, 0.05, 0.05),
  time: () => [0, 7].forEach((st, i) => pluck(semis(1046, st), 0.18, 0.06, i * 0.05)),
  nope: () => glide(240, 150, 0.16, 'square', 0.035),
  // Xylophone run up the pentatonic scale; longer for more lines, higher with the combo.
  clear: (lines, combo) => {
    const base = semis(392, Math.min(combo - 1, 10) * 2);
    PENTA.slice(0, 2 + Math.min(lines, 4) * 2).forEach((st, i) => pluck(semis(base, st), 0.3, 0.09, i * 0.045));
  },
  // Slide whistle down, then a low bar.
  over: () => { glide(880, 196, 0.75, 'triangle', 0.07); pluck(131, 0.5, 0.12, 0.75, 2.76); },
  turn: () => pluck(1568, 0.06, 0.05),
  bonus: () => [0, 4, 7, 12, 16].forEach((st, i) => pluck(semis(1046, st), 0.4, 0.05, i * 0.06, 3)),
  collect: () => [0, 12].forEach((st, i) => pluck(semis(1319, st), 0.3, 0.05, 0.35 + i * 0.08, 2.4)),
  mission: () => [0, 4, 7, 12, 7, 12, 16].forEach((st, i) => pluck(semis(523, st), 0.35, 0.08, 0.3 + i * 0.07)),
  coin: (i) => pluck(semis(1976, (i % 5) * 2), 0.14, 0.04, 0, 2.4),
  buy: () => [0, 4, 7, 12, 16].forEach((st, i) => pluck(semis(523, st), 0.35, 0.09, i * 0.06)),
  bomb: () => { glide(170, 38, 0.45, 'sawtooth', 0.2); noise(0.5, 0.25, 1200, 150, 'lowpass'); },
  // Aventure.
  land: () => { pluck(147, 0.14, 0.14, 0, 2); noise(0.04, 0.04, 800, 800, 'lowpass'); },
  crack: () => { noise(0.09, 0.12, 5000, 2500, 'highpass'); pluck(2349, 0.06, 0.03); },
  pop: () => glide(420, 1400, 0.07, 'sine', 0.1),
  thunk: () => { glide(190, 55, 0.2, 'sine', 0.22); noise(0.12, 0.08, 600, 200, 'lowpass'); },
  sizzle: () => noise(0.35, 0.05, 4500, 3000, 'bandpass', 0, 0.8),
  grow: () => glide(300, 760, 0.16, 'triangle', 0.06),
  swoosh: () => noise(0.4, 0.09, 350, 2200, 'bandpass', 0, 2),
  star: (i) => pluck(semis(784, [0, 4, 7][i] || 12), 0.45, 0.1, 0, 3),
  // Combo tier reached: a sparkle run on top of the clear, longer for higher tiers.
  sparkle: (tier) => [0, 7, 12, 16, 19, 24].slice(0, 3 + tier).forEach((st, i) => pluck(semis(1568, st), 0.25, 0.04, 0.12 + i * 0.045, 2.4)),
  // Combo lost: a small deflating slide.
  fizzle: () => { glide(520, 170, 0.3, 'triangle', 0.05); noise(0.2, 0.025, 3000, 700, 'bandpass'); },
};
