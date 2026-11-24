'use strict';
// ---------- screens, HUD, input ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
let mode = 'lobby';
let paused = false;
let stack = [];
let lastInput = 'mouse';
let canAgainAt = 0;
let shopTab = 'up', skinTab = 'hat', lockTab = 'cat';
const LOCK_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" style="vertical-align:-1px"><rect x="3" y="7" width="10" height="8" rx="2" fill="#16121a"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="#16121a" stroke-width="2"/></svg>';

function banner(text, col) {
  if (R && R.headless) return;
  const b = $('#banner');
  b.textContent = text; b.style.color = col || '#fff';
  b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
}
let toastT = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}
function bump(el) { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function shakeEl(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function retrig(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function refreshCoins() {
  $$('.coinN').forEach(e => { e.textContent = S.coins.toLocaleString('en-US'); });
  $('#lobbyBest').textContent = Math.floor(S.best);
  $$('.rank').forEach(e => { e.textContent = rankOf(S.mDone); });
  $('#boxDot').classList.toggle('on', S.coins >= BOXES[0].cost);
  $('#admChip').classList.toggle('on', !!SET.admin && SET.admin.on);
}

// ----- missions -----
function missionHTML(m, i, doneSet) {
  const done = doneSet && doneSet.includes(i);
  const inRun = R && (R.phase === 'fly' || R.phase === 'aim' || R.phase === 'done');
  const v = inRun ? missionValue(m) : m.prog;
  const k = clamp(v / m.goal, 0, 1);
  const showBar = !MTYPE_BY[m.t].run || inRun;
  return `<div class="mis${done ? ' done' : ''}"><span class="ck">${done ? '✓' : ''}</span><span>${esc(missionLabel(m))}${showBar && !done ? `<div class="bar2"><i style="width:${(k * 100).toFixed(0)}%"></i></div>` : ''}</span><span class="rw"><i class="coin"></i>${m.reward}</span></div>`;
}
function renderMissionsPanel() {
  const rk = rankOf(S.mDone), into = S.mDone % 3;
  $('#rankBox').innerHTML = `<i class="rank">${rk}</i><div style="flex:1;text-align:left">RANK ${rk} <span class="hint">· ${3 - into} more to rank ${rk + 1}</span><div class="lvBar"><i style="width:${into / 3 * 100}%"></i></div></div>`;
  $('#misList').innerHTML = S.missions.map((m, i) => missionHTML(m, i, R ? R.mDoneIdx : [])).join('');
}

// ----- overlay stack -----
function openOverlay(id) {
  const top = stack[stack.length - 1];
  if (top === id) return;
  if (top) $('#' + top).classList.remove('on');
  stack.push(id);
  const el = $('#' + id); el.classList.remove('out'); el.classList.add('on');
  if (id === 'shop') renderShop();
  if (id === 'locker') { if (R && R.phase === 'lobby') R.phase = 'locker'; $('#lobby').classList.remove('on'); renderLocker(); }
  if (id === 'settings') syncSettings();
  if (id === 'missions') renderMissionsPanel();
  if (id === 'admin') renderAdmin();
  if (id === 'board') openBoard();
  sfx('open'); duckMusic(true);
  setTimeout(() => { const f = el.querySelector('.btn.big,.btn'); if (f && lastInput === 'key') f.focus(); }, 30);
}
function back() {
  const id = stack.pop();
  if (!id) return;
  const el = $('#' + id);
  el.classList.add('out');
  setTimeout(() => { el.classList.remove('on', 'out'); }, 160);
  sfx('close');
  if (id === 'locker' && R && R.phase === 'locker') { R.phase = 'lobby'; refreshLobbyCat(); }
  const top = stack[stack.length - 1];
  if (top) { const t = $('#' + top); t.classList.add('on'); if (top === 'shop') renderShop(); if (top === 'locker') renderLocker(); }
  if (!stack.length) {
    duckMusic(false);
    // leaving the last menu mid-launch (admin panel, settings...) always resumes the game
    if (mode === 'play' && paused) { paused = false; CG.gameplayStart(); }
    if (mode === 'lobby') { $('#lobby').classList.add('on'); refreshCoins(); refreshLobbyCat(); }
  }
}
function closeAll() {
  for (const id of stack) $('#' + id).classList.remove('on', 'out');
  stack = [];
}
function openShop(tab) { shopTab = tab; if (stack[stack.length - 1] === 'shop') renderShop(); else openOverlay('shop'); }

// ----- flow -----
function goLobby() {
  closeAll(); paused = false; timeScale = 1;
  mode = 'lobby';
  newRun('lobby');
  CG.gameplayStop();
  $('#hud').classList.remove('on'); $('#lobby').classList.add('on');
  tutOff(); refreshCoins(); duckMusic(false); setMusicZone(0);
}
function refreshLobbyCat() { if (R && (R.phase === 'lobby' || R.phase === 'locker')) { R.catId = S.eq.cat; R.cd = CAT_BY[S.eq.cat]; } }
function startRun() {
  closeAll(); paused = false; timeScale = 1;
  mode = 'play';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  newRun('aim');
  if (!SET.seen.aim) R.tutSlow = 0.55;
  FX.parts.length = 0; FX.texts.length = 0;
  $('#lobby').classList.remove('on'); $('#hud').classList.add('on');
  buildTrack(); updateHud(true);
  $('#bestHud').textContent = S.best > 0 ? `BEST ${Math.floor(S.best)}m` : '';
  duckMusic(false); setMusicZone(0);
  CG.gameplayStart();
}
function againWithAd() {
  if (!CG.adsAvailable()) { startRun(); return; }
  $('#adBlock').classList.add('on');
  CG.requestAd('midgame', () => { $('#adBlock').classList.remove('on'); startRun(); });
}
function togglePause(on) {
  if (mode !== 'play' || !R || R.phase === 'done') return;
  if (on === undefined) on = !paused;
  if (on && !paused) { paused = true; CG.gameplayStop(); openOverlay('pause'); }
  else if (!on && paused) { while (stack.length) back(); paused = false; CG.gameplayStart(); }
}
let CONFIRM_CB = null;
function askConfirm(text, onYes) {
  $('#confirmText').textContent = text;
  CONFIRM_CB = onYes;
  openOverlay('confirm');
  setTimeout(() => $('#confirmNo').focus(), 40);
}
function setMusicZone(z) { MUS_T = [0, 2, 5, -3, -5][z] || 0; MUS_SPACE = ZONES[z].id === 'moon'; }

// ----- spotlight tutorial: darken everything except the one button (and what it reacts to) -----
const TUT = { mode: null, t: 0, real: 0 };
const tutCv = $('#tut'), tutG = tutCv.getContext('2d');
function tutOff() { TUT.mode = null; tutCv.classList.remove('on'); $('#tutText').classList.remove('on', 'now'); if (R && R.tutHold) { R.tutHold = false; timeScale = 1; } }
function updateTutorial(dt) {
  if (mode !== 'play' || !R || paused || stack.length) { if (TUT.mode) { tutCv.classList.remove('on'); $('#tutText').classList.remove('on'); } return; }
  let want = null;
  if (R.phase === 'aim' && !SET.seen.aim) want = 'aim';
  else if (R.phase === 'fly' && !SET.seen.dash && R.charges > 0 && !R.dashTutDone && R.used === 0) {
    const c = R.cat;
    if (TUT.mode === 'dash' || (c.vy > 0 && -c.y < 420 && R.t > 0.7)) want = 'dash';
  }
  if (want !== TUT.mode) {
    TUT.mode = want; TUT.t = 0; TUT.real = 0;
    if (want === 'dash') { R.tutHold = true; sfx('open'); }
    if (!want) { tutCv.classList.remove('on'); $('#tutText').classList.remove('on', 'now'); if (R.tutHold) { R.tutHold = false; timeScale = 1; } return; }
  }
  if (!TUT.mode) return;
  TUT.t += dt; TUT.real += dt;
  if (TUT.mode === 'dash') {
    timeScale = 0.12;
    if (TUT.real > 5) { R.dashTutDone = true; tutOff(); return; }
  }
  // draw the dim layer with holes
  const W = CAM.W, H = CAM.H;
  if (tutCv.width !== Math.round(W * DPR)) { tutCv.width = Math.round(W * DPR); tutCv.height = Math.round(H * DPR); }
  const g = tutG; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(10,6,24,0.74)'; g.fillRect(0, 0, W, H);
  const holes = [];
  const ab = $('#actBtn').getBoundingClientRect(), gr = $('#game').getBoundingClientRect();
  const bx = ab.left - gr.left + ab.width / 2, by = ab.top - gr.top + ab.height / 2, br = ab.width / 2 + 16;
  holes.push([bx, by, br]);
  if (TUT.mode === 'aim') {
    const pv = GL.project(CANNON.x, -CANNON.y, 0), pr = GL.project(CANNON.x + 240, -CANNON.y, 0);
    holes.push([pv.x, pv.y, Math.abs(pr.x - pv.x) + 10]);
  } else {
    const c = R.cat, p = GL.project(c.x, -c.y, 0), q = GL.project(c.x + 70, -c.y, 0);
    holes.push([p.x, p.y, Math.abs(q.x - p.x)]);
  }
  g.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of holes) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  const pulse = (Math.sin(TUT.t * 9) + 1) / 2;
  for (const [x, y, r] of holes) {
    g.lineWidth = 6; g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, r + 4 + pulse * 8, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.strokeStyle = `rgba(255,210,63,${1 - pulse})`; g.beginPath(); g.arc(x, y, r + 14 + pulse * 30, 0, Math.PI * 2); g.stroke();
  }
  // big bouncing hand pointing at the button
  const hy = by - br - 30 - Math.abs(Math.sin(TUT.t * 7)) * 26, hx = bx - 10;
  drawHand(g, hx, hy, TUT.t);
  // text
  const tt = $('#tutText'); tt.classList.add('on'); tt.style.top = '22%';
  const touch = lastInput === 'touch';
  if (TUT.mode === 'aim') {
    const inG = R.angle >= 40 && R.angle <= 50;
    tt.classList.toggle('now', inG);
    tt.innerHTML = inG ? `${touch ? 'TAP' : 'FIRE'} NOW!!!<small>${touch ? 'tap the big button' : 'SPACE or the big button'}</small>` : `WAIT FOR GREEN...<small>then hit the big button</small>`;
  } else {
    tt.classList.add('now');
    tt.innerHTML = `${touch ? 'TAP' : 'PRESS'} FOR ${esc(eqCat().ability)}!!<small>${touch ? 'tap the big button' : 'SPACE or the big button'}</small>`;
  }
  tutCv.classList.add('on');
}
function drawHand(g, x, y, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 7) * 0.12); g.scale(1.4, 1.4);
  g.lineWidth = 4; g.strokeStyle = INK; g.fillStyle = '#ffffff'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-6, 18); g.lineTo(-6, -14); g.quadraticCurveTo(0, -22, 6, -14); g.lineTo(6, 2); g.lineTo(16, 2); g.quadraticCurveTo(22, 4, 20, 12); g.lineTo(18, 26); g.quadraticCurveTo(14, 34, 2, 34); g.lineTo(-8, 34); g.quadraticCurveTo(-16, 30, -16, 22); g.lineTo(-16, 12); g.quadraticCurveTo(-12, 6, -6, 12); g.closePath();
  g.fill(); g.stroke();
  g.restore();
}

