/**
 * Отдельный процесс комбината: здесь исполняется проект игрока.
 *
 * Воркер модульный, поэтому внутри работает настоящий `import()`. Файлы
 * приходят сообщением, превращаются в blob-модули и грузятся движком —
 * со всеми правилами среды: тело модуля выполняется один раз, импорт
 * несуществующего файла падает, цикл импортов виден по маршруту.
 */
import { buildProject, ProjectError } from './loader.js';
import { captureConsole, toPlain, previewValue } from '../runner-core.js';

/** Адреса живут ровно один прогон: следующий должен начинаться с чистого листа. */
function withFreshUrls(files, entry) {
  const created = [];
  const built = buildProject(files, entry, source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    created.push(url);
    return url;
  });

  return { ...built, release: () => created.forEach(url => URL.revokeObjectURL(url)) };
}

/**
 * Запустить проект: загрузить точку входа и вызвать её экспорт.
 * @returns {Promise<{value, preview, logs, exports, error}>}
 */
async function runProject({ files, entry = 'index.js', fn = '', args = [] }) {
  const logs = [];
  const consoleShim = captureConsole(logs);
  const map = new Map(files);

  let built;
  try {
    built = withFreshUrls(map, entry);
  } catch (error) {
    return { value: null, preview: null, logs, exports: [], error: error.message };
  }

  // Консоль проекта — своя: строки уходят в панель вывода, а не в консоль браузера
  const nativeConsole = self.console;
  self.console = { ...nativeConsole, ...consoleShim };

  try {
    const module = await import(built.url);
    const exported = Object.keys(module);

    if (!fn) return { value: null, preview: null, logs, exports: exported, error: null };

    const target = module[fn];
    if (typeof target !== 'function') {
      return {
        value: null,
        preview: null,
        logs,
        exports: exported,
        error: `${entry} не экспортирует функцию ${fn}. Сейчас экспортируется: ${exported.join(', ') || 'ничего'}`,
      };
    }

    const value = await target(...args);
    return { value: toPlain(value), preview: previewValue(value), logs, exports: exported, error: null };
  } catch (error) {
    const where = error instanceof ProjectError && error.path ? `${error.path}: ` : '';
    return { value: null, preview: null, logs, exports: [], error: `${where}${error.name}: ${error.message}` };
  } finally {
    self.console = nativeConsole;
    built.release();
  }
}

self.addEventListener('message', async event => {
  const { id, payload } = event.data ?? {};
  try {
    self.postMessage({ id, result: await runProject(payload ?? {}) });
  } catch (error) {
    self.postMessage({ id, result: { value: null, logs: [], exports: [], error: `Сбой запуска: ${error.message}` } });
  }
});
