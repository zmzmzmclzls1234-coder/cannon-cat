'use strict';
// ---------- v0.6: air combo chain, rival flags from the leaderboard, daily streak reward, landing finale ----------
// Loaded after game.js / layout.js / lb.js / ui.js and before main.js. It extends those modules by wrapping
// their global functions, so the core files stay untouched.

// ===== extra sounds (synth stand-ins, same family as audio.js) =====
SFX.combo = n => { const f = 520 * Math.pow(1.06, Math.min(n, 24)); tone('square', f, f * 1.5, 0.07, 0.09); tone('sine', f * 2, f * 2.2, 0.09, 0.07, 0.04); };
SFX.comboTier = () => { [0, 0.07, 0.14, 0.21].forEach((d, i) => tone('square', 660 * Math.pow(1.26, i), 700 * Math.pow(1.26, i), 0.1, 0.1, d)); noise(0.25, 0.08, 'highpass', 4000, 9000, 1, 0.2); };
SFX.bank = () => { tone('sine', 900, 1400, 0.12, 0.12); tone('sine', 1350, 1800, 0.12, 0.08, 0.06); };
SFX.pass = () => { tone('triangle', 520, 780, 0.12, 0.14); tone('triangle', 780, 1170, 0.14, 0.12, 0.09); noise(0.18, 0.06, 'bandpass', 2500, 6000, 2, 0.05); };
SFX.daily = () => { [0, 0.08, 0.16, 0.24, 0.36].forEach((d, i) => tone('triangle', 523 * Math.pow(1.19, i), 523 * Math.pow(1.19, i) * 1.01, 0.16, 0.12, d)); };
SFX_GAP.combo = 0.03;

// ===== AIR COMBO =====
// Every bounce, boost or skip while the cat stays airborne adds 1 to the chain. Fish keep it alive.
// The chain banks (never lost) when the window runs out, on a hazard hit, or when the run ends.
const COMBO_WIN = 2.6;
const COMBO_TIERS = [5, 10, 15, 20, 30];
const COMBO_COL = ['#ffffff', '#3fcf5c', '#3aa3ff', '#b05cff', '#ff8a1f', '#ffc83a'];
const BOOST_TYPES = { bird: 1, pigeon: 1, gull: 1, balloon: 1, catnip: 1, fuel: 1, ufo: 1, hotair: 1, plane: 1, heli: 1, kite: 1, aurora: 1, satellite: 1 };
function comboTier(n) { let t = 0; for (const x of COMBO_TIERS) if (n >= x) t++; return t; }
function comboHit() {
  if (!R || R.phase !== 'fly') return;
  R.combo++; R.comboT = COMBO_WIN;
  if (R.combo >= 2) R.comboRun += (R.combo - 1) * 2;
  R.comboBest = Math.max(R.comboBest, R.combo);
  if (R.headless) return;
  if (R.combo >= 2) sfx('combo', R.combo);
  if (COMBO_TIERS.includes(R.combo)) {
    const col = COMBO_COL[comboTier(R.combo)];
    banner(`COMBO x${R.combo}!`, col); sfx('comboTier'); punch(0.05); shake(0.2);
    burst('conf', R.cat.x, R.cat.y, 18, 420, 1, 8, [col, '#ffffff', '#ffc83a'], { g: 500, drag: 2, vr: 10 });
  }
  comboHud(true);
}
function comboBank(reason) {
  if (!R || !R.combo) return;
  if (R.combo >= 2) {
    R.comboC += R.comboRun;
    if (!R.headless) {
      wtext(`x${R.combo} COMBO +${R.comboRun}`, R.cat.x, R.cat.y - 80, COMBO_COL[comboTier(R.combo)], 28);
      sfx('bank'); if (typeof bump === 'function') bump(document.getElementById('coinHud'));
    }
  }
  R.combo = 0; R.comboT = 0; R.comboRun = 0;
  if (!R.headless) comboHud(false, reason);
}
let comboEl = null, UIZ = 1;
function comboHud(hit, reason) {
  if (!comboEl) return;
  if (!R || R.combo < 2) {
    if (comboEl.classList.contains('on')) { comboEl.classList.remove('on'); if (reason === 'ouch') retrig(comboEl, 'lost'); }
    return;
  }
  const t = comboTier(R.combo);
  comboEl.classList.add('on');
  comboEl.style.setProperty('--cc', COMBO_COL[t]);
  comboEl.querySelector('b').textContent = 'x' + R.combo;
  comboEl.querySelector('small').textContent = '+' + R.comboRun;
  if (hit) retrig(comboEl, 'hit');
}
function comboTick(h) {
  if (!R || !R.combo) return;
  const c = R.cat;
  const resting = c.ground && Math.abs(c.vy) < 1;
  R.comboT -= h * (resting ? 3 : 1);
  if (comboEl && !R.headless) comboEl.style.setProperty('--k', clamp(R.comboT / COMBO_WIN, 0, 1).toFixed(3));
  if (R.comboT <= 0) comboBank('time');
}

