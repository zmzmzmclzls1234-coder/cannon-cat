'use strict';
// ---------- CrazyGames SDK v3 wrapper ----------
// Works with no SDK at all (artifact preview, other hosts): every call becomes a safe no-op,
// ads report adError so the game never rewards without a finished ad.
const CG = {
  sdk: null, env: 'none', ready: false, muted: false, adPlaying: false, systemInfo: null, dataOK: false, adblock: false,
  async init() {
    const wantSdk = /crazygames/i.test(location.hostname) || /[?&]useLocalSdk=true/.test(location.search) || /crazygames/i.test(document.referrer || '');
    if (wantSdk) {
      try { await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js', 6000); } catch (e) { /* offline or blocked: run without SDK */ }
    }
    const S0 = window.CrazyGames && window.CrazyGames.SDK;
    if (!S0) { this.ready = true; return; }
    try {
      await Promise.race([S0.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('sdk init timeout')), 8000))]);
      this.env = S0.environment;
      if (this.env === 'disabled') { this.ready = true; return; }
      this.sdk = S0;
      try { this.systemInfo = S0.user && S0.user.systemInfo; } catch (e) {}
      try { this.muted = !!(S0.game.settings && S0.game.settings.muteAudio); } catch (e) {}
      try {
        S0.game.addSettingsChangeListener(s => { this.muted = !!(s && s.muteAudio); applyVolumes(); });
      } catch (e) {}
      try { S0.data.getItem('__probe'); this.dataOK = true; } catch (e) { this.dataOK = false; }
      try { this.adblock = await S0.ad.hasAdblock(); } catch (e) {}
    } catch (e) { this.sdk = null; }
    this.ready = true;
  },
  call(fn) { if (!this.sdk) return; try { fn(this.sdk); } catch (e) {} },
  loadingStart() { this.call(s => s.game.loadingStart()); },
  loadingStop() { this.call(s => s.game.loadingStop()); },
  _playing: false,
  gameplayStart() { if (this._playing) return; this._playing = true; this.call(s => s.game.gameplayStart()); },
  gameplayStop() { if (!this._playing) return; this._playing = false; this.call(s => s.game.gameplayStop()); },
  happytime() { this.call(s => s.game.happytime()); },
  // ads: midgame between launches, rewarded only when the player asks
  adsAvailable() { return !!this.sdk && this.env === 'crazygames' && !this.adblock; },
  requestAd(type, done) {
    if (!this.sdk) { done(false, 'noSdk'); return; }
    let finished = false;
    const end = (ok, code) => { if (finished) return; finished = true; this.adPlaying = false; applyVolumes(); done(ok, code); };
    try {
      this.sdk.ad.requestAd(type, {
        adStarted: () => { this.adPlaying = true; applyVolumes(); },
        adFinished: () => end(true),
        adError: e => end(false, e && e.code),
      });
    } catch (e) { end(false, 'other'); }
  },
  // storage: SDK data module when enabled (synced to the player's account), else localStorage
  getItem(k) {
    if (this.dataOK) { try { return this.sdk.data.getItem(k); } catch (e) {} }
    return localStorage.getItem(k);
  },
  setItem(k, v) {
    if (this.dataOK) { try { this.sdk.data.setItem(k, v); return; } catch (e) {} }
    localStorage.setItem(k, v);
  },
  isIOS() {
    const si = this.systemInfo;
    if (si && si.os && /ios/i.test(si.os.name || '')) return true;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },
  deviceType() {
    const si = this.systemInfo;
    if (si && si.device && si.device.type) return si.device.type;   // desktop | tablet | mobile
    return Math.min(innerWidth, innerHeight) < 560 && matchMedia('(pointer:coarse)').matches ? 'mobile' : 'desktop';
  },
  dpr() {
    // CrazyGames: 1 on iOS and low-memory Android, otherwise devicePixelRatio (capped for fill rate)
    if (this.isIOS()) return 1;
    if (/Android/i.test(navigator.userAgent) && (navigator.deviceMemory || 4) <= 4) return 1;
    return Math.min(window.devicePixelRatio || 1, this.deviceType() === 'desktop' ? 2 : 1.5);
  },
};
function loadScript(src, timeout) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    const t = setTimeout(() => rej(new Error('timeout')), timeout);
    s.onload = () => { clearTimeout(t); res(); };
    s.onerror = () => { clearTimeout(t); rej(new Error('load failed')); };
    document.head.appendChild(s);
  });
}
