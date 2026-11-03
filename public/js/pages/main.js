// Main page — edit this file (and css/pages/main.css) to change only this page.
import { getPlayer, getCurrentCode } from '../store.js';
import { shipById } from '../registry.js';
import { navigate } from '../app.js';

export function render(app) {
  app.innerHTML = `
    <div class="ocean-bg"></div>

    <button class="account-btn panel" id="btnAccount">
      <div class="avatar">☠</div>
      <div class="acct-info">
        <div class="acct-name" id="acctName">…</div>
        <div class="acct-level" id="acctLevel">Lv 1</div>
      </div>
    </button>

    <div class="currency-bar">
      <div class="currency"><span class="coin gold"></span><span id="goldCount">0</span></div>
      <div class="currency"><span class="coin diamond"></span><span id="diamondCount">0</span></div>
    </div>

    <button class="btn tasks-btn" id="btnTasks">🎯 Tasks</button>

    <div class="ship-stage"><canvas id="shipCanvas"></canvas></div>

    <div class="right-actions">
      <button class="btn" id="btnSelectShip">⛵ Select Ship</button>
      <button class="btn gold" id="btnPlay">▶ Play</button>
      <button class="btn" id="btnOnline">🌐 Online (next update)</button>
    </div>
  `;

  document.getElementById('btnAccount').onclick = () => navigate('account');
  document.getElementById('btnTasks').onclick = () => navigate('tasks');
  document.getElementById('btnSelectShip').onclick = () => navigate('selectship');
  document.getElementById('btnPlay').onclick = () => navigate('game');
  document.getElementById('btnOnline').onclick = () => alert('Online multiplayer is planned for the next update! 🌐');

  loadPlayer();
  animateShip();
}

async function loadPlayer() {
  const code = await getCurrentCode();
  const p = await getPlayer(code);
  if (!p) return;
  document.getElementById('acctName').textContent = p.name;
  document.getElementById('acctLevel').textContent = 'Lv ' + p.level;
  document.getElementById('goldCount').textContent = p.gold;
  document.getElementById('diamondCount').textContent = p.diamonds;
}

// rotating preview of the currently selected ship
function animateShip() {
  getCurrentCode().then(async (code) => {
    const p = await getPlayer(code);
    const ship = shipById(p.selected) || shipById('gunboat');
    const canvas = document.getElementById('shipCanvas');
    const ctx = canvas.getContext('2d');
    const size = Math.min(window.innerWidth * 0.55, 340);
    canvas.width = size; canvas.height = size;
    let angle = 0;
    function frame() {
      ctx.clearRect(0, 0, size, size);
      ship.draw(ctx, size / 2, size / 2, size / 220, angle);
      angle += 0.008;
      requestAnimationFrame(frame);
    }
    frame();
  });
}
