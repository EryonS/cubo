// Cubo Blocks — Bursts and hearts thrown by Cubo.
'use strict';

function drawBurst(C, x, y, size, alpha, rot) {
  const kind = C.burst || 'heart';
  if (kind === 'heart') { drawHeart(x, y, size, alpha); return; }
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'petal') {
    ctx.fillStyle = '#ffb3cf';
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(Math.cos(k * 1.257) * size * 0.45, Math.sin(k * 1.257) * size * 0.45, size * 0.38, size * 0.24, k * 1.257, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'bubble') {
    ctx.strokeStyle = '#e6f8ff'; ctx.lineWidth = size * 0.14;
    ctx.fillStyle = 'rgba(160,225,255,0.3)';
    ctx.beginPath(); ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-size * 0.22, -size * 0.22, size * 0.13, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'star' || kind === 'spark') {
    ctx.fillStyle = kind === 'star' ? '#ffe066' : '#ffb000';
    if (kind === 'spark') { ctx.shadowColor = '#ff4a00'; ctx.shadowBlur = size * 0.8; }
    ctx.beginPath();
    const pts = kind === 'star' ? 5 : 4;
    for (let k = 0; k < pts * 2; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / pts;
      const r = k % 2 ? size * (kind === 'star' ? 0.3 : 0.18) : size * 0.75;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  } else if (kind === 'snow') {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = size * 0.14;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      ctx.beginPath(); ctx.moveTo(-Math.cos(a) * size * 0.65, -Math.sin(a) * size * 0.65); ctx.lineTo(Math.cos(a) * size * 0.65, Math.sin(a) * size * 0.65); ctx.stroke();
    }
  } else if (kind === 'leaf') {
    ctx.fillStyle = C.leaf;
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.65, size * 0.32, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.leafDark; ctx.lineWidth = size * 0.08;
    ctx.beginPath(); ctx.moveTo(-size * 0.45, size * 0.3); ctx.lineTo(size * 0.45, -size * 0.3); ctx.stroke();
  } else if (kind === 'pixel') {
    // A heart made of 7x6 squares, like a console sprite.
    const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
    const u = size * 0.22;
    ctx.fillStyle = C.ink;
    rows.forEach((row, r) => { for (let c = 0; c < 7; c++) if (row[c] === '1') ctx.fillRect((c - 3.5) * u, (r - 3) * u, u, u); });
  } else if (kind === 'bat') {
    ctx.fillStyle = '#3a2a5a';
    const f = Math.sin(rot * 6) * 0.5 + 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-size * 0.5, -size * f, -size * 1.1, -size * 0.1);
    ctx.quadraticCurveTo(-size * 0.6, size * 0.25, 0, size * 0.3);
    ctx.quadraticCurveTo(size * 0.6, size * 0.25, size * 1.1, -size * 0.1);
    ctx.quadraticCurveTo(size * 0.5, -size * f, 0, 0);
    ctx.fill();
  } else if (kind === 'note') {
    ctx.fillStyle = '#36f9ff'; ctx.strokeStyle = '#36f9ff'; ctx.lineWidth = size * 0.13;
    ctx.shadowColor = '#36f9ff'; ctx.shadowBlur = size * 0.6;
    ctx.beginPath(); ctx.ellipse(-size * 0.2, size * 0.4, size * 0.24, size * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(size * 0.02, size * 0.38); ctx.lineTo(size * 0.02, -size * 0.6); ctx.quadraticCurveTo(size * 0.35, -size * 0.45, size * 0.45, -size * 0.1); ctx.stroke();
  }
  ctx.restore();
}

function drawHeart(x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = '#ff5d8f';
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size, y - size * 0.3, x - size * 0.4, y - size, x, y - size * 0.4);
  ctx.bezierCurveTo(x + size * 0.4, y - size, x + size, y - size * 0.3, x, y + size * 0.35);
  ctx.fill();
  ctx.restore();
}
