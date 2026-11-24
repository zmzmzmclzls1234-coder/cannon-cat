'use strict';
// ---------- 3D cartoon models (built from unit meshes, drawn with ink outlines) ----------
const P = (m, c, x, y, z, sx, sy, sz, rx, ry, rz, o) => GL.part(m, c, x, y, z, sx, sy, sz, rx || 0, ry || 0, rz || 0, o);
const NL = { noLine: true };
const PI = Math.PI;

// ----- cat (origin at body centre, faces +x, y up) -----
function drawCat3(cd, hat, t, face, pose, extra = {}) {
  const s = cd.scale, fly = pose === 'fly';
  GL.push(0, 0, 0, 0, 0, 0, s, s, s);
  if (cd.alpha) GL.forceAlpha = extra.phase ? 0.4 : cd.alpha;
  drawCatExtras(cd, t, extra);
  const chonk = cd.id === 'chonk';
  const bw = chonk ? 54 : 48, bh = chonk ? 40 : 34;
  const wag = Math.sin(t * 9) * 0.35;
  // tail: chain of spheres
  for (let i = 0; i < 5; i++) {
    const u = i / 4;
    const tx = -22 - u * 22, ty = fly ? 2 + u * 4 + Math.sin(u * 3 + t * 9) * 3 : 4 + u * 22 + Math.sin(t * 6) * u * 4;
    P('sphere', i === 4 ? cd.stripe : cd.body, tx, ty, Math.sin(u * 2 + wag) * 6, 12 - u * 2, 12 - u * 2, 12 - u * 2);
  }
  // legs
  const legs = [[-13, 9], [-13, -9], [13, 9], [13, -9]];
  for (const [lx, lz] of legs) {
    const a = fly ? (lx < 0 ? 1.0 : -1.0) : 0;
    P('sphere', cd.paw || cd.body, lx + (fly ? (lx < 0 ? -6 : 6) : 0), -15 + (fly ? 4 : 0), lz, 11, 17, 11, 0, 0, a);
  }
  // floof fluff ring
  if (cd.id === 'floof') {
    const puff = extra.puff || 0;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * PI * 2;
      P('sphere', cd.body, Math.cos(a) * (24 + puff * 8), Math.sin(a) * (15 + puff * 8), (i % 2 ? 8 : -8), 20 + puff * 8, 20 + puff * 8, 20 + puff * 8);
    }
  }
  // body + belly + stripes
  P('sphere', cd.body, 0, 0, 0, bw, bh, bh * 0.95);
  P('sphere', cd.belly, 5, -7, 0, bw * 0.66, bh * 0.6, bh * 0.82, 0, 0, 0, NL);
  for (const sx of [-12, -2, 8]) P('sphere', cd.stripe, sx, bh * 0.42, 0, 6, 6, bh * 0.85, 0, 0, 0.25, NL);
  // head
  GL.push(22, 13, 0);
  P('sphere', cd.body, 0, 0, 0, 33, 31, 31);
  // ears
  const tw = extra.ear || 0;
  for (const ez of [8.5, -8.5]) {
    P('cone', cd.body, -3, 17, ez, 13, 16, 11, 0, 0, ez > 0 ? 0.12 : 0.12 + tw * 0.1);
    P('cone', cd.ear, -0.5, 16, ez, 7, 10, 4, 0, 0, 0.12, NL);
  }
  if (cd.id === 'zip') {
    P('torus', '#ff4b4b', 0, 5, 0, 34, 14, 34, 0, 0, 0.12);
    P('box', '#ff4b4b', -20, 5 + Math.sin(t * 12) * 2, 3, 18, 4, 3, 0, 0, 0.3 + Math.sin(t * 10) * 0.2);
    P('box', '#ff4b4b', -20, 2 + Math.sin(t * 12 + 1) * 2, -2, 16, 4, 3, 0, 0, -0.1 + Math.sin(t * 11) * 0.2);
  }
  // face (looks to +x and toward camera via the cat's yaw)
  P('sphere', '#ff9ab5', 10, -5, 10, 8, 5, 4, 0, 0, 0, NL);
  P('sphere', '#ff7aa0', 16, 0, 0, 5, 4, 5, 0, 0, 0, NL);
  P('box', INK, 20, -1, 7, 13, 1.2, 1.2, 0, 0.3, 0.12, NL);
  P('box', INK, 20, -3, 7, 13, 1.2, 1.2, 0, 0.3, -0.12, NL);
  for (const ez of [7, -7]) {
    const ex = 12;
    if (face === 'happy') { P('box', INK, ex, 4, ez, 6, 1.8, 2, 0, 0, 0.5, NL); P('box', INK, ex + 4, 4, ez, 6, 1.8, 2, 0, 0, -0.5, NL); }
    else if (face === 'dizzy') { P('box', INK, ex + 2, 3, ez, 8, 1.8, 2, 0, 0, 0.8, NL); P('box', INK, ex + 2, 3, ez, 8, 1.8, 2, 0, 0, -0.8, NL); }
    else if (face === 'blink') P('box', INK, ex + 2, 2, ez, 8, 1.8, 2, 0, 0, 0, NL);
    else {
      const big = face === 'wow' ? 1.25 : 1;
      P('sphere', '#ffffff', ex, 3, ez, 7 * big, 10 * big, 6, 0, 0, 0, { line: 2 });
      P('sphere', INK, ex + 2.6, 2.5, ez * 1.12, 3.6, 5.5, 3, 0, 0, 0, NL);
      if (face === 'angry') P('box', INK, ex, 9, ez, 9, 2, 2, 0, 0, ez > 0 ? -0.4 : 0.4, NL);
    }
  }
  if (face === 'wow' || face === 'angry') P('sphere', '#7a1630', 15, -8, 0, 6, 7, 6, 0, 0, 0, { line: 2 });
  if (cd.id === 'blaze') for (let i = 0; i < 3; i++) P('cone', i === 1 ? '#ffd23f' : '#ff8a1f', -4 + i * 6, 18 + Math.sin(t * 14 + i) * 2, 0, 7, 14 + Math.sin(t * 18 + i * 2) * 3, 7, 0, 0, 0.1, { emit: 1, line: 2 });
  if (cd.id === 'ghost') P('ring', '#fff6a0', -2, 26, 0, 26, 26, 26, 0, 0, 0.15, { emit: 1, line: 2 });
  drawHat(hat, t);
  GL.pop();
  GL.forceAlpha = 0;
  GL.pop();
}
function drawCatExtras(cd, t, extra) {
  switch (cd.id) {
    case 'sparky':  // lightning-bolt tail tip
      for (let i = 0; i < 3; i++) P('box', '#fff36b', -50 - i * 8, 8 + (i % 2 ? 6 : -2), 0, 12, 4, 4, 0, 0, i % 2 ? 0.8 : -0.8, { emit: 1, line: 2 });
      if (extra.magnet) P('ring', '#fff36b', 0, 0, 0, 120 + Math.sin(t * 20) * 10, 120, 120, Math.PI / 2, 0, 0, { emit: 1, noLine: true, alpha: 0.5 });
      break;
    case 'astro':   // jetpack on the back
      for (const z of [8, -8]) { P('cyl', '#b9c2cc', -10, 16, z, 12, 26, 12, 0, 0, 0.5); P('cone', '#ff4b4b', -16, 28, z, 12, 10, 12, 0, 0, 0.5); }
      if (extra.jet) for (const z of [8, -8]) P('cone', '#ffb02e', -26, 0, z, 12, 26 + Math.sin(t * 50) * 6, 12, 0, 0, 2.1, { emit: 1, noLine: true });
      break;
    case 'blaze':
      for (let i = 0; i < 3; i++) P('sphere', i ? '#ffb02e' : '#ffe14a', -52 - i * 9, 12 + Math.sin(t * 16 + i) * 3, 0, 12 - i * 2, 12 - i * 2, 12 - i * 2, 0, 0, 0, { emit: 1, line: 2 });
      break;
  }
}
function drawHat(hat, t) {
  switch (hat) {
    case 'party':
      P('cone', '#8f63ff', -2, 25, 0, 18, 26, 18, 0, 0, 0.18);
      P('ring', '#ffd23f', -1, 15, 0, 21, 21, 21, 0, 0, 0.18, NL);
      P('sphere', '#ff5d93', -4.5, 39, 0, 8, 8, 8);
      break;
    case 'cap':
      P('hemi', '#3aa3ff', -1, 10, 0, 32, 22, 32, 0, 0, 0.12);
      P('box', '#3aa3ff', 15, 11, 0, 20, 3, 24, 0, 0, -0.06);
      P('sphere', '#ffffff', -2, 20, 0, 5, 4, 5, 0, 0, 0, NL);
      break;
    case 'viking':
      P('hemi', '#b9c2cc', -1, 5, 0, 37, 36, 37);
      P('ring', '#c79a3a', -1, 6, 0, 37, 37, 37, 0, 0, 0);
      P('box', '#c79a3a', -1, 15, 0, 4, 18, 30, 0, 0, 0, NL);
      for (const z of [1, -1]) P('cone', '#fff4dc', -2, 22, z * 19, 9, 20, 9, z * 0.9, 0, 0);
      break;
    case 'crown':
      P('cyl', '#ffcf3a', -1, 18, 0, 26, 10, 26);
      for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; P('cone', '#ffcf3a', -1 + Math.cos(a) * 10, 26, Math.sin(a) * 10, 6, 9, 6); }
      P('sphere', '#ff4b4b', -1 + 12, 17, 0, 5, 5, 3, 0, 0, 0, NL);
      P('sphere', '#3aa3ff', -1, 17, 12, 5, 5, 3, 0, 0, 0, NL);
      break;
    case 'astro':
      P('ring', '#e8edf5', 0, -12, 0, 44, 44, 44);
      P('cyl', '#b9c2cc', -6, 26, 0, 2, 12, 2);
      P('sphere', '#ff4b4b', -6, 33, 0, 5, 5, 5, 0, 0, 0, { emit: 0.6 });
      P('sphere', '#bfe6ff', 0, 0, 0, 46, 44, 44, 0, 0, 0, { alpha: 0.28, line: 2.5 });
      break;
  }
}

