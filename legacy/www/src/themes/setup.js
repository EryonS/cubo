// Cubo Blocks — Theme helpers (palettes, css tokens, gradients) used by the theme tables.
'use strict';

// ---------- themes ----------
// A theme is a whole visual world: background, board, score plate, fonts and the menu colors (css).
// paint() draws the static background once per resize; animate() runs every frame.
// plate: the score pill. tag: the combo pill under it. frame: the board slab.
// Optional: palette (block colors, same indexes as PALETTE), scale (display font size factor),
// shadow (drop shadow color of plate and frame).
// The worlds match the Aventure map; in Classique / Chrono / Chill they are purely cosmetic.
const TOY_PALETTE = [
  null, '#b8a4f0', '#ffab76', '#ffcf4d', '#6fd6a0', '#5ccfe6', '#6ea8ff', '#8b7cf6',
  '#d49cff', '#ff8fb8', '#b6e36b', '#ff7a8a', '#3fc1b0', '#a3b1c9', '#e0b07a',
];
// Menu tokens: dark worlds share these defaults, light worlds override the translucent ones.
const css = (o) => ({
  '--scheme': 'dark', '--good': '#5ee08a', '--hairline': 'rgba(255,255,255,0.12)', '--sunken': 'rgba(0,0,0,0.3)',
  '--scrim': 'rgba(6,7,10,0.72)', '--card-bw': '2px', '--card-bb': '2px', '--card-glow': '0 0 0 transparent', '--plate-edge': 'inset 0 0 0 1.5px var(--edge)',
  ...o,
});
const lightCss = (o) => css({
  '--scheme': 'light', '--hairline': 'rgba(74,58,102,0.14)', '--sunken': 'rgba(74,58,102,0.1)', '--scrim': 'rgba(74,58,102,0.45)',
  '--card-bw': '0px', '--card-bb': '6px', '--plate-edge': 'inset 0 -3px 0 var(--edge)',
  ...o,
});

function vGradient(g, h, stops) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
}
// A rolling hill line from y0, filled down to the bottom.
function hills(g, w, h, y0, amp, color, phase, waves = 1.5) {
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 2 * waves + phase) * amp);
  g.lineTo(w, h); g.fill();
}
// Position along a looping track: offset + t * speed, wrapped into [-pad, span + pad].
const loop = (v, span, pad) => ((((v + pad) % (span + pad * 2)) + span + pad * 2) % (span + pad * 2)) - pad;
