const menu = document.getElementById('campaign-menu');
const spaceRoot = document.getElementById('space-campaign');
const cityRoot = document.getElementById('city-campaign');
const error = document.getElementById('campaign-error');
let spaceModule, disposeCity, current = 'menu', generation = 0;
let lastSpaceRoute = location.hash && !['#/city', '#/campaigns'].includes(location.hash) ? location.hash : '#/path';

document.querySelector('[data-campaign="space"]').addEventListener('click', event => {
  event.preventDefault();
  location.hash = lastSpaceRoute;
});
document.getElementById('campaign-theme').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('codequest.theme', theme); } catch { /* Theme still changes without storage. */ }
});
function show(name) {
  menu.hidden = name !== 'menu'; spaceRoot.hidden = name !== 'space'; cityRoot.hidden = name !== 'city';
}
async function route() {
  const hash = location.hash;
  const target = hash === '#/city' ? 'city' : !hash || hash === '#/campaigns' ? 'menu' : 'space';
  if (target === current) {
    if (target === 'space') lastSpaceRoute = hash;
    return;
  }
  const mine = ++generation;
  spaceModule?.deactivateSpaceCampaign();
  disposeCity?.(); disposeCity = null;
  current = target; error.hidden = true; show(target);
  try {
    if (target === 'space') {
      lastSpaceRoute = hash;
      const module = await import('./main.js');
      if (mine !== generation) return;
      spaceModule = module; module.activateSpaceCampaign();
    } else if (target === 'city') {
      const module = await import('./city/ui.js');
      if (mine !== generation) return;
      disposeCity = module.mountCity(cityRoot);
    } else {
      document.getElementById('campaign-title').focus();
    }
  } catch (failure) {
    if (mine !== generation) return;
    current = 'menu'; show('menu');
    error.textContent = 'Не удалось открыть кампанию: ' + failure.message + '. Попробуйте ещё раз.';
    error.hidden = false;
    history.replaceState(null, '', '#/campaigns');
  }
}
window.addEventListener('hashchange', route);
window.addEventListener('pagehide', () => { generation++; spaceModule?.deactivateSpaceCampaign(); disposeCity?.(); disposeCity = null; current = 'menu'; });
window.addEventListener('pageshow', event => { if (event.persisted) route(); });
// Each launch starts with a choice, even when an old space route remains in the address.
history.replaceState(null, '', '#/campaigns');
show('menu');
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* Offline support is optional. */ });
}
