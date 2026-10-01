// Injected into www/index.html by tools/make_icons.py: draws the app icons and the splash with the
// game's own Cubo (drawCubo) and block skin (drawBlock). Returns { path: dataURL }.
window.cuboIcons = () => {
  const TOY = THEMES.toy.palette || PALETTE;
  // Cubo sitting on a row of three toy blocks, on the Jouet pink. safe: share of the canvas used.
  function icon(size, safe, bg = true) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    if (bg) {
      const grad = g.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#fff1f7');
      grad.addColorStop(1, '#ffd3e4');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
    }
    const u = (size * safe) / 100; // artwork units: 100 across the safe area
    const cx = size / 2;
    const base = size / 2 + 22 * u;
    const prev = ctx;
    ctx = g;
    const cell = 22 * u;
    [TOY[9], TOY[4], TOY[6]].forEach((color, i) => drawBlock(cx + (i - 1) * cell, base + cell / 2 - 2 * u, cell, color));
    drawCubo(0, { x: cx, y: base - 3 * u, s: 52 * u, C: cuboLookFor('toy', 'auto'), mood: 'happy' });
    ctx = prev;
    return cv.toDataURL('image/png');
  }
  function splash(size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffeef4';
    g.fillRect(0, 0, size, size);
    const img = new Image();
    return new Promise((done) => {
      img.onload = () => { const s = size * 0.3; g.drawImage(img, (size - s) / 2, (size - s) / 2, s, s); done(cv.toDataURL('image/png')); };
      img.src = icon(1024, 0.92, false);
    });
  }
  // Android adaptive icon: the launcher masks the layers (circle, squircle...) and only the middle
  // 66 % is always visible, so the artwork shrinks on a transparent foreground.
  function background(size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#fff1f7');
    grad.addColorStop(1, '#ffd3e4');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return cv.toDataURL('image/png');
  }
  return splash(2732).then((sp) => ({
    'www/icons/icon-512.png': icon(512, 0.92),
    'www/icons/icon-192.png': icon(192, 0.92),
    'www/icons/apple-touch-icon.png': icon(180, 0.92),
    'www/icons/icon-maskable-512.png': icon(512, 0.7),
    'resources/icon-only.png': icon(1024, 0.92),
    'resources/icon-foreground.png': icon(1024, 0.68, false),
    'resources/icon-background.png': background(1024),
    'resources/splash.png': sp,
  }));
};
