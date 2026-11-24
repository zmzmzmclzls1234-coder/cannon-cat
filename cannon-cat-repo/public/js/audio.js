'use strict';
// ---------- audio: synthesized stand-in SFX + a bouncy music loop ----------
// Every sound has its own recipe, pitch jitter, a per-sound rate limit and a global voice cap.
const AU = { ctx: null, master: null, sfx: null, mus: null, noise: null, voices: 0, last: {}, musOn: false, nextT: 0, beat: 0, duck: 1 };

function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    AU.ctx = new C();
    AU.master = AU.ctx.createGain(); AU.master.connect(AU.ctx.destination);
    const comp = AU.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(AU.master);
    AU.sfx = AU.ctx.createGain(); AU.sfx.connect(comp);
    AU.mus = AU.ctx.createGain(); AU.mus.connect(comp);
    const len = AU.ctx.sampleRate;
    AU.noise = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = AU.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // silent unlock buffer (iOS)
    const b = AU.ctx.createBufferSource(); b.buffer = AU.ctx.createBuffer(1, 1, 22050); b.connect(AU.master); b.start(0);
    applyVolumes();
    startMusic();
  } catch (e) { AU.ctx = null; }
}
function applyVolumes() {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  AU.master.gain.setTargetAtTime((CG.muted || CG.adPlaying) ? 0 : 1, t, 0.02);
  AU.sfx.gain.setTargetAtTime(Math.pow(SET.sfx / 100, 1.5) * 0.9, t, 0.02);
  AU.mus.gain.setTargetAtTime(Math.pow(SET.music / 100, 1.5) * 0.32 * AU.duck, t, 0.15);
}
function duckMusic(on) { AU.duck = on ? 0.45 : 1; applyVolumes(); }

