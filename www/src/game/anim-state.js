// Cubo Blocks — Animation state shared by the game flow and the renderer.
'use strict';

// ---------- animation state ----------
let displayScore = state.score;
let drag = null;        // { idx, x, y, lift, t0 }
let returning = [];     // pieces flying back to the tray
let pops = [];          // freshly placed cells
let fades = [];         // cleared cells shrinking out
let particles = [];
let floaters = [];      // "+120" texts
let banners = [];       // queue of big center texts, shown one after another
let shake = 0;
// Per-slot timestamps, sized for the Puzzle surprise tray (up to 12 slots).
const MAX_SLOTS = 12;
let slotIn = new Array(MAX_SLOTS).fill(now()); // slide-in
let slotSpin = new Array(MAX_SLOTS).fill(0);   // rotate animation
let nextIn = now();                 // "next" preview slide-in timestamp
let overAt = 0;
let aiming = null;      // bomb targeting: { cell: [r, c] | null, pid }
let flyers = [];        // bonus icons flying from the board to the inventory
// Combo feel: light sweeping cleared lines, board punch, combo tag pop / break.
let sweeps = [];        // { row | col, t0 }
let punch = null;       // { t0, amp }
let comboAt = 0;        // last time the combo grew
let comboBreak = null;  // { t0, n } the combo that just broke
// Aventure motion. tracks: final board index -> fall segments [{ t0, dur, from, to }] (rows).
// shifts: rows sliding with the sea current. drops: special cells landing or growing.
let tracks = new Map();
let shifts = [];
let drops = new Map();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const calm = () => reducedMotion.matches;
const WAVE_MS = 430;   // gravity chain: time between two clear waves
const FALL_AFTER = 240; // falls start once the wave's cells have faded
const fallMs = (rows) => 110 + 55 * rows;