// ===== RIVAL FLAGS (leaderboard players' bests placed in the world) =====
const RIVAL_COL = ['#3aa3ff', '#b05cff', '#3fcf5c', '#ff5d93', '#ff8a1f'];
function pickRivals() {
  const me = LB.name;
  const rows = (LB.top || []).filter(p => p && !p.you && p.name !== me && p.best > 3).map((p, i) => ({ name: String(p.name).slice(0, 16), best: +p.best, rank: p.rank || i + 1, bot: !!p.bot }));
  rows.sort((a, b) => a.best - b.best);
  const above = rows.filter(p => p.best > S.best).slice(0, 5);
  const below = rows.filter(p => p.best <= S.best).slice(-3);
  const top = rows.length ? [rows[rows.length - 1]] : [];
  const pick = [];
  for (const p of [...below, ...above, ...top]) {
    if (pick.includes(p)) continue;
    if (pick.some(q => Math.abs(q.best - p.best) < 6)) continue; // no two flags on top of each other
    pick.push(p);
  }
  return pick.slice(0, 9).sort((a, b) => a.best - b.best).map((p, i) => ({ ...p, col: RIVAL_COL[i % RIVAL_COL.length], z: i % 2 ? -70 : -150, passed: false }));
}
function nextRival() { return R && R.rivals ? R.rivals.find(p => !p.passed) : null; }
let rivalEl = null, rivalKey = '';
function rivalHud() {
  if (!rivalEl) return;
  const p = R && R.phase !== 'lobby' && R.phase !== 'locker' ? nextRival() : null;
  const key = p ? p.name + p.best : '';
  if (key === rivalKey) return;
  rivalKey = key;
  rivalEl.classList.toggle('on', !!p);
  if (p) { rivalEl.innerHTML = `<i style="background:${p.col}"></i><span>NEXT</span> <b></b> ${Math.floor(p.best)}m`; rivalEl.querySelector('b').textContent = p.name; retrig(rivalEl, 'hit'); }
}
function rivalTick() {
  if (!R || !R.rivals || R.phase !== 'fly') return;
  for (const p of R.rivals) {
    if (p.passed || R.dist < p.best) continue;
    p.passed = true; R.passed++;
    if (R.headless) continue;
    wtext(`PASSED ${p.name}!`, R.cat.x, R.cat.y - 70, p.col, 26);
    sfx('pass');
    burst('star', R.cat.x, R.cat.y, 10, 300, 0.6, 7, [p.col, '#ffffff'], { drag: 3 });
  }
  rivalHud();
}
function drawRivals3() {
  if (!R || !R.rivals || !R.rivals.length) return;
  const hw = CAM.dist * TAN * (CAM.W / CAM.H) + 500;
  for (const p of R.rivals) {
    const x = p.best * PX_PER_M;
    if (Math.abs(x - CAM.x) > hw) continue;
    const wave = Math.sin(rt * 3 + p.best) * 0.12;
    P('cyl', INK, x, 70, p.z, 4, 140, 4);
    P('box', p.passed ? '#c9c2b8' : p.col, x + 26, 122, p.z, 48, 28, 4, 0, wave, 0);
    P('sphere', '#ffd23f', x, 142, p.z, 7, 7, 7);
  }
}
function drawRivalLabels(g) {
  if (!R || !R.rivals || !R.rivals.length) return;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const p of R.rivals) {
    const x = p.best * PX_PER_M;
    const q = GL.project(x + 26, 162, p.z);
    if (q.w <= 0 || q.x < -80 || q.x > CAM.W + 80) continue;
    const fs = clamp(9000 / q.w, 11, 19) * UIZ;
    g.font = `${fs.toFixed(1)}px 'Archivo Black', Impact, sans-serif`;
    g.globalAlpha = p.passed ? 0.55 : 1;
    g.lineWidth = 5; g.strokeStyle = INK; g.strokeText(p.name, q.x, q.y); g.fillStyle = '#fff'; g.fillText(p.name, q.x, q.y);
    g.globalAlpha = 1;
  }
}
function refreshBoard() { if (LB.base !== undefined) LB.fetchBoard().catch(() => {}); }

