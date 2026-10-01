// Cubo Blocks — Generative music: one song per world (SONGS) and the scheduler.
'use strict';

// Generative loop, one song per world (the theme played: a world's in Aventure and dailies, else
// the equipped one). Pad chords, a bass line, a bell arpeggio and, for some, light drums.
// Scheduled ahead with a small lookahead timer so it keeps time while the main thread is busy.
// Song fields: bpm, chords [[bass root, chord tones]] (MIDI, one per bar of 8 eighth notes),
// arp (tone index per step, -1 = rest), pad / bass / bell { type, vol, cut }, bass.steps,
// bell.oct (semitones up) and bell.len (in steps), drums { kick, snare, hat } step lists.
const SONGS = {
  // Toy: I - vi - IV - V in D, music box.
  toy: { bpm: 92, chords: [[50, [62, 66, 69, 73]], [47, [59, 62, 66, 69]], [43, [59, 62, 67, 71]], [45, [61, 64, 69, 73]]],
    arp: [0, 2, 1, 3, 2, 1, -1, 3], pad: { type: 'triangle', vol: 0.05, cut: 900 }, bass: { type: 'sine', vol: 0.16, cut: 400, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.03, cut: 8000, oct: 24, len: 2.4 } },
  // Plaine: bouncy G major, I - V - vi - IV, flute-like triangle lead.
  plain: { bpm: 104, chords: [[43, [67, 71, 74, 79]], [50, [66, 69, 74, 78]], [52, [67, 71, 76, 79]], [48, [64, 67, 72, 76]]],
    arp: [0, 1, 2, 1, 3, 2, 1, 2], pad: { type: 'triangle', vol: 0.035, cut: 1200 }, bass: { type: 'triangle', vol: 0.14, cut: 600, steps: [0, 3, 4, 6] },
    bell: { type: 'triangle', vol: 0.03, cut: 5000, oct: 12, len: 1.4 }, drums: { hat: [2, 6], kick: [0, 4] } },
  // Sous-marin: slow, dreamy major sevenths, bubbles low in the filter.
  sea: { bpm: 74, chords: [[51, [63, 67, 70, 74]], [56, [63, 68, 72, 75]], [48, [63, 67, 70, 74]], [53, [65, 68, 72, 75]]],
    arp: [0, -1, 2, -1, 3, -1, 1, -1], pad: { type: 'sine', vol: 0.06, cut: 700 }, bass: { type: 'sine', vol: 0.14, cut: 300, steps: [0] },
    bell: { type: 'sine', vol: 0.035, cut: 1800, oct: 12, len: 3 } },
  // Espace: wide minor ninths, sparse high bells with long tails.
  space: { bpm: 68, chords: [[45, [60, 64, 67, 71]], [41, [60, 64, 69, 72]], [48, [62, 67, 71, 74]], [43, [62, 65, 71, 74]]],
    arp: [3, -1, -1, 1, -1, -1, 2, -1], pad: { type: 'sawtooth', vol: 0.025, cut: 650 }, bass: { type: 'sine', vol: 0.14, cut: 250, steps: [0] },
    bell: { type: 'sine', vol: 0.03, cut: 9000, oct: 24, len: 6 } },
  // Glace: crystal bells over E major sevenths.
  ice: { bpm: 84, chords: [[40, [63, 66, 68, 71]], [49, [61, 64, 68, 71]], [45, [61, 64, 68, 69]], [47, [63, 66, 71, 73]]],
    arp: [0, 2, 3, 2, 1, 3, 2, -1], pad: { type: 'sine', vol: 0.05, cut: 1500 }, bass: { type: 'sine', vol: 0.13, cut: 350, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.03, cut: 10000, oct: 24, len: 3.5 } },
  // Forêt: A dorian groove with wood-block clicks.
  forest: { bpm: 88, chords: [[45, [60, 64, 67, 69]], [50, [60, 62, 66, 69]], [45, [60, 64, 67, 72]], [43, [59, 62, 67, 71]]],
    arp: [0, 1, -1, 2, 1, -1, 3, 1], pad: { type: 'triangle', vol: 0.04, cut: 800 }, bass: { type: 'triangle', vol: 0.15, cut: 450, steps: [0, 3, 6] },
    bell: { type: 'triangle', vol: 0.03, cut: 3000, oct: 12, len: 1.2 }, drums: { hat: [1, 3, 5, 7], kick: [0] } },
  // Rétro: chiptune in squares, C - Am - F - G.
  retro: { bpm: 126, chords: [[36, [60, 64, 67, 72]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 71]]],
    arp: [0, 1, 2, 3, 2, 1, 0, 2], pad: null, bass: { type: 'square', vol: 0.05, cut: 1200, steps: [0, 1, 2, 3, 4, 5, 6, 7] },
    bell: { type: 'square', vol: 0.025, cut: 4000, oct: 12, len: 0.8 }, drums: { hat: [2, 6], snare: [4] } },
  // Arcade: synthwave, pulsing saw bass, kick and snare.
  arcade: { bpm: 108, chords: [[45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [48, [60, 64, 67, 72]], [43, [59, 62, 67, 71]]],
    arp: [0, 2, 1, 3, 0, 2, 1, 3], pad: { type: 'sawtooth', vol: 0.03, cut: 1100 }, bass: { type: 'sawtooth', vol: 0.07, cut: 600, steps: [0, 1, 2, 3, 4, 5, 6, 7] },
    bell: { type: 'square', vol: 0.02, cut: 3500, oct: 12, len: 1 }, drums: { kick: [0, 4], snare: [2, 6], hat: [1, 3, 5, 7] } },
  // Volcan: dark E minor, heavy toms.
  volcano: { bpm: 96, chords: [[40, [55, 59, 64, 67]], [36, [55, 60, 64, 67]], [45, [57, 60, 64, 69]], [47, [59, 63, 66, 71]]],
    arp: [0, -1, 1, 2, -1, 1, 3, -1], pad: { type: 'sawtooth', vol: 0.03, cut: 500 }, bass: { type: 'sawtooth', vol: 0.09, cut: 350, steps: [0, 2, 3, 6] },
    bell: { type: 'triangle', vol: 0.03, cut: 2500, oct: 12, len: 1.6 }, drums: { kick: [0, 3, 4], snare: [6] } },
};
SONGS.halloween = { bpm: 92, chords: [[45, [57, 60, 64, 68]], [41, [57, 60, 65, 69]], [44, [56, 59, 62, 65]], [45, [57, 60, 64, 67]]],
  arp: [0, 2, 3, 2, 1, -1, 3, -1], pad: { type: 'sawtooth', vol: 0.025, cut: 600 }, bass: { type: 'triangle', vol: 0.14, cut: 380, steps: [0, 3, 4, 6] },
  bell: { type: 'sine', vol: 0.035, cut: 6000, oct: 24, len: 2.5 }, drums: { kick: [0, 4], hat: [2, 6] } }; // Halloween: A minor with a creepy diminished turn
