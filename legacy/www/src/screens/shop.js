// Cubo Blocks — Wallet and Boutique.
'use strict';

// ---------- wallet & shop ----------
const walletEl = document.getElementById('wallet');
let runCoinsShown = 0; // coins picked up this run, landed in the wallet animation

function renderWallet() {
  // The logic mirrors the wallet to know if a paid discard / undo can still save a stuck game.
  const synced = L.withBudget(state, profile.coins);
  if (synced !== state) {
    const wasOver = state.over;
    state = synced;
    if (state.over && !wasOver) endGame(now());
    renderUndo();
  }
  document.getElementById('wallet-coins').textContent = fmt(profile.coins);
  const pending = document.getElementById('wallet-pending');
  pending.textContent = runCoinsShown && !runSettled ? '+' + runCoinsShown : '';
  document.getElementById('shop-coins').textContent = fmt(profile.coins);
  document.getElementById('menu-coins').textContent = fmt(profile.coins);
  document.getElementById('defis-coins').textContent = fmt(profile.coins);
  renderHint();
}
walletEl.addEventListener('animationend', () => walletEl.classList.remove('bump'));
// Tapping the coins (HUD wallet, menu headers) opens the Boutique; a run in progress waits behind.
function coinsToShop() {
  if (tut) return;
  sfx.turn();
  leaveBoard();
  goTab('shop');
}
walletEl.addEventListener('click', coinsToShop);
for (const b of document.querySelectorAll('[data-shop]')) b.addEventListener('click', coinsToShop);

const shopEl = document.getElementById('shop');
const shopBody = document.getElementById('shop-body');
let shopTab = 'boards';

function openShop() {
  unlockAudio();
  const rolled = M.ensureDay(profile, today());
  if (rolled !== profile) { profile = rolled; saveProfile(); resetAnnounced(); }
  setAiming(false);
  renderShop();
  shopEl.classList.add('show');
}
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => { shopTab = tab.dataset.tab; renderShop(); });
}

function renderShop(justBought) {
  renderWallet();
  for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('on', tab.dataset.tab === shopTab);
  shopBody.innerHTML = '';
  if (shopTab === 'bonus') { renderUpgrades(justBought); return; }
  const kind = shopTab;
  const grid = document.createElement('div');
  grid.className = 'skins';
  for (const skin of M.SKINS[kind]) {
    const owned = profile.owned[kind].includes(skin.id);
    const equipped = profile.equipped[kind] === skin.id;
    const card = document.createElement('div');
    card.className = 'skin' + (justBought === skin.id ? ' just-bought' : '');
    const cv = document.createElement('canvas');
    cv.width = 240; cv.height = 180;
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = skin.name;
    const btn = document.createElement('button');
    if (equipped) { btn.className = 'equipped'; btn.textContent = tr('Équipé'); }
    else if (owned) { btn.className = 'equip'; btn.textContent = tr('Équiper'); }
    else if (skin.price == null) { btn.className = 'exclusive'; btn.textContent = skin.exclusive; btn.disabled = true; }
    else {
      btn.className = 'buy';
      btn.innerHTML = COIN + ' ' + fmt(skin.price);
      btn.disabled = profile.coins < skin.price;
    }
    btn.addEventListener('click', () => {
      if (equipped) return;
      const next = owned ? M.equip(profile, kind, skin.id) : M.buy(profile, kind, skin.id);
      if (!next) { nope(); return; }
      profile = next;
      if (!owned) {
        for (const line of stickerLines()) banners.push({ text: tr('Autocollant !'), sub: line.label.replace(tr('Autocollant : '), '') + ' · +' + line.coins, subIcon: 'coin', gold: true });
      }
      saveProfile();
      if (kind === 'boards') paintBackground();
      if (owned) sfx.turn(); else { sfx.buy(); haptic('buy'); }
      renderShop(owned ? null : skin.id);
    });
    card.append(cv, name);
    if (kind === 'boards' && !owned && M.WORLD_ORDER.includes(skin.id)) {
      const via = document.createElement('div');
      via.className = 'via';
      via.textContent = tr('Ou bats son boss');
      card.appendChild(via);
    }
    card.appendChild(btn);
    grid.appendChild(card);
    if (kind === 'cubo') drawCuboPreview(cv, skin.id);
    else drawPreview(cv, kind === 'blocks' ? skin.id : profile.equipped.blocks, kind === 'boards' ? skin.id : profile.equipped.boards);
  }
  shopBody.appendChild(grid);
}

