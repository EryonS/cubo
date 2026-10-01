// Cubo Blocks — Horizontal swipe between tabs and worlds.
'use strict';

// ---------- swipe ----------
// Calls cb(1) on a quick swipe to the left (next), cb(-1) to the right (previous). Vertical scrolls,
// slow drags, and gestures that start on a horizontal scroller (.no-swipe) are ignored.
// only: a selector the gesture must start in (the calendar inside the Défis page).
function onSwipe(el, cb, only) {
  let start = null;
  el.addEventListener('pointerdown', (e) => {
    const off = e.pointerType === 'mouse' || e.target.closest('.no-swipe') || (only && !e.target.closest(only));
    start = off ? null : { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  el.addEventListener('pointercancel', () => { start = null; });
  el.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y, dt = performance.now() - start.t;
    start = null;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.6 || dt > 700) return;
    swallowClick(el);
    cb(dx < 0 ? 1 : -1);
  });
}
// A swipe that ends on a button must not also press it. The next touch clears the guard.
function swallowClick(el) {
  const stop = (e) => { e.stopPropagation(); e.preventDefault(); off(); };
  const off = () => {
    el.removeEventListener('click', stop, { capture: true });
    el.removeEventListener('pointerdown', off, { capture: true });
  };
  el.addEventListener('click', stop, { capture: true });
  el.addEventListener('pointerdown', off, { capture: true });
  setTimeout(off, 400);
}