// ----- HUD -----
let hudDist = -1, hudEst = -1;
function buildTrack() {
  const zc = ['#5fd14f', '#9aa0b0', '#f3d68a', '#e8f0ff', '#8f8ca8'];
  $('#trackZones').innerHTML = ZONES.map((z, i) => {
    const a = z.from, b = i + 1 < ZONES.length ? ZONES[i + 1].from : TRACK_MAX;
    return `<i class="${i >= S.zones ? 'locked' : ''}" style="width:${((b - a) / TRACK_MAX * 100).toFixed(2)}%;background:${zc[i]}" title="${z.name}"></i>`;
  }).join('');
  $('#trackBest').style.left = clamp(S.best / TRACK_MAX, 0, 1) * 100 + '%';
  $('#trackBest').style.display = S.best > 5 ? '' : 'none';
}
let actState = '';
function updateHud(force) {
  if (!R) return;
  const d = Math.floor(R.dist);
  if (d !== hudDist || force) {
    hudDist = d; $('#dist').innerHTML = `${d}<span>m</span>`;
    $('#trackCat').style.left = clamp(R.dist / TRACK_MAX, 0, 1) * 100 + '%';
  }
  const est = payout().total;
  if (est !== hudEst || force) { hudEst = est; $('#coinHudN').textContent = '+' + est; }
  // the one button (hidden on results/menus so it never sits on top of a panel)
  $('#actBtn').style.visibility = R.phase === 'done' || stack.length ? 'hidden' : '';
  const st = R.phase === 'aim' ? 'aim' : `fly${ADM.inf ? '∞' : R.charges}`;
  if (st !== actState || force) {
    actState = st;
    const b = $('#actBtn');
    b.classList.toggle('fire', R.phase === 'aim');
    b.classList.toggle('empty', R.phase !== 'aim' && R.charges <= 0 && !ADM.inf);
    if (R.phase === 'aim') { b.querySelector('.actIcon').className = 'actIcon txt'; b.querySelector('.actIcon').textContent = 'FIRE!'; b.querySelector('.actLbl').textContent = ''; b.querySelector('.actCount').textContent = ''; }
    else { b.querySelector('.actIcon').className = 'actIcon'; b.querySelector('.actIcon').innerHTML = CLAW_SVG; b.querySelector('.actLbl').textContent = eqCat().ability; b.querySelector('.actCount').textContent = ADM.inf ? '∞' : String(R.charges); }
  }
}
let zoneT = 0, mToastT = 0;
const UI = {
  onFire() {
    if (!SET.seen.aim) { SET.seen.aim = true; writeSettings(); }
  },
  onLaunchFX(perf) {
    if (!SET.reduced) { retrig($('#flash'), 'go'); retrig($('#speedlines'), 'go'); }
    banner(perf ? 'PERFECT BOOM!!' : 'KA-BOOM!', perf ? '#3fcf5c' : '#ffd23f');
  },
  useCharge() {
    retrig($('#actBtn'), 'bumpit');
    if (TUT.mode === 'dash' || !SET.seen.dash) { SET.seen.dash = true; writeSettings(); R.dashTutDone = true; tutOff(); }
  },
  denyCharges() { shakeEl($('#actBtn')); },
  fishBump() { bump($('#coinHud')); },
  onZone(zi, isNew) {
    const z = ZONES[zi];
    setMusicZone(zi);
    banner(isNew ? `NEW: ${z.name}!` : z.name, '#ffd23f');
    sfx('zone');
    const c = $('#zoneCard');
    c.querySelector('b').textContent = z.name; c.querySelector('span').textContent = z.rule;
    if (isNew || !SET.seen['zone_' + z.id]) {
      c.classList.add('on'); clearTimeout(zoneT); zoneT = setTimeout(() => c.classList.remove('on'), 3200);
      SET.seen['zone_' + z.id] = true; writeSettings();
    }
    if (isNew) { CG.happytime(); const el = $$('#trackZones i')[zi]; if (el) el.classList.remove('locked'); }
  },
  onMission(m) {
    sfx('mission');
    const t = $('#mToast');
    t.innerHTML = `MISSION COMPLETE!<small>${esc(missionLabel(m))} · +${m.reward}</small>`;
    t.classList.add('on'); clearTimeout(mToastT); mToastT = setTimeout(() => t.classList.remove('on'), 2400);
  },
  onRunEnd(res) { if (res.newBest) setTimeout(() => LB.submitBest(), 400); tutOff(); $('#zoneCard').classList.remove('on'); CG.gameplayStop(); setTimeout(() => showResults(res), res.fell ? 300 : 750); },
};

