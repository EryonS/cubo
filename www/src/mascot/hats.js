// Cubo Blocks — Cubo head pieces: per theme looks and the wardrobe.
'use strict';

// One head piece per look. layer 'back' is drawn before the body, 'front' after the face.
function drawCuboHat(C, layer, cx, top, sw, sh, s, sway, t, still) {
  const hat = C.hat;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (layer === 'back' && (hat === 'sprout' || hat === 'flower' || hat === 'pixel')) {
    ctx.translate(cx, top + s * 0.04);
    ctx.rotate(hat === 'pixel' ? 0 : sway);
    if (hat === 'pixel') {
      // Blocky sprout: little squares, like the console's sprites.
      const u = s * 0.07;
      ctx.fillStyle = C.leafDark;
      ctx.fillRect(-u / 2, -u * 2.5, u, u * 2.5);
      ctx.fillStyle = C.leaf;
      ctx.fillRect(-u * 2.5, -u * 3.5, u * 2, u); ctx.fillRect(-u * 1.5, -u * 2.5, u, u);
      ctx.fillStyle = C.leafDark;
      ctx.fillRect(u * 0.5, -u * 3.5, u * 2, u); ctx.fillRect(u * 0.5, -u * 2.5, u, u);
    } else {
      const stem = hat === 'flower' ? 0.24 : 0.16;
      ctx.strokeStyle = C.leafDark; ctx.lineWidth = s * 0.05;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * stem); ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.fillStyle = side < 0 ? C.leaf : C.leafDark;
        ctx.beginPath(); ctx.ellipse(side * s * 0.1, -s * (hat === 'flower' ? 0.12 : 0.2), s * 0.12, s * 0.06, side * -0.5, 0, Math.PI * 2); ctx.fill();
      }
      if (hat === 'flower') {
        // A daisy on the stem.
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3 + (still ? 0 : t / 2600);
          ctx.beginPath(); ctx.ellipse(Math.cos(a) * s * 0.07, -s * 0.3 + Math.sin(a) * s * 0.07, s * 0.055, s * 0.035, a, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.045, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (layer === 'back' && hat === 'flame') {
    // A little flame flickering on top.
    const f = still ? 1 : 1 + Math.sin(t / 110) * 0.08;
    ctx.translate(cx, top + s * 0.06);
    for (const [col, k] of [['#ff5a2a', 1], ['#ffd23f', 0.55]]) {
      const h = s * 0.32 * k * f;
      const w = s * 0.13 * k;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-w * 1.5, -h * 0.35, -w * 0.2 + sway * w, -h);
      ctx.quadraticCurveTo(w * 1.2, -h * 0.5, w, -h * 0.15);
      ctx.quadraticCurveTo(w * 0.8, 0, 0, 0);
      ctx.fill();
    }
  } else if (layer === 'front' && hat === 'starfish') {
    ctx.translate(cx + sw * 0.2, top + sh * 0.04);
    ctx.rotate(-0.25 + sway * 0.4);
    ctx.fillStyle = '#ff9f43'; ctx.strokeStyle = '#d9692a'; ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? s * 0.06 : s * 0.15;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd6a8';
    for (const [dx, dy] of [[0, -0.07], [0.05, 0], [-0.05, 0]]) { ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.012, 0, Math.PI * 2); ctx.fill(); }
  } else if (layer === 'front' && hat === 'beanie') {
    // Knit beanie with a pompom, folded brim.
    const y0 = top + sh * 0.18;
    ctx.fillStyle = '#ff5d73';
    ctx.beginPath(); ctx.moveTo(cx - sw * 0.46, y0); ctx.quadraticCurveTo(cx - sw * 0.4, top - sh * 0.32, cx, top - sh * 0.34);
    ctx.quadraticCurveTo(cx + sw * 0.4, top - sh * 0.32, cx + sw * 0.46, y0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = s * 0.025;
    for (const k of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(cx + k * sw, y0 - sh * 0.05); ctx.lineTo(cx + k * sw * 0.8, top - sh * 0.22); ctx.stroke(); }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(cx - sw * 0.5, y0 - sh * 0.1, sw, sh * 0.15, sh * 0.07); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + sway * s * 0.05, top - sh * 0.38, s * 0.09, 0, Math.PI * 2); ctx.fill();
  } else if (layer === 'front' && hat === 'mushroom') {
    // Red mushroom cap with white dots, tilted.
    ctx.translate(cx, top + sh * 0.08);
    ctx.rotate(-0.12 + sway * 0.2);
    ctx.fillStyle = '#e8473f';
    ctx.beginPath(); ctx.ellipse(0, 0, sw * 0.56, sh * 0.34, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const [dx, dy, r] of [[-0.28, -0.12, 0.07], [0.05, -0.24, 0.08], [0.3, -0.1, 0.06]]) {
      ctx.beginPath(); ctx.arc(dx * sw, dy * sh, r * s, 0, Math.PI * 2); ctx.fill();
    }
  } else if (layer === 'front' && hat === 'headphones') {
    // Neon headphones: band over the head, cups on the sides.
    ctx.strokeStyle = '#36f9ff'; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.ellipse(cx, top + sh * 0.42, sw * 0.52, sh * 0.58, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.fillStyle = '#1a0b3d';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(cx + side * sw * 0.5 - s * 0.07, top + sh * 0.28, s * 0.14, sh * 0.32, s * 0.05); ctx.fill();
      ctx.fillStyle = '#36f9ff';
      ctx.beginPath(); ctx.roundRect(cx + side * sw * 0.5 - s * 0.035, top + sh * 0.34, s * 0.07, sh * 0.2, s * 0.03); ctx.fill();
      ctx.fillStyle = '#1a0b3d';
    }
  } else if (layer === 'front' && hat === 'helmet') {
    // Astronaut bubble helmet with a shine and an antenna light.
    const hy = top + sh * 0.42;
    const hr = Math.max(sw, sh) * 0.66;
    ctx.fillStyle = 'rgba(200,230,255,0.18)';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.arc(cx, hy, hr, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.arc(cx, hy, hr * 0.8, Math.PI * 1.2, Math.PI * 1.45); ctx.stroke();
    ctx.strokeStyle = '#c9c4e0'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(cx + hr * 0.5, hy - hr * 0.85); ctx.lineTo(cx + hr * 0.62, hy - hr * 1.15); ctx.stroke();
    ctx.fillStyle = still || Math.floor(t / 600) % 2 ? '#ff5d73' : '#ffd23f';
    ctx.beginPath(); ctx.arc(cx + hr * 0.62, hy - hr * 1.15, s * 0.04, 0, Math.PI * 2); ctx.fill();
  } else if (layer === 'front') {
    drawWardrobeHat(hat, cx, top, sw, sh, s, sway, t, still);
  }
  ctx.restore();
}

// Wardrobe head pieces (Boutique tab Cubo), drawn over the face.
function drawWardrobeHat(hat, cx, top, sw, sh, s, sway, t, still) {
  ctx.lineWidth = s * 0.03;
  if (hat === 'crown') {
    const y0 = top + sh * 0.06;
    const w = sw * 0.66;
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#c98a0a';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y0);
    ctx.lineTo(cx - w / 2, y0 - sh * 0.3);
    ctx.lineTo(cx - w / 4, y0 - sh * 0.14);
    ctx.lineTo(cx, y0 - sh * 0.38);
    ctx.lineTo(cx + w / 4, y0 - sh * 0.14);
    ctx.lineTo(cx + w / 2, y0 - sh * 0.3);
    ctx.lineTo(cx + w / 2, y0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const [dx, col] of [[-0.25, '#ff5d73'], [0, '#5ccfe6'], [0.25, '#6fd6a0']]) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(cx + dx * w, y0 - sh * 0.07, s * 0.035, 0, Math.PI * 2); ctx.fill();
    }
    if (!still && Math.floor(t / 900) % 3 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, y0 - sh * 0.38, s * 0.03, 0, Math.PI * 2); ctx.fill();
    }
  } else if (hat === 'cap') {
    const y0 = top + sh * 0.16;
    ctx.fillStyle = '#3f7bff';
    ctx.beginPath(); ctx.ellipse(cx, y0, sw * 0.46, sh * 0.34, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a5ad6';
    ctx.beginPath(); ctx.ellipse(cx + sw * 0.42, y0 - sh * 0.02, sw * 0.26, sh * 0.07, 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx - sw * 0.06, y0 - sh * 0.16, sw * 0.12, sh * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a5ad6';
    ctx.beginPath(); ctx.arc(cx, y0 - sh * 0.34, s * 0.035, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'bow') {
    ctx.translate(cx + sw * 0.26, top + sh * 0.04);
    ctx.rotate(0.3 + sway * 0.2);
    ctx.fillStyle = '#ff5d8f'; ctx.strokeStyle = '#d13a6a';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * s * 0.2, -s * 0.14, side * s * 0.2, 0);
      ctx.quadraticCurveTo(side * s * 0.2, s * 0.14, 0, 0);
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.045, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (hat === 'party') {
    ctx.translate(cx - sw * 0.08, top + sh * 0.08);
    ctx.rotate(-0.18 + sway * 0.3);
    const h = sh * 0.66, w = sw * 0.26;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, -h); ctx.lineTo(w, 0); ctx.closePath();
    ctx.fillStyle = '#b8a4f0'; ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#ffd23f';
    for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(0, -h * (0.12 + k * 0.24)); ctx.rotate(-0.5); ctx.fillRect(-w * 2, -s * 0.025, w * 4, s * 0.05); ctx.restore(); }
    ctx.restore();
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath(); ctx.arc(0, -h, s * 0.06, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'glasses') {
    const fy = top + sh * 0.45;
    const ex = sw * 0.2;
    const r = s * 0.12;
    ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = s * 0.035;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * ex, fy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - ex + r, fy - r * 0.2); ctx.quadraticCurveTo(cx, fy - r * 0.6, cx + ex - r, fy - r * 0.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = s * 0.02;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * ex, fy, r * 0.65, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke(); }
  } else if (hat === 'tophat') {
    const y0 = top + sh * 0.08;
    ctx.translate(cx, y0); ctx.rotate(-0.08 + sway * 0.12);
    ctx.fillStyle = '#23232e';
    ctx.beginPath(); ctx.ellipse(0, 0, sw * 0.42, sh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-sw * 0.25, -sh * 0.52, sw * 0.5, sh * 0.52, s * 0.04); ctx.fill();
    ctx.fillStyle = '#ff5d73';
    ctx.fillRect(-sw * 0.25, -sh * 0.16, sw * 0.5, sh * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-sw * 0.18, -sh * 0.48, sw * 0.06, sh * 0.3);
  } else if (hat === 'dragon') {
    // Golden dragon horns with a red mane between them.
    ctx.fillStyle = '#e8364a';
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath(); ctx.ellipse(cx + k * sw * 0.08, top + sh * 0.02, s * 0.05, s * 0.12, k * 0.25 + sway * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffc94a'; ctx.strokeStyle = '#c98a0a'; ctx.lineWidth = s * 0.02;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + d * sw * 0.2, top + sh * 0.08);
      ctx.quadraticCurveTo(cx + d * sw * 0.26, top - sh * 0.2, cx + d * sw * 0.4, top - sh * 0.34);
      ctx.quadraticCurveTo(cx + d * sw * 0.3, top - sh * 0.12, cx + d * sw * 0.32, top + sh * 0.08);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + d * sw * 0.27, top - sh * 0.14); ctx.lineTo(cx + d * sw * 0.36, top - sh * 0.18); ctx.lineTo(cx + d * sw * 0.29, top - sh * 0.06); ctx.fill();
    }
  } else if (hat === 'santa') {
    const y0 = top + sh * 0.16;
    ctx.fillStyle = '#e8364a';
    ctx.beginPath();
    ctx.moveTo(cx - sw * 0.46, y0);
    ctx.quadraticCurveTo(cx - sw * 0.3, top - sh * 0.4, cx + sw * 0.18, top - sh * 0.36);
    ctx.quadraticCurveTo(cx + sw * 0.5 + sway * s * 0.1, top - sh * 0.2, cx + sw * 0.56, top + sh * 0.02); // the tip flops to the side
    ctx.quadraticCurveTo(cx + sw * 0.3, top - sh * 0.1, cx + sw * 0.46, y0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(cx - sw * 0.52, y0 - sh * 0.1, sw * 1.04, sh * 0.17, sh * 0.08); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + sw * 0.56, top + sh * 0.04, s * 0.08, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'hearts') {
    // Headband with two hearts on springs.
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.ellipse(cx, top + sh * 0.3, sw * 0.5, sh * 0.42, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.strokeStyle = '#6a1b4d'; ctx.lineWidth = s * 0.02;
    for (const d of [-1, 1]) {
      const hx = cx + d * sw * 0.2 + sway * s * 0.04 * d, hy = top - sh * 0.3;
      ctx.beginPath(); ctx.moveTo(cx + d * sw * 0.16, top + sh * 0.02); ctx.quadraticCurveTo(cx + d * sw * 0.28, top - sh * 0.12, hx, hy); ctx.stroke();
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(d * 0.2);
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath(); ctx.moveTo(0, s * 0.09); ctx.bezierCurveTo(-s * 0.14, 0, -s * 0.09, -s * 0.11, 0, -s * 0.04); ctx.bezierCurveTo(s * 0.09, -s * 0.11, s * 0.14, 0, 0, s * 0.09); ctx.fill();
      ctx.restore();
    }
  } else if (hat === 'bunny') {
    for (const d of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + d * sw * 0.18, top + sh * 0.08);
      ctx.rotate(d * (0.18 + (d > 0 ? sway * 0.4 : 0)));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(0, -sh * 0.38, s * 0.1, sh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb3cf';
      ctx.beginPath(); ctx.ellipse(0, -sh * 0.36, s * 0.05, sh * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (hat === 'straw') {
    const y0 = top + sh * 0.12;
    ctx.translate(cx, y0); ctx.rotate(-0.08 + sway * 0.1);
    ctx.fillStyle = '#f2cf74';
    ctx.beginPath(); ctx.ellipse(0, 0, sw * 0.7, sh * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -sh * 0.04, sw * 0.32, sh * 0.32, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ff7a3d';
    ctx.fillRect(-sw * 0.32, -sh * 0.12, sw * 0.64, sh * 0.08);
    ctx.strokeStyle = 'rgba(160,110,40,0.45)'; ctx.lineWidth = s * 0.015;
    for (const k of [0.3, 0.5]) { ctx.beginPath(); ctx.ellipse(0, 0, sw * k * 1.4, sh * 0.06, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath(); ctx.arc(sw * 0.22, -sh * 0.1, s * 0.05, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'sequin') {
    // Gold top hat covered in sparkles.
    const y0 = top + sh * 0.08;
    ctx.translate(cx, y0); ctx.rotate(-0.1 + sway * 0.12);
    const g = ctx.createLinearGradient(-sw * 0.25, -sh * 0.5, sw * 0.25, 0);
    g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#c9900a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, sw * 0.42, sh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-sw * 0.25, -sh * 0.5, sw * 0.5, sh * 0.5, s * 0.04); ctx.fill();
    ctx.fillStyle = '#1a1440';
    ctx.fillRect(-sw * 0.25, -sh * 0.15, sw * 0.5, sh * 0.09);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) {
      const on = still || (Math.floor(t / 200) + k) % 3 === 0;
      if (!on) continue;
      const px = (-0.18 + (k % 3) * 0.17) * sw, py = -sh * (0.24 + (k % 2) * 0.16);
      ctx.beginPath(); ctx.moveTo(px, py - s * 0.04); ctx.lineTo(px + s * 0.012, py); ctx.lineTo(px, py + s * 0.04); ctx.lineTo(px - s * 0.012, py); ctx.fill();
    }
  } else if (hat === 'witch') {
    const y0 = top + sh * 0.1;
    ctx.translate(cx, y0); ctx.rotate(-0.06 + sway * 0.15);
    ctx.fillStyle = '#3a2a5a';
    ctx.beginPath(); ctx.ellipse(0, 0, sw * 0.62, sh * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-sw * 0.3, 0);
    ctx.quadraticCurveTo(-sw * 0.12, -sh * 0.5, sw * 0.02, -sh * 0.78);
    ctx.quadraticCurveTo(sw * 0.2, -sh * 0.7, sw * 0.36, -sh * 0.62); // the tip folds over
    ctx.quadraticCurveTo(sw * 0.16, -sh * 0.5, sw * 0.3, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8a1a';
    ctx.beginPath(); ctx.moveTo(-sw * 0.29, -sh * 0.05); ctx.lineTo(sw * 0.29, -sh * 0.05); ctx.lineTo(sw * 0.26, -sh * 0.17); ctx.lineTo(-sw * 0.25, -sh * 0.17); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = s * 0.025;
    ctx.strokeRect(-s * 0.05, -sh * 0.165, s * 0.1, sh * 0.11);
  }
}
