/**
 * Service worker: держит оболочку игры в кэше, чтобы тренажёр открывался
 * без сети.
 *
 * Стратегия — «сначала сеть, кэш про запас»: так обновления страниц и кода
 * видны сразу после деплоя, а офлайн по-прежнему работает из кэша.
 */
const CACHE = 'codequest-v9';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/reset.css',
  'css/style.css',
  'css/components.css',
  'css/game.css',
  'css/editor.css',
  'js/main.js',
  'js/shell.js',
  'js/state.js',
  'js/ui.js',
  'js/player.js',
  'js/warehouse.js',
  'js/crew.js',
  'js/shipyard.js',
  'js/routes.js',
  'js/market.js',
  'js/enemy.js',
  'js/runner.js',
  'js/runner-core.js',
  'js/runner-worker.js',
  'js/data/quests.js',
  'js/data/js-api.js',
  'js/data/module-art.js',
  'assets/modules/mod-reactor-1.jpg',
  'assets/modules/mod-engine-1.jpg',
  'assets/modules/mod-drill-1.jpg',
  'assets/modules/mod-shield-1.jpg',
  'assets/modules/default.jpg',
  'js/ui/path.js',
  'js/ui/console.js',
  'js/ui/dbview.js',
  'js/db.js',
  'js/ui/sim.js',
  'js/ui/task.js',
  'js/ui/log.js',
  'js/ui/editor.js',
  'js/ui/html.js',
  'js/ui/charts.js',
  'js/ui/map.js',
  'js/ui/shipview.js',
  'js/ui/corp.js',
  'js/ui/mission.js',
  'js/ui/combat.js',
  'js/editor/edit-ops.js',
  'js/editor/highlight.js',
  'js/editor/complete.js',
  'js/editor/hint-box.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll падает целиком из-за одного промаха, поэтому кладём файлы по одному.
      .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Офлайн и страницы нет в кэше — отдаём оболочку тренажёра.
        if (request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      }),
  );
});
