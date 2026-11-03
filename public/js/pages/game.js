// Game page — top-down naval battle like the reference image.
// Joystick (drag) to move; skill buttons bottom-right.
// Permanent skills: common attack (single bomb) + shield — neither uses petroleum.
// Ship skills come from js/ships/<ship>.js and may be targetable (tap button, then tap map).
import { getPlayer, getCurrentCode, addRewards, recordBattle, addTaskProgress } from '../store.js';
import { shipById, mapById, levelById, LEVELS } from '../registry.js';
import { navigate } from '../app.js';

let raf = null, running = false;
let G = null; // game state

export function cleanup() { running = false; if (raf) cancelAnimationFrame(raf); }

export function render(app) {
  app.innerHTML = `
    <canvas id="gameCanvas"></canvas>

    <div class="hud-top-left">
      <div class="bar hp-bar"><div class="fill" id="hpFill"></div></div>
      <div class="bar petro-bar"><div class="fill" id="petroFill"></div></div>
    </div>

    <div class="hud-top-center">
      <div class="hud-pill" id="shipsLeft">SHIPS: 0/0</div>
      <div class="hud-pill timer" id="timer">00:00</div>
      <div class="hud-pill level" id="levelName"></div>
    </div>

    <canvas class="radar" id="radar" width="130" height="130"></canvas>

    <div class="joystick" id="joystick"><div class="stick" id="stick"></div></div>

    <div class="skills" id="skills"></div>
    <div class="target-hint hidden" id="targetHint">Tap the map to set target…</div>

    <div class="rotate-overlay hidden" id="rotateOverlay">
      <div class="rotate-box">
        <div class="rotate-icon">📱⟳</div>
        <h2>Rotate your device</h2>
        <p>Pirate Wars is played in landscape mode</p>
      </div>
    </div>
  `;

  bindOrientationGuard();
  start(app);
}

// The game must be played in landscape — block portrait play and refit the HUD.
function bindOrientationGuard() {
  const overlay = document.getElementById('rotateOverlay');
  const check = () => {
    const portrait = window.innerHeight > window.innerWidth;
    overlay.classList.toggle('hidden', !portrait);
    document.body.classList.toggle('portrait-block', portrait);
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', check);
  }
  check();
}

async function start(app) {
  const code = await getCurrentCode();
  const player = await getPlayer(code);
  const ship = shipById(player.selected) || shipById('gunboat');
  const lvl = levelById('level1');
  const map = mapById(lvl.mapId);

  document.getElementById('levelName').textContent = lvl.name;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const radar = document.getElementById('radar').getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const lvlBonus = (player.owned[ship.id] || 1) - 1;

  G = {
    code, ship, map, lvl, player,
    canvas, ctx, radar,
    w: map.width, h: map.height,
    cam: { x: 0, y: 0 },
    playerEnt: {
      x: map.width / 2, y: map.height / 2, angle: -Math.PI / 2,
      hp: ship.hp + lvlBonus * 40, maxHp: ship.hp + lvlBonus * 40,
      speed: ship.speed, petro: ship.petroleum, maxPetro: ship.petroleum,
      shield: 0, armor: 0, boost: 0, vx: 0, vy: 0,
    },
    enemies: [], bombs: [], particles: [], floaters: [],
    spawned: 0, kills: 0, elapsed: 0, rampLevel: 1,
    joy: { active: false, id: null, dx: 0, dy: 0 },
    armedSkill: null,
    cd: { attack: 0, shield: 0, s1: 0, s2: 0 },
    over: false,
    power: 1 + lvlBonus * 0.15, // +15% skill damage per upgrade level
  };

  buildSkillButtons();
  bindJoystick();
  running = true;
  let last = performance.now();
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
}