// ----- results -----
function showResults(res) {
  if (mode !== 'play') return;
  closeAll();
  openOverlay('results');
  canAgainAt = performance.now() + 700;
  $('#resTitle').textContent = res.fell ? 'FELL IN A HOLE!' : res.dist >= 2000 ? 'LEGENDARY!' : res.dist >= 500 ? 'AMAZING!' : res.dist >= 100 ? 'NICE LAUNCH!' : 'LANDED!';
  $('#newBest').classList.remove('on');
  $('#offer').classList.remove('on');
  $$('.medal').forEach(m => m.classList.remove('on'));
  $('#resTotal').textContent = '+0';
  const parts = [`${res.distC} distance`, `${res.fishC} fish`];
  if (res.perfC) parts.push(`${res.perfC} perfect`);
  if (res.mCoins) parts.push(`${res.mCoins} missions`);
  $('#resDetail').textContent = parts.join(' · ') + (res.mult > 1 ? ` · x${res.mult.toFixed(2)}` : '');
  $('#resMissions').innerHTML = res.completed.map(m => `<div class="mis done"><span class="ck">✓</span><span>${esc(missionLabel(m))}</span><span class="rw"><i class="coin"></i>${m.reward}</span></div>`).join('');
  const el = $('#resDist');
  const target = Math.floor(res.dist);
  const t0 = performance.now(), dur = clamp(400 + target, 500, 1400);
  let lastTick = 0;
  function tickUp(now) {
    const k = clamp((now - t0) / dur, 0, 1);
    el.innerHTML = `${Math.floor(target * (1 - Math.pow(1 - k, 3)))}<span>m</span>`;
    if (now - lastTick > 55 && k < 1) { sfx('tick'); lastTick = now; }
    if (k < 1) { requestAnimationFrame(tickUp); return; }
    bump(el);
    let delay = 0;
    MEDALS.forEach((m, i) => { if (res.dist >= m) { delay += 260; setTimeout(() => { $$('.medal')[i].classList.add('on'); sfx('star'); }, delay); } });
    const c0 = performance.now();
    (function coinUp() {
      const kk = clamp((performance.now() - c0) / 600, 0, 1);
      $('#resTotal').textContent = '+' + Math.floor(res.total * kk).toLocaleString('en-US');
      if (kk < 1) { sfx('coin', 1 + kk * 0.5); setTimeout(coinUp, 50); }
      else { bump($('.resCoins')); refreshCoins(); maybeOffer(res); }
    })();
    if (res.newBest && res.prevBest > 0) setTimeout(() => { $('#newBest').classList.add('on'); sfx('best'); if (res.dist >= 100) CG.happytime(); }, delay + 300);
    if (res.rankUp) setTimeout(() => { sfx('rank'); toast(`RANK UP! You are now rank ${res.rankUp}`); }, delay + 700);
    if (res.newSkins.length) setTimeout(() => toast(`Unlocked: ${res.newSkins.map(s => s.name).join(', ')}!`), delay + 1500);
  }
  requestAnimationFrame(tickUp);
}
function maybeOffer(res) {
  if (!CG.adsAvailable() || res.total < 20 || S.runs - S.lastOffer < 3) return;
  const o = $('#offer');
  o.querySelector('.offerTxt').textContent = `Double it? Watch a short video for +${res.total} coins.`;
  $('#offerYes').innerHTML = `${VIDEO_SVG} +${res.total}`;
  o.classList.add('on');
  o.dataset.amount = res.total;
  S.lastOffer = S.runs; writeSave();
}

