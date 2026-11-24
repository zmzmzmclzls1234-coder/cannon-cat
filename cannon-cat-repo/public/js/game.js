'use strict';
// ---------- effects (3D particles in physics space: x, y down, z depth) ----------
const FX = { parts: [], texts: [] };
const MAX_PARTS = 260, MAX_TEXTS = 20;
function part(kind, x, y, vx, vy, life, size, col, o = {}) {
  if (R && R.headless) return;
  if (FX.parts.length >= MAX_PARTS) FX.parts.shift();
  FX.parts.push({ kind, x, y, z: o.z != null ? o.z : (Math.random() - 0.5) * 30, vx, vy, vz: o.vz || 0, life, max: life, size, col, g: o.g || 0, drag: o.drag || 0, rot: Math.random() * 6, vr: o.vr || 0, land: !!o.land });
}
function wtext(text, x, y, col = '#fff', size = 30) {
  if (R && R.headless) return;
  if (FX.texts.length >= MAX_TEXTS) FX.texts.shift();
  FX.texts.push({ text, x, y, col, size, life: 1.1, max: 1.1 });
}
function burst(kind, x, y, n, speed, life, size, cols, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = o.dir != null ? o.dir + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.6);
    part(kind, x, y, Math.cos(a) * s + (o.vx || 0), Math.sin(a) * s + (o.vy || 0), life * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.6), cols[i % cols.length], { ...o, vz: (Math.random() - 0.5) * speed * 0.5 });
  }
}
function updateFX(dt) {
  for (let i = FX.parts.length - 1; i >= 0; i--) {
    const p = FX.parts[i];
    p.life -= dt;
    if (p.life <= 0) { FX.parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
    if (p.land && p.y > -2) { p.y = -2; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
  }
  for (let i = FX.texts.length - 1; i >= 0; i--) {
    const w = FX.texts[i]; w.life -= dt; w.y -= 50 * dt;
    if (w.life <= 0) FX.texts.splice(i, 1);
  }
}
function drawParticles3() {
  for (const p of FX.parts) {
    const k = p.life / p.max, X = p.x, Y = -p.y, Z = p.z;
    switch (p.kind) {
      case 'puff': { const s = p.size * 2 * (1.25 - k * 0.45) * Math.min(1, k * 4); P('sphere', p.col, X, Y, Z, s, s, s, 0, 0, 0, { line: 2.4 }); break; }
      case 'dust': { const s = p.size * 2 * (0.4 + k * 0.6); P('sphere', p.col, X, Y, Z, s, s, s, 0, 0, 0, NL); break; }
      case 'spark': P('box', p.col, X, Y, Z, p.size * 4, p.size * 0.8, p.size * 0.8, 0, 0, Math.atan2(-p.vy, p.vx), { noLine: true, emit: 1 }); break;
      case 'shard': P('box', p.col, X, Y, Z, p.size * 1.6, p.size, p.size * 1.2, p.rot, p.rot * 0.7, p.rot * 1.3, { line: 2 }); break;
      case 'feather': P('sphere', p.col, X, Y, Z, p.size * 2, p.size * 0.6, p.size, p.rot, 0, p.rot, { line: 1.8 }); break;
      case 'conf': P('box', p.col, X, Y, Z, p.size, p.size * 0.5, 2, p.rot, p.rot, 0, NL); break;
      case 'star': { const s = p.size * (0.6 + k * 0.8); P('sphere', p.col, X, Y, Z, s, s, s, 0, 0, 0, { emit: 1, line: 1.8 }); break; }
      case 'bubble': { const s = p.size * 2 * (0.6 + (1 - k) * 0.6); P('sphere', p.col, X, Y, Z, s, s, s, 0, 0, 0, { alpha: 0.45, line: 1.6 }); break; }
      case 'drop': { const s = p.size * 2 * Math.min(1, k * 3); P('sphere', p.col, X, Y, Z, s * 0.8, s * 1.2, s * 0.8, 0, 0, Math.atan2(-p.vy, p.vx) + Math.PI / 2, { line: 1.8 }); break; }
      case 'ripple': { const s = p.size * 2 * (2.4 - k * 1.6); P('ring', p.col, X, 1, Z, s, s, s * 0.55, 0, 0, 0, { noLine: true, emit: 0.6, alpha: Math.min(0.9, k * 1.4) }); break; }
      case 'column': { const u = 1 - k, hgt = p.size * Math.sin(Math.min(1, u * 1.6) * Math.PI) * 2.2; if (hgt > 2) { P('cyl', p.col, X, hgt / 2, Z, p.size * 0.5, hgt, p.size * 0.5, 0, 0, 0, { line: 2.2, alpha: 0.85 }); P('sphere', '#ffffff', X, hgt, Z, p.size * 0.7, p.size * 0.5, p.size * 0.7, 0, 0, 0, { line: 2 }); } break; }
      case 'ring': { const s = p.size * 2 * (1.9 - k); P('ring', p.col, X, Y, Z, s, s, s, Math.PI / 2, 0, 0, { noLine: true, emit: 1, alpha: Math.min(1, k * 1.5) }); break; }
    }
  }
}

// ---------- camera ----------
const CAM = { x: 300, y: -200, dist: 900, trauma: 0, kx: 0, ky: 0, punch: 0, W: 1280, H: 720, mode: 'lobby' };
const FOV = 40, TAN = Math.tan(FOV / 2 * Math.PI / 180);
function ui(fn, ...a) { if (R && !R.headless && typeof UI !== 'undefined' && UI[fn]) UI[fn](...a); }
function shake(amount) { if (R && R.headless) return; CAM.trauma = Math.max(CAM.trauma, clamp(amount, 0, 1)); }
function kick(dx, dy) { if (R && R.headless) return; CAM.kx = clamp(CAM.kx + dx, -30, 30); CAM.ky = clamp(CAM.ky + dy, -30, 30); }
function punch(a) { if (R && R.headless) return; if (!SET.reduced) CAM.punch = Math.max(CAM.punch, a); }
function baseDist() {
  const asp = CAM.W / CAM.H;
  const dH = 640 / (2 * TAN), dW = 760 / (2 * TAN * asp);
  return Math.max(dH, dW);
}
function updateCam(dt, alpha) {
  const bd = baseDist();
  let tx, ty, td = bd;
  if (!R || R.phase === 'lobby') {
    td = bd * 0.85; tx = CANNON.x + td * TAN * (CAM.W / CAM.H) * (CAM.W > CAM.H ? 0.5 : 0.1); ty = -td * TAN * (CAM.W > CAM.H ? 0.42 : 0.62);
  } else if (R.phase === 'locker') {
    td = bd * 0.42; tx = -150 + td * TAN * (CAM.W / CAM.H) * (CAM.W > CAM.H ? 0.4 : 0); ty = -td * TAN * 0.5 + (CAM.W > CAM.H ? 0 : td * TAN * 0.35);
  } else if (R.phase === 'aim') {
    td = bd * 0.96; tx = CANNON.x + td * TAN * (CAM.W / CAM.H) * 0.5; ty = -td * TAN * 0.42;
  } else {
    const c = R.cat;
    const cx = lerp(c.px, c.x, alpha), cy = lerp(c.py, c.y, alpha);
    const h = Math.max(0, -cy - 250);
    td = bd * clamp(1 + h / 1700 + Math.max(0, Math.abs(c.vx) - 900) / 3000, 1, 2.3);
    const hw = td * TAN * (CAM.W / CAM.H), hh = td * TAN;
    tx = cx + clamp(c.vx * 0.22, -80, hw * 0.42);
    ty = Math.min(-hh * 0.42, cy + hh * 0.18);
    if (R.phase === 'done') td *= 0.82;
  }
  const k = ease(R && R.phase === 'fly' ? 7 : 4, dt);
  CAM.x += (tx - CAM.x) * k; CAM.y += (ty - CAM.y) * k; CAM.dist += (td - CAM.dist) * ease(3, dt);
  CAM.trauma = Math.max(0, CAM.trauma - dt * 1.6);
  CAM.kx *= Math.exp(-10 * dt); CAM.ky *= Math.exp(-10 * dt);
  CAM.punch = Math.max(0, CAM.punch - dt * 2.5);
}

// ---------- the run ----------
let R = null;
function eqCat() { return CAT_BY[S.eq.cat]; }
function newRun(phase, seed, headless) {
  seed = seed != null ? seed : ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const catId = S.eq.cat;
  R = {
    seed, rng: mulberry32(seed), headless: !!headless, phase, t: 0, aimT: 0, angle: 33,
    catId, cd: CAT_BY[catId],
    cat: { x: CANNON.x, y: CANNON.y, px: CANNON.x, py: CANNON.y, vx: 0, vy: 0, r: 22 * CAT_BY[catId].scale, rot: 0, prot: 0, ground: false },
    charges: chargesFor(S.up.charges, catId), maxCharges: chargesFor(S.up.charges, catId),
    bounce: bounceFor(S.up.spring, catId),
    objs: [], genX: 520, perfect: false, dist: 0, maxH: 0, stopT: 0,
    glide: 0, rocket: 0, inv: 0, flop: false, recoil: 0, face: 'normal', faceT: 0, ouch: false,
    queue: 0, used: 0, paid: false, zone: 0, zoneMax: 0, skips: 0,
    jet: 0, phantom: 0, magnetT: 0, rebirth: catId === 'blaze', fell: false, fellT: 0, hitstop: 0, swell: 0,
    assistCD: 0.5, assistLeft: S.runs < 3 ? 4 : S.runs < 10 ? 2 : 1, pitSaves: S.runs < 5 ? 3 : 1, assists: 0, arng: mulberry32(seed ^ 0x51f15e),
    st: { fish: 0, pop: 0, bounce: 0, perfect: 0, ability: 0, smash: 0, bird: 0 },
    mDoneIdx: [], mCoins: 0,
  };
  genUpTo(3200);
  return R;
}
function aimAngle(t) { return 45 + 30 * Math.sin(t * 2.0 - Math.PI / 2); }

function pickWeighted(table, r) {
  let tot = 0; for (const k in table) tot += table[k];
  let v = r() * tot;
  for (const k in table) { v -= table[k]; if (v <= 0) return k; }
  return Object.keys(table)[0];
}
const HAZARDS = { pot: [50, 62], hydrant: [30, 56], snowman: [50, 118], crab: [64, 34], rock: [56, 44] };
// hitbox tuning: helpers are generous, hazards are forgiving (players never see these numbers)
const AIR_R = { fish: 16, goldfish: 24, bird: 24, pigeon: 24, gull: 24, balloon: 26, catnip: 26, fuel: 26, ufo: 56, hotair: 70, plane: 60, heli: 60, kite: 40, aurora: 75, satellite: 50, asteroid: 34 };
const HELP_SCALE = { fish: 1.6, goldfish: 1.6, bird: 1.6, pigeon: 1.6, gull: 1.6, balloon: 1.5, catnip: 1.7, fuel: 1.7, ufo: 1.35, hotair: 1.3, plane: 1.3, heli: 1.3, kite: 1.4, aurora: 1.2, satellite: 1.3, asteroid: 0.6 };
const HAZ_W = 0.62, HAZ_H = 0.72, PIT_IN = 0.18, HELP_PAD = 28;
function airR(o) { return AIR_R[o.type] * (HELP_SCALE[o.type] || 1); }
function spawnHigh(x, z, r) {
  const type = pickWeighted(ZONES[z].high, r);
  const y = -(1200 + r() * 2600);
  if (type === 'bird' || type === 'gull') R.objs.push({ type, x, y, r: 24, vx: -40 - r() * 50, ph: r() * 6 });
  else R.objs.push({ type, x, y, ph: r() * 6 });
}
function genUpTo(X) {
  const r = R.rng;
  while (R.genX < X) {
    R.genX += 230 + r() * 330;
    const x = R.genX, d = x / PX_PER_M, z = zoneAt(x);
    let type = pickWeighted(ZONES[z].objs, r);
    if (d < 45 && (HAZARDS[type] || type === 'puddle' || type === 'sea' || type === 'pit')) type = 'fish';
    if (type === 'pit' && d < 80) type = 'fish';
    if (r() < 0.3 && d > 30) spawnHigh(x + r() * 200, z, r);
    if (type === 'catnip' && d < 60) type = 'fish';
    switch (type) {
      case 'fish': {
        const n = 4 + Math.floor(r() * 4), by = -(70 + r() * 720), arc = 30 + r() * 70;
        for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5; R.objs.push({ type: 'fish', x: x + i * 42, y: by - Math.sin(u * Math.PI) * arc }); }
        break;
      }
      case 'bird': case 'pigeon': case 'gull': R.objs.push({ type, x, y: -(170 + r() * 950), r: 24, vx: -40 - r() * 50, ph: r() * 6 }); break;
      case 'balloon': { const cols = ['#ff4b4b', '#ff5d93', '#8f63ff', '#3fcf5c']; R.objs.push({ type, x, y: -(220 + r() * 760), r: 26, ph: r() * 6, col: cols[Math.floor(r() * 4)] }); break; }
      case 'catnip': case 'fuel': R.objs.push({ type, x, y: -(240 + r() * 600), r: 26, ph: r() * 6 }); break;
      case 'goldfish':
      R.st.fish += 5; sfx('coin', 1.3); setTimeout(() => sfx('coin', 1.5), 60);
      burst('star', o.x, o.y, 10, 260, 0.6, 8, ['#ffd23f', '#ffffff'], { drag: 3 });
      wtext('GOLDEN FISH +5', o.x, o.y - 30, '#ffd23f', 28); ui('fishBump');
      break;
    case 'hotair':
      c.vy = Math.min(c.vy, 0) - 720; c.vx += 160; R.st.bounce++; sfx('boing', 0.7);
      wtext('HOT AIR LIFT!', c.x, c.y - 50, '#ff5d93', 30); shake(0.25);
      break;
    case 'plane':
      c.vx += 520; c.vy = Math.min(c.vy, -160); sfx('whoosh'); shake(0.35); punch(0.05);
      wtext('PLANE RIDE!', c.x, c.y - 50, '#3aa3ff', 30);
      burst('puff', o.x, o.y, 10, 200, 0.5, 10, ['#ffffff'], { drag: 3 });
      break;
    case 'heli':
      c.vy = -880; c.vx += 120; sfx('whoosh'); shake(0.3);
      wtext('CHOPPER LIFT!', c.x, c.y - 50, '#ffd23f', 30);
      break;
    case 'kite':
      c.vy = Math.min(c.vy, 0) - 520; c.vx += 220; sfx('glide');
      wtext('KITE BOOST!', c.x, c.y - 50, '#ff4b4b', 28);
      break;
    case 'aurora':
      c.vx += 320; c.vy -= 300; R.st.fish += 3; sfx('zone'); punch(0.06);
      wtext('AURORA RUSH! +3', c.x, c.y - 50, '#3fffd5', 30);
      burst('star', o.x, o.y, 14, 380, 0.7, 9, ['#3fffd5', '#8f63ff', '#ffffff'], { drag: 3 });
      break;
    case 'satellite':
      c.vx += 460; c.vy = Math.min(c.vy, -100); sfx('beam'); shake(0.3);
      wtext('ORBIT SLINGSHOT!', c.x, c.y - 50, '#7f8cff', 30);
      break;
    case 'asteroid':
      R.st.smash++; sfx('crash'); shake(0.5);
      burst('shard', o.x, o.y, 12, 380, 1, 9, ['#8f8ca8', '#6b6880'], { g: 600, vr: 10 });
      if (R.rebirth) phoenix(); else { c.vx *= 0.55; c.vy = Math.max(c.vy, 0) + 200; wtext('BONK!', c.x, c.y - 50, '#ff4b4b', 32); R.face = 'dizzy'; R.faceT = 0.9; R.ouch = true; }
      break;
    case 'ufo': R.objs.push({ type, x, y: -(260 + r() * 700), r: 56, ph: r() * 6 }); break;
      case 'tramp': R.objs.push({ type, x, w: 110, sq: 0 }); break;
      case 'puddle': R.objs.push({ type, x, w: 110 + r() * 80 }); break;
      case 'sea': R.objs.push({ type, x, w: 320 + r() * 380 }); R.genX += 200; break;
      case 'car': R.objs.push({ type, x, w: 130, vx: 40 + r() * 60, col: ['#3aa3ff', '#ffd23f', '#ff5d93', '#3fcf5c'][Math.floor(r() * 4)] }); break;
      case 'awning': R.objs.push({ type, x, w: 120, h: 112 }); break;
      case 'ball': R.objs.push({ type, x, r: 30, ph: r() * 6, cd: 0 }); break;
      case 'ramp': R.objs.push({ type, x, w: 170, h: 70, cd: 0 }); break;
      case 'penguin': R.objs.push({ type, x, w: 40, h: 60, ph: r() * 6, used: false }); break;
      case 'crater': R.objs.push({ type, x, w: 140 }); break;
      case 'pit': R.objs.push({ type, x, w: 130 + r() * 110 }); R.genX += 120; break;
      default: if (HAZARDS[type]) R.objs.push({ type, x, w: HAZARDS[type][0], h: HAZARDS[type][1], ph: r() * 6 });
    }
  }
}

function queueAction() { if (R && (R.phase === 'aim' || R.phase === 'fly')) R.queue = 1; }

function fire() {
  if (ADM.perfect) R.angle = 45;
  const c = R.cat, a = R.angle, rad = a * Math.PI / 180;
  const perf = Math.abs(a - 45) <= 5;
  const v = launchSpeed(S.up.power) * (perf ? 1.15 : 1) * (ADM.mega ? 2.2 : 1);
  c.x = CANNON.x + Math.cos(rad) * BARREL; c.y = CANNON.y - Math.sin(rad) * BARREL;
  c.px = c.x; c.py = c.y;
  c.vx = Math.cos(rad) * v; c.vy = -Math.sin(rad) * v; c.rot = c.prot = -rad;
  R.phase = 'fly'; R.perfect = perf; R.recoil = 1.7; R.swell = 1; R.face = 'wow'; R.hitstop = 0.07;
  if (perf) R.st.perfect = 1;
  sfx('boom'); if (!R.headless) { setTimeout(() => sfx('boom'), 40); setTimeout(() => sfx('meow'), 90); }
  shake(1); kick(-26, 12); punch(0.2);
  const mx = CANNON.x + Math.cos(rad) * (BARREL + 14), my = CANNON.y - Math.sin(rad) * (BARREL + 14);
  burst('puff', mx, my, 26, 420, 1.1, 20, ['#ffffff', '#f2ece0', '#ffe0a0'], { dir: -rad, spread: 1.8, drag: 3.5, g: -40 });
  burst('puff', mx, my, 10, 260, 0.6, 14, ['#ffb02e', '#ff4b1f'], { dir: -rad, spread: 0.9, drag: 5 });
  burst('spark', mx, my, 34, 1500, 0.4, 5, ['#ffc83a', '#ff8a1f', '#ffffff'], { dir: -rad, spread: 1.0 });
  burst('star', mx, my, 10, 700, 0.6, 9, ['#ffd23f', '#ffffff'], { dir: -rad, spread: 1.4, drag: 3 });
  for (let i = 0; i < 3; i++) part('ring', mx, my, 0, 0, 0.35 + i * 0.15, 30 + i * 26, i ? '#ffd23f' : '#ffffff', { z: 0 });
  burst('dust', 0, -6, 18, 520, 0.8, 16, [ZONES[0].dirt, '#ffffff'], { dir: Math.PI, spread: 1.2, drag: 3 });
  burst('dust', 0, -6, 18, 520, 0.8, 16, [ZONES[0].dirt, '#ffffff'], { dir: 0, spread: 1.2, drag: 3 });
  ui('onLaunchFX', perf, v);
  if (perf && !R.headless) { setTimeout(() => sfx('perfect'), 160); slowmo(0.3, 0.35); }
  else slowmo(0.5, 0.18);
  ui('onFire', perf);
  checkMissions();
}

function useAbility() {
  const c = R.cat;
  if (R.fell) return;
  if (R.charges <= 0 && !ADM.inf) { sfx('deny'); ui('denyCharges'); return; }
  if (!ADM.inf) R.charges--;
  R.used++; R.st.ability++;
  ui('useCharge', R.charges);
  const wasGround = c.ground;
  switch (R.catId) {
    case 'mochi':
      c.vx += 260; c.vy = Math.min(c.vy, 0) - 380;
      sfx('dash');
      burst('spark', c.x, c.y, 12, 520, 0.3, 4, ['#ffffff', '#ffc83a'], { dir: Math.PI + Math.atan2(c.vy, c.vx), spread: 0.8 });
      part('ring', c.x, c.y, 0, 0, 0.3, 26, '#ffffff', { z: 0 });
      kick(8, -4); R.face = 'angry'; R.faceT = 0.4;
      break;
    case 'chonk':
      if (wasGround) { c.vy = -620; c.vx += 80; R.flop = false; sfx('boing', 0.8); }
      else { c.vy = Math.max(c.vy, 0) + 1250; R.flop = true; sfx('flop'); R.face = 'angry'; R.faceT = 1; }
      burst('puff', c.x, c.y - 10, 6, 140, 0.4, 10, ['#ffffff'], { drag: 4 });
      break;
    case 'floof':
      R.glide = 2.3; if (c.vy > 0) c.vy *= 0.25; if (wasGround) c.vy = -420; c.vx += 250;
      sfx('glide'); burst('puff', c.x, c.y, 10, 180, 0.6, 9, ['#fff1f6', '#ffd1e2'], { drag: 3 });
      R.face = 'happy'; R.faceT = 1.5;
      break;
    case 'socks':
      c.vy = Math.min(c.vy, 0) - 560; c.vx += 60;
      sfx('boing', 1.2); burst('puff', c.x, c.y + c.r, 8, 200, 0.4, 9, ['#ffffff'], { drag: 4 });
      part('ring', c.x, c.y + c.r, 0, 0, 0.3, 24, '#ffffff', { z: 0 });
      R.face = 'happy'; R.faceT = 0.5;
      break;
    case 'sparky':
      R.magnetT = 3; c.vx += 250; c.vy = Math.min(c.vy, 0) - 300; if (wasGround) c.vy = -420;
      sfx('beam'); burst('spark', c.x, c.y, 18, 600, 0.35, 4, ['#fff36b', '#ffffff'], {});
      R.face = 'wow'; R.faceT = 1;
      break;
    case 'astro':
      R.jet = 1.3; if (wasGround) c.vy = -420;
      sfx('rocket'); shake(0.3);
      R.face = 'wow'; R.faceT = 1.3;
      break;
    case 'ghost':
      R.phantom = 3.0; c.vx += 280; c.vy = Math.min(c.vy * 0.3, -160); if (wasGround) c.vy = -420;
      sfx('glide'); burst('puff', c.x, c.y, 10, 160, 0.6, 10, ['#d8f0ff', '#ffffff'], { drag: 3 });
      R.face = 'happy'; R.faceT = 2.6;
      break;
    case 'blaze':
      c.vy = -900; c.vx += 380;
      sfx('megaflop'); shake(0.5); punch(0.08);
      burst('puff', c.x, c.y, 16, 360, 0.7, 12, ['#ff4b1f', '#ffb02e', '#ffe14a'], { drag: 3 });
      burst('spark', c.x, c.y, 20, 800, 0.4, 5, ['#ffe14a', '#ff8a1f'], {});
      R.face = 'angry'; R.faceT = 0.8;
      break;
    case 'zip':
      burst('puff', c.x, c.y, 10, 160, 0.5, 12, ['#4b4f70', '#6c7193'], { drag: 4 });
      c.x += 560; c.px = c.x; c.vx += 200; if (c.vy > 0) c.vy *= 0.35; c.vy -= 220; if (wasGround) c.vy = -420;
      R.inv = 0.3; sfx('blink');
      burst('puff', c.x, c.y, 10, 160, 0.5, 12, ['#4b4f70', '#6c7193'], { drag: 4 });
      burst('star', c.x, c.y, 5, 220, 0.5, 8, ['#ffc83a'], { drag: 3 });
      break;
  }
  c.ground = false;
  checkMissions();
}

let timeScale = 1, slowT = 0;
function slowmo(scale, dur) { if (R && R.headless) return; timeScale = scale; slowT = dur; }

function step(h) {
  if (!R) return;
  R.t += h;
  if (R.phase === 'lobby' || R.phase === 'locker') { R.angle = 33 + Math.sin(R.t * 0.8) * 4; R.recoil *= Math.exp(-6 * h); return; }
  if (R.phase === 'aim') {
    const prev = R.angle;
    R.aimT += h * (R.tutSlow || 1); R.angle = aimAngle(R.aimT);
    if ((prev < 40) !== (R.angle < 40) || (prev > 50) !== (R.angle > 50)) sfx('aimTick');
    if (R.queue) { R.queue = 0; fire(); }
    return;
  }
  R.recoil *= Math.exp(-5 * h); R.swell *= Math.exp(-7 * h);
  if (R.phase !== 'fly') return;
  const c = R.cat;
  if (R.hitstop > 0) { R.hitstop -= h; c.px = c.x; c.py = c.y; return; }
  if (R.queue) { R.queue = 0; useAbility(); }
  c.px = c.x; c.py = c.y; c.prot = c.rot;
  if (R.fell) {
    c.vy += GRAV * h; c.y += c.vy * h; c.x += c.vx * 0.3 * h; c.rot += 6 * h; R.fellT += h;
    if (R.fellT > 1.1) endRun();
    return;
  }
  const SUB = 3;
  for (let i = 0; i < SUB; i++) physics(h / SUB);
  if (!c.ground) c.rot += angDiff(Math.atan2(c.vy, c.vx), c.rot) * Math.min(1, h * 9);
  else c.rot += angDiff(0, c.rot) * Math.min(1, h * 10);
  if (R.glide > 0) R.glide -= h;
  if (R.jet > 0) { R.jet -= h; if (!R.headless) part('puff', c.x - 26, c.y + 8, -300, 40, 0.4, 8, Math.random() < 0.5 ? '#ffb02e' : '#ff4b1f', { drag: 3 }); }
  if (R.phantom > 0) R.phantom -= h;
  if (R.magnetT > 0) R.magnetT -= h;
  // fish magnet: upgrade reach, much more while Sparky's ability runs
  const mr = Math.max(magnetR(S.up.magnet), R.magnetT > 0 ? 520 : 0);
  if (mr > 45) for (const o of R.objs) {
    if ((o.type !== 'fish' && o.type !== 'goldfish') || o.hit) continue;
    const dx = c.x - o.x, dy = c.y - o.y;
    if (dx * dx + dy * dy < mr * mr) { const k = Math.min(1, h * 7); o.x += dx * k; o.y += dy * k; }
  }
  R.assistCD -= h;
  if (R.assistCD <= 0) assistTick();
  if (R.rocket > 0) { R.rocket -= h; part('puff', c.x - 20, c.y + 4, -200 + Math.random() * 60, Math.random() * 60 - 30, 0.5, 9, Math.random() < 0.5 ? '#ffc83a' : '#ff8a1f', { drag: 3 }); }
  if (R.inv > 0) R.inv -= h;
  if (R.faceT > 0) { R.faceT -= h; if (R.faceT <= 0) R.face = 'normal'; }
  const sp = Math.hypot(c.vx, c.vy);
  if (R.face === 'normal' && sp > 1100) R.face = 'wow';
  else if (R.face === 'wow' && sp < 900 && R.faceT <= 0) R.face = 'normal';
  // trail skin
  if (!R.headless && !c.ground && sp > 350 && S.eq.trail !== 'none') {
    const cols = TRAIL_COL[S.eq.trail], col = cols[Math.floor(R.t * 20) % cols.length];
    const kind = S.eq.trail === 'bubbles' ? 'bubble' : S.eq.trail === 'fire' ? 'puff' : S.eq.trail === 'rainbow' ? 'dust' : 'star';
    part(kind, c.x - c.vx * 0.02, c.y - c.vy * 0.02, -c.vx * 0.05, -c.vy * 0.05 + (kind === 'puff' ? -40 : 0), kind === 'dust' ? 0.5 : 0.45, kind === 'dust' ? 9 : 6, col, { z: 0, drag: 2 });
  }
  // zones
  const zi = zoneAt(c.x);
  if (zi !== R.zone) {
    R.zone = zi;
    if (zi > R.zoneMax) {
      R.zoneMax = zi;
      const isNew = zi >= S.zones;
      if (!R.headless) ui('onZone', zi, isNew);
      if (isNew) S.zones = zi + 1;
    }
  }
  // world upkeep
  genUpTo(c.x + 3200);
  if (R.objs.length > 0 && R.objs[0].x < c.x - 2400) R.objs = R.objs.filter(o => o.x > c.x - 2400);
  for (const o of R.objs) {
    if ((o.type === 'bird' || o.type === 'pigeon' || o.type === 'gull') && !o.hit) o.x += o.vx * h;
    if (o.type === 'car') o.x += o.vx * h;
    if (o.sq) o.sq = Math.max(0, o.sq - h * 4);
    if (o.cd) o.cd = Math.max(0, o.cd - h);
  }
  R.maxH = Math.max(R.maxH, -c.y - c.r);
  const d = Math.max(0, c.x / PX_PER_M);
  if (d > R.dist) {
    if (!R.headless && Math.floor(d / 100) > Math.floor(R.dist / 100)) { sfx('star'); wtext(`${Math.floor(d / 100) * 100}m!`, c.x, c.y - 60, '#ffc83a', 34); }
    if (!R.headless && S.best > 20 && R.dist < S.best && d >= S.best) { banner('NEW BEST!', '#ffc83a'); sfx('best'); }
    R.dist = d;
  }
  checkMissions();
  if (c.ground && Math.abs(c.vx) < 10) {
    c.vx = 0; R.stopT += h;
    if (R.stopT > 0.15 && R.face !== 'dizzy' && R.face !== 'happy') { R.face = R.ouch ? 'dizzy' : 'happy'; R.faceT = 99; sfx('land'); }
    if (R.stopT > 1.0) endRun();
  } else R.stopT = 0;
  if (R.t > 240) endRun();
}

// ---------- admin cheats (settings code) ----------
const ADM = { on: false, god: false, inf: false, mega: false, hit: false, lowg: false, perfect: false };
function safe() { return ADM.god || R.phantom > 0; }

// ---------- holes in the ground ----------
function pitAt(x) {
  for (const o of R.objs) if (o.type === 'pit' && x > o.x + o.w * PIT_IN && x < o.x + o.w * (1 - PIT_IN)) return o;
  return null;
}
function pitFull(x) {
  for (const o of R.objs) if (o.type === 'pit' && x > o.x - 10 && x < o.x + o.w + 10) return o;
  return null;
}
function fallIn(pit) {
  const c = R.cat;
  if (R.rebirth) { phoenix(); c.y = -c.r - 40; return; }
  R.fell = true; R.fellPit = pit; c.vx *= 0.3; c.vy = Math.max(c.vy, 200);
  R.face = 'wow'; R.faceT = 99;
  sfx('whoosh'); if (!R.headless) setTimeout(() => sfx('thud', 0.6), 700);
  wtext('WHOOPS!', c.x, c.y - 60, '#ff4b4b', 36);
}
function phoenix() {
  const c = R.cat;
  R.rebirth = false;
  c.vy = -950; c.vx = Math.max(c.vx, 420) + 200; c.ground = false; R.inv = 0.6;
  sfx('megaflop'); shake(0.7); punch(0.1);
  banner('PHOENIX REVIVE!', '#ff8a1f');
  burst('puff', c.x, c.y, 22, 420, 0.9, 14, ['#ff4b1f', '#ffb02e', '#ffe14a'], { drag: 3 });
  part('ring', c.x, c.y, 0, 0, 0.5, 50, '#ffb02e', { z: 0 });
}

// ---------- hidden assist: predict the landing, quietly put help on the path ----------
function predictLanding(c, maxT = 6) {
  let x = c.x, y = c.y, vx = c.vx, vy = c.vy;
  const dt = 1 / 30, drag = R.cd.drag;
  for (let t = 0; t < maxT; t += dt) {
    const g = GRAV * ZONES[zoneAt(x)].grav * (ADM.lowg ? 0.5 : 1);
    vy += g * dt; vx -= vx * drag * dt; x += vx * dt; y += vy * dt;
    if (vy > 0 && y + c.r >= 0) return { x, y, vx, vy, t };
  }
  return null;
}
function pointAt(c, tp) {
  let x = c.x, y = c.y, vx = c.vx, vy = c.vy;
  const dt = 1 / 30, drag = R.cd.drag;
  for (let t = 0; t < tp; t += dt) { const g = GRAV * ZONES[zoneAt(x)].grav; vy += g * dt; vx -= vx * drag * dt; x += vx * dt; y += vy * dt; }
  return { x, y };
}
function viewRight() {
  if (R.headless) return R.cat.x + 900;
  return CAM.x + CAM.dist * TAN * (CAM.W / CAM.H) + 60;
}
function assistTick() {
  R.assistCD = 0.35;
  const c = R.cat;
  if (c.ground || R.rocket > 0 || R.glide > 0 || R.jet > 0 || R.phantom > 0 || R.fell || ADM.god) return;
  const L = predictLanding(c);
  if (!L || L.t < 0.45) return;
  const pit = pitFull(L.x);
  const fr = ZONES[zoneAt(L.x)].friction;
  const vxAfter = Math.max(0, L.vx * 0.8);
  const stopM = (L.x + vxAfter * vxAfter / (2 * fr)) / PX_PER_M;
  const goal = Math.max(70, S.best * 0.75);
  const weak = !pit && R.assistLeft > 0 && c.vy > 0 && stopM < goal && R.charges === 0;
  if (pit && R.pitSaves > 0) { if (placeHelp(L, true)) R.pitSaves--; }
  else if (weak) { if (placeHelp(L, false)) R.assistLeft--; }
}
function placeHelp(L, overPit) {
  const vr = viewRight();
  // 1) a trampoline right where the cat will land, if that spot is still off-screen
  if (L.x - 60 > vr && !groundObjAt('sea', L.x)) {
    R.objs.push({ type: 'tramp', x: L.x - 55, w: 110, sq: 0, assist: true });
    R.assists++; return true;
  }
  // 2) otherwise a bird that flies in from the right and meets the cat on its path
  const tp = clamp(L.t * 0.6, 0.35, 1.6);
  const p = pointAt(R.cat, tp);
  if (p.y > -40) return false;
  const vx = -70;
  const bx = p.x - vx * tp;
  R.objs.push({ type: zoneAt(p.x) === 1 ? 'pigeon' : zoneAt(p.x) === 2 ? 'gull' : 'bird', x: bx, y: p.y, r: 24, vx, ph: 0, assist: true });
  R.assists++; return true;
}

function groundObjAt(type, x) {
  for (const o of R.objs) if (o.type === type && x >= o.x && x <= o.x + o.w) return o;
  return null;
}
// big cartoon "PLUNGE": water column, droplets, ripples on the surface
function waterSplash(x, big) {
  part('column', x, 0, 0, 0, big ? 0.75 : 0.45, big ? 70 : 34, '#9fdcff', { z: 0 });
  burst('drop', x, -6, big ? 26 : 10, big ? 620 : 380, 1.0, big ? 6 : 4, ['#55b8ff', '#9fdcff', '#ffffff'], { g: 1500, dir: -Math.PI / 2, spread: 1.3 });
  for (let i = 0; i < (big ? 3 : 1); i++) part('ripple', x, -1, 0, 0, 0.8 + i * 0.3, 26 + i * 18, '#e8f8ff', { z: 10 });
  burst('puff', x, -6, big ? 8 : 3, 200, 0.6, 8, ['#ffffff', '#e8f8ff'], { drag: 4 });
  sfx(big ? 'plunge' : 'skip', big ? undefined : 1.1);
  if (big) { shake(0.35); kick(0, 10); }
}
function hitHazard(o) {
  const c = R.cat;
  o.hit = true; R.st.smash++;
  const cx = o.x + o.w / 2;
  const cols = { pot: ['#d9733b', '#e8874d', '#3fcf5c'], hydrant: ['#ff4b4b', '#b9c2cc'], snowman: ['#ffffff', '#ff8a1f', '#26222c'], crab: ['#ff5a3c', '#ffffff'], rock: ['#8f8ca8', '#a7a5bc'] }[o.type];
  burst('shard', cx, -o.h / 2, 12, 420, 1.2, 8, cols, { g: 1400 * ZONES[R.zone].grav, vr: 12, land: true, dir: -Math.PI / 2, spread: 2.4 });
  burst('dust', cx, -10, 8, 200, 0.5, 12, [ZONES[R.zone].dirt], { drag: 3 });
  if (o.type === 'hydrant') burst('puff', cx, -o.h, 14, 500, 0.8, 7, ['#55b8ff', '#bfe6ff'], { g: 1200, dir: -Math.PI / 2, spread: 0.7 });
  sfx(o.type === 'snowman' ? 'thud' : o.type === 'crab' ? 'angry' : 'crash', o.type === 'snowman' ? 1 : undefined);
  if (R.catId === 'chonk') {
    c.vx *= 0.93; wtext('SMASH!', c.x, c.y - 50, '#ff8a1f', 32); shake(0.3);
  } else if (R.rebirth) {
    phoenix();
  } else {
    c.vx *= o.type === 'snowman' ? 0.45 : 0.32; c.vy = -Math.abs(c.vy) * 0.25 - 240; R.ouch = true;
    wtext(o.type === 'crab' ? 'PINCH!' : 'OUCH!', c.x, c.y - 50, '#ff4b4b', 34); shake(0.5); kick(-12, 0);
    if (!R.headless) setTimeout(() => sfx('angry'), 80); R.face = 'dizzy'; R.faceT = 0.9;
  }
}
function bounceUp(o, minUp, vxMin, label, col, snd) {
  const c = R.cat;
  let up = Math.max(minUp, c.vy * 1.02);
  if (R.flop) { up *= 1.35; R.flop = false; }
  c.vy = -up; c.vx = Math.max(c.vx * 1.02, vxMin);
  o.sq = 1; o.cd = 0.25; R.st.bounce++; c.ground = false;
  sfx(snd || 'boing'); shake(0.25); kick(0, 8);
  wtext(label, c.x, c.y - 50, col, 30);
  burst('star', c.x, c.y + c.r, 6, 260, 0.5, 8, ['#ffffff', '#ffc83a'], { drag: 3 });
  if (R.face !== 'angry') { R.face = 'happy'; R.faceT = 0.6; }
}

function physics(h) {
  const c = R.cat, cd = R.cd, zone = ZONES[R.zone];
  let g = GRAV * zone.grav * (ADM.lowg ? 0.5 : 1);
  if (R.glide > 0) { g *= 0.18; if (c.vy > 70) c.vy += (70 - c.vy) * Math.min(1, h * 10); }
  if (R.phantom > 0) { g *= 0.35; if (c.vy > 110) c.vy += (110 - c.vy) * Math.min(1, h * 6); c.vx -= c.vx * -0.02 * h; }
  if (R.jet > 0) { c.vx += 1250 * h; c.vy += (-120 - c.vy) * Math.min(1, h * 4); g *= 0.25; }
  if (R.rocket > 0) { c.vx += 1600 * h; c.vy += (-280 - c.vy) * Math.min(1, h * 5); g = 0; }
  c.vy += g * h;
  c.vx -= c.vx * cd.drag * (R.glide > 0 ? 0.4 : 1) * h;
  c.vx = clamp(c.vx, -600, 3400); c.vy = clamp(c.vy, -2600, 2800);
  c.x += c.vx * h; c.y += c.vy * h;

  for (const o of R.objs) {
    if (o.x > c.x + 260 || o.x + (o.w || 0) < c.x - 260) continue;
    if (o.hit) continue;
    switch (o.type) {
      case 'fish': case 'goldfish': case 'bird': case 'pigeon': case 'gull': case 'balloon': case 'catnip': case 'fuel': case 'ufo':
      case 'hotair': case 'plane': case 'heli': case 'kite': case 'aurora': case 'satellite': case 'asteroid': {
        if (o.used) break;
        if (o.type === 'asteroid' && (safe() || R.inv > 0)) break;
        const dx = o.x - c.x, dy = o.y - c.y, rr = airR(o) + c.r;
        if (dx * dx + dy * dy > rr * rr) break;
        if (o.type === 'ufo') o.used = true; else o.hit = true;
        hitAir(o); break;
      }
      case 'tramp':
        if (!o.cd && c.vy > 0 && c.x > o.x - HELP_PAD && c.x < o.x + o.w + HELP_PAD && c.y + c.r >= -30 && c.y + c.r <= 34) { c.y = -26 - c.r; bounceUp(o, 760, 260, 'BOING!', '#3aa3ff'); }
        break;
      case 'car': {
        const top = -74;
        if (!o.cd && c.x > o.x - HELP_PAD && c.x < o.x + o.w + HELP_PAD && c.y + c.r >= top - 8 && (c.vy > 0 || c.y > top)) { c.y = top - c.r; bounceUp(o, 860, 340, 'BEEP BEEP!', '#ffd23f', 'honk'); }
        break;
      }
      case 'awning': {
        const top = -o.h - 6;
        if (!o.cd && c.vy > 0 && c.x > o.x - HELP_PAD && c.x < o.x + o.w + HELP_PAD && c.y + c.r >= top - 8 && c.y + c.r <= top + 50) { c.y = top - c.r; bounceUp(o, 740, 300, 'BOING!', '#ff4b4b'); c.vx += 100; }
        break;
      }
      case 'ball': {
        const by = -o.r, dx = o.x - c.x, dy = by - c.y, rr = o.r * 1.4 + c.r;
        if (!o.cd && dx * dx + dy * dy < rr * rr) { c.y = Math.min(c.y, by - rr * 0.9); bounceUp(o, 950, 340, 'SUPER BOUNCE!', '#ff5d93'); c.vx += 120; o.cd = 0.4; }
        break;
      }
      case 'ramp': {
        if (o.cd || c.x < o.x || c.x > o.x + o.w) break;
        const surf = -o.h * (c.x - o.x) / o.w;
        if (c.y + c.r >= surf - 2 && c.vx > 80) {
          c.y = surf - c.r; c.vy = -Math.max(Math.abs(c.vx) * 0.75, 620); c.vx = Math.max(c.vx * 1.1, 400); o.cd = 0.6; R.st.bounce++; c.ground = false;
          sfx('ramp'); shake(0.3); wtext('SKI JUMP!', c.x, c.y - 50, '#3aa3ff', 32);
          burst('puff', c.x, c.y + c.r, 12, 260, 0.6, 8, ['#ffffff', '#e2ecff'], { drag: 3 });
        }
        break;
      }
      case 'penguin': {
        if (o.used) break;
        if (c.x > o.x - 10 && c.x < o.x + o.w + 10 && c.y + c.r > -o.h) {
          o.used = true; c.vx = Math.min(c.vx + 420, 1700); c.vy = Math.min(c.vy, -180); c.ground = false;
          sfx('penguin'); wtext('PENGUIN PUSH!', c.x, c.y - 50, '#26222c', 28); shake(0.2);
          burst('puff', c.x, -10, 8, 200, 0.5, 8, ['#ffffff'], { drag: 3 });
        }
        break;
      }
      default:
        if (HAZARDS[o.type]) {
          if (R.inv > 0 || safe()) break;
          const cxh = o.x + o.w / 2, hw = o.w * HAZ_W / 2;
          const nx = clamp(c.x, cxh - hw, cxh + hw), ny = clamp(c.y, -o.h * HAZ_H, 0);
          const dx = c.x - nx, dy = c.y - ny;
          if (dx * dx + dy * dy <= c.r * c.r) hitHazard(o);
        }
    }
  }

  // ground
  c.ground = false;
  const pit = safe() ? null : pitAt(c.x);
  if (pit && c.y + c.r >= -2) {
    // over a hole: no ground here
    if (c.y > 30) fallIn(pit);
    return;
  }
  if (c.y + c.r >= 0) {
    c.y = -c.r;
    const sea = safe() ? null : groundObjAt('sea', c.x);
    const pud = R.inv > 0 || safe() ? null : groundObjAt('puddle', c.x);
    if (sea && R.inv <= 0) {
      if (c.vy > 60 && c.vx > 330 && c.vy < c.vx * 1.3) {
        c.vy = -Math.max(260, c.vy * 0.6); c.vx *= 0.9; R.skips++; R.st.bounce++;
        wtext(R.skips > 1 ? `SKIP x${R.skips}!` : 'SKIP!', c.x, c.y - 50, '#2fa4ff', 30);
        waterSplash(c.x, false); sfx('skip', 0.9 + R.skips * 0.08);
      } else {
        if (c.vy > 60) {
          wtext('SPLOOSH!', c.x, c.y - 50, '#2fa4ff', 34);
          waterSplash(c.x, true);
          c.vx *= 0.5; R.face = 'dizzy'; R.faceT = 0.8;
        }
        c.vy = 0; c.ground = true; R.flop = false;
      }
    } else if (pud && !pud.hit) {
      pud.hit = true;
      c.vx *= 0.5; c.vy = 0; R.flop = false; c.ground = true;
      wtext('SPLASH!', c.x, c.y - 50, '#3aa3ff', 32);
      waterSplash(c.x, true);
      R.face = 'dizzy'; R.faceT = 0.8;
    } else if (c.vy > 160) {
      const impact = c.vy;
      if (R.flop) {
        c.vy = -Math.max(impact * 0.72, 760); c.vx = Math.max(c.vx, 220) + 60; R.flop = false;
        sfx('megaflop'); shake(0.8); punch(0.08); kick(0, 18);
        wtext('MEGA FLOP!', c.x, c.y - 60, '#ffc83a', 38);
        burst('dust', c.x, -6, 20, 520, 0.8, 16, [zone.dirt, zone.ground, '#ffffff'], { drag: 3, dir: -Math.PI / 2, spread: 2.6 });
        part('ring', c.x, -4, 0, 0, 0.4, 60, '#ffffff', { z: 0 });
      } else {
        c.vy = -impact * R.bounce; c.vx *= 0.8;
        sfx('thud', clamp(impact / 1200, 0.25, 1)); shake(clamp(impact / 2600, 0.05, 0.4));
        burst('dust', c.x, -6, Math.round(clamp(impact / 120, 3, 10)), impact * 0.25, 0.5, 10, [zone.ground, zone.dirt], { drag: 4, dir: -Math.PI / 2, spread: 2.8 });
      }
      if (c.vy > -130) { c.vy = 0; c.ground = true; }
    } else { c.vy = 0; c.ground = true; }
  }
  if (c.ground) {
    const inWater = groundObjAt('sea', c.x) || groundObjAt('puddle', c.x);
    const fr = inWater && R.inv <= 0 ? 1400 : zone.friction;
    c.vx -= Math.sign(c.vx) * Math.min(Math.abs(c.vx), fr * h);
    if (!R.headless && Math.abs(c.vx) > 60 && Math.random() < 0.25) part('dust', c.x - 14, -4, -c.vx * 0.1, -40 - Math.random() * 40, 0.4, 7, zone.id === 'snow' ? '#ffffff' : zone.dirt);
  }
}

function hitAir(o) {
  const c = R.cat;
  switch (o.type) {
    case 'fish':
      R.st.fish++; sfx('coin', 1 + Math.min(R.st.fish, 30) * 0.01);
      if (R.magnetT > 0) { c.vx += 90; c.vy = Math.min(c.vy, c.vy * 0.6); }
      burst('star', o.x, o.y, 4, 180, 0.4, 6, ['#ffc83a', '#ffffff'], { drag: 4 });
      if (R.st.fish % 10 === 0) wtext(`${R.st.fish} FISH!`, o.x, o.y - 30, '#ffc83a', 26);
      ui('fishBump');
      break;
    case 'bird': case 'pigeon': case 'gull':
      c.vx += 180; c.vy = Math.min(c.vy, 0) - 420; R.st.bird++;
      sfx('squawk', o.type === 'gull' ? 1.2 : o.type === 'pigeon' ? 0.8 : 1); shake(0.25); kick(8, -6);
      wtext('BIRD BOOST!', c.x, c.y - 50, '#4aa8ff', 28);
      burst('feather', o.x, o.y, 10, 320, 1.2, 7, o.type === 'bird' ? ['#4aa8ff', '#d9f0ff', '#2f8de6'] : o.type === 'pigeon' ? ['#8d93a6', '#c9cfdc'] : ['#ffffff', '#b9c2cc'], { g: 120, drag: 2.5, vr: 6 });
      break;
    case 'balloon':
      c.vy = Math.min(c.vy, 0) - 560; R.st.pop++;
      sfx('pop'); shake(0.15);
      wtext('POP!', c.x, c.y - 50, o.col, 30);
      burst('conf', o.x, o.y, 14, 360, 1, 9, [o.col, '#ffffff', '#ffc83a'], { g: 600, drag: 2, vr: 10 });
      break;
    case 'catnip': case 'fuel':
      R.rocket = 0.95; c.ground = false;
      sfx('rocket'); shake(0.45); punch(0.1); slowmo(0.3, 0.2);
      banner(o.type === 'fuel' ? 'ROCKET FUEL!' : 'CATNIP ROCKET!', '#ffc83a');
      burst('star', o.x, o.y, 12, 380, 0.7, 10, ['#ffc83a', '#ffffff', '#3fcf5c'], { drag: 3 });
      R.face = 'wow'; R.faceT = 1.2;
      break;
    case 'goldfish':
      R.st.fish += 5; sfx('coin', 1.3); setTimeout(() => sfx('coin', 1.5), 60);
      burst('star', o.x, o.y, 10, 260, 0.6, 8, ['#ffd23f', '#ffffff'], { drag: 3 });
      wtext('GOLDEN FISH +5', o.x, o.y - 30, '#ffd23f', 28); ui('fishBump');
      break;
    case 'hotair':
      c.vy = Math.min(c.vy, 0) - 720; c.vx += 160; R.st.bounce++; sfx('boing', 0.7);
      wtext('HOT AIR LIFT!', c.x, c.y - 50, '#ff5d93', 30); shake(0.25);
      break;
    case 'plane':
      c.vx += 520; c.vy = Math.min(c.vy, -160); sfx('whoosh'); shake(0.35); punch(0.05);
      wtext('PLANE RIDE!', c.x, c.y - 50, '#3aa3ff', 30);
      burst('puff', o.x, o.y, 10, 200, 0.5, 10, ['#ffffff'], { drag: 3 });
      break;
    case 'heli':
      c.vy = -880; c.vx += 120; sfx('whoosh'); shake(0.3);
      wtext('CHOPPER LIFT!', c.x, c.y - 50, '#ffd23f', 30);
      break;
    case 'kite':
      c.vy = Math.min(c.vy, 0) - 520; c.vx += 220; sfx('glide');
      wtext('KITE BOOST!', c.x, c.y - 50, '#ff4b4b', 28);
      break;
    case 'aurora':
      c.vx += 320; c.vy -= 300; R.st.fish += 3; sfx('zone'); punch(0.06);
      wtext('AURORA RUSH! +3', c.x, c.y - 50, '#3fffd5', 30);
      burst('star', o.x, o.y, 14, 380, 0.7, 9, ['#3fffd5', '#8f63ff', '#ffffff'], { drag: 3 });
      break;
    case 'satellite':
      c.vx += 460; c.vy = Math.min(c.vy, -100); sfx('beam'); shake(0.3);
      wtext('ORBIT SLINGSHOT!', c.x, c.y - 50, '#7f8cff', 30);
      break;
    case 'asteroid':
      R.st.smash++; sfx('crash'); shake(0.5);
      burst('shard', o.x, o.y, 12, 380, 1, 9, ['#8f8ca8', '#6b6880'], { g: 600, vr: 10 });
      if (R.rebirth) phoenix(); else { c.vx *= 0.55; c.vy = Math.max(c.vy, 0) + 200; wtext('BONK!', c.x, c.y - 50, '#ff4b4b', 32); R.face = 'dizzy'; R.faceT = 0.9; R.ouch = true; }
      break;
    case 'ufo':
      c.vy = Math.min(c.vy, 0) - 760; c.vx += 160;
      sfx('beam'); shake(0.3); wtext('BEAM ME UP!', c.x, c.y - 50, '#7ff0ff', 30);
      burst('star', c.x, c.y, 10, 300, 0.6, 7, ['#fff6a0', '#7ff0ff'], { drag: 3 });
      R.face = 'wow'; R.faceT = 0.8;
      break;
  }
}

// ---------- missions ----------
function runVal(t) {
  switch (t) {
    case 'dist': return Math.floor(R.dist);
    case 'fish': case 'fishT': return R.st.fish;
    case 'height': return Math.floor(R.maxH / PX_PER_M);
    case 'zone': return R.zoneMax;
    default: return R.st[t] || 0;
  }
}
function missionValue(m) { const mt = MTYPE_BY[m.t]; return mt.run ? runVal(m.t) : m.prog + runVal(m.t); }
function checkMissions() {
  if (!R || R.phase === 'lobby') return;
  S.missions.forEach((m, i) => {
    if (R.mDoneIdx.includes(i)) return;
    if (missionValue(m) >= m.goal) {
      R.mDoneIdx.push(i); R.mCoins += m.reward;
      if (!R.headless) { ui('onMission', m); }
    }
  });
}

function payout() {
  const mult = luckMult(S.up.luck);
  const distC = Math.floor(R.dist * 0.32);
  const fishC = R.st.fish * 2;
  const perfC = R.perfect ? 10 : 0;
  const total = Math.round((distC + fishC + perfC) * mult) + R.mCoins;
  return { distC, fishC, perfC, mult, mCoins: R.mCoins, total };
}
function endRun() {
  if (R.phase === 'done') return;
  R.phase = 'done';
  const p = payout();
  const prevBest = S.best, prevRank = rankOf(S.mDone);
  let completed = [], newSkins = [];
  if (!R.paid) {
    R.paid = true;
    S.coins += p.total; S.runs++;
    if (R.dist > S.best) S.best = Math.round(R.dist * 10) / 10;
    S.totals.fish += R.st.fish; S.totals.pop += R.st.pop; S.totals.perfect += R.st.perfect; S.totals.smash += R.st.smash; S.totals.bird += R.st.bird;
    // commit mission progress, replace finished ones
    S.missions.forEach((m, i) => { if (!MTYPE_BY[m.t].run) m.prog += runVal(m.t); if (R.mDoneIdx.includes(i)) completed.push(m); });
    S.missions = S.missions.filter((m, i) => !R.mDoneIdx.includes(i));
    S.mDone += completed.length;
    fillMissions();
    newSkins = grantReqSkins();
    if (!R.headless) writeSave();
  }
  R.result = { fell: R.fell, assists: R.assists, dist: R.dist, ...p, newBest: R.dist > prevBest && R.dist > 0, prevBest, completed, newSkins, rankUp: rankOf(S.mDone) > prevRank ? rankOf(S.mDone) : 0, zoneMax: R.zoneMax };
  ui('onRunEnd', R.result);
}

// ---------- rendering ----------
const cv = document.getElementById('cv');
const ov = document.getElementById('ov');
const octx = ov.getContext('2d');
let DPR = 1;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  DPR = CG.dpr();
  GL.resize(w, h, DPR);
  ov.width = Math.round(w * DPR); ov.height = Math.round(h * DPR);
  CAM.W = w; CAM.H = h;
}
let skyKey = '';
function setSky(z, frac, alt = 0) {
  const a = ZONES[z], b = ZONES[Math.min(z + 1, ZONES.length - 1)];
  const top = mixHex(mixHex(a.sky, b.sky, frac), '#0b0930', alt), hor = mixHex(mixHex(a.horizon, b.horizon, frac), '#3a2f7a', alt * 0.8);
  const key = top + hor;
  if (key !== skyKey) { skyKey = key; document.getElementById('game').style.background = `linear-gradient(${top}, ${hor} 70%)`; }
  const hc = hex3(hor); GL.fogC = [hc[0], hc[1], hc[2]];
}
function render(alpha, rt) {
  const W = CAM.W, H = CAM.H;
  if (BOXST) { octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, ov.width, ov.height); renderBoxScene(rt); return; }
  const shakeAmt = SET.shake / 100;
  const tr = CAM.trauma * CAM.trauma * shakeAmt;
  const sx = (Math.random() * 2 - 1) * 22 * tr + CAM.kx * shakeAmt, sy = (Math.random() * 2 - 1) * 22 * tr + CAM.ky * shakeAmt;
  const dist = CAM.dist * (1 - CAM.punch);
  const tx = CAM.x + sx * dist / 900, ty = -CAM.y - sy * dist / 900;
  const eye = [tx, ty + dist * 0.16, dist], target = [tx, ty, 0];
  // zone tint: blend near boundaries
  const zf = zoneAt(CAM.x);
  const nextFrom = zf + 1 < ZONES.length ? ZONES[zf + 1].from * PX_PER_M : 1e9;
  const frac = clamp(1 - (nextFrom - CAM.x) / 600, 0, 1);
  const alt = clamp((-CAM.y - 700) / 2600, 0, 1);
  setSky(zf, frac, alt);
  GL.fog = [dist + 300, dist + 2600];
  GL.lineW = 3.2;
  GL.begin(eye, target, FOV, null);
  const hw = dist * TAN * (W / H);
  const x0 = tx - hw - 400, x1 = tx + hw + 400;
  const pits = R ? R.objs.filter(o => o.type === 'pit') : [];
  drawGround(x0, x1, pits);
  drawPlanets(tx, ty, hw, dist, zf, alt, rt);
  // scenery for zones in view (wider range for depth)
  const zA = zoneAt(Math.max(0, x0 - 1500)), zB = zoneAt(x1 + 1500);
  for (let z = zA; z <= zB; z++) drawScenery(z, x0 - 1500, x1 + 1500, rt);
  drawClouds(x0 - 1500, x1 + 1500, ty, ZONES[zf].id === 'moon');
  // sky decorations
  if (ZONES[zf].id === 'moon') {
    for (let i = Math.floor((tx - hw * 3) / 300); i < (tx + hw * 3) / 300; i++) { const h = hash(i * 5.3); if (h < 0.5) continue; P('sphere', '#ffffff', i * 300, 300 + hash(i * 1.7) * 2200, -2400, 10, 10, 10, 0, 0, 0, { noLine: true, emit: 1, noFog: true }); }
    P('sphere', '#3aa3ff', tx + hw * 1.2, ty + dist * 0.9, -2600, 520, 520, 520, 0, rt * 0.05, 0, { noFog: true });
    P('sphere', '#3fcf5c', tx + hw * 1.2 + 80, ty + dist * 0.9 + 90, -2350, 220, 140, 160, 0, 0, 0.3, { noLine: true, noFog: true });
  } else P('sphere', '#ffd23f', tx + hw * (R && R.phase === 'lobby' ? -1.1 : 1.3), ty + dist * 0.85, -2800, 360, 360, 360, 0, 0, 0, { emit: 1, noFog: true });
  // signs
  for (let m = Math.max(50, Math.floor(x0 / PX_PER_M / 50) * 50); m * PX_PER_M < x1; m += 50) drawSign(m);
  if (S.best > 5) { const bx = S.best * PX_PER_M; if (bx > x0 && bx < x1) { P('cyl', INK, bx, 75, 20, 4, 150, 4); P('box', '#ff4b4b', bx + 30, 132, 20, 56, 32, 4, 0, 0, 0); } }
  if (R) {
    for (const o of R.objs) { if (o.x + (o.w || 0) < x0 || o.x > x1) continue; drawObj3(o, rt); }
    const showCat = R.phase === 'lobby' || R.phase === 'aim';
    const face = Math.sin(rt * 0.9) > 0.985 ? 'blink' : (R.phase === 'aim' ? 'wow' : 'normal');
    drawCannon3(S.eq.cannon, R.angle, R.recoil, rt, R.cd, S.eq.hat, face, showCat, R.swell);
    if (R.phase === 'locker') {
      P('cyl', '#ffd23f', -150, 10, 0, 90, 20, 90);
      P('ring', '#ff8a1f', -150, 20, 0, 92, 60, 92, 0, 0, 0, NL);
      GL.push(-150, 20 + 22 * R.cd.scale + Math.abs(Math.sin(rt * 3)) * 6, 0, 0, Math.sin(rt * 0.8) * 0.9 - 0.5, 0);
      drawCat3(R.cd, S.eq.hat, rt, Math.sin(rt * 0.9) > 0.97 ? 'blink' : 'happy', 'sit', {});
      GL.pop();
      if (S.eq.trail !== 'none' && Math.random() < 0.3) { const cols = TRAIL_COL[S.eq.trail]; part(S.eq.trail === 'bubbles' ? 'bubble' : 'star', -150 + (Math.random() - 0.5) * 80, -40 - Math.random() * 60, 0, -60, 0.8, 5, cols[Math.floor(Math.random() * cols.length)], { z: 20 }); }
    }
    if (!showCat && R.phase !== 'locker') {
      const c = R.cat;
      const x = lerp(c.px, c.x, alpha), y = lerp(c.py, c.y, alpha);
      const hgt = Math.max(0, -y - c.r);
      const ss = c.r * 2.2 * clamp(1.2 - hgt / 1500, 0.35, 1.2);
      P('cyl', mixHex(ZONES[zoneAt(x)].ground, '#16121a', 0.35), x, 1.5, 0, ss, 1, ss * 0.6, 0, 0, 0, NL);
      const rot = c.prot + angDiff(c.rot, c.prot) * alpha;
      const sp = Math.hypot(c.vx, c.vy);
      const st = c.ground ? 0 : clamp((sp - 500) / 4000, 0, 0.2);
      const wet = c.ground && (groundObjAt('sea', c.x) || groundObjAt('puddle', c.x));
      const sink = wet ? 14 + Math.sin(rt * 4) * 3 : 0;
      if (wet && Math.random() < 0.04) part('ripple', c.x, -1, 0, 0, 0.9, 22, '#e8f8ff', { z: 10 });
      GL.push(x, -y - sink, 0, 0, -0.45, -rot + (wet ? Math.sin(rt * 3) * 0.12 : 0), 1 + st, 1 - st * 0.6, 1 - st * 0.3);
      if (!(R.inv > 0 && Math.sin(rt * 60) > 0)) drawCat3(R.cd, S.eq.hat, rt, R.face, c.ground ? 'sit' : 'fly', { puff: R.glide > 0 ? clamp(R.glide, 0, 1) : 0, jet: R.jet > 0, magnet: R.magnetT > 0, phase: R.phantom > 0 });
      GL.pop();
    }
  }
  drawParticles3();
  // ---- 2D overlay: labels, texts, aim gauge ----
  const g = octx;
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (let m = Math.max(50, Math.floor(x0 / PX_PER_M / 50) * 50); m * PX_PER_M < x1; m += 50) {
    const p = GL.project(m * PX_PER_M, 92, 46); if (p.w <= 0) continue;
    const fsz = clamp(9000 / p.w, 9, 24) * (m % 100 === 0 ? 1 : 0.85);
    g.font = `${fsz.toFixed(1)}px 'Archivo Black', Impact, sans-serif`; g.fillStyle = INK; g.fillText(`${m}m`, p.x, p.y);
  }
  if (S.best > 5) {
    const p = GL.project(S.best * PX_PER_M + 30, 132, 26);
    if (p.x > -50 && p.x < W + 50) { g.font = `${clamp(8000 / p.w, 9, 18).toFixed(1)}px 'Archivo Black', Impact, sans-serif`; g.lineWidth = 4; g.strokeStyle = INK; g.strokeText('BEST', p.x, p.y); g.fillStyle = '#fff'; g.fillText('BEST', p.x, p.y); }
  }
  for (const w of FX.texts) {
    const p = GL.project(w.x, -w.y, 0);
    const k = w.life / w.max, sc = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
    g.globalAlpha = clamp(k * 3, 0, 1);
    g.font = `${(w.size * sc * clamp(900 / p.w, 0.7, 1.2)).toFixed(1)}px 'Archivo Black', Impact, sans-serif`;
    g.lineWidth = 6; g.strokeStyle = INK; g.strokeText(w.text, p.x, p.y); g.fillStyle = w.col; g.fillText(w.text, p.x, p.y);
  }
  g.globalAlpha = 1;
  if (R && R.phase === 'aim') drawAimGauge2D(g, rt);
  if (R && ADM.hit) drawHitboxes(g);
  if (R && (R.phase === 'fly' || R.phase === 'done')) {
    const c = R.cat, p = GL.project(c.x, -c.y, 0);
    if (p.y < -10) {
      g.lineWidth = 4; g.strokeStyle = INK; g.fillStyle = '#ff8a1f';
      g.beginPath(); g.moveTo(p.x, 14); g.lineTo(p.x - 14, 36); g.lineTo(p.x + 14, 36); g.closePath(); g.fill(); g.stroke();
      g.font = "16px 'Archivo Black', Impact, sans-serif"; g.lineWidth = 5; g.strokeText(`${Math.round(-c.y / PX_PER_M)}m`, p.x, 56); g.fillStyle = '#fff'; g.fillText(`${Math.round(-c.y / PX_PER_M)}m`, p.x, 56);
    }
  }
}
function drawAimGauge2D(g, t) {
  const pv = GL.project(CANNON.x, -CANNON.y, 0), pr = GL.project(CANNON.x + 210, -CANNON.y, 0);
  const R0 = (pr.x - pv.x) * 0.92, R1 = R0 + 26;
  const seg = (a0, a1, col) => {
    const r0 = -a0 * Math.PI / 180, r1 = -a1 * Math.PI / 180;
    g.beginPath(); g.arc(pv.x, pv.y, R1, r0, r1, true); g.arc(pv.x, pv.y, R0, r1, r0, false); g.closePath(); g.fillStyle = col; g.fill();
  };
  seg(15, 30, '#ff6b6b'); seg(30, 40, '#ffc83a'); seg(40, 50, '#3fcf5c'); seg(50, 60, '#ffc83a'); seg(60, 75, '#ff6b6b');
  g.lineWidth = 4; g.strokeStyle = INK;
  g.beginPath(); g.arc(pv.x, pv.y, R1, -15 * Math.PI / 180, -75 * Math.PI / 180, true); g.arc(pv.x, pv.y, R0, -75 * Math.PI / 180, -15 * Math.PI / 180, false); g.closePath(); g.stroke();
  g.lineWidth = 2.5;
  for (const d of [30, 40, 50, 60]) { const r = -d * Math.PI / 180; g.beginPath(); g.moveTo(pv.x + Math.cos(r) * R0, pv.y + Math.sin(r) * R0); g.lineTo(pv.x + Math.cos(r) * R1, pv.y + Math.sin(r) * R1); g.stroke(); }
  const r = -R.angle * Math.PI / 180, inG = R.angle >= 40 && R.angle <= 50;
  g.save(); g.translate(pv.x + Math.cos(r) * (R1 + 8), pv.y + Math.sin(r) * (R1 + 8)); g.rotate(r);
  g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, -13); g.lineTo(14, 13); g.closePath();
  g.fillStyle = inG ? '#3fcf5c' : '#fff'; g.fill(); g.lineWidth = 4; g.stroke();
  g.restore();
}