// Season events: Nouvel An swing with bells, Saint-Valentin soft waltz-y major sevenths, Pâques a
// bright pastoral loop, Plage a lazy island groove, Noël sleigh bells over a I-vi-IV-V.
Object.assign(SONGS, {
  newyear: { bpm: 116, chords: [[41, [57, 60, 64, 69]], [38, [57, 62, 65, 69]], [43, [59, 62, 67, 71]], [36, [60, 64, 67, 72]]],
    arp: [0, 2, 1, 3, 2, 1, 3, 2], pad: { type: 'triangle', vol: 0.04, cut: 1400 }, bass: { type: 'triangle', vol: 0.14, cut: 500, steps: [0, 2, 4, 6] },
    bell: { type: 'sine', vol: 0.035, cut: 9000, oct: 24, len: 1.4 }, drums: { kick: [0, 4], snare: [2, 6], hat: [1, 3, 5, 7] } },
  // Nouvel An chinois: a major pentatonic tune with woodblock and gong-like kicks.
  lunar: { bpm: 100, chords: [[38, [62, 64, 67, 69]], [45, [64, 67, 69, 74]], [43, [62, 67, 69, 71]], [38, [62, 64, 69, 74]]],
    arp: [0, 1, 2, 3, 2, -1, 1, -1], pad: { type: 'triangle', vol: 0.035, cut: 1300 }, bass: { type: 'triangle', vol: 0.14, cut: 450, steps: [0, 4] },
    bell: { type: 'square', vol: 0.02, cut: 3000, oct: 12, len: 0.7 }, drums: { kick: [0], hat: [2, 3, 6] } },
  valentine: { bpm: 80, chords: [[41, [57, 60, 64, 69]], [43, [59, 62, 65, 71]], [40, [55, 59, 64, 67]], [45, [57, 60, 64, 67]]],
    arp: [0, 1, 2, 3, 2, 1, -1, -1], pad: { type: 'sine', vol: 0.06, cut: 1200 }, bass: { type: 'sine', vol: 0.13, cut: 350, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.03, cut: 6000, oct: 12, len: 2.5 } },
  easter: { bpm: 104, chords: [[43, [59, 62, 67, 71]], [48, [60, 64, 67, 72]], [40, [59, 64, 67, 71]], [50, [57, 62, 66, 69]]],
    arp: [0, 1, 2, 1, 3, 2, 1, 2], pad: { type: 'triangle', vol: 0.04, cut: 1600 }, bass: { type: 'triangle', vol: 0.14, cut: 450, steps: [0, 3, 4] },
    bell: { type: 'triangle', vol: 0.03, cut: 5000, oct: 12, len: 1 }, drums: { hat: [2, 6] } },
  beach: { bpm: 96, chords: [[38, [57, 62, 66, 69]], [43, [59, 62, 67, 71]], [45, [57, 61, 64, 69]], [43, [59, 62, 67, 71]]],
    arp: [-1, 0, -1, 2, -1, 1, 3, -1], pad: { type: 'sine', vol: 0.05, cut: 1000 }, bass: { type: 'sine', vol: 0.15, cut: 400, steps: [0, 3, 6] },
    bell: { type: 'triangle', vol: 0.03, cut: 3500, oct: 12, len: 1.2 }, drums: { kick: [0, 5], hat: [2, 6] } },
  xmas: { bpm: 112, chords: [[36, [60, 64, 67, 72]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 71]]],
    arp: [0, 1, 2, 3, 2, 1, 0, -1], pad: { type: 'triangle', vol: 0.04, cut: 1500 }, bass: { type: 'triangle', vol: 0.14, cut: 500, steps: [0, 4] },
    bell: { type: 'sine', vol: 0.04, cut: 10000, oct: 24, len: 1.8 }, drums: { hat: [0, 1, 2, 3, 4, 5, 6, 7] } },
});
const music = (() => {
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let bus = null;
  let timer = null;
  let step = 0;
  let nextAt = 0;
  let song = SONGS.toy;
  let songId = 'toy';
  let hiss = null;

  function voice(freq, at, dur, type, vol, cutoff, attack = Math.min(0.4, dur * 0.3)) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(f).connect(g).connect(bus);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  // Drums: kick = pitch drop, snare / hat = filtered noise bursts.
  function hit(kind, at) {
    if (kind === 'kick') {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.setValueAtTime(140, at);
      o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
      g.gain.setValueAtTime(0.22, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      o.connect(g).connect(bus);
      o.start(at); o.stop(at + 0.25);
      return;
    }
    if (!hiss) {
      hiss = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
      const d = hiss.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource();
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    src.buffer = hiss;
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const dur = kind === 'hat' ? 0.05 : 0.16;
    g.gain.setValueAtTime(kind === 'hat' ? 0.03 : 0.07, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(at); src.stop(at + dur + 0.02);
  }

  function schedule() {
    const STEP = 60 / song.bpm / 2; // eighth notes
    while (nextAt < ac.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % song.chords.length;
      const [root, tones] = song.chords[bar];
      const i = step % 8;
      if (i === 0 && song.pad) {
        for (const n of tones.slice(0, 3)) voice(hz(n), nextAt, STEP * 8.4, song.pad.type, song.pad.vol, song.pad.cut);
      }
      const b = song.bass;
      if (b.steps.includes(i)) voice(hz(root), nextAt, STEP * (b.steps.length > 4 ? 0.9 : 3), b.type, b.vol, b.cut, 0.01);
      const a = song.arp[i];
      const bell = song.bell;
      // Bell arpeggio: instant attack, bell-like decay; every 4th bar thins out.
      if (a >= 0 && (step % 32 < 24 || i % 2 === 0)) voice(hz(tones[a] + bell.oct), nextAt, STEP * bell.len, bell.type, bell.vol, bell.cut, 0.005);
      if (song.drums) for (const [kind, at] of Object.entries(song.drums)) if (at.includes(i)) hit(kind, nextAt);
      nextAt += STEP;
      step += 1;
    }
  }

  function start() {
    if (timer || !ac) return;
    if (!bus) {
      bus = ac.createGain();
      bus.gain.value = 0;
      bus.connect(ac.destination);
    }
    bus.gain.cancelScheduledValues(ac.currentTime);
    bus.gain.setTargetAtTime(0.5, ac.currentTime, 0.4);
    nextAt = ac.currentTime + 0.1;
    timer = setInterval(schedule, 90);
    schedule();
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    bus.gain.setTargetAtTime(0, ac.currentTime, 0.15);
  }

  // A new world: fade out, switch song from its first bar, fade back in.
  let switching = 0;
  function pick(id) {
    const next = SONGS[id] ? id : 'toy';
    if (next === songId) return;
    songId = next;
    song = SONGS[next];
    step = 0;
    if (!timer) return;
    stop();
    clearTimeout(switching);
    switching = setTimeout(() => { switching = 0; sync(); }, 400);
  }

  // Menus play the equipped theme's song, like they wear its look; a run plays its world's.
  const MENUS = '.overlay.hub.show, #adventure.show, #event.show, #puzzles.show, #stage.show, #free.show';
  function sync() {
    pick(document.querySelector(MENUS) ? profile.equipped.boards : themeId());
    if (switching) return;
    if (settings.music && ac && !document.hidden) start(); else stop();
  }
  return { sync };
})();
document.addEventListener('visibilitychange', () => music.sync());
