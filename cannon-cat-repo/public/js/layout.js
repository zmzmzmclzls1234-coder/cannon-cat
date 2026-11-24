'use strict';
// ---------- responsive layout: portrait (phones/tablets upright), short (landscape phones), wide ----------
// Sets body classes used by css/mobile.css and adapts the camera framing to the screen shape.
let LAYOUT = 'wide';
function applyLayout(w, h) {
  LAYOUT = h > w * 1.1 ? 'portrait' : h <= 500 ? 'short' : 'wide';
  const b = document.body;
  b.classList.toggle('portrait', LAYOUT === 'portrait');
  b.classList.toggle('short', LAYOUT === 'short');
  b.classList.toggle('wide', LAYOUT === 'wide');
  b.style.setProperty('--vmin', Math.min(w, h, 470) + 'px');
}
(function () {
  const baseResize = resize;
  resize = function () { applyLayout(window.innerWidth, window.innerHeight); baseResize(); };
  // narrower minimum view width in portrait so the cat is not tiny
  baseDist = function () {
    const asp = CAM.W / CAM.H;
    const dH = 640 / (2 * TAN), dW = (LAYOUT === 'portrait' ? 520 : 760) / (2 * TAN * asp);
    return Math.max(dH, dW);
  };
  // lobby + aim framing per layout; everything else uses the original camera
  const baseCam = updateCam;
  updateCam = function (dt, alpha) {
    if (LAYOUT !== 'portrait' || !R || (R.phase !== 'lobby' && R.phase !== 'aim')) return baseCam(dt, alpha);
    const bd = baseDist();
    let tx, ty, td;
    if (R.phase === 'lobby') { td = bd * 0.62; tx = CANNON.x + 70; ty = -110; }
    else { td = bd * 0.96; tx = CANNON.x + td * TAN * (CAM.W / CAM.H) * 0.42; ty = -td * TAN * 0.3; }
    const k = ease(4, dt);
    CAM.x += (tx - CAM.x) * k; CAM.y += (ty - CAM.y) * k; CAM.dist += (td - CAM.dist) * ease(3, dt);
    CAM.trauma = Math.max(0, CAM.trauma - dt * 1.6);
    CAM.kx *= Math.exp(-10 * dt); CAM.ky *= Math.exp(-10 * dt);
    CAM.punch = Math.max(0, CAM.punch - dt * 2.5);
  };
})();
