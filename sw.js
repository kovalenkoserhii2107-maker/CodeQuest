/**
 * Service worker: держит оболочку игры в кэше, чтобы тренажёр открывался
 * без сети.
 *
 * Стратегия — «сначала сеть, кэш про запас»: так обновления страниц и кода
 * видны сразу после деплоя, а офлайн по-прежнему работает из кэша.
 */
const CACHE = 'codequest-v4';

const SHELL = [
  './',
  'index.html',
  'index.html',
  'missions.html',
  'manifest.webmanifest',
  'css/reset.css',
  'css/style.css',
  'css/components.css',
  'css/game.css',
  'css/editor.css',
  'js/main.js',
  'js/state.js',
  'js/runner.js',
  'js/runner-core.js',
  'js/runner-worker.js',
  'js/data/quests.js',
  'js/data/modules.js',
  'js/ui/map.js',
  'js/ui/ship.js',
  'js/ui/task.js',
  'js/ui/log.js',
  'js/ui/editor.js',
  'js/ui/html.js',
  'js/shell.js',
  'js/editor/edit-ops.js',
  'js/editor/highlight.js',
  'js/editor/complete.js',
  'js/editor/hint-box.js',
  'js/data/js-api.js',
  'js/data/ship-data.js',
  'js/data/dashboard.js',
  'js/ui/bridge.js',
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