// ----- thumbnails -----
function thumbSVG(cat, id, silhouette) {
  const st = 'stroke="#16121a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  if (cat === 'cat') {
    const c = CAT_BY[id];
    if (silhouette) return `<svg viewBox="0 0 80 60"><path d="M22 18 L26 4 L36 14 Z M44 14 L54 4 L58 18 Z" fill="#3a3550" ${st}/><ellipse cx="40" cy="32" rx="22" ry="20" fill="#3a3550" ${st}/><text x="40" y="41" text-anchor="middle" font-family="Archivo Black,Impact" font-size="22" fill="#fff">?</text></svg>`;
    let extra = '';
    if (id === 'zip') extra = `<rect x="18" y="20" width="44" height="6" fill="#ff4b4b"/>`;
    if (id === 'sparky') extra = `<path d="M66 8l-8 12h6l-6 12 14-16h-6l6-8z" fill="#fff36b" ${st} stroke-width="2.5"/>`;
    if (id === 'astro') extra = `<rect x="6" y="26" width="10" height="18" rx="4" fill="#b9c2cc" ${st} stroke-width="2.5"/>`;
    if (id === 'ghost') extra = `<ellipse cx="40" cy="6" rx="12" ry="3" fill="none" stroke="#ffd23f" stroke-width="3"/>`;
    if (id === 'blaze') extra = `<path d="M30 10q4-10 10-4 4-8 10 4" fill="#ffd23f" ${st} stroke-width="2.5"/>`;
    const paws = c.paw ? `<ellipse cx="30" cy="52" rx="6" ry="4" fill="${c.paw}" ${st} stroke-width="2.5"/><ellipse cx="50" cy="52" rx="6" ry="4" fill="${c.paw}" ${st} stroke-width="2.5"/>` : '';
    return `<svg viewBox="0 0 80 60" ${c.alpha ? 'opacity=".8"' : ''}>${paws}<path d="M22 18 L26 4 L36 14 Z M44 14 L54 4 L58 18 Z" fill="${c.body}" ${st}/><ellipse cx="40" cy="32" rx="22" ry="20" fill="${c.body}" ${st}/><path d="M30 16q2 6 0 10M40 13v9M50 16q-2 6 0 10" stroke="${c.stripe}" stroke-width="3" fill="none"/>${extra}<circle cx="32" cy="32" r="4" fill="#16121a"/><circle cx="48" cy="32" r="4" fill="#16121a"/><path d="M36 41q4 4 8 0" fill="none" ${st} stroke-width="2.5"/></svg>`;
  }
  if (cat === 'hat') {
    const H = {
      none: `<circle cx="40" cy="30" r="16" fill="#fff" ${st}/><path d="M29 41L51 19" ${st}/>`,
      party: `<path d="M28 50L40 8L52 50Z" fill="#8f63ff" ${st}/><path d="M33 36l14 0M30 44h20" stroke="#ffd23f" stroke-width="4"/><circle cx="40" cy="8" r="5" fill="#ff5d93" ${st}/>`,
      cap: `<path d="M18 40a18 18 0 0 1 36 0Z" fill="#3aa3ff" ${st}/><path d="M50 40h18v6H50Z" fill="#3aa3ff" ${st}/>`,
      viking: `<path d="M20 44a20 20 0 0 1 40 0Z" fill="#b9c2cc" ${st}/><path d="M22 34L10 12L26 28M58 34L70 12L54 28" fill="#fff4dc" ${st}/>`,
      crown: `<path d="M18 46V22l11 10 11-16 11 16 11-10v24Z" fill="#ffcf3a" ${st}/><circle cx="40" cy="38" r="4" fill="#ff4b4b"/>`,
      astro: `<circle cx="40" cy="30" r="22" fill="#bfe6ff" ${st}/><path d="M28 22a14 12 0 0 1 12-6" stroke="#fff" stroke-width="4" fill="none"/>`,
    };
    return `<svg viewBox="0 0 80 60">${H[id] || ''}</svg>`;
  }
  if (cat === 'cannon') {
    const c = CANNON_COL[id];
    return `<svg viewBox="0 0 80 60"><g transform="rotate(-25 40 32)"><rect x="12" y="20" width="52" height="22" rx="10" fill="${c.barrel}" ${st}/><rect x="28" y="20" width="6" height="22" fill="${c.band}"/><rect x="40" y="20" width="6" height="22" fill="${c.band}"/><rect x="60" y="16" width="10" height="30" rx="4" fill="${c.rim}" ${st}/></g><circle cx="30" cy="44" r="11" fill="${c.wheel}" ${st}/></svg>`;
  }
  const cols = TRAIL_COL[id];
  if (!cols) return `<svg viewBox="0 0 80 60"><path d="M12 40q28-30 56-10" stroke="#16121a" stroke-width="3" stroke-dasharray="4 6" fill="none"/></svg>`;
  return `<svg viewBox="0 0 80 60">${cols.map((c, i) => `<circle cx="${12 + i * (56 / Math.max(1, cols.length - 1))}" cy="${40 - Math.sin(i / Math.max(1, cols.length - 1) * 3) * 16}" r="${5 + i % 2 * 2}" fill="${c}" ${st} stroke-width="2.5"/>`).join('')}</svg>`;
}
function skinStatus(cat, d) {
  if (S.owned[cat].includes(d.id)) return { owned: true };
  if (d.req) return { owned: false, req: d.req.rank ? `RANK ${d.req.rank}` : `REACH ${ZONES.find(z => z.id === d.req.zone).name}` };
  return { owned: false, cost: d.cost };
}
const rTag = r => `<span class="rTag" style="background:${RARITY[r].col}">${RARITY[r].name}</span>`;

