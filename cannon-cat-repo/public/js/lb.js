'use strict';
// ---------- online leaderboard client (best distance) ----------
// Works offline: if the server can't be reached the panel says so and the game carries on.
const LB = {
  base: ((window.CC_CONFIG && window.CC_CONFIG.leaderboardUrl) || '').replace(/\/+$/, ''),
  id: null, name: null, online: null, top: [], me: null, total: 0, lastSent: 0, busy: false,
  init() {
    try { this.id = CG.getItem('cannoncat_pid'); } catch (e) {}
    if (!this.id || !/^[A-Za-z0-9_-]{8,64}$/.test(this.id)) {
      this.id = 'p' + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
      try { CG.setItem('cannoncat_pid', this.id); } catch (e) {}
    }
    try { this.lastSent = +(localStorage.getItem('cannoncat_lbsent') || 0); } catch (e) {}
    this.name = SET.lbName || null;
    // on CrazyGames, use the player's CrazyGames username when they have one
    if (!this.name && CG.sdk && CG.sdk.user) {
      try { CG.sdk.user.getUser().then(u => { if (u && u.username && !SET.lbName) { this.name = u.username.slice(0, 16); } }).catch(() => {}); } catch (e) {}
    }
    if (!this.name) { this.name = 'Kitty' + Math.floor(1000 + Math.random() * 9000); SET.lbName = this.name; writeSettings(); }
  },
  url(p) { return `${this.base}/api${p}`; },
  async req(path, body) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(this.url(path), body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal } : { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error('not json');
      this.online = true;
      return await r.json();
    } catch (e) { this.online = false; throw e; }
    finally { clearTimeout(tm); }
  },
  async fetchBoard() {
    const d = await this.req(`/leaderboard?limit=50&playerId=${encodeURIComponent(this.id)}`);
    this.top = Array.isArray(d.top) ? d.top : []; this.me = d.me || null; this.total = d.total || 0;
    return d;
  },
  cheating() { return !!(SET.admin && SET.admin.on); },
  async submitBest() {
    if (this.cheating() || S.best <= 0 || S.best <= this.lastSent || this.busy) return;
    this.busy = true;
    try {
      const d = await this.req('/score', { playerId: this.id, name: this.name, best: Math.floor(S.best * 10) / 10, cat: S.eq.cat });
      this.lastSent = S.best; try { localStorage.setItem('cannoncat_lbsent', String(S.best)); } catch (e) {}
      if (d && d.rank) this.me = d;
    } catch (e) { /* offline: try again after the next launch */ }
    this.busy = false;
  },
  async setName(n) {
    const d = await this.req('/name', { playerId: this.id, name: n });
    this.name = d.name; SET.lbName = d.name; writeSettings();
    return d.name;
  },
};
