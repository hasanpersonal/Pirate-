// Account page — shows level, owned ships, total gold/diamonds.
// Anyone can look up any account by its 6-character code.
import { getPlayer, getCurrentCode, searchByCode } from '../store.js';
import { SHIPS } from '../registry.js';
import { navigate } from '../app.js';

export function render(app) {
  app.innerHTML = `
    <div class="ocean-bg"></div>
    <button class="back-btn" id="btnBack">← Back</button>
    <div class="account-wrap panel">
      <h2 id="accTitle">My Account</h2>
      <div class="code-row">Account code: <b id="accCode">……</b></div>
      <div class="level-row">Level <b id="accLevel">1</b> <span class="xp">(XP <span id="accXp">0</span>)</span></div>
      <div class="totals">
        <div class="currency"><span class="coin gold"></span> <span id="accGold">0</span></div>
        <div class="currency"><span class="coin diamond"></span> <span id="accDiamond">0</span></div>
        <div class="stat">⚔ Kills: <b id="accKills">0</b></div>
        <div class="stat">🏆 Wins: <b id="accWins">0</b></div>
      </div>
      <h3>Owned Ships</h3>
      <div class="owned-list" id="ownedList"></div>
      <h3>Search another account</h3>
      <div class="search-row">
        <input id="searchInput" maxlength="6" placeholder="Enter 6-char code" />
        <button class="btn" id="btnSearch">Search</button>
      </div>
      <div id="searchResult"></div>
    </div>
  `;

  document.getElementById('btnBack').onclick = () => navigate('main');
  document.getElementById('btnSearch').onclick = async () => {
    const code = document.getElementById('searchInput').value;
    const p = await searchByCode(code);
    const el = document.getElementById('searchResult');
    el.innerHTML = p
      ? `<div class="panel found">☠ <b>${esc(p.name)}</b> — Lv ${p.level} — 💰 ${p.gold} ◆ ${p.diamonds}</div>`
      : `<div class="not-found">No account found for code "${esc(code)}".</div>`;
  };

  loadMyAccount();
}

function esc(s) { return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }

async function loadMyAccount() {
  const code = await getCurrentCode();
  const p = await getPlayer(code);
  if (!p) return;
  document.getElementById('accCode').textContent = p.code;
  document.getElementById('accLevel').textContent = p.level;
  document.getElementById('accXp').textContent = p.xp;
  document.getElementById('accGold').textContent = p.gold;
  document.getElementById('accDiamond').textContent = p.diamonds;
  document.getElementById('accKills').textContent = p.stats.kills;
  document.getElementById('accWins').textContent = p.stats.wins;
  document.getElementById('ownedList').innerHTML = SHIPS
    .filter(s => p.owned[s.id])
    .map(s => `<div class="owned-ship">⛵ <b>${s.name}</b> — Lv ${p.owned[s.id]}</div>`)
    .join('') || '<div class="not-found">No ships owned.</div>';
}
