/**
 * Service worker: держит оболочку игры в кэше, чтобы тренажёр открывался
 * без сети. Стратегия — «сначала кэш, сеть про запас».
 */
const CACHE = 'codequest-v1';

const SHELL = [
  './',
  'game.html',
  'index.html',
  'missions.html',
  'manifest.webmanifest',
  'css/reset.css',
  'css/style.css',
  'css/components.css',
  'css/game.css',
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
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? caches.match('game.html'));

      return cached ?? network;
    }),
  );
});
