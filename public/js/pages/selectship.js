// Select Ship page — lists all ships (owned / not owned), buy, upgrade, select.
// Shows each ship's skills and movement speed. Ship data lives in js/ships/*.
import { getPlayer, getCurrentCode, savePlayer } from '../store.js';
import { SHIPS } from '../registry.js';
import { navigate } from '../app.js';

export function render(app) {
  app.innerHTML = `
    <div class="ocean-bg"></div>
    <button class="back-btn" id="btnBack">← Back</button>
    <div class="ship-page-wrap">
      <h2 class="page-title">⛵ Select Ship</h2>
      <div class="ship-grid" id="shipGrid"></div>
    </div>
  `;
  document.getElementById('btnBack').onclick = () => navigate('main');
  loadShips();
}

async function loadShips() {
  const code = await getCurrentCode();
  const p = await getPlayer(code);
  const grid = document.getElementById('shipGrid');

  grid.innerHTML = SHIPS.map(s => {
    const owned = !!p.owned[s.id];
    const lvl = p.owned[s.id] || 0;
    const selected = p.selected === s.id;
    const upgradeCost = owned ? Math.round(s.price * 0.6 + lvl * 500) || 500 : null;
    return `
      <div class="ship-card panel ${selected ? 'selected' : ''}">
        <canvas class="ship-img" data-ship="${s.id}" width="220" height="120"></canvas>
        <div class="ship-name">${s.name} ${owned ? '<span class="lv">Lv ' + lvl + '</span>' : ''}</div>
        <div class="ship-stats">
          <span>❤ ${s.hp + lvl * 40}</span>
          <span>⚡ Speed ${s.speed}</span>
          <span>🛢 ${s.petroleum}</span>
        </div>
        <div class="ship-skills">
          ${s.skills.map(k => `<div class="skill-line">• <b>${k.name}</b> — ${k.desc}</div>`).join('')}
        </div>
        <div class="ship-actions">
          ${!owned
            ? `<button class="btn gold buy-btn" data-ship="${s.id}" data-cost="${s.price}">Buy 💰${s.price}</button>`
            : `<button class="btn upgrade-btn" data-ship="${s.id}">Upgrade 💰${upgradeCost}</button>`}
          ${owned
            ? `<button class="btn select-btn ${selected ? 'disabled' : ''}" data-ship="${s.id}">${selected ? 'Selected ✓' : 'Select'}</button>`
            : ''}
        </div>
      </div>`;
  }).join('');

  // draw each ship preview
  grid.querySelectorAll('canvas.ship-img').forEach(c => {
    const s = SHIPS.find(x => x.id === c.dataset.ship);
    s.draw(c.getContext('2d'), 110, 60, 1.1, -0.2);
  });

  grid.querySelectorAll('.buy-btn').forEach(b => b.onclick = async () => {
    const s = SHIPS.find(x => x.id === b.dataset.ship);
    if (p.gold < s.price) return alert('Not enough gold!');
    p.gold -= s.price; p.owned[s.id] = 1; p.selected = s.id;
    await savePlayer(p); loadShips();
  });
  grid.querySelectorAll('.upgrade-btn').forEach(b => b.onclick = async () => {
    const s = SHIPS.find(x => x.id === b.dataset.ship);
    const cost = Math.round(s.price * 0.6 + p.owned[s.id] * 500) || 500;
    if (p.gold < cost) return alert('Not enough gold!');
    p.gold -= cost; p.owned[s.id] += 1;
    await savePlayer(p); loadShips();
  });
  grid.querySelectorAll('.select-btn').forEach(b => b.onclick = async () => {
    p.selected = b.dataset.ship;
    await savePlayer(p); loadShips();
  });
}
