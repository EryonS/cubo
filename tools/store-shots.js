// App Store screenshots (dev only, not shipped). Plays the real game in Chromium at iPhone 6.9"
// size (440x956 @3x = 1320x2868), then lays each capture in a phone frame under a caption.
// Usage: npx http-server -p 8123 . &   then   node tools/store-shots.js [out dir]
// Needs Playwright (global install is fine: NODE_PATH=$(npm root -g)).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const L = require('../src/logic.js');
require('../src/worlds.js');
const LV = require('../src/levels.js');
const M = require('../src/meta.js');
const { bestMove } = require('./bot.js');

const URL = 'http://localhost:8123/index.html';
const OUT = path.resolve(process.argv[2] || 'store/app-store/iphone-6.9');
const RAW = path.join(OUT, 'raw');
const W = 1320, H = 2868; // iPhone 6.9" portrait, the one size App Store Connect requires
const NB = ' '; // French thin space before ! ? :

// A bot game frozen mid-run: board about a third full, a combo going, bonuses on the grid.
function midRun(opts, score) {
  let best = null;
  for (let seed = 1; seed < 60; seed++) {
    let s = L.createGame(seed * 104729, opts);
    for (let k = 0; k < 40 && !s.over && !(s.stage && s.stage.won); k++) {
      const r = bestMove(s);
      if (!r) break;
      s = r.state;
      const filled = s.board.filter(Boolean).length;
      const extras = s.bonus.filter(Boolean).length + (s.special || []).filter(Boolean).length;
      const inv = Object.values(s.inventory).reduce((a, b) => a + b, 0);
      const v = (filled >= 22 && filled <= 36 ? 60 : 0) + s.combo * 8 + extras * 12 + inv * 10;
      if (k > 8 && !s.over && (!best || v > best.v)) best = { v, s };
    }
  }
  return { ...best.s, undo: null, ...(score ? { score } : {}) };
}

// A player a few days in: three worlds played, some themes owned, a 12-day streak.
function profile(theme) {
  const p = M.createProfile(new Date().toISOString().slice(0, 10));
  const stars = {};
  M.WORLD_ORDER.slice(0, 3).forEach((w, wi) => {
    for (let i = 1; i <= (wi < 2 ? 20 : 7); i++) stars[`${w}-${i}`] = (i * 7 + wi) % 5 === 0 ? 2 : 3;
  });
  const tips = Object.fromEntries(['tutorial', 'bonus', 'coins', 'chrono', 'chill', 'puzzle', 'worlds', 'daily', 'adventure',
    'stuck', 'stuck-puzzle', 'stuck-chill'].map((t) => [t, true]));
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return { ...p, coins: 2480, games: 42, tips, adventure: { stars },
    owned: { blocks: ['classic', 'neon'], boards: ['toy', 'plain', 'sea', 'space'] },
    equipped: { blocks: 'classic', boards: theme },
    streak: { count: 12, best: 12, lastDay: yesterday, freezes: 1 } };
}

const classic = midRun(undefined, 3450);
const space = midRun({ mode: 'adventure', stage: LV.level('space', 8) });

// name, theme, saved run (over = none in progress), what to tap once the home menu shows.
const CAPTURES = [
  ['classic', 'toy', classic, ['#menu-continue']],
  ['space', 'space', space, ['#menu-continue']],
  ['sea', 'sea', classic, ['#menu-continue']],
  ['puzzle', 'toy', { ...classic, over: true }, ['#menu-puzzles', '#puzzles-list button']],
  ['world', 'toy', { ...classic, over: true }, ['#menu-map', '#worlds > :nth-child(3)']],
  ['defis', 'toy', classic, ['#tabbar button:nth-child(2)']],
  ['shop', 'toy', classic, ['#tabbar button:nth-child(3)']],
];