// ---------------- skills ----------------
function buildSkillButtons() {
  const el = document.getElementById('skills');
  const defs = [
    { id: 'attack', name: '💣 Attack', cost: 0, cd: 0.9, desc: 'Single bomb' },
    { id: 'shield', name: '🛡 Shield', cost: 0, cd: 12, desc: '4s invulnerable' },
    ...G.ship.skills.map((s, i) => ({ id: 's' + (i + 1), name: '⭐ ' + s.name, cost: s.cost, cd: s.cooldown, targetable: s.targetable })),
  ];
  el.innerHTML = defs.map(d => `
    <button class="skill-btn" data-skill="${d.id}" title="${d.desc}">
      <span class="skill-icon">${d.name}</span>
      <span class="skill-cd"></span>
    </button>`).join('');
  el.querySelectorAll('.skill-btn').forEach(b => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); useSkill(b.dataset.skill); });
  });
  G.skillDefs = defs;
}

function useSkill(id) {
  if (G.over) return;
  const def = G.skillDefs.find(d => d.id === id);
  const p = G.playerEnt;
  if (G.cd[id] > 0) return;
  if (def.cost > 0 && p.petro < def.cost) { floatText(p.x, p.y - 30, 'No petroleum!', '#ff8a80'); return; }

  if (def.targetable) {
    G.armedSkill = (G.armedSkill === id) ? null : id;
    document.getElementById('targetHint').classList.toggle('hidden', G.armedSkill !== id);
    return;
  }
  fireSkill(id, p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40);
}

function fireSkill(id, tx, ty) {
  const p = G.playerEnt;
  const def = G.skillDefs.find(d => d.id === id);
  G.cd[id] = def.cd;
  if (def.cost > 0) p.petro = Math.max(0, p.petro - def.cost);

  if (id === 'attack') {
    bombs.push(mkBomb(p.x, p.y, p.angle, 520, 25, 'player'));
  } else if (id === 'shield') {
    p.shield = 4;
  } else if (id === 's1') {
    const s = G.ship.skills[0].id;
    if (s === 'spread') for (let i = -1; i <= 1; i++) bombs.push(mkBomb(p.x, p.y, p.angle + i * 0.25, 520, 25, 'player'));
    else if (s === 'barrage') for (let i = 0; i < 5; i++) bombs.push(mkBomb(tx + (Math.random() - 0.5) * 90, ty + (Math.random() - 0.5) * 90, -Math.PI / 2, 300, 30, 'player', 60));
    else if (s === 'carpet') bombs.push(mkBomb(tx, ty, 0, 0, 90, 'player', 0, 130));
  } else if (id === 's2') {
    const s = G.ship.skills[1].id;
    if (s === 'boost') p.boost = 4;
    else if (s === 'repair') { p.hp = Math.min(p.maxHp, p.hp + 40); floatText(p.x, p.y - 30, '+40 HP', '#69f0ae'); }
    else if (s === 'armor') p.armor = 6;
  }
}

function mkBomb(x, y, angle, speed, dmg, owner, delay = 0, aoe = 0) {
  return { x, y, angle, speed, dmg, owner, delay, aoe, life: 4 };
}

// ---------------- input: joystick + target taps ----------------
function bindJoystick() {
  const joy = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  const R = 46;

  function setStick(dx, dy) {
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  joy.addEventListener('pointerdown', (e) => {
    G.joy.active = true; G.joy.id = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    move(e);
  });
  joy.addEventListener('pointermove', (e) => { if (G.joy.active && e.pointerId === G.joy.id) move(e); });
  function end(e) {
    if (e.pointerId !== G.joy.id) return;
    G.joy.active = false; G.joy.dx = 0; G.joy.dy = 0; setStick(0, 0);
  }
  joy.addEventListener('pointerup', end);
  joy.addEventListener('pointercancel', end);

  function move(e) {
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = dx / len * R; dy = dy / len * R; }
    setStick(dx, dy);
    G.joy.dx = dx / R; G.joy.dy = dy / R;
  }

  // taps on the water = target for armed skill
  G.canvas.addEventListener('pointerdown', (e) => {
    if (!G.armedSkill) return;
    const wx = G.cam.x + e.clientX, wy = G.cam.y + e.clientY;
    fireSkill(G.armedSkill, wx, wy);
    G.armedSkill = null;
    document.getElementById('targetHint').classList.add('hidden');
  });
}

