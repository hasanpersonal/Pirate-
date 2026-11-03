// Tasks page — task list; completing tasks earns gold and diamonds.
import { getPlayer, getCurrentCode, claimTask, addRewards } from '../store.js';
import { TASKS } from '../data/tasks.js';
import { navigate } from '../app.js';

export function render(app) {
  app.innerHTML = `
    <div class="ocean-bg"></div>
    <button class="back-btn" id="btnBack">← Back</button>
    <div class="tasks-wrap panel">
      <h2>🎯 Tasks</h2>
      <div class="task-list" id="taskList"></div>
    </div>
  `;
  document.getElementById('btnBack').onclick = () => navigate('main');
  loadTasks();
}

async function loadTasks() {
  const code = await getCurrentCode();
  const p = await getPlayer(code);
  const list = document.getElementById('taskList');
  list.innerHTML = TASKS.map(t => {
    const st = p.tasks[t.id] || { progress: 0, claimed: false };
    const prog = Math.min(st.progress, t.target);
    const done = prog >= t.target;
    const rewardTxt = [
      t.reward.gold ? `+${t.reward.gold} 💰` : '',
      t.reward.diamonds ? `+${t.reward.diamonds} ◆` : '',
      t.reward.petroleum ? `+${t.reward.petroleum} 🛢` : '',
    ].filter(Boolean).join(' ');
    return `
      <div class="task panel ${st.claimed ? 'claimed' : ''}">
        <div class="task-info">
          <div class="task-name">${t.name}</div>
          <div class="task-bar"><div class="fill" style="width:${(prog / t.target) * 100}%"></div></div>
          <div class="task-prog">${prog}/${t.target} — reward: ${rewardTxt}</div>
        </div>
        <button class="btn claim-btn ${done && !st.claimed ? '' : 'disabled'}"
          data-task="${t.id}" ${done && !st.claimed ? '' : 'disabled'}>
          ${st.claimed ? '✓ Done' : done ? 'Claim' : '…'}
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('.claim-btn').forEach(btn => {
    btn.onclick = async () => {
      const t = TASKS.find(x => x.id === btn.dataset.task);
      await claimTask(code, t.id);
      await addRewards(code, t.reward);
      loadTasks();
    };
  });
}
