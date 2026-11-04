// Run with: node --experimental-vm-modules --test tests/loading.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function synthetic(context, exports) {
  return new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
}

function storage() {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

async function loadStore(localStorage, mode) {
  const cloud = mode.cloud || new Map();
  const context = vm.createContext({ localStorage, window: {}, console: { warn() {} },
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 10)), clearTimeout });
  const config = synthetic(context, { firebaseConfig: { apiKey: 'test' } });
  const firebase = synthetic(context, { initializeApp: () => ({}) });
  const firestore = synthetic(context, {
    getFirestore: () => ({}), doc: (_, __, code) => code,
    setDoc: async (code, p) => { if (mode.hangWrites) return new Promise(() => {}); cloud.set(code, structuredClone(p)); },
    getDoc: async code => ({ exists: () => cloud.has(code), data: () => cloud.get(code) }),
  });
  const module = new vm.SourceTextModule(fs.readFileSync('public/js/store.js', 'utf8'), {
    context, importModuleDynamically: async specifier => {
      if (mode.hangSdk) return new Promise(() => {});
      const mod = specifier.includes('firebase-app') ? firebase : firestore;
      if (mod.status === 'unlinked') await mod.link(() => {});
      if (mod.status === 'linked') await mod.evaluate();
      return mod;
    },
  });
  await module.link(() => config);
  await module.evaluate();
  return module.namespace;
}

test('a stalled Firebase SDK does not block startup', async () => {
  const store = await loadStore(storage(), { hangSdk: true });
  const p = await store.ensurePlayer();
  assert.equal(p.selected, 'gunboat');
  assert.equal(store.usingFirebase(), false);
});

test('offline writes are cached and sync when Firebase becomes available', async () => {
  const local = storage(), cloud = new Map();
  const offline = await loadStore(local, { hangWrites: true, cloud });
  const p = await offline.ensurePlayer();
  p.gold = 777;
  await offline.savePlayer(p);
  assert.equal((await offline.getPlayer(p.code)).gold, 777);
  const online = await loadStore(local, { cloud });
  assert.equal((await online.ensurePlayer()).gold, 777);
  assert.equal(cloud.get(p.code).gold, 777);
});

test('the game runs frames and fires a bomb without crashing', async () => {
  const elements = new Map(), frames = [];
  const ctx = new Proxy({}, { get: (_, prop) => prop === 'createLinearGradient'
    ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  function element(id) {
    if (!elements.has(id)) elements.set(id, { id, style: {}, classList: { toggle() {}, add() {} },
      addEventListener(type, fn) { this[type] = fn; }, getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      querySelectorAll: () => [], setPointerCapture() {} });
    return elements.get(id);
  }
  const buttons = ['attack', 'shield', 's1', 's2'].map(id => ({ dataset: { skill: id },
    addEventListener(type, fn) { this[type] = fn; }, querySelector: () => ({}),
    classList: { toggle() {} } }));
  element('skills').querySelectorAll = () => buttons;
  const document = { body: { classList: { toggle() {}, remove() {} } }, getElementById: element,
    querySelectorAll: () => buttons };
  const window = { innerWidth: 800, innerHeight: 600, addEventListener() {}, removeEventListener() {} };
  const context = vm.createContext({ document, window, screen: {}, performance: { now: () => 0 },
    requestAnimationFrame: fn => { frames.push(fn); return frames.length; }, cancelAnimationFrame() {}, console });
  const player = { selected: 'gunboat', owned: { gunboat: 1 } };
  const ship = { id: 'gunboat', hp: 100, speed: 100, petroleum: 100, skills: [
    { id: 'spread', cost: 1, cooldown: 1 }, { id: 'boost', cost: 1, cooldown: 1 }], draw() {} };
  const level = { name: 'Test', mapId: 'map', enemyCount: 1, spawnInterval: 1, rampSeconds: 60,
    ramp: { count: 1, speed: 1, fireRate: 1, hp: 1 }, enemyHp: 100, enemySpeed: 10, enemyFireInterval: 1 };
  const map = { width: 2000, height: 2000, water: ['blue', 'blue'], islands: [] };
  const mocks = {
    '../store.js': { getPlayer: async () => player, getCurrentCode: async () => 'CODE', addRewards: async () => {}, recordBattle: async () => {}, addTaskProgress: async () => {} },
    '../registry.js': { shipById: () => ship, mapById: () => map, levelById: () => level, LEVELS: [level] },
    '../app.js': { navigate() {} },
  };
  const module = new vm.SourceTextModule(fs.readFileSync('public/js/pages/game.js', 'utf8'), { context });
  await module.link(specifier => synthetic(context, mocks[specifier]));
  await module.evaluate();
  await module.namespace.render({ innerHTML: '' });
  frames.shift()(16);
  buttons[0].pointerdown({ preventDefault() {} });
  for (let i = 2; i < 45; i++) frames.shift()(i * 50);
  assert.ok(frames.length, 'game loop should continue after firing and enemy attacks');
  module.namespace.cleanup();
});
