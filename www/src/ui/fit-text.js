// Cubo Blocks — Shrinks button labels that do not fit.
'use strict';

// ---------- button text fit ----------
// Button labels stay on one line: a label too long for its button (narrow phone, 3 buttons in a row,
// long word like "Recommencer") shrinks its font until it fits. Runs after any screen shows or changes.
const FIT = '.btn, .tab, .ptab, .seg button, .hero-go, .home-head .brand, .shop-head h2';
// The label must fit inside the padding on both sides: scrollWidth leaves the right padding out
// on Safari, so the text is measured with a range against the content box.
const fitRange = document.createRange();
function overflows(el, room) {
  fitRange.selectNodeContents(el);
  return fitRange.getBoundingClientRect().width > room + 0.5;
}
function fitText(root = document) {
  // French spacing before ! ? : stays unbreakable, so a title never ends on a lone "!".
  for (const h of root.querySelectorAll('.card h2')) {
    for (const n of h.childNodes) if (n.nodeType === 3 && / [!?:;]/.test(n.data)) n.data = n.data.replace(/ ([!?:;])/g, '\u00a0$1');
  }
  for (const el of root.querySelectorAll(FIT)) {
    if (el.style.fontSize) el.style.fontSize = '';
    if (!el.clientWidth) continue;
    const cs = getComputedStyle(el);
    const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let size = parseFloat(cs.fontSize);
    while (size > 11 && overflows(el, room)) el.style.fontSize = --size + 'px';
  }
}
let fitQueued = false;
const queueFit = () => {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; for (const el of document.querySelectorAll('.overlay.show')) fitText(el); });
};
const fitWatch = new MutationObserver(queueFit);
for (const el of document.querySelectorAll('.overlay')) fitWatch.observe(el, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true, characterData: true });
addEventListener('resize', queueFit);
document.fonts.ready.then(queueFit);
