'use strict';
// CANNON CAT leaderboard server - plain Node.js, no dependencies.
// Serves the game from /public and a small JSON API under /api.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = +process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'leaderboard.json');
const BOT_COUNT = +(process.env.BOT_COUNT || 40);
const BOTS_LABELED = process.env.BOTS_LABELED !== 'false';     // show a small CPU tag next to bots
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
const MAX_DIST = 30000;                                         // metres; anything above is rejected
const CATS = ['mochi', 'socks', 'chonk', 'floof', 'zip', 'sparky', 'astro', 'ghost', 'blaze'];

// ---------- storage: one JSON file, written atomically a few seconds after a change ----------
let db = { version: 1, players: {} };
try {
  const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (d && d.players && typeof d.players === 'object') db = d;
} catch (e) { /* first start or unreadable file: start fresh */ }
let dirty = false, sorted = null;
function changed() { dirty = true; sorted = null; }
function flush() {
  if (!dirty) return;
  dirty = false;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) { console.error('save failed', e.message); dirty = true; }
}
setInterval(flush, 3000);
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { flush(); process.exit(0); });

// ---------- bots: give the board some life; they slowly improve over time ----------
const BOT_NAMES = ['WhiskerWiz', 'CaptainPaws', 'MeowMachine', 'Sir Fluffington', 'TunaRocket', 'PurrNado', 'NapQueen', 'ZoomieKing',
  'Catstronaut', 'Mittens99', 'LaserChaser', 'BiscuitBoi', 'Noodle', 'Pickles', 'SockThief', 'MochiMaster', 'Clawdia', 'Furball', 'CosmoCat',
  'Pawsome', 'KittyHawk', 'Snowball', 'Ginger', 'Tofu', 'Pudding', 'MrWhiskers', 'Shadow', 'Mango', 'Luna', 'Oreo', 'Nugget', 'Waffles',
  'Bubbles', 'Simba', 'Peanut', 'Pepper', 'Ziggy', 'Marble', 'Muffin', 'Sushi', 'Hazel', 'Pixel', 'Boba', 'Kiwi', 'Taco', 'Dumpling'];
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function ensureBots() {
  const r = rng(1234);
  for (let i = 0; i < BOT_COUNT; i++) {
    const id = 'bot-' + i;
    const g = Math.sqrt(-2 * Math.log(r() || 1e-6)) * Math.cos(2 * Math.PI * r());   // normal
    const best = Math.round(Math.min(4200, Math.max(60, Math.exp(Math.log(420) + 0.85 * g))));
    if (!db.players[id]) db.players[id] = { id, name: BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? i : ''), best, cat: CATS[Math.floor(r() * CATS.length)], bot: true, updated: Date.now() - Math.floor(r() * 864e5) };
  }
  changed();
}
function botTick() {
  for (const p of Object.values(db.players)) {
    if (!p.bot || Math.random() > 0.12) continue;
    p.best = Math.min(6500, Math.round(p.best * (1.02 + Math.random() * 0.08)));
    p.updated = Date.now();
  }
  changed();
}
ensureBots();
setInterval(botTick, 5 * 60 * 1000);

// ---------- ranking ----------
function ranked() {
  if (!sorted) sorted = Object.values(db.players).filter(p => p.best > 0).sort((a, b) => b.best - a.best || a.updated - b.updated);
  return sorted;
}
function rankOf(id) { const i = ranked().findIndex(p => p.id === id); return i < 0 ? null : i + 1; }
function publicRow(p, rank, meId) {
  const o = { rank, name: p.name, best: p.best, cat: p.cat };
  if (p.bot && BOTS_LABELED) o.bot = true;
  if (p.id === meId) o.you = true;
  return o;
}

// ---------- validation ----------
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'porn', 'sex', 'dick', 'pussy', 'slut', 'whore', 'retard', '시발', '씨발', '병신', '좆', '섹스'];
function cleanName(n) {
  if (typeof n !== 'string') return null;
  n = n.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (n.length < 2 || !/^[\p{L}\p{N} _.\-]+$/u.test(n)) return null;
  const low = n.toLowerCase().replace(/[\s_.\-]/g, '');
  if (BAD.some(w => low.includes(w))) return null;
  return n;
}
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id) && !id.startsWith('bot-');

// ---------- rate limit: 30 writes per minute per address ----------
const hits = new Map();
function limited(ip) {
  const now = Date.now(); let h = hits.get(ip);
  if (!h || now > h.reset) { h = { n: 0, reset: now + 60000 }; hits.set(ip, h); }
  h.n++;
  return h.n > 30;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now > v.reset) hits.delete(k); }, 60000);

// ---------- http ----------
function cors(req, res) {
  const o = req.headers.origin;
  if (ALLOWED_ORIGINS.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (o && ALLOWED_ORIGINS.some(a => o === a || (a.startsWith('*.') && o.endsWith(a.slice(1))))) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 4096) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB + path.sep) && file !== PUB) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (url.pathname.startsWith('/api/')) {
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, players: Object.keys(db.players).length });
      if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
        const limit = Math.max(1, Math.min(100, +url.searchParams.get('limit') || 50));
        const me = url.searchParams.get('playerId');
        const list = ranked();
        const top = list.slice(0, limit).map((p, i) => publicRow(p, i + 1, me));
        let mine = null;
        if (validId(me) && db.players[me] && db.players[me].best > 0) mine = { rank: rankOf(me), best: db.players[me].best, name: db.players[me].name };
        return json(res, 200, { top, me: mine, total: list.length });
      }
      if (req.method === 'POST' && url.pathname === '/api/score') {
        if (limited(ip)) return json(res, 429, { error: 'slow down' });
        const b = await readBody(req);
        if (!validId(b.playerId)) return json(res, 400, { error: 'bad player id' });
        const best = Math.floor(Number(b.best) * 10) / 10;
        if (!isFinite(best) || best <= 0 || best > MAX_DIST) return json(res, 400, { error: 'bad distance' });
        const cat = CATS.includes(b.cat) ? b.cat : 'mochi';
        let p = db.players[b.playerId];
        if (!p) p = db.players[b.playerId] = { id: b.playerId, name: cleanName(b.name) || 'Kitty' + Math.floor(1000 + Math.random() * 9000), best: 0, cat, updated: Date.now() };
        if (best > p.best) { p.best = best; p.cat = cat; p.updated = Date.now(); }
        changed();
        return json(res, 200, { rank: rankOf(p.id), best: p.best, name: p.name, total: ranked().length });
      }
      if (req.method === 'POST' && url.pathname === '/api/name') {
        if (limited(ip)) return json(res, 429, { error: 'slow down' });
        const b = await readBody(req);
        if (!validId(b.playerId)) return json(res, 400, { error: 'bad player id' });
        const name = cleanName(b.name);
        if (!name) return json(res, 400, { error: 'name not allowed' });
        const p = db.players[b.playerId] || (db.players[b.playerId] = { id: b.playerId, best: 0, cat: 'mochi', updated: Date.now() });
        p.name = name; changed();
        return json(res, 200, { name });
      }
      return json(res, 404, { error: 'not found' });
    } catch (e) { return json(res, 400, { error: 'bad request' }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, url.pathname);
});
server.listen(PORT, () => console.log(`CANNON CAT server on :${PORT} (data: ${DB_FILE})`));
