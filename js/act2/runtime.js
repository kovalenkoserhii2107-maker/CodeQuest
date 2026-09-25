/**
 * Мост между интерфейсом комбината и процессом, где живёт проект игрока.
 *
 * Воркер модульный и одноразовый по смыслу: каждый прогон собирает файлы
 * заново, поэтому состояние модулей не перетекает из запуска в запуск.
 * Зависший проект снимается по таймауту вместе с воркером.
 */
const TIMEOUT_MS = 4000;

let worker = null;
let nextId = 1;

function ensureWorker() {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./project-worker.js', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
  }
  return worker;
}

/** Снять процесс: после таймаута он уже ничей. */
function dropWorker() {
  if (!worker) return;
  worker.terminate();
  worker = null;
}

/**
 * Запустить проект игрока.
 *
 * @param {{files: Array, entry?: string, fn?: string, args?: Array}} payload
 * @returns {Promise<{value, preview, logs, exports, error}>}
 */
export function runProject(payload) {
  const active = ensureWorker();
  if (!active) {
    return Promise.resolve({
      value: null, preview: null, logs: [], exports: [],
      error: 'Отдельный процесс недоступен — откройте игру через сервер, а не файлом с диска',
    });
  }

  const id = nextId += 1;

  return new Promise(resolve => {
    const timer = setTimeout(() => {
      cleanup();
      dropWorker();
      resolve({
        value: null, preview: null, logs: [], exports: [],
        error: `Проект не ответил за ${TIMEOUT_MS / 1000} с и был остановлен. Похоже на бесконечный цикл.`,
      });
    }, TIMEOUT_MS);

    function onMessage(event) {
      if (event.data?.id !== id) return;
      cleanup();
      resolve(event.data.result);
    }

    function onError() {
      cleanup();
      dropWorker();
      resolve({ value: null, preview: null, logs: [], exports: [], error: 'Процесс комбината остановлен. Перезапустите прогон.' });
    }

    function cleanup() {
      clearTimeout(timer);
      active.removeEventListener('message', onMessage);
      active.removeEventListener('error', onError);
    }

    active.addEventListener('message', onMessage);
    active.addEventListener('error', onError);
    active.postMessage({ id, payload });
  });
}
