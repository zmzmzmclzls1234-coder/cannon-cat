'use strict';
// ---------- versioned save (SDK data module or localStorage), backup slot, separate settings ----------
const SAVE_KEY = 'cannoncat_save';
const SET_KEY = 'cannoncat_settings';
let storageOK = true;

function defSave() {
  return {
    version: 3, coins: 0, best: 0, runs: 0, boxes: 0, freeBox: false,
    up: { power: 0, charges: 0, spring: 0, luck: 0, magnet: 0 },
    cats: ['mochi'],
    owned: { hat: ['none'], cannon: ['classic'], trail: ['none'] },
    eq: { cat: 'mochi', hat: 'none', cannon: 'classic', trail: 'none' },
    zones: 1, missions: [], mDone: 0, mGen: 0,
    totals: { fish: 0, pop: 0, perfect: 0, smash: 0, bird: 0 },
    lastOffer: -9,
  };
}
function defSettings() {
  let reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  return { music: 55, sfx: 80, shake: 100, reduced, seen: {}, admin: { on: false } };
}
const MIGRATIONS = {
  // v1 (2D prototype): cats[] + sel  ->  v2 owned/eq skins, missions, zones
  1: s => {
    const d = defSave();
    d.coins = s.coins; d.best = s.best; d.runs = s.runs; d.up = s.up || d.up;
    d.version = 2; d.owned.cat = Array.isArray(s.cats) ? s.cats.slice() : ['mochi'];
    if (s.sel) d.eq.cat = s.sel;
    return d;
  },
  // v2 -> v3: cats leave the skin list (they now come from cat boxes), magnet upgrade added
  2: s => {
    s.cats = s.owned && Array.isArray(s.owned.cat) ? s.owned.cat.slice() : ['mochi'];
    if (s.owned) delete s.owned.cat;
    s.version = 3; return s;
  },
};
function migrate(s) {
  let guard = 0;
  while (MIGRATIONS[s.version] && guard++ < 20) s = MIGRATIONS[s.version](s);
  return s;
}
function sanitize(s) {
  const d = defSave();
  const num = (v, lo, hi, def) => (typeof v === 'number' && isFinite(v) ? clamp(Math.floor(v), lo, hi) : def);
  d.coins = num(s.coins, 0, 1e9, 0);
  d.best = typeof s.best === 'number' && isFinite(s.best) ? clamp(s.best, 0, 1e6) : 0;
  d.runs = num(s.runs, 0, 1e9, 0);
  for (const u of UPS) d.up[u.id] = num(s.up && s.up[u.id], 0, u.max, 0);
  d.boxes = num(s.boxes, 0, 1e9, 0);
  d.freeBox = s.freeBox === true;
  d.cats = Array.isArray(s.cats) ? Array.from(new Set(s.cats.filter(id => CAT_BY[id]))) : [];
  if (!d.cats.includes('mochi')) d.cats.unshift('mochi');
  d.eq.cat = s.eq && d.cats.includes(s.eq.cat) ? s.eq.cat : 'mochi';
  for (const k in SKINS) {
    const ids = SKINS[k].map(x => x.id);
    const own = s.owned && Array.isArray(s.owned[k]) ? s.owned[k].filter(id => ids.includes(id)) : [];
    if (!own.includes(ids[0])) own.unshift(ids[0]);
    d.owned[k] = Array.from(new Set(own));
    d.eq[k] = s.eq && d.owned[k].includes(s.eq[k]) ? s.eq[k] : ids[0];
  }
  d.zones = num(s.zones, 1, ZONES.length, 1);
  d.mDone = num(s.mDone, 0, 1e6, 0);
  d.mGen = num(s.mGen, 0, 1e9, 0);
  d.lastOffer = num(s.lastOffer, -9, 1e9, -9);
  for (const k in d.totals) d.totals[k] = num(s.totals && s.totals[k], 0, 1e9, 0);
  d.missions = Array.isArray(s.missions) ? s.missions.filter(m => m && MTYPE_BY[m.t] && typeof m.goal === 'number').slice(0, 3).map(m => ({ t: m.t, goal: Math.max(1, m.goal | 0), prog: num(m.prog, 0, 1e9, 0), L: num(m.L, 0, 1e6, 0), reward: num(m.reward, 0, 1e6, 40) })) : [];
  return d;
}
function validSave(s) { return s && typeof s === 'object' && typeof s.version === 'number'; }

function loadSave() {
  try {
    let s = null;
    try { s = JSON.parse(CG.getItem(SAVE_KEY)); } catch (e) { s = null; }
    if (!validSave(s)) {
      let b = null;
      try { b = JSON.parse(CG.getItem(SAVE_KEY + '_bak')); } catch (e) { b = null; }
      if (validSave(b)) { s = b; setTimeout(() => toast('Save was damaged - restored the backup'), 600); }
      else s = defSave();
    }
    return sanitize(migrate(s));
  } catch (e) {
    storageOK = false;
    return defSave();
  }
}
let saveTimer = 0;
function writeSave() {
  try {
    const cur = CG.getItem(SAVE_KEY);
    if (cur) CG.setItem(SAVE_KEY + '_bak', cur);
    CG.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) {
    if (storageOK) { storageOK = false; toast("Progress can't be saved in this browser"); }
  }
}
function loadSettings() {
  const d = defSettings();
  try {
    const s = JSON.parse(localStorage.getItem(SET_KEY));
    if (s && typeof s === 'object') {
      for (const k of ['music', 'sfx', 'shake']) if (typeof s[k] === 'number') d[k] = clamp(s[k], 0, 100);
      if (typeof s.reduced === 'boolean') d.reduced = s.reduced;
      if (s.seen && typeof s.seen === 'object') d.seen = s.seen;
      if (s.admin && typeof s.admin === 'object') d.admin = s.admin;
    }
  } catch (e) {}
  return d;
}
function writeSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) {} }

let S = defSave();
let SET = loadSettings();

// ---------- skins helpers ----------
function skinDef(cat, id) { return SKINS[cat].find(x => x.id === id); }
function skinUnlockedByReq(def) {
  if (!def.req) return false;
  if (def.req.rank) return rankOf(S.mDone) >= def.req.rank;
  if (def.req.zone) return S.zones > ZONES.findIndex(z => z.id === def.req.zone);
  return false;
}
function grantReqSkins() {
  const got = [];
  for (const k in SKINS) for (const d of SKINS[k]) if (!S.owned[k].includes(d.id) && skinUnlockedByReq(d)) { S.owned[k].push(d.id); got.push(d); }
  return got;
}

// ---------- missions ----------
function fillMissions() {
  while (S.missions.length < 3) {
    const rng = mulberry32(9001 + S.mGen * 7919);
    const active = S.missions.map(m => m.t);
    let pool = MTYPES.filter(m => !active.includes(m.t));
    if (S.zones >= ZONES.length) pool = pool.filter(m => m.t !== 'zone');
    const mt = pool[Math.floor(rng() * pool.length)];
    const L = S.mDone + S.missions.length;
    S.missions.push({ t: mt.t, goal: mt.goal(L), prog: 0, L, reward: missionReward(L) });
    S.mGen++;
  }
}
function missionLabel(m) { return MTYPE_BY[m.t].label(m.goal); }