// ---------------- update ----------------
function update(dt) {
  const p = G.playerEnt, lvl = G.lvl;
  G.elapsed += dt;

  // difficulty ramp: AI gets harder over time
  const newRamp = 1 + Math.floor(G.elapsed / lvl.rampSeconds);
  if (newRamp > G.rampLevel) G.rampLevel = newRamp;

  // movement
  const spd = p.speed * (p.boost > 0 ? 2 : 1);
  p.vx = G.joy.dx * spd; p.vy = G.joy.dy * spd;
  p.x = clamp(p.x + p.vx * dt, 30, G.w - 30);
  p.y = clamp(p.y + p.vy * dt, 30, G.h - 30);
  if (Math.hypot(p.vx, p.vy) > 10) p.angle = Math.atan2(p.vy, p.vx);
  // island collision
  for (const isl of G.map.islands) {
    const d = Math.hypot(p.x - isl.x, p.y - isl.y);
    if (d < isl.r + 26) {
      const a = Math.atan2(p.y - isl.y, p.x - isl.x);
      p.x = isl.x + Math.cos(a) * (isl.r + 26);
      p.y = isl.y + Math.sin(a) * (isl.r + 26);
    }
  }

  // regen + timers
  p.petro = Math.min(p.maxPetro, p.petro + 2 * dt);
  if (p.shield > 0) p.shield -= dt;
  if (p.armor > 0) p.armor -= dt;
  if (p.boost > 0) p.boost -= dt;
  for (const k in G.cd) G.cd[k] = Math.max(0, G.cd[k] - dt);

  // spawn enemies (non-stop until enemyCount reached)
  if (G.spawned < lvl.enemyCount && G.elapsed > G.spawned * (lvl.spawnInterval / Math.pow(lvl.ramp.count, G.rampLevel - 1))) {
    spawnEnemy();
  }

  // enemies AI
  for (const e of G.enemies) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const sp = e.speed * Math.pow(lvl.ramp.speed, G.rampLevel - 1);
    e.x += Math.cos(a) * sp * dt;
    e.y += Math.sin(a) * sp * dt;
    e.angle = a;
    e.fire -= dt;
    if (e.fire <= 0) {
      e.fire = lvl.enemyFireInterval / Math.pow(lvl.ramp.fireRate, G.rampLevel - 1);
      bombs.push(mkBomb(e.x, e.y, a, 380, 12, 'enemy'));
    }
  }

  // bombs
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    if (b.delay > 0) { b.delay -= dt; continue; }
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    let hit = false;
    if (b.owner === 'player') {
      for (const e of G.enemies) {
        if (Math.hypot(b.x - e.x, b.y - e.y) < 26 + (b.aoe || 0)) { damageEnemy(e, b.dmg); hit = true; break; }
      }
    } else {
      if (p.shield <= 0 && Math.hypot(b.x - p.x, b.y - p.y) < 26) {
        const dmg = p.armor > 0 ? b.dmg / 2 : b.dmg;
        p.hp -= dmg; hit = true;
        floatText(p.x, p.y - 30, '-' + Math.round(dmg), '#ff8a80');
      }
    }
    if (hit || b.life <= 0 || b.x < 0 || b.y < 0 || b.x > G.w || b.y > G.h) {
      explode(b.x, b.y, b.aoe || 40);
      bombs.splice(i, 1);
    }
  }

  // particles / floaters
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const q = G.particles[i];
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
    if (q.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.y -= 40 * dt; f.life -= dt;
    if (f.life <= 0) G.floaters.splice(i, 1);
  }

  // camera follows player
  G.cam.x = clamp(p.x - G.canvas.width / 2, 0, Math.max(0, G.w - G.canvas.width));
  G.cam.y = clamp(p.y - G.canvas.height / 2, 0, Math.max(0, G.h - G.canvas.height));

  updateHud();
  checkEnd();
}