function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function voice(dur) {
  AU.voices++;
  setTimeout(() => { AU.voices--; }, dur * 1000 + 50);
}
function tone(type, f0, f1, dur, vol, delay = 0, dest = AU.sfx, a = 0.005) {
  const c = AU.ctx, t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, a, vol, dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  voice(dur + delay);
  return o;
}
function noise(dur, vol, ftype, f0, f1, q = 1, delay = 0, dest = AU.sfx, a = 0.004) {
  const c = AU.ctx, t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
  const f = c.createBiquadFilter(); f.type = ftype; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = c.createGain(); env(g, t, a, vol, dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  voice(dur + delay);
}
function vib(o, rate, depth, dur, delay = 0) {
  const c = AU.ctx, t = c.currentTime + delay;
  const l = c.createOscillator(), g = c.createGain();
  l.frequency.value = rate; g.gain.value = depth;
  l.connect(g); g.connect(o.frequency); l.start(t); l.stop(t + dur);
}

const SFX = {
  hover() { tone('sine', 1300, 1500, 0.04, 0.05); },
  click() { tone('square', 820, 520, 0.06, 0.12); tone('sine', 200, 120, 0.06, 0.2); },
  deny() { tone('square', 200, 170, 0.09, 0.14); tone('square', 160, 130, 0.12, 0.14, 0.1); },
  open() { tone('sine', 420, 880, 0.14, 0.18); noise(0.12, 0.06, 'bandpass', 800, 2500, 2); },
  close() { tone('sine', 760, 360, 0.11, 0.16); },
  buy() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.12, 0.2, i * 0.06)); tone('square', 2093, 2093, 0.05, 0.06, 0.24); },
  coin(j) { const f = 1320 * j; tone('square', f, f, 0.05, 0.08); tone('square', f * 1.335, f * 1.335, 0.1, 0.08, 0.05); },
  tick() { tone('square', 1900 + Math.random() * 200, 1900, 0.025, 0.05); },
  boom() {
    noise(0.6, 0.9, 'lowpass', 1800, 90, 0.7);
    tone('sine', 140, 38, 0.5, 0.9);
    noise(0.25, 0.4, 'highpass', 2500, 600, 0.7);
  },
  meow(j) {
    const c = AU.ctx, t = c.currentTime, d = 0.42;
    const o = c.createOscillator(); o.type = 'sawtooth';
    const base = 520 * j;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.55, t + 0.12);
    o.frequency.linearRampToValueAtTime(base * 1.2, t + 0.28);
    o.frequency.linearRampToValueAtTime(base * 0.8, t + d);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1800, t + 0.15); f.frequency.linearRampToValueAtTime(700, t + d);
    const g = c.createGain(); env(g, t, 0.04, 0.35, d);
    o.connect(f); f.connect(g); g.connect(AU.sfx); o.start(t); o.stop(t + d + 0.02);
    vib(o, 7, 14, d); voice(d);
  },
  angry(j) {
    const o = tone('sawtooth', 380 * j, 300 * j, 0.35, 0.22); vib(o, 26, 50, 0.35);
    noise(0.3, 0.12, 'bandpass', 2500, 1500, 2);
  },
  whoosh() { noise(0.28, 0.35, 'bandpass', 500, 2600, 1.4, 0, AU.sfx, 0.05); },
  dash() { noise(0.18, 0.4, 'bandpass', 1400, 3600, 2); tone('triangle', 500, 1100, 0.12, 0.18); },
  flop() { noise(0.3, 0.35, 'bandpass', 2400, 400, 1.5); tone('sine', 900, 200, 0.3, 0.2); },
  glide() { const o = tone('sine', 520, 820, 0.45, 0.16, 0, AU.sfx, 0.06); vib(o, 9, 25, 0.45); noise(0.3, 0.08, 'highpass', 3000, 5000, 1); },
  blink() { tone('sine', 2400, 300, 0.16, 0.2); noise(0.2, 0.25, 'highpass', 4000, 800, 1); tone('square', 300, 2400, 0.1, 0.06, 0.12); },
  boing(j) { const o = tone('sine', 160 * j, 520 * j, 0.14, 0.4); tone('sine', 520 * j, 240 * j, 0.25, 0.3, 0.13); vib(o, 18, 30, 0.38); },
  squawk(j) { const o = tone('sawtooth', 900 * j, 1250 * j, 0.18, 0.18); vib(o, 40, 220, 0.2); tone('square', 1500 * j, 900 * j, 0.1, 0.08, 0.12); },
  pop() { noise(0.07, 0.6, 'highpass', 1500, 4000, 0.8); tone('sine', 900, 180, 0.06, 0.25); },
  crash() {
    noise(0.4, 0.55, 'lowpass', 4000, 300, 0.7);
    for (let i = 0; i < 4; i++) tone('triangle', 2000 + Math.random() * 1800, 1200, 0.06, 0.1, 0.03 + i * 0.05);
    tone('sine', 220, 70, 0.2, 0.35);
  },
  splash() { noise(0.55, 0.5, 'bandpass', 1200, 350, 1.2, 0, AU.sfx, 0.01); noise(0.3, 0.2, 'highpass', 3000, 6000, 1, 0.05); },
  thud(v) { tone('sine', 170, 55, 0.14, 0.45 * v); noise(0.09, 0.3 * v, 'lowpass', 600, 150, 1); },
  megaflop() { tone('sine', 120, 30, 0.6, 1); noise(0.6, 0.7, 'lowpass', 1200, 80, 0.7); tone('sine', 300, 900, 0.3, 0.2, 0.08); },
  rocket() { noise(0.9, 0.45, 'bandpass', 700, 2500, 1, 0, AU.sfx, 0.05); const o = tone('sawtooth', 160, 700, 0.8, 0.12); vib(o, 30, 20, 0.8); },
  star() { tone('triangle', 1046, 1046, 0.4, 0.22); tone('triangle', 1568, 1568, 0.45, 0.16, 0.05); tone('sine', 2093, 2093, 0.4, 0.08, 0.08); },
  best() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone('square', f, f, 0.13, 0.09, i * 0.08)); },
  perfect() { [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.14, 0.18, i * 0.045)); },
  aimTick() { tone('sine', 1200, 1200, 0.03, 0.04); },
  honk(j) { tone('square', 340 * j, 330 * j, 0.18, 0.12); tone('square', 430 * j, 420 * j, 0.18, 0.1); tone('square', 340 * j, 330 * j, 0.22, 0.12, 0.2); tone('square', 430 * j, 420 * j, 0.22, 0.1, 0.2); },
  skip(j) { noise(0.16, 0.4, 'bandpass', 2200 * j, 900, 2); tone('sine', 900 * j, 1400 * j, 0.1, 0.15); },
  ramp() { noise(0.4, 0.3, 'bandpass', 600, 2400, 1.2, 0, AU.sfx, 0.05); tone('triangle', 300, 900, 0.35, 0.2); },
  penguin(j) { const o = tone('square', 700 * j, 500 * j, 0.12, 0.1); vib(o, 30, 60, 0.12); tone('square', 800 * j, 600 * j, 0.12, 0.1, 0.13); },
  beam() { const o = tone('sine', 300, 1200, 0.7, 0.18, 0, AU.sfx, 0.05); vib(o, 12, 80, 0.7); tone('triangle', 600, 2400, 0.7, 0.06); },
  zone() { [392, 523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.18, 0.18, i * 0.07)); noise(0.6, 0.08, 'highpass', 5000, 9000, 1, 0.3); },
  mission() { [784, 1046, 1318].forEach((f, i) => tone('square', f, f, 0.12, 0.1, i * 0.07)); tone('triangle', 1568, 1568, 0.4, 0.15, 0.22); },
  rank() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone('triangle', f, f, 0.16, 0.16, i * 0.06)); },
  equip() { tone('triangle', 660, 990, 0.12, 0.18); noise(0.1, 0.1, 'highpass', 4000, 8000, 1); },
  tab() { tone('sine', 900, 1100, 0.05, 0.08); },
  boxshake(n) { const k = n || 1; noise(0.18 + k * 0.05, 0.25 + k * 0.12, 'lowpass', 900, 200, 1); for (let i = 0; i < 2 + k; i++) tone('triangle', 300 + k * 120 + i * 60, 200, 0.06, 0.12, i * 0.05); tone('sine', 120 + k * 40, 60, 0.2, 0.3); },
  reveal(ri) {
    const r = ri | 0; const base = [523, 587, 659, 784, 880][r] || 523;
    [1, 1.25, 1.5, 2].concat(r >= 2 ? [2.5, 3] : []).forEach((m, i) => tone(r >= 3 ? 'square' : 'triangle', base * m, base * m, 0.16, 0.14, i * 0.07));
    if (r >= 3) { noise(0.8, 0.15, 'highpass', 4000, 9000, 1, 0.3); tone('triangle', base * 4, base * 4, 0.6, 0.12, 0.45); }
  },
  plunge() {
    tone('sine', 140, 38, 0.45, 0.9); noise(0.7, 0.6, 'lowpass', 1600, 200, 0.8, 0, AU.sfx, 0.01);
    noise(0.5, 0.25, 'bandpass', 2600, 900, 2, 0.08);
    for (let i = 0; i < 5; i++) tone('sine', 500 + Math.random() * 700, 1200 + Math.random() * 600, 0.06, 0.07, 0.25 + i * 0.07);
  },
  land() { tone('triangle', 660, 660, 0.12, 0.15); tone('triangle', 880, 880, 0.2, 0.15, 0.1); },
};
const SFX_GAP = { coin: 0.035, tick: 0.03, thud: 0.06, hover: 0.05, aimTick: 0.1 };