// ----- cannon (origin on the ground under the pivot) -----
function drawCannon3(skin, angleDeg, recoil, t, catCd, hat, face, showCat, swell = 0) {
  const c = CANNON_COL[skin] || CANNON_COL.classic;
  const piv = -CANNON.y;
  // carriage
  P('box', c.wood, -4, 24, 0, 92, 44, 46);
  P('box', c.wood, -4, 48, 0, 70, 10, 40);
  for (const z of [30, -30]) {
    GL.push(-4, 28, z, PI / 2, 0, Math.sin(t * 0.7) * 0.05 - recoil * 0.6);
    P('cyl', c.wheel, 0, 0, 0, 58, 10, 58);
    P('cyl', c.band, 0, z > 0 ? 3 : -3, 0, 22, 8, 22, 0, 0, 0, NL);
    for (let k = 0; k < 3; k++) P('box', c.band, 0, 0, 0, 52, 6, 5, 0, k * PI / 3, 0, NL);
    GL.pop();
  }
  // barrel
  GL.push(0, piv, 0, 0, 0, angleDeg * PI / 180);
  GL.push(-recoil * 18, 0, 0, 0, 0, 0, 1 - swell * 0.12, 1 + swell * 0.3, 1 + swell * 0.3);
  if (showCat) { GL.push(92, 6, 0, 0, -0.5, 0); drawCat3(catCd, hat, t, face, 'sit', { ear: Math.sin(t * 1.3) > 0.97 ? 1 : 0 }); GL.pop(); }
  P('sphere', c.barrel, -36, 0, 0, 56, 56, 56);
  P('cyl', c.barrel, 32, 0, 0, 56, 138, 56, 0, 0, -PI / 2);
  for (const bx of [14, 44]) P('ring', c.band, bx, 0, 0, 60, 60, 60, 0, 0, PI / 2);
  P('cyl', c.rim, 100, 0, 0, 68, 20, 68, 0, 0, -PI / 2);
  P('cyl', '#1a1420', 104, 0, 0, 52, 14, 52, 0, 0, -PI / 2, NL);
  if (skin === 'blaster') { P('box', c.band, 20, 32, 0, 50, 8, 10); P('sphere', c.band, 50, 34, 0, 10, 10, 10, 0, 0, 0, { emit: 0.8 }); }
  if (skin === 'pirate') P('sphere', '#c7a14a', -60, 0, 0, 14, 14, 14);
  if (skin === 'candy') for (const bx of [-6, 30, 62]) P('ring', '#ffffff', bx, 0, 0, 58, 58, 58, 0, 0, PI / 2, NL);
  GL.pop(); GL.pop();
}

