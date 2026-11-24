'use strict';
// ---------- boot, fixed-step loop, error card, test hooks ----------
const ERR_LOG = [];
function showError(msg, stack) {
  ERR_LOG.push(`[${new Date().toISOString()}] v${VERSION} mode=${mode} phase=${R && R.phase} seed=${R && R.seed}\n${msg}\n${stack || ''}`);
  console.error(msg);
  paused = true;
  CG.gameplayStop();
  $('#errCard').classList.add('on');
}
window.addEventListener('error', e => showError(e.message, e.error && e.error.stack));
window.addEventListener('unhandledrejection', e => showError(String(e.reason)));

let acc = 0, last = performance.now(), rt = 0, booted = false;
const perf = { frames: [] };
function frame(now) {
  const t0 = performance.now();
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.25;
  if (dt < 0) dt = 0;
  try {
    rt += dt;
    if (slowT > 0) { slowT -= dt; if (slowT <= 0) timeScale = 1; }
    const simRunning = !paused && !CG.adPlaying && !(stack.length && mode === 'play' && R && R.phase !== 'done');
    if (simRunning) {
      acc += dt * timeScale;
      let n = 0;
      while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; }
      if (n >= 5) acc = 0;
      updateFX(dt * timeScale);
    }
    if (BOXST && !simRunning) updateFX(dt);
    processThumbs();
    const alpha = clamp(acc / STEP, 0, 1);
    updateCam(simRunning ? dt : 0, alpha);
    render(alpha, rt);
    if (mode === 'play') updateHud();
    updateTutorial(dt);
    if (booted) updateGuide(dt);
    if (QA) {
      const ft = performance.now() - t0; perf.frames.push(ft); if (perf.frames.length > 30) perf.frames.shift();
      $('#qa').textContent = `assists ${R ? R.assists : 0}  frame ${ft.toFixed(1)}ms  worst ${Math.max(...perf.frames).toFixed(1)}ms\ndraws ${GL.draws} parts ${FX.parts.length} objs ${R ? R.objs.length : 0}\nseed ${R && R.seed} dpr ${DPR} sdk ${CG.env}`;
    }
  } catch (e) { showError(e.message, e.stack); }
  requestAnimationFrame(frame);
}

async function boot() {
  const fill = $('#loadFill');
  fill.style.width = '15%';
  await CG.init();
  CG.loadingStart();
  fill.style.width = '45%';
  if (QA && /[?&]qaAds=1/.test(location.search)) mockAds();
  S = loadSave();
  fillMissions(); grantReqSkins();
  try { GL.init(cv); } catch (e) {
    console.error('GL init failed: ' + e.message);
    $('#errText').textContent = 'Your browser could not start 3D graphics (WebGL). Try another browser or update your graphics drivers.';
    $('#errCard').classList.add('on'); $('#loading').classList.remove('on'); return;
  }
  resize();
  window.addEventListener('resize', resize);
  LB.init();
  initUI();
  setTimeout(() => LB.submitBest(), 2500);
  try { await document.fonts.load("20px 'Archivo Black'"); } catch (e) {}
  fill.style.width = '100%';
  CG.loadingStop();
  $('#loading').classList.remove('on');
  booted = true;
  if (S.runs === 0) {
    // first visit: land straight in gameplay with the in-world tutorial
    mode = 'lobby'; newRun('lobby'); startRun();
  } else goLobby();
  CAM.dist = baseDist(); updateCam(10, 0);
  if (QA) { $('#qa').style.display = 'block'; if (/[?&]qaCoins=1/.test(location.search)) { S.coins += 20000; refreshCoins(); } }
  requestAnimationFrame(frame);
}
// QA only: simulate the SDK's ad flow so the rewarded/midgame UI can be tested without a CrazyGames host
function mockAds() {
  CG.sdk = { ad: { requestAd: (type, cb) => { cb.adStarted(); setTimeout(() => cb.adFinished(), 1200); } }, game: { gameplayStart() {}, gameplayStop() {}, happytime() {}, loadingStart() {}, loadingStop() {} } };
  CG.env = 'crazygames';
}

// ---------- headless simulation (tests + balance bots) ----------
function simRun(seed, bot = 'good', save) {
  const keepS = S, keepR = R;
  S = save ? save : JSON.parse(JSON.stringify(S));
  if (!S.missions.length) fillMissions();
  newRun('aim', seed, true);
  const rr = mulberry32(seed ^ 0x9e3779b9);
  const want = bot === 'good' ? 45 + (rr() - 0.5) * 6 : bot === 'avg' ? 45 + (rr() - 0.5) * 24 : 15 + rr() * 60;
  let fired = false, steps = 0;
  while (R.phase !== 'done' && steps < 60 * 200) {
    if (!fired && R.phase === 'aim' && Math.abs(R.angle - want) < 1.2 && R.aimT > 0.3) { R.queue = 1; fired = true; }
    if (!fired && R.aimT > 8) { R.queue = 1; fired = true; }
    if (R.phase === 'fly' && bot !== 'careless' && R.charges > 0) {
      const c = R.cat;
      if (c.vy > 200 && c.y > -260 && !c.ground) R.queue = 1;
      if (c.ground && Math.abs(c.vx) < 250) R.queue = 1;
    }
    step(STEP); steps++;
  }
  const out = { fell: R.fell, assists: R.assists, dist: R.dist, coins: R.result ? R.result.total : 0, fish: R.st.fish, zone: R.zoneMax, perfect: R.perfect, t: R.t, st: R.st, missions: R.result ? R.result.completed.length : 0, steps, saveAfter: S };
  S = keepS; R = keepR;
  return out;
}
window.__cc = { simRun, get S() { return S; }, set S(v) { S = v; }, get R() { return R; }, get mode() { return mode; }, get stack() { return stack; }, startRun, goLobby, openOverlay, back, step, endRun, defSave, fillMissions, launchSpeed, upCost, UPS, CATS, ZONES, GL, CG, writeSave, renderShop, renderLocker,
  setTab(t, sk) { shopTab = t; if (sk) skinTab = sk; renderShop(); }, setLockTab(t) { lockTab = t; renderLocker(); }, openBox, showOdds, boxStep, closeBox, submitCode, get SET() { return SET; }, ADM, predictLanding };

boot();