// ----- shop -----
function renderShop(popId) {
  $$('#shopTabs .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === shopTab));
  const chips = $('#skinChips');
  chips.classList.toggle('on', shopTab === 'skins');
  chips.innerHTML = SKIN_CATS.map(([k, n]) => `<button class="chip${k === skinTab ? ' on' : ''}" data-chip="${k}">${n}</button>`).join('');
  const g = $('#shopGrid'); g.innerHTML = ''; g.className = 'grid' + (shopTab === 'up' ? ' upGrid' : '');
  $$('#shopTabs .tab').forEach(t => t.dataset.tab === 'box' && t.setAttribute('data-guide', 'boxtab'));
  if (shopTab === 'up') {
    UPS.forEach((u, i) => {
      const lv = S.up[u.id], maxed = lv >= u.max, cost = upCost(u, lv);
      const c = document.createElement('div'); c.className = 'card'; c.style.animationDelay = (i * 0.04) + 's';
      c.innerHTML = `<div class="icon" style="background:var(${u.color})">${u.icon}</div><h3>${u.name}</h3>
        <div class="lvRow"><span class="lvTxt">LV ${lv}/${u.max}</span><div class="lvBar"><i class="${maxed ? 'full' : ''}" style="width:${lv / u.max * 100}%"></i></div></div>
        <div class="stat">${u.stat(lv)}${maxed ? '' : ' → <b>' + u.stat(lv + 1) + '</b>'}</div>
        <button class="btn ${maxed ? 'owned' : 'green'} ${!maxed && S.coins < cost ? 'poor' : ''}" data-buy="${u.id}">${maxed ? 'MAX' : `<i class="coin"></i>${cost.toLocaleString('en-US')}`}</button>`;
      g.appendChild(c);
      if (popId === u.id) bump(c.querySelector('.lvBar'));
    });
  } else if (shopTab === 'box') {
    BOXES.forEach((b, i) => {
      const c = document.createElement('div'); c.className = 'card boxCard'; c.style.animationDelay = (i * 0.05) + 's';
      const mini = RARITY_ORDER.filter(r => b.odds[r] > 0).map(r => `<i style="width:${b.odds[r]}%;background:${RARITY[r].col}"></i>`).join('');
      c.innerHTML = `<button class="infoBtn" data-odds="${b.id}" aria-label="Drop rates">i</button>
        <div class="thumb">${thumbCanvas('box', b.id)}</div>
        <h3>${b.name}</h3><div class="oddsMini">${mini}</div>
        ${i === 0 && guideActive() ? `<button class="btn yellow" id="freeBoxBtn">FREE!</button>` : `<button class="btn green ${S.coins < b.cost ? 'poor' : ''}" data-box="${b.id}"><i class="coin"></i>${b.cost.toLocaleString('en-US')}</button>`}`;
      g.appendChild(c);
    });
  } else {
    SKINS[skinTab].forEach((d, i) => {
      const st = skinStatus(skinTab, d);
      const c = document.createElement('div'); c.className = 'card' + (st.owned ? '' : ' locked'); c.style.animationDelay = (i * 0.03) + 's';
      const btn = st.owned ? `<button class="btn owned" data-equip="${skinTab}:${d.id}">${S.eq[skinTab] === d.id ? 'WEARING' : 'WEAR'}</button>`
        : st.req ? `<span class="req">${LOCK_SVG} ${st.req}</span>`
          : `<button class="btn green ${S.coins < st.cost ? 'poor' : ''}" data-skin="${skinTab}:${d.id}"><i class="coin"></i>${st.cost}</button>`;
      c.innerHTML = `<div class="thumb">${thumbCanvas(skinTab, d.id)}</div><h3>${d.name}</h3>${btn}`;
      g.appendChild(c);
    });
  }
  queueThumbs(g);
  refreshCoins();
}
function buyUpgrade(id, btn) {
  const u = UPS.find(x => x.id === id), lv = S.up[id];
  if (lv >= u.max) { sfx('deny'); shakeEl(btn); return; }
  const cost = upCost(u, lv);
  if (S.coins < cost) { sfx('deny'); shakeEl(btn); shakeEl(btn.closest('.panel').querySelector('.pill')); return; }
  S.coins -= cost; S.up[id]++; writeSave();
  sfx('buy'); renderShop(id); bump($('#shop .pill'));
}
function buySkin(cat, id, btn) {
  const d = skinDef(cat, id);
  if (!d || S.owned[cat].includes(id) || d.req) return;
  if (S.coins < d.cost) { sfx('deny'); shakeEl(btn); shakeEl(btn.closest('.panel').querySelector('.pill')); return; }
  S.coins -= d.cost; S.owned[cat].push(id); S.eq[cat] = id; writeSave();
  sfx('buy'); renderShop(); bump($('#shop .pill'));
  toast(`${d.name} equipped!`);
}
function equip(cat, id) {
  if (cat === 'cat') { if (!S.cats.includes(id)) return; if (S.eq.cat !== id) { S.eq.cat = id; writeSave(); sfx('meow'); } }
  else { if (!S.owned[cat].includes(id)) return; if (S.eq[cat] !== id) { S.eq[cat] = id; writeSave(); sfx('equip'); } }
  refreshLobbyCat();
  if (stack[stack.length - 1] === 'locker') renderLocker(); else renderShop();
}

// ----- odds info -----
function showOdds(boxId) {
  const b = BOXES.find(x => x.id === boxId);
  $('#oddsTitle').textContent = b.name;
  $('#oddsBody').innerHTML = RARITY_ORDER.map(r => {
    const cats = CATS.filter(c => c.rarity === r);
    const each = b.odds[r] / Math.max(1, cats.length);
    return `<div class="oRow"><span class="rn" style="background:${RARITY[r].col}">${RARITY[r].name}</span><span class="cats">${cats.map(c => `${c.name} ${each ? each.toFixed(each < 1 ? 2 : 1) + '%' : ''}`).join(' · ')}</span><span class="pc">${b.odds[r]}%</span></div>`;
  }).join('');
  openOverlay('odds');
}

// ----- cat boxes -----
function rollBox(b) {
  let v = Math.random() * 100, rar = 'common';
  for (const r of RARITY_ORDER) { if (b.odds[r] <= 0) continue; v -= b.odds[r]; rar = r; if (v <= 0) break; }
  const pool = CATS.filter(c => c.rarity === rar);
  return pool[Math.floor(Math.random() * pool.length)];
}
let BOXST = null;
function openBox(boxId, btn, free, forcedCat) {
  const b = BOXES.find(x => x.id === boxId);
  if (!free && S.coins < b.cost) { sfx('deny'); if (btn) { shakeEl(btn); shakeEl(btn.closest('.panel').querySelector('.pill')); } return; }
  const cat = forcedCat || rollBox(b);
  const dup = S.cats.includes(cat.id);
  const refund = dup ? RARITY[cat.rarity].dup : 0;
  // pay out first, animate after: a reload mid-animation can't lose or repeat the reward
  if (!free) S.coins -= b.cost;
  if (dup) S.coins += refund; else S.cats.push(cat.id);
  S.boxes++; writeSave(); refreshCoins();
  BOXST = { b, cat, dup, refund, step: 0, t0: rt, stepAt: rt, popAt: null, burst: false };
  FX.parts.length = 0;
  const el = $('#boxOpen');
  el.classList.remove('revealed'); el.classList.add('on');
  document.body.classList.add('showcase');
  sfx('whoosh'); setTimeout(() => sfx('thud', 1), 450); duckMusic(true);
  clearTimeout(boxAuto); boxAuto = setTimeout(boxStep, 1100);
}
let boxAuto = 0;
function boxStep() {
  if (!BOXST || BOXST.popAt != null) return;
  clearTimeout(boxAuto);
  BOXST.step++; BOXST.stepAt = rt;
  const ri = RARITY_ORDER.indexOf(BOXST.cat.rarity);
  if (BOXST.step <= 3) {
    // three shakes, each bigger; the glow hints the rarity a little more each time
    sfx('boxshake', BOXST.step); shake(0.15 * BOXST.step);
    if (BOXST.step === 3 && ri >= 3) retrig($('#flash'), 'go');
    boxAuto = setTimeout(boxStep, 650);
    return;
  }
  BOXST.popAt = rt;
  sfx('boom'); retrig($('#flash'), 'go'); shake(0.6);
  setTimeout(() => {
    if (!BOXST) return;
    const c = BOXST.cat, el = $('#boxOpen');
    el.classList.add('revealed');
    $('.rarityTag').textContent = RARITY[c.rarity].name; $('.rarityTag').style.background = RARITY[c.rarity].col;
    $('.revName').textContent = c.name;
    $('.revAbility').textContent = `${c.ability}: ${c.desc}`;
    $('.revExtra').textContent = BOXST.dup ? `DUPLICATE - +${BOXST.refund} coins` : 'NEW CAT!';
    $('#revEquip').style.display = BOXST.dup || S.eq.cat === c.id ? 'none' : '';
    sfx('reveal', ri);
    if (ri >= 3) CG.happytime();
  }, 700);
}
function closeBox() {
  $('#boxOpen').classList.remove('on', 'revealed'); BOXST = null; FX.parts.length = 0;
  document.body.classList.remove('showcase');
  duckMusic(!!stack.length);
  if (stack[stack.length - 1] === 'shop') renderShop();
  if (GUIDE.step === 'reveal') guideDone();
}

// ----- first-session guide: after the first launch, lead the player to a free box with a good cat -----
const GUIDE = { step: null, t: 0 };
function guideActive() { return S.runs >= 1 && !S.freeBox; }
function pickGoodCat() {
  const pool = r => CATS.filter(c => c.rarity === r && !S.cats.includes(c.id));
  let p = Math.random() < 0.72 ? pool('epic') : pool('legendary');
  if (!p.length) p = pool('epic').concat(pool('legendary'));
  if (!p.length) p = CATS.filter(c => c.rarity === 'epic');
  return p[Math.floor(Math.random() * p.length)];
}
function claimFreeBox() {
  if (!guideActive()) return;
  S.freeBox = true;
  openBox('basic', null, true, pickGoodCat());
  BOXST.free = true;
}
function guideDone() { GUIDE.step = null; tutOff(); }
function updateGuide(dt) {
  if (TUT.mode) return;                 // the in-launch tutorial owns the spotlight
  let target = null, text = '';
  const top = stack[stack.length - 1];
  if (BOXST && BOXST.free) {
    if ($('#boxOpen').classList.contains('revealed')) { GUIDE.step = 'reveal'; target = $('#revEquip').style.display === 'none' ? $('#revOk') : $('#revEquip'); text = ''; }
    else { GUIDE.step = 'tap'; text = 'TAP THE BOX!'; }
  } else if (guideActive() && !BOXST) {
    if (top === 'results' && performance.now() >= canAgainAt) { GUIDE.step = 'home'; target = $('#homeBtn'); text = 'A FREE CAT BOX IS WAITING!'; }
    else if (mode === 'lobby' && !top) { GUIDE.step = 'boxes'; target = $('.mBtn[data-shop="box"]'); text = 'OPEN YOUR FREE BOX!'; }
    else if (top === 'shop' && shopTab === 'box') { GUIDE.step = 'free'; target = $('#freeBoxBtn'); text = 'IT\'S FREE - TAP IT!'; }
    else if (top === 'shop') { GUIDE.step = 'tab'; target = $('[data-guide="boxtab"]'); text = 'CAT BOXES'; }
    else GUIDE.step = null;
  } else GUIDE.step = null;
  if (!GUIDE.step) { if (tutCv.classList.contains('on') && !TUT.mode) { tutCv.classList.remove('on'); $('#tutText').classList.remove('on', 'now'); } return; }
  GUIDE.t += dt;
  const holes = [];
  if (target) {
    const r = target.getBoundingClientRect(), gr = $('#game').getBoundingClientRect();
    if (r.width) holes.push([r.left - gr.left + r.width / 2, r.top - gr.top + r.height / 2, Math.max(r.width, r.height) / 2 + 14]);
  }
  drawSpot(holes, GUIDE.t, GUIDE.step === 'tap' || GUIDE.step === 'reveal' ? 0 : 0.7, true);
  const tt = $('#tutText'); tt.classList.toggle('on', !!text); tt.classList.add('now'); tt.innerHTML = text;
  tt.style.top = GUIDE.step === 'reveal' ? '34%' : '22%';
}
function drawSpot(holes, t, dim, hand) {
  const W = CAM.W, H = CAM.H;
  if (tutCv.width !== Math.round(W * DPR)) { tutCv.width = Math.round(W * DPR); tutCv.height = Math.round(H * DPR); }
  const g = tutG; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  if (dim > 0) { g.fillStyle = `rgba(10,6,24,${dim})`; g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of holes) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  const pulse = (Math.sin(t * 9) + 1) / 2;
  for (const [x, y, r] of holes) {
    g.lineWidth = 6; g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, r + 4 + pulse * 8, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.strokeStyle = `rgba(255,210,63,${1 - pulse})`; g.beginPath(); g.arc(x, y, r + 14 + pulse * 30, 0, Math.PI * 2); g.stroke();
  }
  if (hand && holes[0]) { const [x, y, r] = holes[0]; drawHand(g, x - 6, y - r - 30 - Math.abs(Math.sin(t * 7)) * 22, t); }
  tutCv.classList.add('on');
}

// ----- leaderboard panel -----
const CAT_NAME = id => (CAT_BY[id] ? CAT_BY[id].name : '');
function lbRowHTML(p, me) {
  const cls = p.rank === 1 ? 'gold' : p.rank === 2 ? 'silver' : p.rank === 3 ? 'bronze' : '';
  return `<div class="lbRow ${cls}${me ? ' me' : ''}"><span class="rk">#${p.rank}</span><span class="nm">${esc(p.name)}${p.bot ? '<i class="cpu">CPU</i>' : ''}</span><span class="ds">${Math.floor(p.best).toLocaleString('en-US')}m</span></div>`;
}
async function openBoard() {
  $('#lbName').textContent = LB.name;
  $('#nameEdit').classList.remove('on');
  $('#lbList').innerHTML = '<div class="hint">Loading…</div>'; $('#lbMe').innerHTML = '';
  $('#lbStatus').textContent = LB.cheating() ? 'Admin mode is on: your launches are not ranked.' : '';
  try { await LB.submitBest(); await LB.fetchBoard(); }
  catch (e) {
    $('#lbList').innerHTML = `<div class="lbRow me"><span class="rk">-</span><span class="nm">${esc(LB.name)}</span><span class="ds">${Math.floor(S.best)}m</span></div>`;
    $('#lbStatus').textContent = 'Leaderboard offline right now. Your best is saved and will be sent later.';
    return;
  }
  if (stack[stack.length - 1] !== 'board') return;
  const meId = LB.me && LB.me.rank;
  $('#lbList').innerHTML = LB.top.map(p => lbRowHTML(p, p.you)).join('') || '<div class="hint">No scores yet - be the first!</div>';
  $('#lbMe').innerHTML = LB.me && !LB.top.some(p => p.you) ? lbRowHTML({ rank: LB.me.rank, name: LB.name, best: LB.me.best }, true) : '';
  if (!LB.cheating()) $('#lbStatus').textContent = `${LB.total.toLocaleString('en-US')} players ranked by best distance`;
  const mine = $('#lbList .me'); if (mine) mine.scrollIntoView({ block: 'center' });
}

// ----- locker -----
function renderLocker() {
  const tabs = [['cat', 'CATS'], ...SKIN_CATS];
  $('#lockTabs').innerHTML = tabs.map(([k, n]) => `<button class="tab${k === lockTab ? ' on' : ''}" data-ltab="${k}">${n}</button>`).join('');
  const g = $('#lockGrid'); g.innerHTML = '';
  if (lockTab === 'cat') {
    $('#lockInfo').innerHTML = `<span>Wearing: <b>${esc(eqCat().name)}</b></span><span>${S.cats.length}/${CATS.length} cats</span>`;
    CATS.forEach((cd, i) => {
      const own = S.cats.includes(cd.id), eq = S.eq.cat === cd.id;
      const c = document.createElement('div'); c.className = 'card' + (own ? '' : ' locked') + (eq ? ' eq' : ''); c.style.animationDelay = (i * 0.03) + 's';
      const btn = own ? (eq ? `<span class="badge">ON</span>` : `<button class="btn blue small" data-equip="cat:${cd.id}">WEAR</button>`) : `<button class="btn orange small" data-shop="box">BOXES</button>`;
      c.innerHTML = `<div class="thumb">${thumbCanvas('cat', cd.id, !own)}</div><h3>${own ? cd.name : '???'}</h3>${rTag(cd.rarity)}${btn}`;
      g.appendChild(c);
    });
    queueThumbs(g);
    return;
  }
  const own = S.owned[lockTab].length, all = SKINS[lockTab].length;
  $('#lockInfo').innerHTML = `<span>Wearing: <b>${esc(skinDef(lockTab, S.eq[lockTab]).name)}</b></span><span>${own}/${all}</span>`;
  SKINS[lockTab].forEach((d, i) => {
    const st = skinStatus(lockTab, d), eq = S.eq[lockTab] === d.id;
    const c = document.createElement('div'); c.className = 'card' + (st.owned ? '' : ' locked') + (eq ? ' eq' : ''); c.style.animationDelay = (i * 0.03) + 's';
    const btn = st.owned ? (eq ? `<span class="badge">ON</span>` : `<button class="btn blue small" data-equip="${lockTab}:${d.id}">WEAR</button>`)
      : st.req ? `<span class="req">${LOCK_SVG} ${st.req}</span>` : `<button class="btn green small" data-toshop="${lockTab}"><i class="coin"></i>${st.cost}</button>`;
    c.innerHTML = `<div class="thumb">${thumbCanvas(lockTab, d.id)}</div><h3>${d.name}</h3>${btn}`;
    g.appendChild(c);
  });
  queueThumbs(g);
}

// ----- settings + secret code -----
function syncSettings() {
  for (const [id, key] of [['#sMusic', 'music'], ['#sSfx', 'sfx'], ['#sShake', 'shake']]) { const el = $(id); el.value = SET[key]; el.style.setProperty('--v', SET[key] + '%'); }
  const r = $('#sReduce'); r.textContent = SET.reduced ? 'ON' : 'OFF'; r.classList.toggle('on', SET.reduced);
  document.body.classList.toggle('reduced', SET.reduced);
}
function submitCode() {
  const inp = $('#codeIn'), v = inp.value.trim().toLowerCase();
  inp.value = '';
  if (v === ADMIN_CODE) {
    SET.admin = Object.assign({ on: true }, SET.admin || {}); SET.admin.on = true; writeSettings(); applyAdmin();
    sfx('rank'); toast('ADMIN MODE UNLOCKED'); refreshCoins(); openOverlay('admin');
  } else { sfx('deny'); shakeEl($('.codeRow')); }
}

// ----- admin "hack menu" -----
const ADM_TOGGLES = [['god', 'GOD MODE'], ['inf', 'INFINITE ABILITY'], ['mega', 'MEGA CANNON x2.2'], ['perfect', 'AUTO PERFECT'], ['lowg', 'LOW GRAVITY'], ['hit', 'SHOW HITBOXES']];
const ADM_ACTIONS = [['coins', '+100,000 COINS'], ['maxup', 'MAX ALL UPGRADES'], ['cats', 'UNLOCK ALL CATS'], ['skins', 'UNLOCK ALL SKINS'], ['mis', 'COMPLETE MISSIONS'], ['box', 'FREE LEGEND BOX'],
  ['tp1', 'TELEPORT > DOWNTOWN'], ['tp2', 'TELEPORT > BEACH'], ['tp3', 'TELEPORT > SNOW'], ['tp4', 'TELEPORT > MOON'], ['sky', 'TELEPORT > SPACE'], ['off', 'ADMIN OFF']];
function applyAdmin() {
  const a = SET.admin || {};
  for (const [k] of ADM_TOGGLES) ADM[k] = !!(a.on && a[k]);
  ADM.on = !!a.on;
  refreshCoins();
}
function renderAdmin() {
  const a = SET.admin || {};
  $('#admToggles').innerHTML = ADM_TOGGLES.map(([k, n]) => `<button class="tb${a[k] ? ' on' : ''}" data-admt="${k}">[${a[k] ? 'x' : ' '}] ${n}</button>`).join('');
  $('#admActions').innerHTML = ADM_ACTIONS.map(([k, n]) => `<button class="tb" data-adma="${k}">&gt; ${n}</button>`).join('');
}
function admLog(t) { $('#admLog').textContent = '> ' + t + '_'; }
function adminAction(k) {
  const tp = { tp1: 1, tp2: 2, tp3: 3, tp4: 4 };
  if (k === 'coins') { S.coins += 100000; admLog('coins injected'); }
  else if (k === 'maxup') { for (const u of UPS) S.up[u.id] = u.max; admLog('upgrades maxed'); }
  else if (k === 'cats') { S.cats = CATS.map(c => c.id); admLog('all cats unlocked'); }
  else if (k === 'skins') { for (const c in SKINS) S.owned[c] = SKINS[c].map(d => d.id); admLog('all skins unlocked'); }
  else if (k === 'mis') { const n = S.missions.length; for (const m of S.missions) S.coins += m.reward; S.missions = []; S.mDone += n; fillMissions(); admLog(`${n} missions completed`); }
  else if (k === 'box') { while (stack.length) back(); openBox('legend', null, true); return; }
  else if (k in tp || k === 'sky') {
    if (!R || R.phase !== 'fly') { admLog('launch first, then teleport'); return; }
    const c = R.cat;
    if (k === 'sky') { c.y = -3400; c.vy = -200; c.vx = Math.max(c.vx, 700); }
    else { c.x = ZONES[tp[k]].from * PX_PER_M + 200; c.y = -300; c.vx = 900; c.vy = -300; R.objs = R.objs.filter(o => o.x > c.x - 2000); R.genX = Math.max(R.genX, c.x - 100); R.dist = c.x / PX_PER_M; }
    c.px = c.x; c.py = c.y; R.fell = false;
    admLog('teleported'); while (stack.length) back(); paused = false; return;
  }
  else if (k === 'off') { SET.admin = { on: false }; writeSettings(); applyAdmin(); back(); toast('Admin mode off'); return; }
  writeSave(); refreshCoins(); sfx('equip');
}

// ----- events -----
function initUI() {
  applyAdmin();
  refreshCoins();
  document.body.classList.toggle('reduced', SET.reduced);
  document.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('.btn,.tab,.chip,.mBtn'); if (b && e.pointerType === 'mouse' && !b.contains(e.relatedTarget)) sfx('hover'); });
  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { shopTab = tb.dataset.tab; sfx('tab'); renderShop(); return; }
    const ch = e.target.closest('[data-chip]'); if (ch) { skinTab = ch.dataset.chip; sfx('tab'); renderShop(); return; }
    const lt = e.target.closest('[data-ltab]'); if (lt) { lockTab = lt.dataset.ltab; sfx('tab'); renderLocker(); return; }
    const od = e.target.closest('[data-odds]'); if (od) { sfx('click'); showOdds(od.dataset.odds); return; }
    const at = e.target.closest('[data-admt]'); if (at) { const k = at.dataset.admt; SET.admin[k] = !SET.admin[k]; writeSettings(); applyAdmin(); renderAdmin(); admLog(`${k} ${SET.admin[k] ? 'enabled' : 'disabled'}`); sfx('tab'); return; }
    const aa = e.target.closest('[data-adma]'); if (aa) { adminAction(aa.dataset.adma); return; }
    const sh = e.target.closest('[data-shop]'); if (sh) { sfx('click'); if (stack[stack.length - 1] === 'locker') back(); openShop(sh.dataset.shop); return; }
    const b = e.target.closest('.btn,.mBtn'); if (!b) return;
    if (!b.dataset.buy && !b.dataset.skin && !b.dataset.box) sfx('click');
    if (b.dataset.go) openOverlay(b.dataset.go);
    else if (b.hasAttribute('data-back')) back();
    else if (b.dataset.buy) buyUpgrade(b.dataset.buy, b);
    else if (b.dataset.box) openBox(b.dataset.box, b);
    else if (b.dataset.skin) { const [c, id] = b.dataset.skin.split(':'); buySkin(c, id, b); }
    else if (b.dataset.equip) { const [c, id] = b.dataset.equip.split(':'); equip(c, id); }
    else if (b.dataset.toshop) { shopTab = 'skins'; skinTab = b.dataset.toshop; back(); openOverlay('shop'); }
  });
  $('#playBtn').addEventListener('click', startRun);
  $('#pauseBtn').addEventListener('click', e => { e.stopPropagation(); togglePause(true); });
  const act = $('#actBtn');
  act.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); lastInput = e.pointerType === 'touch' ? 'touch' : 'mouse'; audioInit(); if (mode === 'play' && !paused && !stack.length) queueAction(); });
  $('#resumeBtn').addEventListener('click', () => togglePause(false));
  $('#quitBtn').addEventListener('click', () => askConfirm('End this launch now? You keep the coins earned so far.', () => { closeAll(); paused = false; endRun(); }));
  $('#againBtn').addEventListener('click', () => { if (performance.now() >= canAgainAt) againWithAd(); });
  $('#homeBtn').addEventListener('click', goLobby);
  $('#offerNo').addEventListener('click', () => $('#offer').classList.remove('on'));
  $('#offerYes').addEventListener('click', () => {
    const amt = +$('#offer').dataset.amount || 0;
    $('#offer').classList.remove('on');
    $('#adBlock').classList.add('on');
    CG.requestAd('rewarded', ok => {
      $('#adBlock').classList.remove('on');
      if (ok) { S.coins += amt; writeSave(); refreshCoins(); sfx('buy'); toast(`+${amt} coins!`); bump($('.resCoins')); }
      else toast('No video right now - your coins are safe.');
    });
  });
  $('#confirmNo').addEventListener('click', back);
  $('#confirmYes').addEventListener('click', () => { const cb = CONFIRM_CB; CONFIRM_CB = null; back(); if (cb) cb(); });
  $('#errRetry').addEventListener('click', () => { $('#errCard').classList.remove('on'); paused = false; goLobby(); });
  $('#errCopy').addEventListener('click', () => { try { navigator.clipboard.writeText(ERR_LOG.join('\n')); toast('Copied'); } catch (e) {} });
  $('#boxOpen').addEventListener('click', e => {
    if (e.target.closest('#revOk')) { sfx('click'); closeBox(); return; }
    if (e.target.closest('#revEquip')) { const id = BOXST.cat.id; equip('cat', id); closeBox(); toast(`Now wearing ${CAT_BY[id].name}!`); return; }
    if (BOXST && BOXST.popAt == null) boxStep();
  });
  $('#shopGrid').addEventListener('click', e => { if (e.target.closest('#freeBoxBtn')) { sfx('click'); claimFreeBox(); } });
  $('#codeOk').addEventListener('click', submitCode);
  $('#lbEdit').addEventListener('click', () => { $('#nameEdit').classList.toggle('on'); $('#nameIn').value = LB.name; $('#nameIn').focus(); });
  const saveName = async () => {
    const v = $('#nameIn').value.trim();
    if (v.length < 2) { shakeEl($('#nameIn')); sfx('deny'); return; }
    try { const n = await LB.setName(v); $('#lbName').textContent = n; $('#nameEdit').classList.remove('on'); sfx('equip'); openBoard(); }
    catch (e) { toast('Could not reach the leaderboard. Try again later.'); }
  };
  $('#nameSave').addEventListener('click', saveName);
  $('#nameIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') saveName(); });
  $('#codeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') submitCode(); });
  $('#admClose').addEventListener('click', back);
  $('#admChip').addEventListener('click', e => { e.stopPropagation(); if (mode === 'play' && !paused && R && R.phase !== 'done') { paused = true; CG.gameplayStop(); } openOverlay('admin'); });
  for (const [id, key] of [['#sMusic', 'music'], ['#sSfx', 'sfx'], ['#sShake', 'shake']]) {
    $(id).addEventListener('input', e => { SET[key] = +e.target.value; e.target.style.setProperty('--v', SET[key] + '%'); applyVolumes(); });
    $(id).addEventListener('change', () => { writeSettings(); if (key === 'sfx') sfx('coin'); if (key === 'shake') shake(0.6); });
  }
  $('#sReduce').addEventListener('click', () => { SET.reduced = !SET.reduced; writeSettings(); syncSettings(); });
  $('#sTut').addEventListener('click', () => { SET.seen = {}; writeSettings(); toast('Tutorial will play on your next launch'); });
  $('#sReset').addEventListener('click', () => askConfirm('Erase all coins, upgrades, cats, skins and missions? Settings stay.', () => {
    askConfirm('Really? This cannot be undone.', () => { S = defSave(); fillMissions(); writeSave(); refreshCoins(); refreshLobbyCat(); toast('Progress erased'); });
  }));

  $('#game').addEventListener('pointerdown', e => {
    lastInput = e.pointerType === 'touch' ? 'touch' : 'mouse';
    document.body.classList.toggle('touch', lastInput === 'touch');
    audioInit();
    if (e.target.closest('.btn,.panel,input,label,.tab,.chip,.mBtn,#boxOpen,.term,#admChip')) return;
    if (mode === 'play' && !paused && !stack.length) { queueAction(); e.preventDefault(); }
  });
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    lastInput = 'key'; document.body.classList.remove('touch');
    audioInit();
    if (e.repeat) return;
    if ($('#boxOpen').classList.contains('on')) { if (e.code === 'Space' || e.code === 'Enter') { if (BOXST && BOXST.popAt == null) boxStep(); else if ($('#boxOpen').classList.contains('revealed')) closeBox(); e.preventDefault(); } return; }
    if (e.code === 'KeyP') { if (mode === 'play') togglePause(); e.preventDefault(); return; }
    const act = ['Space', 'Enter', 'ArrowUp', 'KeyW', 'KeyJ', 'KeyX'].includes(e.code);
    if (!act) return;
    const top = stack[stack.length - 1];
    const ae = document.activeElement;
    if (ae && ae.classList && ae.classList.contains('btn')) { if (mode !== 'play' || top) return; ae.blur(); }
    if (mode === 'play' && !paused && !top) { queueAction(); retrig($('#actBtn'), 'press'); setTimeout(() => $('#actBtn').classList.remove('press'), 90); e.preventDefault(); }
    else if (mode === 'lobby' && !top) { startRun(); e.preventDefault(); }
    else if (top === 'results' && performance.now() >= canAgainAt) { againWithAd(); e.preventDefault(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (mode === 'play' && R && R.phase !== 'done') togglePause(true); audioSuspend(true); writeSave(); }
    else if (AU.ctx) audioSuspend(false);
  });
  window.addEventListener('pagehide', writeSave);
}