// Caption, subline, background, text color. Order = order on the store page.
const SLIDES = [
  ['classic', `Pose. Efface.<br>Enchaîne${NB}!`, 'Le puzzle de blocs tout doux, à jouer d\'une main', 'linear-gradient(#ffeef4, #ffd6e5)', '#4a3a66', '#7c5cff'],
  ['space', '8 mondes,<br>160 niveaux', 'Astéroïdes, glace, lave : chaque monde a sa règle', 'linear-gradient(#1b1440, #3a1f6e)', '#ffffff', '#ffd23f'],
  ['sea', 'Des bonus<br>explosifs', 'Toupie, Étoile, Bulle, Bombe, Tornade', 'linear-gradient(#0d3b66, #0a6c8f)', '#ffffff', '#7ff0ff'],
  ['puzzle', '40 puzzles<br>à compléter', 'Remplis le dessin avec les formes données', 'linear-gradient(#e9fbf2, #b7f0d8)', '#1e4d3a', '#1f9e68'],
  ['world', 'Étoiles, coffres<br>et boss', 'Bats l\'épreuve et le boss de chaque monde', 'linear-gradient(#fff4d6, #ffd9a0)', '#5a3a12', '#e07b00'],
  ['defis', 'Un défi<br>chaque jour', 'Garde ta série et remplis tes missions', 'linear-gradient(#ffe9e4, #ffc2b3)', '#5b2333', '#ff5d7a'],
  ['shop', '9 mondes<br>à débloquer', 'Des thèmes complets, pas juste des couleurs', 'linear-gradient(#efe9ff, #cfc2ff)', '#3a2a7a', '#7c5cff'],
];

async function capture(browser) {
  fs.mkdirSync(RAW, { recursive: true });
  for (const [name, theme, run, taps] of CAPTURES) {
    const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'light' });
    const seed = [JSON.stringify(profile(theme)), JSON.stringify({ state: run, bests: { classic: 8120 }, settings: { sfx: false, music: false }, prefs: {} })];
    await ctx.addInitScript(([pr, st]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem('gridlock.profile.v1', pr);
      localStorage.setItem('gridlock.v2', st);
      sessionStorage.setItem('seeded', '1');
    }, seed);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1200);
    for (const sel of taps) { await page.click(sel); await page.waitForTimeout(800); }
    await page.waitForTimeout(3500); // level banners gone
    await page.screenshot({ path: path.join(RAW, name + '.png') });
    await ctx.close();
    console.log('captured', name);
  }
}

function slideHtml([name, title, sub, bg, ink, accent]) {
  const font = 'file://' + path.resolve(__dirname, '../fonts/baloo2.woff2');
  const shot = 'file://' + path.join(RAW, name + '.png');
  const PW = 960, PH = Math.round(PW * 2868 / 1320), B = 26; // phone screen size and bezel
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Baloo 2'; src: url('${font}'); font-weight: 400 800; }
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  body { background: ${bg}; font-family: 'Baloo 2', sans-serif; color: ${ink}; position: relative; }
  body::before { content: ''; position: absolute; inset: 0; opacity: .18;
    background: radial-gradient(circle, ${accent} 5px, transparent 6px) 0 0 / 64px 64px; }
  .cap { position: absolute; top: 150px; left: 0; right: 0; text-align: center; }
  h1 { margin: 0; font-size: 150px; line-height: .98; font-weight: 800; letter-spacing: -1px; }
  p { margin: 34px 90px 0; font-size: 54px; font-weight: 700; opacity: .85; line-height: 1.15; text-wrap: balance; }
  .phone { position: absolute; left: ${(W - PW) / 2 - B}px; top: 680px; width: ${PW}px; height: ${PH}px; padding: ${B}px;
    background: #16121f; border-radius: 140px; box-shadow: 0 40px 90px rgba(20, 10, 40, .35), inset 0 0 0 5px #3a3450; }
  .screen { width: 100%; height: 100%; border-radius: 116px; background: url('${shot}') center / cover; position: relative; }
  </style></head><body>
  <div class="cap"><h1>${title}</h1><p>${sub}</p></div>
  <div class="phone"><div class="screen"></div></div>
  </body></html>`;
}

async function compose(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  let i = 0;
  for (const slide of SLIDES) {
    const file = path.join(OUT, `.slide.html`);
    fs.writeFileSync(file, slideHtml(slide));
    await page.goto('file://' + file);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const out = path.join(OUT, `${String(++i).padStart(2, '0')}-${slide[0]}.png`);
    await page.screenshot({ path: out });
    fs.unlinkSync(file);
    console.log('composed', path.relative(process.cwd(), out));
  }
}

(async () => {
  const browser = await chromium.launch();
  if (!process.argv.includes('--compose-only')) await capture(browser);
  await compose(browser);
  await browser.close();
})();