// ----- gameplay objects (x/y in physics px, y down) -----
function drawObj3(o, t, zoneIdx) {
  const X = o.x;
  switch (o.type) {
    case 'fish': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 3 + o.x * 0.01) * 5;
      GL.push(X, y, 0, 0, t * 1.5 + o.x, Math.sin(t * 4 + o.x) * 0.15);
      P('cone', '#ffb02e', -14, 0, 0, 14, 12, 6, 0, 0, PI / 2);
      P('sphere', '#ffc83a', 0, 0, 0, 28, 18, 14);
      P('sphere', INK, 8, 3, 5, 4, 4, 3, 0, 0, 0, NL);
      P('sphere', INK, 8, 3, -5, 4, 4, 3, 0, 0, 0, NL);
      GL.pop(); break;
    }
    case 'bird': case 'pigeon': case 'gull': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 2 + o.ph) * 12, flap = Math.sin(t * 16 + o.ph);
      const col = o.type === 'bird' ? ['#4aa8ff', '#d9f0ff', '#2f8de6', '#ffb02e'] : o.type === 'pigeon' ? ['#8d93a6', '#c9cfdc', '#6b7186', '#ffb02e'] : ['#ffffff', '#ffffff', '#b9c2cc', '#ffd23f'];
      GL.push(X, y, 0, 0, 0.35, 0);
      P('cone', col[3], -24, 0, 0, 10, 16, 10, 0, 0, PI / 2);
      P('sphere', col[0], 0, 0, 0, 40, 36, 36);
      P('sphere', col[1], -4, -8, 6, 24, 18, 24, 0, 0, 0, NL);
      for (const z of [16, -16]) P('sphere', col[2], 4, 6, z, 30, 8, 16, flap * (z > 0 ? -0.7 : 0.7), 0, 0);
      P('sphere', '#ffffff', -10, 8, 11, 10, 10, 6, 0, 0, 0, { line: 2 });
      P('sphere', INK, -13, 8, 13, 5, 5, 3, 0, 0, 0, NL);
      GL.pop(); break;
    }
    case 'balloon': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 1.5 + o.ph) * 8;
      P('sphere', o.col, X, y, 0, 48, 58, 48);
      P('cone', o.col, X, y - 31, 0, 10, 8, 10, PI);
      P('cyl', INK, X, y - 60, 0, 1.5, 52, 1.5, 0, 0, Math.sin(t * 2 + o.ph) * 0.1, NL);
      break;
    }
    case 'catnip': case 'fuel': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 3 + o.ph) * 6;
      GL.push(X, y, 0, 0, 0, 0.35 + Math.sin(t * 5) * 0.06);
      const body = o.type === 'fuel' ? '#ffd23f' : '#ffffff';
      P('cyl', body, 0, 0, 0, 22, 40, 22, 0, 0, -PI / 2);
      P('cone', '#ff4b4b', 28, 0, 0, 22, 18, 22, 0, 0, -PI / 2);
      for (const z of [10, -10]) P('box', '#ff4b4b', -16, 0, z, 14, 4, 14, 0, 0, 0);
      P('cone', '#ffb02e', -30, 0, 0, 16, 18 + Math.sin(t * 40) * 4, 16, 0, 0, PI / 2, { emit: 1, noLine: true });
      P('sphere', '#3fcf5c', 0, 0, 11, 12, 10, 3, 0, 0, 0, NL);
      GL.pop();
      P('sphere', '#ffe680', X, y, 0, 70 + Math.sin(t * 6) * 6, 70 + Math.sin(t * 6) * 6, 70, 0, 0, 0, { alpha: 0.18, noLine: true, emit: 1 });
      break;
    }
    case 'tramp': {
      const sq = o.sq || 0;
      for (const lx of [10, o.w - 10]) for (const z of [18, -18]) P('cyl', '#3a3f5c', X + lx, 11, z, 5, 22, 5);
      P('box', '#ff4b4b', X + o.w / 2, 22, 0, o.w + 8, 6, 50);
      P('box', '#3aa3ff', X + o.w / 2, 25 - sq * 10, 0, o.w - 8, 3, 42, 0, 0, 0, NL);
      break;
    }
    case 'pot': case 'hydrant': case 'snowman': case 'crab': case 'rock': {
      if (o.hit) return;
      drawHazard(o, t);
      break;
    }
    case 'puddle': {
      P('cyl', '#55b8ff', X + o.w / 2, 1, 0, o.w, 2, 70, 0, 0, 0, { line: 2.5 });
      break;
    }
    case 'sea': {
      const wv = Math.sin(t * 2 + X * 0.01) * 2;
      P('box', '#2fa4ff', X + o.w / 2, -2 + wv, -40, o.w, 8, 220, 0, 0, 0, { line: 2.5 });
      for (let k = 0; k < o.w / 60; k++) P('sphere', '#e8f8ff', X + 20 + k * 60 + Math.sin(t * 2 + k) * 6, 2 + wv, 30, 18, 4, 8, 0, 0, 0, NL);
      break;
    }
    case 'car': {
      GL.push(X + o.w / 2, 0, 0);
      P('box', o.col, 0, 30, 0, o.w, 34, 60);
      P('box', o.col, -6, 60, 0, o.w * 0.55, 28, 54);
      P('box', '#bfe9ff', -6, 61, 0, o.w * 0.45, 18, 56, 0, 0, 0, NL);
      P('box', '#ffe14a', o.w / 2 - 2, 34, 18, 6, 8, 12, 0, 0, 0, { emit: 0.6 });
      for (const wx of [-o.w * 0.3, o.w * 0.3]) for (const z of [30, -30]) {
        GL.push(wx, 14, z, PI / 2, 0, -t * o.vx * 0.02);
        P('cyl', '#26222c', 0, 0, 0, 30, 10, 30); P('box', '#c9cfdc', 0, 0, 0, 20, 11, 4, 0, 0, 0, NL);
        GL.pop();
      }
      GL.pop(); break;
    }
    case 'awning': {
      for (const lx of [8, o.w - 8]) P('cyl', '#5b5e6b', X + lx, o.h / 2, 26, 5, o.h, 5);
      GL.push(X + o.w / 2, o.h, 0, 0, 0, -0.18 + (o.sq || 0) * 0.08);
      P('box', '#ff4b4b', 0, 0, 0, o.w, 8, 70);
      for (let k = 1; k < 5; k += 2) P('box', '#ffffff', -o.w / 2 + (k + 0.5) * o.w / 5, 0.6, 0, o.w / 5, 8, 70.5, 0, 0, 0, NL);
      GL.pop(); break;
    }
    case 'ball': {
      if (o.hit) return;
      const y = o.r + Math.abs(Math.sin(t * 2.4 + o.ph)) * 10;
      GL.push(X, y, 0, 0, t, t * 0.6);
      P('sphere', '#ffffff', 0, 0, 0, o.r * 2, o.r * 2, o.r * 2);
      P('sphere', '#ff4b4b', 0, 0, 0, o.r * 2.02, o.r * 0.7, o.r * 2.02, 0, 0, 0, NL);
      P('sphere', '#3aa3ff', 0, 0, 0, o.r * 0.7, o.r * 2.02, o.r * 2.02, 0, 0, 0, NL);
      GL.pop(); break;
    }
    case 'ramp': {
      const L = Math.hypot(o.w, o.h), a = Math.atan2(o.h, o.w);
      P('box', '#9fd0ff', X + o.w / 2, o.h / 2 - 4, 0, L, 10, 70, 0, 0, a);
      P('box', '#7a4425', X + o.w - 6, o.h / 2, 0, 10, o.h, 60);
      P('box', '#ff4b4b', X + o.w - 4, o.h + 2, 0, 12, 6, 74, 0, 0, a);
      break;
    }
    case 'penguin': {
      if (o.hit) return;
      GL.push(X, 0, 0, 0, -0.5, Math.sin(t * 6 + o.ph) * 0.08);
      P('sphere', '#26222c', 0, 26, 0, 34, 50, 32);
      P('sphere', '#ffffff', 6, 22, 4, 24, 38, 24, 0, 0, 0, NL);
      P('cone', '#ffb02e', 18, 40, 0, 8, 12, 8, 0, 0, -PI / 2);
      for (const z of [8, -8]) { P('sphere', '#ffffff', 10, 44, z, 6, 7, 4, 0, 0, 0, NL); P('sphere', INK, 12, 44, z * 1.1, 3, 4, 2, 0, 0, 0, NL); P('sphere', '#ffb02e', 4, 2, z, 12, 4, 8); }
      for (const z of [16, -16]) P('sphere', '#26222c', -2, 26, z, 8, 30, 8, 0, 0, Math.sin(t * 8 + o.ph) * 0.3);
      GL.pop(); break;
    }
    case 'ufo': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 2 + o.ph) * 10;
      GL.push(X, y, 0, 0.15, t * 2, 0);
      P('cyl', '#b9c2cc', 0, 0, 0, 96, 12, 96);
      P('torus', '#8f63ff', 0, 0, 0, 100, 14, 100, 0, 0, 0, NL);
      P('hemi', '#7ff0ff', 0, 5, 0, 46, 34, 46, 0, 0, 0, { alpha: 0.6 });
      for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; P('sphere', k % 2 ? '#ffd23f' : '#ff5d93', Math.cos(a) * 42, -2, Math.sin(a) * 42, 8, 8, 8, 0, 0, 0, { emit: 1, noLine: true }); }
      GL.pop();
      P('cone', '#fff6a0', X, y - 110, 0, 110, 200, 110, 0, 0, 0, { alpha: 0.16, noLine: true, emit: 1 });
      break;
    }
    case 'pit': return;   // drawn with the ground
    case 'goldfish': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 3 + o.x * 0.01) * 6;
      GL.push(X, y, 0, 0, t * 2 + o.x, 0, 1.5, 1.5, 1.5);
      P('cone', '#ff8a1f', -14, 0, 0, 14, 12, 6, 0, 0, PI / 2, { emit: 0.4 });
      P('sphere', '#ffcf3a', 0, 0, 0, 28, 18, 14, 0, 0, 0, { emit: 0.5 });
      P('sphere', INK, 8, 3, 5, 4, 4, 3, 0, 0, 0, NL);
      GL.pop();
      P('sphere', '#fff6a0', X, y, 0, 60, 60, 60, 0, 0, 0, { alpha: 0.2, noLine: true, emit: 1 });
      break;
    }
    case 'hotair': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 1.2 + o.ph) * 10;
      P('sphere', '#ff5d93', X, y + 60, 0, 120, 140, 120);
      for (let k = 0; k < 3; k++) P('sphere', '#ffd23f', X, y + 60, 0, 122, 30 + k * 0, 122, 0, k * PI / 3, 0, NL);
      for (const d of [-1, 1]) P('cyl', '#7a4425', X + d * 18, y, 0, 3, 50, 3, 0, 0, -d * 0.3, NL);
      P('box', '#b98a52', X, y - 30, 0, 44, 30, 40);
      break;
    }
    case 'plane': case 'heli': case 'satellite': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 2 + o.ph) * 8;
      GL.push(X, y, 0, 0, o.type === 'satellite' ? t : 0.25, o.type === 'satellite' ? t * 0.3 : 0);
      if (o.type === 'plane') {
        P('cyl', '#ffffff', 0, 0, 0, 34, 120, 34, 0, 0, PI / 2); P('cone', '#ff4b4b', -66, 0, 0, 34, 20, 34, 0, 0, PI / 2);
        P('box', '#3aa3ff', 0, 0, 0, 40, 6, 170); P('box', '#3aa3ff', 52, 14, 0, 22, 30, 6); P('box', '#7ad0ff', -40, 8, 0, 18, 10, 30, 0, 0, 0, NL);
        P('box', '#26222c', -78, 0, 0, 4, 50, 6, t * 30, 0, 0, NL);
      } else if (o.type === 'heli') {
        P('sphere', '#ffd23f', 0, 0, 0, 80, 56, 56); P('cyl', '#ffd23f', 60, 6, 0, 12, 80, 12, 0, 0, PI / 2); P('sphere', '#bfe9ff', -18, 6, 0, 40, 30, 50, 0, 0, 0, NL);
        P('box', '#26222c', 0, 40, 0, 200, 3, 12, 0, t * 25, 0, NL); P('cyl', '#26222c', 0, 32, 0, 6, 14, 6, 0, 0, 0, NL);
      } else {
        P('box', '#b9c2cc', 0, 0, 0, 40, 40, 40); for (const d of [-1, 1]) P('box', '#3a52c9', d * 60, 0, 0, 70, 4, 34);
        P('cone', '#ffffff', 0, 34, 0, 30, 20, 30, PI);
      }
      GL.pop(); break;
    }
    case 'kite': {
      if (o.hit) return;
      const y = -o.y + Math.sin(t * 2 + o.ph) * 14;
      P('box', '#ff4b4b', X, y, 0, 70, 70, 4, 0, 0, PI / 4 + Math.sin(t * 2) * 0.1);
      P('box', '#ffd23f', X, y, 0.5, 70, 6, 4.5, 0, 0, PI / 4, NL); P('box', '#ffd23f', X, y, 0.5, 6, 70, 4.5, 0, 0, PI / 4, NL);
      for (let k = 0; k < 4; k++) P('box', k % 2 ? '#3aa3ff' : '#3fcf5c', X - 10 - k * 14, y - 60 - k * 12, 0, 10, 6, 3, 0, 0, Math.sin(t * 4 + k));
      break;
    }
    case 'aurora': {
      if (o.hit) return;
      const y = -o.y;
      P('ring', '#3fffd5', X, y, 0, 150, 150, 150, PI / 2, t * 0.6, 0, { emit: 1, line: 2.5 });
      P('ring', '#8f63ff', X, y, 0, 120, 120, 120, PI / 2, -t * 0.8, 0, { emit: 1, noLine: true });
      break;
    }
    case 'asteroid': {
      if (o.hit) return;
      const y = -o.y;
      GL.push(X, y, 0, t * 0.7 + o.ph, t * 0.5, t * 0.3);
      P('sphere', '#8f8ca8', 0, 0, 0, 70, 56, 62); P('sphere', '#6b6880', 18, 14, 18, 22, 18, 10, 0, 0, 0, NL); P('sphere', '#6b6880', -16, -10, 22, 18, 14, 8, 0, 0, 0, NL);
      GL.pop(); break;
    }
    case 'crater': {
      P('torus', '#a7a5bc', X + o.w / 2, 2, 0, o.w, 8, 80, 0, 0, 0, { line: 2.5 });
      break;
    }
  }
}
function drawHazard(o, t) {
  const X = o.x + (o.w || 0) / 2;
  switch (o.type) {
    case 'pot':
      P('cyl', '#d9733b', X, 22, 0, 46, 44, 46);
      P('torus', '#e8874d', X, 46, 0, 54, 18, 54);
      for (const a of [-0.5, 0, 0.6]) P('sphere', '#3fcf5c', X + Math.sin(a) * 12, 66, 0, 14, 34, 10, 0, 0, a);
      break;
    case 'hydrant':
      P('cyl', '#ff4b4b', X, 24, 0, 26, 44, 26);
      P('hemi', '#ff4b4b', X, 46, 0, 26, 18, 26);
      P('cyl', '#d63a3a', X, 32, 0, 10, 40, 10, 0, 0, PI / 2);
      P('cyl', '#b9c2cc', X, 4, 0, 34, 8, 34);
      break;
    case 'snowman':
      P('sphere', '#ffffff', X, 24, 0, 50, 48, 50);
      P('sphere', '#ffffff', X, 62, 0, 38, 36, 38);
      P('sphere', '#ffffff', X, 92, 0, 28, 28, 28);
      P('cone', '#ff8a1f', X + 18, 92, 0, 6, 16, 6, 0, 0, -PI / 2);
      for (const z of [6, -6]) P('sphere', INK, X + 11, 98, z * 1.6, 4, 4, 4, 0, 0, 0, NL);
      P('cyl', INK, X, 110, 0, 26, 16, 26); P('cyl', INK, X, 103, 0, 36, 3, 36);
      for (const d of [1, -1]) P('box', '#7a4425', X + d * 24, 70, 0, 26, 3, 3, 0, 0, d * 0.5);
      break;
    case 'crab': {
      const sc = Math.sin(t * 4 + o.ph) * 0.3;
      GL.push(X, 0, 0, 0, 0, sc * 0.1);
      P('sphere', '#ff5a3c', 0, 16, 0, 46, 24, 32);
      for (const d of [1, -1]) { P('sphere', '#ff5a3c', d * 30, 22 + sc * 6, 10, 16, 14, 12); P('cyl', INK, d * 8, 32, 6, 2, 12, 2, 0, 0, 0, NL); P('sphere', '#ffffff', d * 8, 39, 6, 7, 7, 7, 0, 0, 0, { line: 2 }); }
      for (let k = 0; k < 3; k++) for (const d of [1, -1]) P('box', '#d63a2a', d * (12 + k * 6), 6, 10, 3, 14, 3, 0, 0, d * 0.5, NL);
      GL.pop(); break;
    }
    case 'rock':
      P('sphere', '#8f8ca8', X, 20, 0, 52, 44, 46, 0, 0.4, 0.2);
      P('sphere', '#a7a5bc', X + 14, 14, 10, 26, 22, 24);
      break;
  }
}