function spawnEnemy() {
  const lvl = G.lvl;
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = 60; y = Math.random() * G.h; }
  else if (edge === 1) { x = G.w - 60; y = Math.random() * G.h; }
  else if (edge === 2) { x = Math.random() * G.w; y = 60; }
  else { x = Math.random() * G.w; y = G.h - 60; }
  G.enemies.push({
    x, y, angle: 0,
    hp: lvl.enemyHp * Math.pow(lvl.ramp.hp, G.rampLevel - 1),
    maxHp: lvl.enemyHp * Math.pow(lvl.ramp.hp, G.rampLevel - 1),
    speed: lvl.enemySpeed, fire: 1.5,
  });
  G.spawned++;
}

async function damageEnemy(e, dmg) {
  e.hp -= dmg;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    G.kills++;
    explode(e.x, e.y, 70);
    floatText(e.x, e.y - 30, 'CRITICAL!', '#ffd54a');
    const gold = 50 + Math.floor(Math.random() * 100);
    const diamonds = Math.random() < 0.3 ? 1 : 0;
    const petro = 15 + Math.floor(Math.random() * 25);
    await addRewards(G.code, { gold, diamonds, petroleum: petro, xp: 20 });
    await addTaskProgress(G.code, 'kill3'); await addTaskProgress(G.code, 'kill10');
    G.playerEnt.petro = Math.min(G.playerEnt.maxPetro, G.playerEnt.petro + petro);
    floatText(e.x, e.y + 10, `+${gold} 💰 ${diamonds ? '+' + diamonds + ' ◆' : ''} +${petro} 🛢`, '#a5e88b');
    G.enemies.splice(G.enemies.indexOf(e), 1);
  }
}

function explode(x, y, r) {
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, r: r / 8 });
  }
}

function floatText(x, y, txt, color) { G.floaters.push({ x, y, txt, color, life: 1.2 }); }