// ===== DAILY STREAK =====
const DAILY = [60, 90, 130, 180, 240, 320, 'super'];
function dayKey(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dayDiff(a, b) { const pa = a.split('-').map(Number), pb = b.split('-').map(Number); return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 864e5); }
function dailyReady() { return S.daily && S.daily.last !== dayKey(); }
function dailyNextDay() { // 1..7, which tile is claimable today
  const d = S.daily; if (!d.last) return 1;
  const gap = dayDiff(d.last, dayKey());
  if (gap === 1) return d.streak >= 7 ? 1 : d.streak + 1;
  return 1;
}
function renderDaily() {
  const today = dailyNextDay();
  const done = dailyReady() ? today - 1 : S.daily.streak;
  $('#dailyGrid').innerHTML = DAILY.map((r, i) => {
    const n = i + 1, cls = n <= done ? 'got' : n === today && dailyReady() ? 'now' : '';
    const prize = r === 'super' ? `<span class="dBox"></span><em>SUPER BOX</em>` : `<span class="dCoin"><i class="coin"></i></span><em>${r}</em>`;
    return `<div class="dTile ${cls} ${r === 'super' ? 'big' : ''}"><small>DAY ${n}</small>${prize}${n <= done ? '<b class="dCk">✓</b>' : ''}</div>`;
  }).join('');
  const btn = $('#dailyClaim');
  btn.disabled = !dailyReady();
  btn.textContent = dailyReady() ? 'CLAIM!' : 'COME BACK TOMORROW';
  $('#dailyHint').textContent = dailyReady() ? (today > 1 ? `${today - 1} day streak - keep it going!` : 'Come back every day for bigger prizes.') : 'Your next prize unlocks tomorrow.';
}
function claimDaily() {
  if (!dailyReady()) return;
  const n = dailyNextDay(), r = DAILY[n - 1];
  S.daily = { last: dayKey(), streak: n };
  if (r === 'super') {
    writeSave(); back();
    setTimeout(() => openBox('super', null, true), 250);
    return;
  }
  S.coins += r; writeSave(); refreshCoins(); sfx('daily');
  const tile = $$('#dailyGrid .dTile')[n - 1];
  if (tile) { tile.classList.remove('now'); tile.classList.add('got', 'pop'); }
  toast(`+${r} coins! See you tomorrow.`);
  renderDaily();
  setTimeout(() => { if (stack[stack.length - 1] === 'daily') back(); }, 1100);
}
let dailyShown = '';
function maybeDaily() {
  if (!S || S.runs < 1 || !S.freeBox || !dailyReady() || dailyShown === dayKey()) return;
  setTimeout(() => {
    if (mode !== 'lobby' || stack.length || BOXST || (typeof guideActive === 'function' && guideActive())) return;
    dailyShown = dayKey();
    openOverlay('daily');
  }, 650);
}

