// Level 1 — one file per level. Difficulty ramps up over time inside the level.
export default {
  id: 'level1',
  name: 'Level 1 — First Blood',
  mapId: 'map1',
  enemyCount: 3,          // total enemies to defeat
  spawnInterval: 6,       // seconds between spawns (decreases over time)
  rampSeconds: 30,        // every 30s the AI gets harder
  ramp: { hp: 1.25, speed: 1.12, fireRate: 1.2, count: 1 },
  enemyHp: 60,
  enemySpeed: 120,
  enemyFireInterval: 2.4,
  rewards: { gold: 150, diamonds: 2, petroleum: 30, xp: 60 }, // win bonus
};
