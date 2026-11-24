'use strict';
// ---------- constants & content data ----------
const GAME_TITLE = 'CANNON CAT';   // working title (see README: rename before submitting)
const VERSION = '0.3.0';
const STEP = 1 / 60;
const GRAV = 980;
const INK = '#16121a';
const CANNON = { x: 0, y: -58 };
const BARREL = 104;
const PX_PER_M = 10;
const QA = /[?&]qa=1/.test(location.search);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (k, dt) => 1 - Math.exp(-k * dt);
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(A >> 16 & 255, B >> 16 & 255, t)), g = Math.round(lerp(A >> 8 & 255, B >> 8 & 255, t)), bl = Math.round(lerp(A & 255, B & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

// ---------- zones (longer map) ----------
// objs: ground-level + low-air spawn weights. high: what lives 120m+ up in this zone. planet: what you see from space here.
const ZONES = [
  { id: 'yard', name: 'BACKYARD', from: 0, sky: '#63c6ff', horizon: '#d2f2ff', ground: '#5fd14f', dirt: '#c4865a', friction: 650, grav: 1,
    rule: 'Trampolines help, flower pots and holes hurt.',
    objs: { tramp: 8, pot: 7, puddle: 4, pit: 4, fish: 40, bird: 18, balloon: 17, catnip: 3 },
    high: { hotair: 6, goldfish: 5, bird: 3 }, planet: { col: '#ff9f43', ring: '#ffd23f' } },
  { id: 'town', name: 'DOWNTOWN', from: 400, sky: '#ffad6b', horizon: '#ffe6c2', ground: '#7d8190', dirt: '#5b5e6b', friction: 650, grav: 1,
    rule: 'Bounce off car roofs and awnings. Mind the open manholes!',
    objs: { car: 12, awning: 8, hydrant: 8, pit: 5, fish: 36, pigeon: 18, balloon: 12, catnip: 3 },
    high: { plane: 6, goldfish: 5, heli: 3 }, planet: { col: '#8f63ff', ring: null } },
  { id: 'beach', name: 'SUNNY BEACH', from: 1000, sky: '#43cfff', horizon: '#dcfcff', ground: '#f3d68a', dirt: '#e0b96a', friction: 820, grav: 1,
    rule: 'Hit the sea flat and fast to SKIP across. Beach balls are super bouncy.',
    objs: { sea: 12, ball: 10, crab: 8, pit: 3, fish: 36, gull: 18, balloon: 10, catnip: 3 },
    high: { kite: 7, goldfish: 5, gull: 3 }, planet: { col: '#2fa4ff', ring: '#bfe9ff' } },
  { id: 'snow', name: 'SNOW PEAKS', from: 1800, sky: '#86b2ff', horizon: '#eef4ff', ground: '#f4f8ff', dirt: '#c9d6ea', friction: 280, grav: 1,
    rule: 'Icy ground: long slides! Ski ramps launch you, penguins push you.',
    objs: { ramp: 11, snowman: 9, penguin: 9, pit: 5, fish: 36, bird: 14, balloon: 12, catnip: 3 },
    high: { aurora: 7, goldfish: 5 }, planet: { col: '#bfe6ff', ring: '#ffffff' } },
  { id: 'moon', name: 'MOON BASE', from: 3000, sky: '#120f35', horizon: '#3a2f7a', ground: '#bdbbd0', dirt: '#8f8ca8', friction: 480, grav: 0.6,
    rule: 'Low gravity! UFO beams lift you, fuel cans blast you forward.',
    objs: { crater: 10, rock: 9, pit: 6, ufo: 12, fish: 36, fuel: 5 },
    high: { satellite: 6, asteroid: 5, goldfish: 5 }, planet: { col: '#3aa3ff', ring: null, earth: true } },
];
const TRACK_MAX = 3600;
function zoneAt(xPx) {
  const m = xPx / PX_PER_M; let z = 0;
  for (let i = 0; i < ZONES.length; i++) if (m >= ZONES[i].from) z = i;
  return z;
}

// ---------- rarity + cats (from cat boxes) ----------
const RARITY = {
  common: { name: 'COMMON', col: '#3fcf5c', dup: 100 },
  rare: { name: 'RARE', col: '#3aa3ff', dup: 250 },
  epic: { name: 'EPIC', col: '#8f63ff', dup: 600 },
  legendary: { name: 'LEGENDARY', col: '#ffc83a', dup: 1500 },
  mythic: { name: 'MYTHIC', col: '#ff4b4b', dup: 4000 },
};
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];
const CATS = [
  { id: 'mochi', name: 'MOCHI', rarity: 'common', body: '#ff9f43', belly: '#ffe3bf', stripe: '#d9661a', ear: '#ffb8c9',
    ability: 'CLAW DASH', desc: 'Slash forward and up.', drag: 0.055, bounceMod: 0, scale: 1 },
  { id: 'socks', name: 'SOCKS', rarity: 'common', body: '#2e2a38', belly: '#ffffff', stripe: '#1e1b26', ear: '#ff9fbf', paw: '#ffffff',
    ability: 'DOUBLE JUMP', desc: 'Hop straight up. One extra use.', drag: 0.055, bounceMod: 0, scale: 0.95, extra: 1 },
  { id: 'chonk', name: 'CHONK', rarity: 'rare', body: '#a3adb9', belly: '#eef1f4', stripe: '#6f7a87', ear: '#ffb8c9',
    ability: 'BELLY FLOP', desc: 'Dive, then MEGA bounce. Smashes obstacles.', drag: 0.03, bounceMod: -0.05, scale: 1.18 },
  { id: 'floof', name: 'FLOOF', rarity: 'rare', body: '#fff1f6', belly: '#ffffff', stripe: '#f4a9c4', ear: '#ff9fbf',
    ability: 'PUFF GLIDE', desc: 'Puff up and float. Extra bouncy.', drag: 0.06, bounceMod: 0.05, scale: 1.08 },
  { id: 'zip', name: 'ZIP', rarity: 'epic', body: '#3d4160', belly: '#727aa3', stripe: '#262940', ear: '#ff8fae',
    ability: 'NINJA BLINK', desc: 'Teleport ahead through anything.', drag: 0.05, bounceMod: 0, scale: 1 },
  { id: 'sparky', name: 'SPARKY', rarity: 'epic', body: '#ffd23f', belly: '#fff6c2', stripe: '#ff8a1f', ear: '#ffb8c9',
    ability: 'FISH MAGNET', desc: 'Pulls every fish in. Each one gives a push.', drag: 0.05, bounceMod: 0, scale: 1 },
  { id: 'astro', name: 'ASTRO', rarity: 'legendary', body: '#e8edf5', belly: '#ffffff', stripe: '#3aa3ff', ear: '#ffb8c9',
    ability: 'JETPACK', desc: 'Long rocket burn straight ahead.', drag: 0.04, bounceMod: 0, scale: 1 },
  { id: 'ghost', name: 'GHOST', rarity: 'legendary', body: '#d8f0ff', belly: '#ffffff', stripe: '#a8d8ff', ear: '#ffd1e2',
    ability: 'PHANTOM', desc: 'Float and pass through hazards and holes.', drag: 0.045, bounceMod: 0.02, scale: 1, alpha: 0.72 },
  { id: 'blaze', name: 'BLAZE', rarity: 'mythic', body: '#ff5a1f', belly: '#ffd23f', stripe: '#b81d1d', ear: '#ffd23f',
    ability: 'PHOENIX RISE', desc: 'Fiery launch upward. Revives once from a crash or hole.', drag: 0.04, bounceMod: 0.03, scale: 1.05 },
];
const CAT_BY = Object.fromEntries(CATS.map(c => [c.id, c]));

// odds in percent, per rarity; inside a rarity every cat is equally likely
const BOXES = [
  { id: 'basic', name: 'CAT BOX', cost: 500, col: '#c9874f', lid: '#e8a868', odds: { common: 60, rare: 28, epic: 9, legendary: 2.7, mythic: 0.3 } },
  { id: 'super', name: 'SUPER BOX', cost: 1500, col: '#3aa3ff', lid: '#7fc6ff', odds: { common: 30, rare: 40, epic: 22, legendary: 7, mythic: 1 } },
  { id: 'legend', name: 'LEGEND BOX', cost: 5000, col: '#ffc83a', lid: '#fff09a', odds: { common: 0, rare: 0, epic: 60, legendary: 34, mythic: 6 } },
];

// ---------- cosmetic skins ----------
const SKINS = {
  hat: [
    { id: 'none', name: 'NO HAT', cost: 0 },
    { id: 'party', name: 'PARTY HAT', cost: 80 },
    { id: 'cap', name: 'BALL CAP', cost: 160 },
    { id: 'viking', name: 'VIKING', cost: 600 },
    { id: 'crown', name: 'ROYAL CROWN', cost: 0, req: { rank: 6 } },
    { id: 'astro', name: 'SPACE HELMET', cost: 0, req: { zone: 'moon' } },
  ],
  cannon: [
    { id: 'classic', name: 'CLASSIC', cost: 0 },
    { id: 'pirate', name: 'PIRATE', cost: 300 },
    { id: 'candy', name: 'CANDY', cost: 700 },
    { id: 'blaster', name: 'SPACE BLASTER', cost: 1500 },
    { id: 'gold', name: 'GOLDEN', cost: 0, req: { rank: 10 } },
  ],
  trail: [
    { id: 'none', name: 'NO TRAIL', cost: 0 },
    { id: 'stars', name: 'STARDUST', cost: 200 },
    { id: 'bubbles', name: 'BUBBLES', cost: 400 },
    { id: 'rainbow', name: 'RAINBOW', cost: 700 },
    { id: 'fire', name: 'FIRE', cost: 0, req: { rank: 4 } },
  ],
};
const SKIN_CATS = [['hat', 'HATS'], ['cannon', 'CANNONS'], ['trail', 'TRAILS']];
const CANNON_COL = {
  classic: { barrel: '#e8413c', band: '#ffc83a', rim: '#b62a2a', wood: '#9b5c34', wheel: '#7a4425' },
  pirate: { barrel: '#3a3d48', band: '#c7a14a', rim: '#24262e', wood: '#7a4a2a', wheel: '#5a3418' },
  candy: { barrel: '#ff7ab0', band: '#ffffff', rim: '#e0447f', wood: '#8fe3ff', wheel: '#ffd23f' },
  blaster: { barrel: '#7f8cff', band: '#3fffd5', rim: '#4a52c9', wood: '#3a3f5c', wheel: '#262940' },
  gold: { barrel: '#ffcf3a', band: '#fff3b0', rim: '#e09a00', wood: '#b8792e', wheel: '#8a5a1c' },
};
const TRAIL_COL = { stars: ['#ffd23f', '#ffffff'], bubbles: ['#bfe9ff', '#ffffff'], rainbow: ['#ff4b4b', '#ff8a1f', '#ffd23f', '#3fcf5c', '#3aa3ff', '#8f63ff'], fire: ['#ff4b1f', '#ffb02e', '#ffe14a'] };

// ---------- upgrades (stronger per level) ----------
function launchSpeed(lv) { return 700 + 105 * lv; }
function chargesFor(lv, catId) { return 1 + lv + ((catId && CAT_BY[catId].extra) || 0); }
function bounceFor(lv, catId) { return clamp(0.42 + 0.05 * lv + CAT_BY[catId].bounceMod, 0.3, 0.86); }
function luckMult(lv) { return 1 + 0.2 * lv; }
function magnetR(lv) { return 40 + 38 * lv; }
const UPS = [
  { id: 'power', name: 'CANNON POWER', max: 12, base: 45, grow: 1.7, color: '--red', desc: 'Faster launch.',
    stat: lv => `${Math.round(launchSpeed(lv) / 10)} km/h`,
    icon: '<svg viewBox="0 0 48 48"><circle cx="16" cy="34" r="8"/><path d="M12 28 L36 12 L42 20 L18 36 Z"/><path d="M38 9l5-3M43 15l4 0M41 22l4 2" fill="none"/></svg>' },
  { id: 'charges', name: 'EXTRA CLAWS', max: 4, base: 150, grow: 2.4, color: '--pink', desc: 'More ability uses.',
    stat: lv => `${chargesFor(lv)} uses`,
    icon: '<svg viewBox="0 0 48 48"><path d="M10 38C16 26 18 18 16 8M22 40C28 28 30 18 28 8M34 38C40 28 41 20 39 12" fill="none" stroke-width="5"/></svg>' },
  { id: 'spring', name: 'SPRINGY TAIL', max: 8, base: 70, grow: 1.8, color: '--green', desc: 'Bigger bounces.',
    stat: lv => `${Math.round(bounceFor(lv, 'mochi') * 100)}% bounce`,
    icon: '<svg viewBox="0 0 48 48"><path d="M10 40h28M14 34l20-5-20-5 20-5-20-5 20-5" fill="none" stroke-width="4"/><rect x="10" y="4" width="28" height="6" rx="3"/></svg>' },
  { id: 'luck', name: 'LUCKY COLLAR', max: 8, base: 90, grow: 1.85, color: '--yellow', desc: 'More coins.',
    stat: lv => `x${luckMult(lv).toFixed(2)} coins`,
    icon: '<svg viewBox="0 0 48 48"><path d="M6 14c10 8 26 8 36 0" fill="none" stroke-width="6"/><circle cx="24" cy="30" r="10"/><path d="M24 25v10M20 30h8" fill="none"/></svg>' },
  { id: 'magnet', name: 'FISH MAGNET', max: 6, base: 130, grow: 2.0, color: '--blue', desc: 'Pull fish from afar.',
    stat: lv => `${Math.round(magnetR(lv) / PX_PER_M)}m reach`,
    icon: '<svg viewBox="0 0 48 48"><path d="M12 8v16a12 12 0 0 0 24 0V8h-8v16a4 4 0 0 1-8 0V8z"/><path d="M12 8h8v6h-8zM28 8h8v6h-8z" fill="#ff4b4b"/></svg>' },
];
function upCost(u, lv) { return Math.round(u.base * Math.pow(u.grow || 1.7, lv) / 5) * 5; }

const MEDALS = [100, 500, 2000];

// ---------- missions ----------
const MTYPES = [
  { t: 'dist', run: true, label: g => `Fly ${g}m in one launch`, goal: L => Math.round((100 + L * 60) / 10) * 10 },
  { t: 'fish', run: true, label: g => `Catch ${g} fish in one launch`, goal: L => 5 + L * 2 },
  { t: 'fishT', run: false, label: g => `Catch ${g} fish in total`, goal: L => 25 + L * 15 },
  { t: 'pop', run: false, label: g => `Pop ${g} balloons`, goal: L => 2 + L },
  { t: 'bounce', run: true, label: g => `Bounce ${g} times in one launch`, goal: L => 1 + Math.floor(L / 2) },
  { t: 'perfect', run: false, label: g => `Get ${g} PERFECT launches`, goal: L => 2 + Math.floor(L / 3) },
  { t: 'ability', run: true, label: g => `Use your ability ${g}x in one launch`, goal: L => Math.min(1 + Math.floor(L / 4), chargesFor(S.up.charges)) },
  { t: 'smash', run: false, label: g => `Crash into ${g} obstacles`, goal: L => 2 + L },
  { t: 'height', run: true, label: g => `Fly ${g}m high`, goal: L => 25 + L * 10 },
  { t: 'bird', run: false, label: g => `Bounce off ${g} birds`, goal: L => 2 + L },
  { t: 'zone', run: true, label: g => `Reach ${ZONES[g].name}`, goal: () => Math.min(ZONES.length - 1, (S.zones || 1)) },
];
const MTYPE_BY = Object.fromEntries(MTYPES.map(m => [m.t, m]));
function missionReward(L) { return 50 + L * 30; }
function rankOf(done) { return 1 + Math.floor(done / 3); }

const CLAW_SVG = '<svg viewBox="0 0 24 24"><path d="M5 20C8 14 9 9 8 4M11 21C14 15 15 10 14 5M17 20C19.5 15 20 11 19 7"/></svg>';
const VIDEO_SVG = '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="14" height="14" rx="3"/><path d="M16 10l6-3v10l-6-3z"/></svg>';
const ADMIN_CODE = 'ezwin';
