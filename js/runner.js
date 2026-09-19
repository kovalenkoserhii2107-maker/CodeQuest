/**
 * Обёртка над воркером: следит за таймаутом и умеет работать в запасном
 * режиме (без воркера), если страницу открыли не через сервер.
 */
import { runQuestTests } from './runner-core.js';

const TIMEOUT_MS = 3000;

let worker = null;
let workerBroken = false;
let nextId = 1;

function ensureWorker() {
  if (workerBroken) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./runner-worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('error', () => {
      workerBroken = true;
      worker = null;
    });
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

/** Признак запасного режима — нужен, чтобы предупредить игрока в интерфейсе. */
export function isFallbackMode() {
  return workerBroken || typeof Worker === 'undefined';
}

/**
 * Прогоняет решение против тестов задачи.
 * @returns {Promise<{ok: boolean, results: Array, logs: string[], error: string|null}>}
 */
export function runSolution(source, quest) {
  const active = typeof Worker === 'undefined' ? null : ensureWorker();

  if (!active) {
    // Запасной путь: выполняем в основном потоке. Бесконечный цикл здесь
    // прервать нельзя, поэтому интерфейс предупреждает об этом отдельно.
    return runQuestTests(source, { fn: quest.fn, tests: quest.tests });
  }

  const id = nextId++;
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      cleanup();
      active.terminate();
      worker = null;
      resolve({
        ok: false,
        results: [],
        logs: [],
        error: 'Решение работает дольше 3 секунд. Похоже на бесконечный цикл — проверьте условие выхода.',
      });
    }, TIMEOUT_MS);

    function onMessage(event) {
      if (event.data.id !== id) return;
      cleanup();
      resolve(event.data.report);
    }

    function onError() {
      cleanup();
      workerBroken = true;
      worker = null;
      runQuestTests(source, { fn: quest.fn, tests: quest.tests }).then(resolve);
    }

    function cleanup() {
      clearTimeout(timer);
      active.removeEventListener('message', onMessage);
      active.removeEventListener('error', onError);
    }

    active.addEventListener('message', onMessage);
    active.addEventListener('error', onError);
    active.postMessage({ id, source, quest: { fn: quest.fn, tests: quest.tests } });
  });
}
