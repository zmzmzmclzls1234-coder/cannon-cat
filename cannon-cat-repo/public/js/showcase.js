'use strict';
// ---------- 3D thumbnails ----------
// Each thumbnail is drawn into the bottom-left corner of the main WebGL canvas and copied to its own
// 2D canvas in the same task, before the frame's main render clears it. Results are cached per item.
const THUMB = { queue: [], cache: new Map(), size: 192 };
function thumbCanvas(kind, id, sil) {
  const key = `${kind}:${id}:${sil ? 1 : 0}:${kind === 'hat' ? S.eq.cat : ''}`;
  return `<canvas class="t3d" width="192" height="144" data-kind="${kind}" data-id="${id}" data-sil="${sil ? 1 : ''}" data-key="${key}"></canvas>`;
}
function queueThumbs(root) {
  root.querySelectorAll('canvas.t3d').forEach(c => {
    const cached = THUMB.cache.get(c.dataset.key);
    if (cached) blitThumb(c, cached); else THUMB.queue.push(c);
  });
}
function blitThumb(c, src) {
  const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  const s = Math.min(c.width / src.width, c.height / src.height) * 1.0;
  const w = src.width * s, h = src.height * s;
  g.drawImage(src, (c.width - w) / 2, (c.height - h) / 2, w, h);
}
function processThumbs() {
  let n = 0;
  while (THUMB.queue.length && n < 3) {
    const c = THUMB.queue.shift();
    if (!c.isConnected) continue;
    let src = THUMB.cache.get(c.dataset.key);
    if (!src) { src = renderThumb(c.dataset.kind, c.dataset.id, !!c.dataset.sil); THUMB.cache.set(c.dataset.key, src); n++; }
    blitThumb(c, src);
  }
}
const THUMB_CAM = {
  cat: { eye: [8, 22, 100], tgt: [4, 4, 0] },
  hat: { eye: [34, 36, 70], tgt: [22, 26, 0] },
  cannon: { eye: [60, 100, 270], tgt: [40, 58, 0] },
  trail: { eye: [-10, 8, 185], tgt: [-10, 4, 0] },
  box: { eye: [0, 130, 270], tgt: [0, 62, 0] },
};
function renderThumb(kind, id, sil) {
  const size = THUMB.size, cam = THUMB_CAM[kind];
  const keepFog = GL.fog; GL.fog = [1e6, 2e6];
  GL.begin(cam.eye, cam.tgt, 40, null, [0, 0, size, Math.round(size * 0.75)]);
  GL.lineW = 2.6;
  if (sil) GL.forceColor = '#2a2540';
  const t = 1.3;
  switch (kind) {
    case 'cat': GL.push(0, 0, 0, 0, -0.55, 0); drawCat3(CAT_BY[id], 'none', t, sil ? 'normal' : 'happy', 'sit', {}); GL.pop(); break;
    case 'hat': GL.push(0, 0, 0, 0, -0.5, 0); drawCat3(CAT_BY[S.eq.cat] || CATS[0], id, t, 'happy', 'sit', {}); GL.pop(); break;
    case 'cannon': GL.push(0, 0, 0, 0, -0.35, 0); drawCannon3(id, 35, 0, t, CATS[0], 'none', 'normal', false, 0); GL.pop(); break;
    case 'trail': drawTrailPreview(id, t); break;
    case 'box': { const b = BOXES.find(x => x.id === id); GL.push(0, 0, 0, 0.12, -0.6, 0); drawBox3(b, 0, false, 0, t); GL.pop(); break; }
  }
  GL.forceColor = null; GL.lineW = 3.2; GL.fog = keepFog;
  const h = Math.round(size * 0.75);
  const off = document.createElement('canvas'); off.width = size; off.height = h;
  off.getContext('2d').drawImage(GL.gl.canvas, 0, GL.gl.canvas.height - h, size, h, 0, 0, size, h);
  return off;
}
function drawTrailPreview(id, t) {
  const cols = TRAIL_COL[id];
  for (let i = 0; i < 12; i++) {
    const u = i / 11, x = -110 + u * 150, y = -30 + Math.sin(u * 2.6) * 34;
    if (!cols) { if (i % 2) P('sphere', '#b9c2cc', x, y, 0, 6, 6, 6, 0, 0, 0, NL); continue; }
    const col = cols[i % cols.length], s = 6 + u * 10;
    if (id === 'bubbles') P('sphere', col, x, y, 0, s * 1.6, s * 1.6, s * 1.6, 0, 0, 0, { alpha: 0.5, line: 1.6 });
    else if (id === 'rainbow') P('box', col, x, y, 0, 14, 12, 12, 0, 0, u, { line: 1.8 });
    else if (id === 'fire') P('sphere', col, x, y, 0, s * 1.8, s * 1.8, s * 1.8, 0, 0, 0, { emit: 1, line: 1.8 });
    else P('sphere', col, x, y, 0, s, s, s, 0, 0, 0, { emit: 1, line: 1.6 });
  }
  GL.push(70, 14, 0, 0, -0.4, -0.45); drawCat3(CAT_BY[S.eq.cat] || CATS[0], S.eq.hat, t, 'wow', 'fly', {}); GL.pop();
}

