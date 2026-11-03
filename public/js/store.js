// Storage layer. Uses Firebase Firestore when firebase-config.js is filled in,
// otherwise falls back to localStorage so the game is fully playable offline/dev.
import { firebaseConfig } from './firebase-config.js';

const USE_FIREBASE = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');
const LS_KEY = 'pirate_wars_players';
let db = null;

if (USE_FIREBASE) {
  try {
    const [{ initializeApp }, firestore, analyticsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js'),
    ]);
    const app = initializeApp(firebaseConfig);
    db = firestore.getFirestore(app);
    try { analyticsMod.getAnalytics(app); } catch (e) { /* analytics optional */ }
    window.__fs = firestore; // helpers below
  } catch (e) {
    console.warn('Firebase init failed, using localStorage fallback.', e);
    db = null;
  }
}

export function usingFirebase() { return !!db; }

// ---------- helpers ----------
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function defaultPlayer(name) {
  return {
    code: genCode(),
    name: name || 'Player_' + Math.floor(Math.random() * 1000),
    level: 1,
    xp: 0,
    gold: 500,
    diamonds: 10,
    petroleum: 100,
    owned: { gunboat: 1 },   // shipId -> upgrade level
    selected: 'gunboat',
    tasks: {},                // taskId -> { progress, claimed }
    stats: { kills: 0, wins: 0, battles: 0 },
  };
}

function xpToLevel(xp) { return Math.floor(xp / 100) + 1; }

function normalize(p) { return { ...defaultPlayer(''), ...p, stats: { kills: 0, wins: 0, battles: 0, ...(p.stats || {}) }, owned: { gunboat: 1, ...(p.owned || {}) }, tasks: p.tasks || {} }; }

// ---------- localStorage implementation ----------
function lsAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function lsSaveAll(all) { localStorage.setItem(LS_KEY, JSON.stringify(all)); }

// ---------- public API (same signatures for both backends) ----------
export async function ensurePlayer() {
  let code = localStorage.getItem('pirate_wars_code');
  if (!code) {
    const p = defaultPlayer();
    code = p.code;
    if (db) {
      const { doc, setDoc } = window.__fs;
      await setDoc(doc(db, 'players', code), p);
    } else {
      const all = lsAll(); all[code] = p; lsSaveAll(all);
    }
    localStorage.setItem('pirate_wars_code', code);
  }
  return getPlayer(code);
}

export async function getCurrentCode() {
  return localStorage.getItem('pirate_wars_code');
}

export async function getPlayer(code) {
  if (!code) return null;
  if (db) {
    const { doc, getDoc } = window.__fs;
    const snap = await getDoc(doc(db, 'players', code));
    return snap.exists() ? normalize({ code, ...snap.data() }) : null;
  }
  const p = lsAll()[code];
  return p ? normalize(p) : null;
}

export async function createPlayer(name) {
  const p = defaultPlayer(name);
  if (db) {
    const { doc, setDoc } = window.__fs;
    await setDoc(doc(db, 'players', p.code), p);
  } else {
    const all = lsAll(); all[p.code] = p; lsSaveAll(all);
  }
  localStorage.setItem('pirate_wars_code', p.code);
  return p;
}

export async function savePlayer(p) {
  p.level = xpToLevel(p.xp);
  if (db) {
    const { doc, setDoc } = window.__fs;
    await setDoc(doc(db, 'players', p.code), p);
  } else {
    const all = lsAll(); all[p.code] = p; lsSaveAll(all);
  }
  return p;
}

export async function searchByCode(code) {
  return getPlayer(String(code || '').trim().toUpperCase());
}

export async function addRewards(code, { gold = 0, diamonds = 0, petroleum = 0, xp = 0 }) {
  const p = await getPlayer(code);
  if (!p) return null;
  p.gold += gold; p.diamonds += diamonds; p.petroleum = Math.max(0, Math.min(100, p.petroleum + petroleum));
  p.xp += xp; p.level = xpToLevel(p.xp);
  return savePlayer(p);
}

export async function recordBattle(code, { won, kills }) {
  const p = await getPlayer(code);
  if (!p) return null;
  p.stats.battles += 1;
  p.stats.kills += kills;
  if (won) p.stats.wins += 1;
  return savePlayer(p);
}

export async function addTaskProgress(code, taskId, amount = 1) {
  const p = await getPlayer(code);
  if (!p) return null;
  const t = p.tasks[taskId] || { progress: 0, claimed: false };
  if (!t.claimed) t.progress += amount;
  p.tasks[taskId] = t;
  return savePlayer(p);
}

export async function claimTask(code, taskId) {
  const p = await getPlayer(code);
  if (!p) return null;
  const t = p.tasks[taskId];
  if (!t || t.claimed) return p;
  t.claimed = true;
  p.tasks[taskId] = t;
  return savePlayer(p);
}
