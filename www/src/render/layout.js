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
  if (meta.getAttribute('content') !== color) meta.setAttribute('content', color);
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
  // Tall screens: HUD buttons, then the score sign + combo tag right above the board.
  // Short screens: the sign moves up between the HUD buttons when it fits (wide screens),
  // otherwise it gets a slimmer row of its own right under them (phones).
  const short = H < 760;
  const compact = short && hudGap() >= 150;
  const slim = short && !compact;
  const topH = compact ? safeTop + 118 : slim ? safeTop + 62 + 88 : safeTop + 62 + 116;
  const invH = 64;
  const maxBoard = Math.min(W - 32, 440);
  // board + gap (1 cell: hints, chrono) + tray (3.4 cells) + inventory must fit below the HUD
  const cell = Math.floor(Math.min(maxBoard / SIZE, (H - topH - invH - 24) / (SIZE + 4.4)));
  const board = cell * SIZE;
  const bx = Math.round((W - board) / 2);
  const used = board + cell * 4.4 + invH;
  const by = Math.round(topH + Math.max(0, (H - topH - used) * 0.5));
  const ty = by + board + cell;
  // Three tray slots, then a narrow column announcing the next piece.
  const slotW = board / 3.6;
  lay = { cell, board, bx, by, ty, trayH: cell * 3.4, slotW, nextX: bx + slotW * 3, nextW: board - slotW * 3, compact,
    plateY: compact ? safeTop + 10 : slim ? safeTop + 60 : by - 116, plateH: compact || slim ? 58 : 72 };
  invEl.style.top = Math.round(ty + lay.trayH) + 'px';
  trashEl.style.top = Math.round(ty + lay.trayH) + 'px';
  trashEl.style.width = board + 'px';
  paintBackground();
}
// Width left for the score sign, centered between the wallet and the right HUD buttons.
// The wallet is counted at least 110px wide so a growing coin count never overlaps the sign.
function hudGap() {
  const wallet = document.getElementById('wallet').getBoundingClientRect();
  const missions = document.getElementById('missions-open');
  const right = (missions.offsetParent ? missions : document.getElementById('undo')).getBoundingClientRect();
  const walletRight = Math.max(wallet.right, wallet.left + 110);
  return 2 * Math.min(W / 2 - walletRight, right.left - W / 2) - 16;
}
window.addEventListener('resize', resize);
resize();