// Bonus tab: each bonus goes up to level 3. Bought levels apply to the run in progress too.
function renderUpgrades(justBought) {
  const list = document.createElement('div');
  list.className = 'ups';
  for (const [type, ui] of Object.entries(BONUS_UI)) {
    const lv = M.upgradeLevel(profile, type);
    const price = M.upgradePrice(profile, type);
    const row = document.createElement('div');
    row.className = 'up' + (justBought === type ? ' just-bought' : '');
    const cv = document.createElement('canvas');
    const px = Math.round(40 * Math.min(window.devicePixelRatio || 1, 3));
    cv.width = px; cv.height = px;
    drawIcon(type, px / 2, px / 2, px * 0.94, cv.getContext('2d'));
    const txt = document.createElement('div');
    txt.className = 'txt';
    txt.innerHTML = '<b><span></span><span class="lv"></span></b><span></span>';
    txt.querySelector('b > span').textContent = ui.name;
    txt.querySelector('.lv').innerHTML = [1, 2, 3].map((k) => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('');
    txt.querySelector('.lv').setAttribute('aria-label', tr`Niveau ${lv} sur ${L.UPGRADE_MAX}`);
    txt.lastChild.textContent = price == null ? ui.levels[lv - 1] + tr(' · niveau max') : `${ui.levels[lv - 1]} → ${ui.levels[lv]}`;
    const btn = document.createElement('button');
    if (price == null) { btn.className = 'max'; btn.textContent = tr('Max'); btn.disabled = true; }
    else {
      btn.innerHTML = COIN + ' ' + fmt(price);
      btn.disabled = profile.coins < price;
      btn.setAttribute('aria-label', tr`Améliorer ${ui.name} pour ${price} pièces`);
    }
    btn.addEventListener('click', () => {
      const next = M.buyUpgrade(profile, type);
      if (!next) { nope(); return; }
      profile = next;
      state = { ...state, upgrades: { ...profile.upgrades } };
      saveProfile();
      save();
      refreshBonusTexts();
      sfx.buy(); haptic('buy');
      renderShop(type);
    });
    row.append(cv, txt, btn);
    list.appendChild(row);
  }
  shopBody.appendChild(list);
  const note = document.createElement('p');
  note.className = 'ups-note';
  note.textContent = tr('Les améliorations comptent dans tous les modes, même dans la partie en cours.');
  shopBody.appendChild(note);
}

// Cubo wearing a wardrobe piece, on the equipped theme's background.
function drawCuboPreview(cv, wear, themeKey = profile.equipped.boards) {
  const g = cv.getContext('2d');
  const th = THEMES[themeKey] || THEMES.toy;
  th.paint(g, cv.width, cv.height);
  drawFrame(g, th, 40, cv.height - 34, cv.width - 80, 60);
  const prev = ctx;
  ctx = g;
  drawCubo(0, { x: cv.width / 2, y: cv.height - 34, s: 84, C: cuboLookFor(themeKey, wear), mood: 'happy' });
  ctx = prev;
}

// Mini scene rendered with the real theme and skin code: score sign over a patch of board.
function drawPreview(cv, blocksId, boardsId) {
  const g = cv.getContext('2d');
  const w = cv.width;
  const h = cv.height;
  const th = THEMES[boardsId];
  th.paint(g, w, h);
  const cell = 30;
  const cols = 5;
  const rows = 3;
  const ox = (w - cols * cell) / 2;
  const oy = 64;
  const pw = 132;
  drawPlate(g, th.plate, (w - pw) / 2, 12, pw, 40);
  g.textAlign = 'center';
  g.fillStyle = th.plate.ink;
  g.font = themeFont(th, 26);
  if (th.plate.glow) { g.shadowColor = th.plate.glow; g.shadowBlur = 10; }
  g.fillText(fmt(12480), w / 2, 42);
  g.shadowColor = 'transparent';
  drawFrame(g, th, ox - 7, oy - 7, cols * cell + 14, rows * cell + 14);
  const pattern = [
    [6, 6, 0, 11, 0],
    [6, 6, 11, 11, 3],
    [9, 0, 11, 4, 3],
  ];
  const prev = ctx;
  ctx = g;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + (c + 0.5) * cell;
      const y = oy + (r + 0.5) * cell;
      drawEmpty(g, th, x, y, cell);
      const v = pattern[r][c];
      if (v) drawBlock(x, y, cell, paletteOf(th)[v], 1, 1, null, BLOCK_SKINS[blocksId], v);
    }
  }
  ctx = prev;
}
