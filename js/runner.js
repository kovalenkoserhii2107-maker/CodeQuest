/**
 * Изолированный исполнитель с таймаутом. Прямой запуск разрешён только в Node для тестов.
 */
import { runQuestTests, runPlayerCode, runConsoleInput } from './runner-core.js';
import { appSource, liveFunctions } from './state.js';
import { testsOf } from './data/quests.js';

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
export async function runSolution(source, quest) {
  const combined = appSource({ fn: quest.fn, source });
  const suites = [quest, ...liveFunctions().filter(item => item.fn !== quest.fn).map(item => item.stage)];
  const report = { ok: true, results: [], logs: [], error: null };
  for (const suite of suites) {
    const part = await runTestSuite(combined, suite);
    if (part.error) return { ...part, error: `${suite.fn}: ${part.error}` };
    report.results.push(...part.results.map(item => ({ ...item,
      name: suite === quest ? item.name : `${suite.fn} · интеграция · ${item.name}`,
      integration: suite !== quest,
    })));
    report.logs.push(...part.logs);
    report.ok &&= part.ok;
  }
  return report;
}

function runTestSuite(source, quest) {
  const active = typeof Worker === 'undefined' ? null : ensureWorker();

  if (!active) {
    // В браузере не запускаем пользовательский код без изоляции.
    if (typeof window !== 'undefined') return Promise.resolve({ok:false, results:[], logs:[], error:'Изолированный исполнитель недоступен. Перезагрузите страницу.'});
    return runQuestTests(source, { fn: quest.fn, tests: testsOf(quest) });
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
      resolve({ok:false,results:[],logs:[],error:'Исполнитель остановлен. Перезагрузите страницу.'});
    }

    function cleanup() {
      clearTimeout(timer);
      active.removeEventListener('message', onMessage);
      active.removeEventListener('error', onError);
    }

    active.addEventListener('message', onMessage);
    active.addEventListener('error', onError);
    active.postMessage({ id, kind: 'tests', source, quest: { fn: quest.fn, tests: testsOf(quest) } });
  });
}

/**
 * Считает показания приборов Мостика кодом игрока.
 * Одним сообщением уходит весь список — так дешевле, чем по заданию на вызов.
 *
 * @param {Array<{id: string, source: string, fn: string, expr: string}>} jobs
 * @returns {Promise<Array<{id: string, value: unknown, error: string|null}>>}
 */
export function evaluateWidgets(jobs) {
  if (jobs.length === 0) return Promise.resolve([]);

  const active = typeof Worker === 'undefined' ? null : ensureWorker();

  if (!active) {
    if (typeof window !== 'undefined') return Promise.resolve(jobs.map(job => ({id:job.id,value:null,error:'Изолированный исполнитель недоступен'})));
    return Promise.all(
      jobs.map(job => runPlayerCode(job.source, job.fn, job.expr).then(outcome => ({ id: job.id, ...outcome }))),
    );
  }

  const id = nextId++;
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      cleanup();
      active.terminate();
      worker = null;
      resolve(jobs.map(job => ({ id: job.id, value: null, error: 'Прибор не ответил: код выполняется слишком долго' })));
    }, TIMEOUT_MS);

    function onMessage(event) {
      if (event.data.id !== id) return;
      cleanup();
      resolve(event.data.results ?? []);
    }

    function onError() {
      cleanup();
      workerBroken = true;
      worker = null;
      resolve(jobs.map(job => ({id:job.id,value:null,error:'Исполнитель остановлен'})));
    }

    function cleanup() {
      clearTimeout(timer);
      active.removeEventListener('message', onMessage);
      active.removeEventListener('error', onError);
    }

    active.addEventListener('message', onMessage);
    active.addEventListener('error', onError);
    active.postMessage({ id, kind: 'widgets', jobs });
  });
}

/**
 * Выполнить команду из консоли корпорации.
 * @param {string} source все решения игрока
 * @param {string} input что он набрал
 * @param {object} payload данные корпорации, снимок базы и список панелей
 */
export function runConsole(source, input, payload = {}) {
  const active = typeof Worker === 'undefined' ? null : ensureWorker();

  if (!active) return typeof window === 'undefined' ? runConsoleInput(source, input, payload) : Promise.resolve({value:null,logs:[],ops:[],error:'Изолированный исполнитель недоступен'});

  const id = nextId++;
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      cleanup();
      active.terminate();
      worker = null;
      resolve({ value: undefined, logs: [], ops: [], error: 'Команда выполняется дольше 3 секунд и была прервана' });
    }, TIMEOUT_MS);

    function onMessage(event) {
      if (event.data.id !== id) return;
      cleanup();
      resolve(event.data.result ?? { value: undefined, logs: [], ops: [], error: 'Консоль не ответила' });
    }

    function onError() {
      cleanup();
      workerBroken = true;
      worker = null;
      resolve({value:null,logs:[],ops:[],error:'Исполнитель остановлен'});
    }

    function cleanup() {
      clearTimeout(timer);
      active.removeEventListener('message', onMessage);
      active.removeEventListener('error', onError);
    }

    active.addEventListener('message', onMessage);
    active.addEventListener('error', onError);
    active.postMessage({ id, kind: 'console', source, input, payload });
  });
}