// ---------------- draw ----------------
function draw() {
  const { ctx, canvas, cam } = G;
  // water
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, G.map.water[0]); g.addColorStop(1, G.map.water[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // islands
  for (const isl of G.map.islands) {
    ctx.fillStyle = '#c2a06b';
    ctx.beginPath(); ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.arc(isl.x - isl.r * 0.2, isl.y - isl.r * 0.2, isl.r * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  // bombs
  for (const b of bombs) {
    ctx.fillStyle = b.owner === 'player' ? '#ffb300' : '#ff5252';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.aoe ? 8 : 5, 0, Math.PI * 2); ctx.fill();
  }

  // enemies
  for (const e of G.enemies) {
    drawShipShape(ctx, e.x, e.y, e.angle, '#7a2e2e', '#4a1a1a', 30);
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x - 20, e.y - 34, 40, 5);
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(e.x - 20, e.y - 34, 40 * (e.hp / e.maxHp), 5);
  }

  // player
  const p = G.playerEnt;
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(77,216,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 36, 0, Math.PI * 2); ctx.stroke();
  }
  G.ship.draw(ctx, p.x, p.y, 1, p.angle);

  // particles
  for (const q of G.particles) {
    ctx.fillStyle = `rgba(255,${140 + Math.floor(q.life * 100)},40,${Math.min(1, q.life * 2)})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
  }
  // floating texts
  ctx.font = 'bold 16px Arial';
  for (const f of G.floaters) {
    ctx.fillStyle = f.color;
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillText(f.txt, f.x - 30, f.y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawRadar();
}

function drawShipShape(ctx, x, y, angle, color, hull, size) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(size, 0); ctx.quadraticCurveTo(size * 0.4, size * 0.45, -size * 0.7, size * 0.4);
  ctx.lineTo(-size * 0.8, 0); ctx.lineTo(-size * 0.7, -size * 0.4);
  ctx.quadraticCurveTo(size * 0.4, -size * 0.45, size, 0);
  ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(-size * 0.5, -size * 0.28, size * 0.9, size * 0.56);
  ctx.restore();
}

function drawRadar() {
  const r = G.radar, s = 130;
  r.clearRect(0, 0, s, s);
  r.fillStyle = 'rgba(4,18,31,0.75)';
  r.beginPath(); r.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); r.fill();
  const k = (s - 8) / Math.max(G.w, G.h);
  r.fillStyle = '#c2a06b';
  for (const isl of G.map.islands) { r.beginPath(); r.arc(4 + isl.x * k, 4 + isl.y * k, 3, 0, Math.PI * 2); r.fill(); }
  r.fillStyle = '#ff5252';
  for (const e of G.enemies) { r.beginPath(); r.arc(4 + e.x * k, 4 + e.y * k, 3, 0, Math.PI * 2); r.fill(); }
  r.fillStyle = '#4dd8ff';
  const p = G.playerEnt;
  r.beginPath(); r.arc(4 + p.x * k, 4 + p.y * k, 4, 0, Math.PI * 2); r.fill();
}

// ---------------- HUD & end ----------------
function updateHud() {
  const p = G.playerEnt;
  document.getElementById('hpFill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
  document.getElementById('petroFill').style.width = (p.petro / p.maxPetro * 100) + '%';
  document.getElementById('shipsLeft').textContent = `SHIPS: ${G.kills}/${G.lvl.enemyCount}`;
  const t = Math.floor(G.elapsed);
  document.getElementById('timer').textContent =
    String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  document.querySelectorAll('.skill-btn').forEach(b => {
    const id = b.dataset.skill;
    const cd = G.cd[id] || 0;
    const overlay = b.querySelector('.skill-cd');
    overlay.textContent = cd > 0 ? cd.toFixed(1) + 's' : '';
    const def = G.skillDefs.find(d => d.id === id);
    b.classList.toggle('armed', G.armedSkill === id);
    b.classList.toggle('no-petro', def.cost > 0 && p.petro < def.cost);
  });
}

async function checkEnd() {
  if (G.over) return;
  const p = G.playerEnt;
  if (p.hp <= 0) { G.over = true; await endBattle(false); }
  else if (G.kills >= G.lvl.enemyCount && G.enemies.length === 0) { G.over = true; await endBattle(true); }
}

async function endBattle(won) {
  running = false;
  await recordBattle(G.code, { won, kills: G.kills });
  if (won) {
    await addRewards(G.code, G.lvl.rewards);
    await addTaskProgress(G.code, 'win1'); await addTaskProgress(G.code, 'play3');
  } else {
    await addTaskProgress(G.code, 'play3');
  }
  const r = won ? G.lvl.rewards : {};
  const app = document.getElementById('app');
  const overlay = document.createElement('div');
  overlay.className = 'end-overlay';
  overlay.innerHTML = `
    <div class="panel end-box">
      <h1>${won ? '🏆 VICTORY!' : '💀 DEFEAT'}</h1>
      <p>${won ? `Bonus: +${r.gold || 0} 💰 +${r.diamonds || 0} ◆ +${r.petroleum || 0} 🛢` : 'Your ship was sunk…'}</p>
      <button class="btn gold" id="btnAgain">Play Again</button>
      <button class="btn" id="btnHome">Main Menu</button>
    </div>`;
  app.appendChild(overlay);
  overlay.querySelector('#btnAgain').onclick = () => { overlay.remove(); start(app); };
  overlay.querySelector('#btnHome').onclick = () => navigate('main');
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
