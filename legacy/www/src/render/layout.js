// Cubo Blocks — Layout: board, tray and HUD geometry for the current screen size.
'use strict';

// ---------- layout ----------
const invEl = document.getElementById('inventory');
const trashEl = document.getElementById('trash');
const bgCanvas = document.createElement('canvas');
let W, H, dpr, lay;

function paintBackground() {
  bgCanvas.width = Math.round(W * dpr);
  bgCanvas.height = Math.round(H * dpr);
  const g = bgCanvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  theme().paint(g, W, H);
  applyThemeCss();
}

// Wide screens: menu screens float as cards, so the canvas behind them shows the equipped
// theme's decor instead of the run in progress (phones fill the screen with the menu).
const menuBgCanvas = document.createElement('canvas');
let menuBgKey = '';
const menuTheme = () => THEMES[profile.equipped.boards] || THEMES.toy;
const menuDecorShown = () => W > 600 && document.querySelector('.overlay.screen.show') !== null;
function menuBackground() {
  const key = `${profile.equipped.boards}|${W}x${H}@${dpr}`;
  if (key !== menuBgKey) {
    menuBgKey = key;
    menuBgCanvas.width = Math.round(W * dpr);
    menuBgCanvas.height = Math.round(H * dpr);
    const g = menuBgCanvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    menuTheme().paint(g, W, H);
  }
  return menuBgCanvas;
}

// HUD buttons, inventory and in-game cards follow the theme played (a world's in Aventure).
// Menu screens and the tab bar always wear the equipped theme, so they look the same everywhere.
const fontVar = (th) => (th.font === PIXEL_FONT ? '"Press Start 2P UI", ui-monospace, monospace' : th.font); // narrower pixel face, as th.scale on canvas
function themeVars(th) {
  return { ...th.css, '--font-display': fontVar(th), '--display-style': th.italic ? 'italic' : 'normal' };
}
const menuThemeEl = document.head.appendChild(document.createElement('style'));
function applyThemeCss() {
  const th = theme();
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(themeVars(th))) root.setProperty(k, v);
  const menu = THEMES[profile.equipped.boards] || THEMES.toy;
  menuThemeEl.textContent = `.overlay.ui, #tabbar { ${Object.entries(themeVars(menu)).map(([k, v]) => `${k}: ${v};`).join(' ')} color: var(--text); }`;
  document.body.dataset.theme = themeId();
  syncStatusBar();
}

// iPhone status bar (theme-color): a menu screen's own color,
// else the background of the world played.
function syncStatusBar() {
  const meta = document.querySelector('meta[name="theme-color"]');
  const screen = [...document.querySelectorAll('.overlay.screen.show')].find((el) => !/\bout-(left|right)\b/.test(el.className));
  const color = screen ? getComputedStyle(screen.querySelector('.card')).backgroundColor : theme().base;
  if (meta.getAttribute('content') === color) return;
  meta.setAttribute('content', color);
  nativeStatusBar(color);
}
// Native app: the same color through @capacitor/status-bar, dark icons on a light background.
// ('LIGHT' is the style for light backgrounds.) Android also takes the bar color.
const statusBarPlugin = window.Capacitor && Capacitor.isNativePlatform() && Capacitor.Plugins.StatusBar;
function nativeStatusBar(color) {
  if (!statusBarPlugin) return;
  const [r, g, b] = (color.match(/\d+(\.\d+)?/g) || [255, 255, 255]).map(Number);
  const light = 0.299 * r + 0.587 * g + 0.114 * b > 150;
  statusBarPlugin.setStyle({ style: light ? 'LIGHT' : 'DARK' }).catch(() => {});
  if (Capacitor.getPlatform() === 'android') {
    const hex = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    statusBarPlugin.setBackgroundColor({ color: hex }).catch(() => {});
  }
}

// env(safe-area-inset-top) is only readable through CSS.
const safeProbe = document.createElement('div');
safeProbe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none';
document.body.appendChild(safeProbe);

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  const safeTop = safeProbe.offsetHeight;
  // HUD buttons, then the score band right above the board frame (Cubo stands at its right end).
  const bandH = H < 760 ? 50 : 60;
  const bandGap = 14; // room under the band for the combo tag hung from it
  const topH = safeTop + 66 + bandH + bandGap + 10;
  const invH = 64;
  const maxBoard = Math.min(W - 32, 440);
  // board + gap (1 cell: hints, chrono) + tray (2.7 cells) + inventory must fit below the HUD
  const cell = Math.floor(Math.min(maxBoard / SIZE, (H - topH - invH - 24) / (SIZE + 3.7)));
  const board = cell * SIZE;
  const bx = Math.round((W - board) / 2);
  const used = board + cell * 3.7 + invH;
  const by = Math.round(topH + Math.max(0, (H - topH - used) * 0.5));
  const ty = by + board + cell;
  // Three tray slots, then a narrow column announcing the next piece.
  const slotW = board / 3.6;
  lay = { cell, board, bx, by, ty, trayH: cell * 2.7, slotW, nextX: bx + slotW * 3, nextW: board - slotW * 3,
    safeTop, band: { x: bx - 10, y: by - 10 - bandGap - bandH, w: board + 20, h: bandH } };
  invEl.style.top = Math.round(ty + lay.trayH) + 'px';
  trashEl.style.top = Math.round(ty + lay.trayH) + 'px';
  trashEl.style.width = board + 'px';
  paintBackground();
}
window.addEventListener('resize', resize);
// iOS can resolve env(safe-area-inset-top) after the first layout: lay out again when it lands.
if (window.ResizeObserver) new ResizeObserver(() => { if (safeProbe.offsetHeight !== lay.safeTop) resize(); }).observe(safeProbe);
resize();