function sfx(name, arg) {
  if (!AU.ctx || AU.ctx.state !== 'running' || SET.sfx <= 0) return;
  if (typeof R !== 'undefined' && R && R.headless) return;
  const now = AU.ctx.currentTime;
  const gap = SFX_GAP[name] != null ? SFX_GAP[name] : 0.04;
  if (AU.last[name] && now - AU.last[name] < gap) return;
  if (AU.voices > 28) return;
  AU.last[name] = now;
  const jitter = 0.94 + Math.random() * 0.12;
  try { SFX[name](arg != null ? arg : jitter); } catch (e) {}
}

// ---------- music: 8-bar bouncy loop, 132 bpm, scheduled ahead ----------
const MUS = {
  bpm: 132,
  // chords: C  Am  F  G
  bass: [48, 48, 55, 48, 45, 45, 52, 45, 41, 41, 48, 41, 43, 43, 50, 47],
  chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
  lead: [72, -1, 76, 79, 76, -1, 74, 72, 69, -1, 72, 76, 74, -1, 72, -1, 69, -1, 72, 77, 76, -1, 72, 69, 67, -1, 71, 74, 79, 77, 74, 71],
};
let MUS_T = 0, MUS_SPACE = false;
const midi = n => 440 * Math.pow(2, (n - 69 + MUS_T) / 12);
function startMusic() {
  if (AU.musOn || !AU.ctx) return;
  AU.musOn = true; AU.nextT = AU.ctx.currentTime + 0.1; AU.beat = 0;
  setInterval(scheduleMusic, 30);
}
function scheduleMusic() {
  if (!AU.ctx || AU.ctx.state !== 'running') return;
  const e8 = 60 / MUS.bpm / 2;
  while (AU.nextT < AU.ctx.currentTime + 0.15) {
    const b = AU.beat, t = AU.nextT - AU.ctx.currentTime;
    const bar = Math.floor(b / 8) % 4;
    if (b % 2 === 0) tone('triangle', midi(MUS.bass[(b / 2) % 16] - 12 + 12), midi(MUS.bass[(b / 2) % 16]), e8 * 1.6, 0.32, t, AU.mus, 0.004);
    if (b % 2 === 1) MUS.chords[bar].forEach(n => tone('square', midi(n), midi(n), e8 * 0.55, 0.035, t, AU.mus, 0.003));
    const ln = MUS.lead[b % 32];
    if (ln > 0 && (MUS_SPACE || Math.floor(b / 32) % 2 === 1)) tone(MUS_SPACE ? 'sine' : 'triangle', midi(ln), midi(ln), e8 * 0.9, 0.09, t, AU.mus, 0.004);
    if (b % 4 === 0) { tone('sine', 150, 45, 0.12, 0.35, t, AU.mus); }
    if (b % 4 === 2) noise(0.08, 0.12, 'bandpass', 1800, 1200, 1, t, AU.mus);
    noise(0.03, b % 2 ? 0.05 : 0.03, 'highpass', 7000, 9000, 1, t, AU.mus, 0.001);
    AU.beat++; AU.nextT += e8;
  }
}
function audioSuspend(on) {
  if (!AU.ctx) return;
  if (on) AU.ctx.suspend(); else AU.ctx.resume();
}