function drawHitboxes(g) {
  g.lineWidth = 2;
  const c = R.cat, pc = GL.project(c.x, -c.y, 0), pr = GL.project(c.x + c.r, -c.y, 0);
  g.strokeStyle = '#00ff88'; g.beginPath(); g.arc(pc.x, pc.y, Math.abs(pr.x - pc.x), 0, Math.PI * 2); g.stroke();
  for (const o of R.objs) {
    if (o.hit) continue;
    if (AIR_R[o.type]) {
      const p = GL.project(o.x, -o.y, 0), q = GL.project(o.x + airR(o), -o.y, 0);
      if (p.x < -100 || p.x > CAM.W + 100) continue;
      g.strokeStyle = o.type === 'asteroid' ? '#ff3355' : '#33aaff'; g.beginPath(); g.arc(p.x, p.y, Math.abs(q.x - p.x), 0, Math.PI * 2); g.stroke();
    } else if (HAZARDS[o.type] || o.type === 'pit') {
      const isPit = o.type === 'pit';
      const l = isPit ? o.x + o.w * PIT_IN : o.x + o.w / 2 - o.w * HAZ_W / 2, r = isPit ? o.x + o.w * (1 - PIT_IN) : o.x + o.w / 2 + o.w * HAZ_W / 2;
      const a = GL.project(l, isPit ? 0 : o.h * HAZ_H, 0), b = GL.project(r, isPit ? -40 : 0, 0);
      g.strokeStyle = '#ff3355'; g.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
  }
  if (R.phase === 'fly' && !R.cat.ground) {
    const L = predictLanding(R.cat);
    if (L) { const p = GL.project(L.x, 0, 0); g.strokeStyle = '#ffff00'; g.beginPath(); g.moveTo(p.x - 10, p.y - 10); g.lineTo(p.x + 10, p.y + 10); g.moveTo(p.x + 10, p.y - 10); g.lineTo(p.x - 10, p.y + 10); g.stroke(); }
  }
}