// ===== wiring =====
(function () {
  // save: keep the daily streak (sanitize drops unknown fields)
  const baseDef = defSave;
  defSave = function () { const d = baseDef(); d.daily = { last: '', streak: 0 }; return d; };
  const baseSan = sanitize;
  sanitize = function (s) {
    const d = baseSan(s);
    const dl = s && s.daily;
    d.daily = { last: dl && typeof dl.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dl.last) ? dl.last : '', streak: dl ? clamp(Math.floor(+dl.streak || 0), 0, 7) : 0 };
    return d;
  };

  const baseNew = newRun;
  newRun = function (phase, seed, headless) {
    const r = baseNew(phase, seed, headless);
    r.combo = 0; r.comboT = 0; r.comboRun = 0; r.comboC = 0; r.comboBest = 0; r.passed = 0; r._bAdj = 0; r._landFx = false;
    r.rivals = headless ? null : pickRivals();
    rivalKey = '#'; if (!headless) { rivalHud(); comboHud(false); }
    return r;
  };
  const baseHitAir = hitAir;
  hitAir = function (o) {
    const b0 = R.st.bounce;
    baseHitAir(o);
    R._bAdj += R.st.bounce - b0;
    if (BOOST_TYPES[o.type]) comboHit();
    else if ((o.type === 'fish' || o.type === 'goldfish') && R.combo) R.comboT = Math.max(R.comboT, Math.min(COMBO_WIN, R.comboT + 0.6));
    else if (o.type === 'asteroid' && R.ouch) comboBank('ouch');
  };
  const baseHaz = hitHazard;
  hitHazard = function (o) {
    baseHaz(o);
    if (R.catId === 'chonk') comboHit(); // Chonk smashes through: that counts
    else comboBank('ouch');
  };
  const baseStep = step;
  step = function (h) {
    if (!R || R.phase !== 'fly') return baseStep(h);
    const b0 = R.st.bounce, a0 = R._bAdj, d0 = R.dist, hs = R.hitstop > 0;
    const wasStopped = R.stopT > 0.15;
    baseStep(h);
    if (!R) return;
    const nb = (R.st.bounce - b0) - (R._bAdj - a0);
    for (let i = 0; i < nb; i++) comboHit();
    if (R.phase === 'fly' && !hs) comboTick(h);
    rivalTick();
    if (R.headless) return;
    // crossing your best: a short slow-motion beat
    if (S.best > 20 && d0 < S.best && R.dist >= S.best) { slowmo(0.35, 0.5); punch(0.08); burst('conf', R.cat.x, R.cat.y, 24, 480, 1.2, 9, ['#ffc83a', '#ff5d93', '#3aa3ff', '#ffffff'], { g: 500, drag: 2, vr: 10 }); }
    // landing finale: the moment the cat settles
    if (!wasStopped && R.stopT > 0.15 && !R._landFx && R.phase === 'fly') {
      R._landFx = true;
      comboBank('land');
      punch(0.12); shake(0.15);
      wtext(`${Math.floor(R.dist)}m`, R.cat.x, R.cat.y - 90, R.dist > S.best ? '#ffc83a' : '#ffffff', 46);
      part('ring', R.cat.x, -4, 0, 0, 0.5, 90, '#ffffff', { z: 0 });
      if (R.dist > S.best && S.best > 0) burst('conf', R.cat.x, R.cat.y - 40, 30, 520, 1.4, 9, ['#ffc83a', '#ff5d93', '#3aa3ff', '#3fcf5c'], { g: 600, drag: 2, vr: 10 });
    }
  };
  const baseEnd = endRun;
  endRun = function () {
    if (R && R.phase !== 'done') comboBank('end');
    baseEnd();
    if (R && R.result) { R.result.comboBest = R.comboBest; R.result.passed = R.passed; R.result.comboC = R.comboC; }
  };
  const basePay = payout;
  payout = function () {
    const p = basePay();
    const live = R.combo >= 2 ? R.comboRun : 0;
    p.comboC = Math.round((R.comboC || 0) * p.mult);
    p.total += p.comboC + (R.phase === 'done' ? 0 : Math.round(live * p.mult));
    return p;
  };
  const baseParts = drawParticles3;
  drawParticles3 = function () { if (R && R.phase !== 'lobby' && R.phase !== 'locker') drawRivals3(); baseParts(); };
  const baseRender = render;
  render = function (alpha, t) {
    baseRender(alpha, t);
    if (!BOXST && R && (R.phase === 'aim' || R.phase === 'fly' || R.phase === 'done')) drawRivalLabels(octx);
  };
  const baseRes = showResults;
  showResults = function (res) {
    baseRes(res);
    const d = $('#resDetail');
    if (d && res.comboC) d.textContent = d.textContent.replace(/( · x[\d.]+)?$/, m => ` · ${res.comboC} combo` + m);
    const ex = $('#resExtra');
    if (ex) {
      const chips = [];
      if (res.comboBest >= 2) chips.push(`<span class="chip c1">BEST COMBO <b>x${res.comboBest}</b></span>`);
      if (res.passed) chips.push(`<span class="chip c2">PASSED <b>${res.passed}</b> ${res.passed > 1 ? 'PLAYERS' : 'PLAYER'}</span>`);
      ex.innerHTML = chips.join('');
      ex.classList.toggle('on', chips.length > 0);
    }
  };
  const baseLobby = goLobby;
  goLobby = function () { baseLobby(); maybeDaily(); };
  const baseOpen = openOverlay;
  openOverlay = function (id) { baseOpen(id); if (id === 'daily') renderDaily(); };
  const baseRunEnd = UI.onRunEnd;
  UI.onRunEnd = function (res) { baseRunEnd.call(UI, res); setTimeout(refreshBoard, 2500); };
  const baseLayout = applyLayout;
  applyLayout = function (w, h) {
    baseLayout(w, h);
    // big desktop screens: scale the whole UI up instead of leaving it tiny in the middle
    const z = LAYOUT === 'wide' ? clamp(Math.min(w / 1280, h / 720), 1, 1.7) : 1;
    UIZ = z; document.body.style.setProperty('--uiz', z.toFixed(3));
  };
  const baseInit = initUI;
  initUI = function () {
    const g = document.getElementById('game');
    const hud = document.getElementById('hud');
    comboEl = document.createElement('div'); comboEl.id = 'combo';
    comboEl.innerHTML = '<span class="cRing"></span><b>x2</b><em>COMBO</em><small>+0</small>';
    hud.appendChild(comboEl);
    rivalEl = document.createElement('div'); rivalEl.id = 'rival'; rivalEl.className = 'pill';
    document.getElementById('distBox').appendChild(rivalEl);
    const res = document.querySelector('#results .resCoins');
    if (res) { const ex = document.createElement('div'); ex.id = 'resExtra'; res.after(ex); }
    const d = document.createElement('div');
    d.className = 'screen dim'; d.id = 'daily';
    d.innerHTML = `<div class="panel narrow center"><div class="ribbon green ol">DAILY GIFT</div>
      <div class="pHead"><span></span><button class="btn sq red close" data-back aria-label="Close">✕</button></div>
      <div class="dailyGrid" id="dailyGrid"></div><p class="hint" id="dailyHint"></p>
      <button class="btn big yellow" id="dailyClaim">CLAIM!</button></div>`;
    g.insertBefore(d, document.getElementById('adBlock'));
    baseInit();
    d.querySelector('#dailyClaim').addEventListener('click', claimDaily);
    setTimeout(refreshBoard, 1200);
  };
})();
