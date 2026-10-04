// Cubo Blocks — Stats: per mode tiles, last scores, lifetime counters.
'use strict';

// ----- stats: one mode at a time (tiles + last scores), then lifetime counters -----
const STAT_MODES = () => [['classic', tr('Classique')], ['chrono', tr('Chrono')], ['chill', tr('Chill')], ['worlds', tr('Mondes')]];
const CHART_RUNS = 20;
let statsMode = 'classic';

function modeStatsHtml() {
  const ms = M.modeStats(profile, statsMode);
  const record = Math.max(ms.best, bests[statsMode] || 0);
  const tiles = [
    [tr('Parties'), fmt(ms.games)],
    [tr('Record'), fmt(record)],
    [tr('Moyenne'), ms.games ? fmt(Math.round(ms.total / ms.games)) : '–'],
    [tr('Meilleur combo'), ms.bestCombo ? '×' + ms.bestCombo : '–'],
  ];
  return `
      <div class="seg pills stat-modes no-swipe">${STAT_MODES().map(([id, name]) => `<button data-smode="${id}" class="${id === statsMode ? 'on' : ''}">${name}</button>`).join('')}</div>
      <div class="stat-tiles">${tiles.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      ${scoreChart(M.recentScores(profile, statsMode, CHART_RUNS))}`;
}

// Last scores as bars, oldest left. One series: accent bars, the best one labeled; tap a bar for its value.
function scoreChart(scores) {
  if (!scores.length) return tr('<div class="chart-empty">Tes prochaines parties dans ce mode s’afficheront ici.</div>');
  const W0 = 300;
  const H0 = 96;
  const top = 16;
  const max = Math.max(...scores, 1);
  const slot = W0 / CHART_RUNS;
  const bw = slot - 2; // 2px surface gap between bars
  const peak = scores.indexOf(Math.max(...scores));
  const bars = scores.map((v, i) => {
    const h = Math.max(3, ((H0 - top) * v) / max);
    const x = i * slot + 1;
    const y = H0 - h;
    const r = Math.min(4, h, bw / 2);
    // Rounded data end, square on the baseline.
    const d = `M${x},${H0}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${H0}Z`;
    return `<g class="bar" data-v="${v}" data-n="${i + 1}"><rect x="${i * slot}" y="0" width="${slot}" height="${H0}" fill="transparent"/><path d="${d}"/><title>${tr`${fmt(v)} points`}</title></g>`;
  }).join('');
  const px = peak * slot + 1 + bw / 2;
  const label = `<text x="${Math.min(W0 - 4, Math.max(4, px))}" y="${H0 - Math.max(3, ((H0 - top) * scores[peak]) / max) - 4}" text-anchor="${px < 30 ? 'start' : px > W0 - 30 ? 'end' : 'middle'}">${fmt(scores[peak])}</text>`;
  return `
      <div class="chart">
        <svg viewBox="0 0 ${W0} ${H0 + 1}" role="img" aria-label="${tr`Scores des ${scores.length} dernières parties`}">${bars}<line x1="0" x2="${W0}" y1="${H0 + 0.5}" y2="${H0 + 0.5}"/>${label}</svg>
        <div class="chart-cap" id="chart-cap">${tr`${scores.length} dernière${scores.length > 1 ? 's' : ''} partie${scores.length > 1 ? 's' : ''} · meilleure : ${fmt(scores[peak])}`}</div>
      </div>`;
}

function statsHtml() {
  const lt = profile.lifetime || {};
  const dailies = Object.values(profile.daily || {}).filter((d) => d.stars !== undefined).length;
  const rows = [
    [tr('Parties jouées'), fmt(lt.games || 0)],
    [tr('Meilleur score (tous modes)'), fmt(lt.score || 0)],
    [tr('Meilleur combo'), lt.bestCombo ? '×' + lt.bestCombo : '–'],
    [tr('Lignes effacées'), fmt(lt.lines || 0)],
    [tr('Formes posées'), fmt(lt.pieces || 0)],
    [tr('Grilles vidées'), fmt(lt.perfects || 0)],
    [tr('Bonus utilisés'), fmt(lt.bonusUsed || 0)],
    [tr('Pièces gagnées'), fmt(lt.coinsEarned || 0)],
    [tr('Étoiles en Aventure'), `${M.totalStars(profile)} / ${M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3}`],
    [tr('Niveaux du jour réussis'), fmt(dailies)],
    [tr('Plus longue série'), tr`${M.streakOf(profile).best} jours`],
  ];
  return modeStatsHtml() + `<div class="section-title">${tr('Depuis le début')}</div><div class="stats">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
}