// ----- scenery per zone (deterministic per chunk, depth gives real parallax) -----
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function drawScenery(z, x0, x1, t) {
  const zone = ZONES[z].id;
  const CH = 260;
  for (let i = Math.floor(x0 / CH) - 1; i <= Math.ceil(x1 / CH) + 1; i++) {
    const cx = i * CH;
    if (zoneAt(cx) !== z) continue;
    const h1 = hash(i * 3.1 + z * 17), h2 = hash(i * 7.7 + z * 5), h3 = hash(i * 1.3 + z * 31);
    switch (zone) {
      case 'yard':
        // fence near the play plane
        P('box', '#fff4dc', cx, 34, -70, CH, 8, 6, 0, 0, 0, NL);
        P('box', '#fff4dc', cx + CH / 2, 34, -70, 16, 68, 10);
        if (h1 < 0.55) drawTree(cx + h2 * 100, -220 - h3 * 220, 0.9 + h2 * 0.6, '#4cc23e');
        if (h2 < 0.3) drawHouse(cx, -620 - h1 * 200, h3);
        if (h3 < 0.35) P('sphere', '#a6e38c', cx, -260, -1500 - h1 * 300, 900, 520, 400);
        break;
      case 'town':
        if (h1 < 0.8) drawBuilding(cx + h2 * 60, -300 - h3 * 300, h1, h2, h3);
        if (h2 < 0.5) drawBuilding(cx + h1 * 120, -900 - h3 * 300, h3, h1, h2, 1.8);
        if (h3 < 0.5) { P('cyl', '#3a3f5c', cx + 40, 60, -60, 6, 120, 6); P('sphere', '#ffe14a', cx + 40, 124, -60, 16, 16, 16, 0, 0, 0, { emit: 0.7 }); }
        P('box', '#c9cfdc', cx, 2, -45, CH, 4, 30, 0, 0, 0, NL);
        break;
      case 'beach':
        if (h1 < 0.45) drawPalm(cx + h2 * 120, -120 - h3 * 240, h1, t);
        if (h2 < 0.3) drawUmbrella(cx + h3 * 100, -60, h1);
        if (h3 < 0.15) P('sphere', '#4cc23e', cx, -40, -2200, 500, 220, 300);
        break;
      case 'snow':
        if (h1 < 0.7) drawPine(cx + h2 * 100, -120 - h3 * 380, 0.8 + h1 * 0.8);
        if (h2 < 0.25) { P('cone', '#c9d6ea', cx, 260, -1700 - h3 * 400, 900, 1100, 700); P('cone', '#ffffff', cx, 690, -1700 - h3 * 400, 330, 260, 260, 0, 0, 0, NL); }
        break;
      case 'moon':
        if (h1 < 0.4) P('torus', '#a7a5bc', cx + h2 * 100, 2, -150 - h3 * 300, 120 + h1 * 120, 10, 90);
        if (h2 < 0.2) { P('hemi', '#e8edf5', cx, 0, -420, 160, 110, 160); P('box', '#8f63ff', cx, 40, -330, 40, 30, 10, 0, 0, 0, NL); }
        if (h3 < 0.25) { P('cyl', '#b9c2cc', cx, 90, -300, 6, 180, 6); P('sphere', '#ff4b4b', cx, 186, -300, 12, 12, 12, 0, 0, 0, { emit: Math.sin(t * 4) > 0 ? 1 : 0 }); }
        break;
    }
  }
}
function drawTree(x, z, s, col) {
  P('cyl', '#8a5a34', x, 50 * s, z, 18 * s, 100 * s, 18 * s);
  P('sphere', col, x, 120 * s, z, 110 * s, 96 * s, 100 * s);
  P('sphere', col, x - 36 * s, 100 * s, z + 10, 70 * s, 60 * s, 70 * s);
  P('sphere', col, x + 40 * s, 96 * s, z - 10, 76 * s, 62 * s, 70 * s);
}
function drawHouse(x, z, h) {
  const cols = ['#ffb3c7', '#ffe08a', '#a8d8ff', '#c5f0a4'];
  const c = cols[Math.floor(h * 4) % 4];
  P('box', c, x, 80, z, 200, 160, 160);
  P('prism', '#e8413c', x, 200, z, 230, 80, 180);
  P('box', '#9b5c34', x - 40, 45, z + 81, 40, 90, 4, 0, 0, 0, NL);
  P('box', '#bfe9ff', x + 45, 95, z + 81, 46, 40, 4);
}
function drawBuilding(x, z, a, b, c, s = 1) {
  const cols = ['#ffd6a5', '#c3b5ff', '#9fe0d0', '#ffb3b3', '#b9c2cc'];
  const w = (140 + a * 120) * s, h = (220 + b * 420) * s;
  P('box', cols[Math.floor(c * 5) % 5], x, h / 2, z, w, h, 160 * s);
  P('box', '#5b5e6b', x, h + 6, z, w + 12, 12, 170 * s, 0, 0, 0, NL);
  if (s === 1) for (let r = 0; r < 3; r++) P('box', '#7ad0ff', x, h * (0.3 + r * 0.22), z + 81, w * 0.75, 26, 3, 0, 0, 0, NL);
}
function drawPalm(x, z, h, t) {
  const lean = 0.2 + h * 0.3, sway = Math.sin(t * 1.2 + x) * 0.04;
  for (let k = 0; k < 6; k++) P('cyl', '#b98a52', x + k * 22 * lean, 18 + k * 34, z, 22 - k, 36, 22 - k, 0, 0, -lean * 0.6);
  const tx = x + 6 * 22 * lean, ty = 18 + 6 * 34;
  for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; P('sphere', '#3fcf5c', tx + Math.cos(a) * 46, ty - 8, z + Math.sin(a) * 46, 90, 14, 30, 0, -a, -0.35 + sway); }
  P('sphere', '#7a4425', tx, ty - 14, z + 10, 16, 16, 16);
}
function drawUmbrella(x, z, h) {
  P('cyl', '#ffffff', x, 60, z, 5, 120, 5);
  P('cone', h < 0.5 ? '#ff5d93' : '#3aa3ff', x, 128, z, 160, 40, 160);
  P('box', h < 0.5 ? '#3aa3ff' : '#ffd23f', x + 60, 8, z + 30, 80, 6, 40);
}
function drawPine(x, z, s) {
  P('cyl', '#7a4425', x, 20 * s, z, 16 * s, 40 * s, 16 * s);
  for (let k = 0; k < 3; k++) {
    P('cone', '#2f9e5b', x, (70 + k * 50) * s, z, (120 - k * 30) * s, 90 * s, (120 - k * 30) * s);
    P('cone', '#ffffff', x, (96 + k * 50) * s, z, (56 - k * 12) * s, 34 * s, (56 - k * 12) * s, 0, 0, 0, NL);
  }
}
function drawClouds(x0, x1, camY, night) {
  const CH = 700;
  for (let i = Math.floor(x0 / CH) - 2; i <= Math.ceil(x1 / CH) + 2; i++) {
    const h = hash(i * 9.1);
    if (h < 0.3) continue;
    const x = i * CH + h * 300, y = 380 + hash(i * 2.3) * 900, z = -900 - hash(i * 4.4) * 700;
    const c = night ? '#4a3f8f' : '#ffffff';
    P('sphere', c, x, y, z, 220, 130, 140);
    P('sphere', c, x - 110, y - 20, z, 150, 100, 120);
    P('sphere', c, x + 120, y - 16, z, 170, 110, 120);
  }
}
function drawGround(x0, x1, pits) {
  // one slab per zone in view, split around holes in the ground
  for (let z = 0; z < ZONES.length; z++) {
    const a = z === 0 ? -1e9 : ZONES[z].from * PX_PER_M, b = z + 1 < ZONES.length ? ZONES[z + 1].from * PX_PER_M : 1e9;
    let l = Math.max(a, x0 - 3000); const r = Math.min(b, x1 + 3000);
    if (r <= l) continue;
    const zz = ZONES[z];
    const segs = [];
    for (const p of pits) { if (p.x + p.w <= l || p.x >= r) continue; if (p.x > l) segs.push([l, p.x]); l = Math.max(l, p.x + p.w); }
    if (r > l) segs.push([l, r]);
    for (const [sl, sr] of segs) {
      const cx = (sl + sr) / 2, w = sr - sl;
      P('box', zz.dirt, cx, -170, -1400, w, 316, 3000, 0, 0, 0, { noLine: true });
      P('box', zz.ground, cx, -6, -1400, w, 12, 3000, 0, 0, 0, { noLine: true });
      P('box', zz.ground, cx, -6, 96, w, 12, 12);
      P('box', zz.dirt, cx, -115, 99, w, 206, 6);
    }
  }
  for (const p of pits) {
    if (p.x + p.w < x0 - 500 || p.x > x1 + 500) continue;
    P('box', '#1b1430', p.x + p.w / 2, -330, -1400, p.w, 600, 3000, 0, 0, 0, { noLine: true });
    // warning sign before the hole
    P('cyl', '#5b5e6b', p.x - 40, 30, 40, 4, 60, 4, 0, 0, 0, NL);
    P('box', '#ffd23f', p.x - 40, 62, 40, 30, 30, 4, 0, 0, PI / 4);
    P('box', INK, p.x - 40, 64, 42.5, 4, 14, 1, 0, 0, 0, NL); P('box', INK, p.x - 40, 53, 42.5, 4, 4, 1, 0, 0, 0, NL);
  }
}
function drawPlanets(tx, ty, hw, dist, zf, alt, t) {
  // what you see from up high depends on the biome below
  if (alt < 0.15) return;
  const z = ZONES[zf], pl = z.planet, k = clamp((alt - 0.15) / 0.5, 0, 1);
  const baseY = ty + dist * 0.12, Z = -2600;
  P('sphere', pl.col, tx - hw * 0.6, baseY + dist * 0.2 * (1 - k), Z, 420 * k + 80, 420 * k + 80, 420 * k + 80, 0, t * 0.05, 0.2, { noFog: true });
  if (pl.ring) P('ring', pl.ring, tx - hw * 0.6, baseY + dist * 0.2 * (1 - k), Z, 760 * k + 140, 760 * k + 140, 760 * k + 140, 0.35, 0, 0.25, { noFog: true, emit: 0.4 });
  if (k > 0.4) P('sphere', zf % 2 ? '#ff6b6b' : '#3fcf5c', tx + hw * 0.9, baseY + dist * 0.35, Z - 200, 160, 160, 160, 0, 0, 0, { noFog: true });
  for (let i = Math.floor((tx - hw * 3) / 260); i < (tx + hw * 3) / 260; i++) { const h = hash(i * 5.3 + zf); if (h < 0.55) continue; P('sphere', '#ffffff', i * 260, ty - dist * 0.6 + hash(i * 1.7) * dist * 2.2, -2400, 16, 16, 16, 0, 0, 0, { noLine: true, emit: 1, noFog: true, alpha: Math.min(1, k * 1.5) }); }
}
function drawSign(xm) {
  const X = xm * PX_PER_M, big = xm % 100 === 0;
  P('box', '#9b5c34', X, 40, 40, 8, 80, 8);
  P('box', big ? '#fff4dc' : '#ffe0b0', X, 92, 40, big ? 92 : 70, 36, 8);
}