// ---------- 3D gift box ----------
function drawBox3(b, shakeZ, lidOff, lidT, t) {
  GL.push(0, 0, 0, 0, 0, shakeZ);
  P('box', b.col, 0, 50, 0, 150, 100, 150);
  P('box', '#ff4b4b', 0, 50, 0, 28, 101, 152, 0, 0, 0, NL);
  P('box', '#ff4b4b', 0, 50, 0, 152, 101, 28, 0, 0, 0, NL);
  if (!lidOff) drawLid(b, 0, 0, 0, t);
  GL.pop();
  if (lidOff) {
    const y = 112 + lidT * 900 - 0.5 * 1500 * lidT * lidT;
    if (lidT < 1.4) drawLid(b, lidT * 160, y - 112, lidT * 6, t);
  }
}
function drawLid(b, dx, dy, spin, t) {
  GL.push(dx, 112 + dy, 0, spin * 0.4, spin, spin * 0.7);
  P('box', b.lid, 0, 0, 0, 168, 30, 168);
  P('box', '#ff4b4b', 0, 0, 0, 30, 31, 170, 0, 0, 0, NL);
  P('box', '#ff4b4b', 0, 0, 0, 170, 31, 30, 0, 0, 0, NL);
  for (const d of [-1, 1]) P('sphere', '#ff4b4b', d * 22, 28, 0, 40, 26, 22, 0, 0, d * 0.5);
  P('sphere', '#e03a3a', 0, 24, 0, 18, 18, 18);
  GL.pop();
}

// ---------- 3D box opening scene ----------
const easeOutBack = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
function easeOutBounce(x) {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}
function renderBoxScene(rt) {
  const B = BOXST, T = rt - B.t0, rc = RARITY[B.cat.rarity].col, ri = RARITY_ORDER.indexOf(B.cat.rarity);
  GL.fog = [1e6, 2e6];
  const pt = B.popAt != null ? rt - B.popAt : -1;
  const zoom = pt > 0 ? 1 - Math.min(0.08, pt * 0.15) : 1;
  GL.begin([0, 150 * zoom + 40, 640 * zoom], [0, 105, 0], 40, null);
  // light rays in the rarity colour, behind everything
  const rayA = pt > 0 ? Math.min(0.5, pt) : B.step * 0.06;
  if (rayA > 0) for (let i = 0; i < 12; i++) P('box', i % 2 ? rc : '#ffffff', 0, 100, -500, 60, 2400, 4, 0, 0, i / 12 * Math.PI + rt * 0.35, { noLine: true, emit: 1, alpha: rayA * (i % 2 ? 1 : 0.5) });
  // pedestal
  P('cyl', '#3a2a6e', 0, -14, 0, 380, 28, 380);
  P('ring', rc, 0, 2, 0, 390, 390, 390, 0, rt * 0.5, 0, { emit: 1, noLine: true, alpha: 0.4 + B.step * 0.15 });
  // the box: drops in, then shakes harder each tap, glowing more toward its rarity colour
  const drop = clamp(T / 0.7, 0, 1), y = (1 - easeOutBounce(drop)) * 600;
  let rz = 0, sc = 1;
  if (B.step >= 1 && B.popAt == null) {
    const st = rt - B.stepAt, amp = 0.09 * B.step * Math.exp(-st * 2.5) + 0.01 * B.step;
    rz = Math.sin(st * 42) * amp; sc = 1 + 0.06 * B.step * Math.exp(-st * 5) + 0.03 * B.step;
  }
  if ((B.step > 0 && pt < 0) || (pt >= 0 && pt < 0.25)) { const gs = 220 + B.step * 30; P('sphere', rc, 0, 70 + y, -160, gs, gs, gs * 0.3, 0, 0, 0, { noLine: true, emit: 1, alpha: pt >= 0 ? 0.5 * (1 - pt / 0.25) : 0.08 * B.step * (ri + 1) / 3 }); }
  GL.push(0, y, 0, 0, -0.45 + Math.sin(T * 0.8) * 0.12, 0, sc, sc * (1 + (B.popAt == null ? 0 : 0)), sc);
  drawBox3(B.b, rz, pt >= 0, Math.max(0, pt), rt);
  GL.pop();
  // the cat rises out of the box
  if (pt > 0.12) {
    const k = clamp((pt - 0.12) / 0.55, 0, 1), s = easeOutBack(k) * 1.55 / (B.cat.scale || 1);
    GL.push(0, 120 + easeOutBack(k) * 40 + Math.sin(rt * 3) * 6, 20, 0, -0.5 + Math.sin(rt * 1.1) * 0.6, 0, s, s, s);
    drawCat3(B.cat, 'none', rt, 'happy', 'sit', {});
    GL.pop();
  }
  if (pt > 0 && !B.burst) {
    B.burst = true;
    const cols = [rc, '#ffffff', '#ffd23f', '#ff5d93', '#3aa3ff'];
    burst('conf', 0, -140, 60 + ri * 20, 900, 1.6, 12, cols, { g: 900, drag: 1.5, vr: 10, vy: -300 });
    burst('star', 0, -140, 14 + ri * 6, 700, 1.0, 12, [rc, '#ffffff'], { drag: 2 });
    part('ring', 0, -100, 0, 0, 0.6, 120, rc, { z: 0 }); part('ring', 0, -100, 0, 0, 0.9, 80, '#ffffff', { z: 0 });
  }
  drawParticles3();
}
