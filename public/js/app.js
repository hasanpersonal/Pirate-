// Router: each page is its own module (js/pages/<page>.js) + its own css (css/pages/<page>.css).
// To change one page's design or behavior, edit only that page's file.
import { ensurePlayer } from './store.js';

const routes = {
  main:       () => import('./pages/main.js'),
  account:    () => import('./pages/account.js'),
  tasks:      () => import('./pages/tasks.js'),
  selectship: () => import('./pages/selectship.js'),
  game:       () => import('./pages/game.js'),
};

let currentCleanup = null;
let renderVersion = 0;

export function navigate(page) {
  location.hash = '#/' + page;
}

async function render(page) {
  const version = ++renderVersion;
  try {
    if (!routes[page]) page = 'main';
    if (currentCleanup) { try { currentCleanup(); } catch (e) {} currentCleanup = null; }

    const app = document.getElementById('app');
    app.innerHTML = '';
    app.className = 'page-' + page;

    // one css file per page
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `css/pages/${page}.css`;
    document.head.appendChild(link);

    await ensurePlayer();
    if (version !== renderVersion) return;
    const mod = await routes[page]();
    if (version !== renderVersion) return;
    if (typeof mod.cleanup === 'function') currentCleanup = mod.cleanup;
    await mod.render(app);
  } catch (e) {
    if (version !== renderVersion) return;
    console.error('Render failed:', e);
    const app = document.getElementById('app');
    app.innerHTML = `<div style="padding:40px;font-family:sans-serif;color:#fff">
      Failed to load page "${page}". <button onclick="location.reload()">Reload</button>
      <pre style="opacity:.7">${String(e && e.message || e)}</pre></div>`;
  }
}

window.addEventListener('hashchange', () => {
  render((location.hash.replace('#/', '') || 'main'));
});

render((location.hash.replace('#/', '') || 'main'));
