import { validateDashboard } from './dashboard-model.js';
import { validateFiles, validateMemory } from './engine.js';

/** One fresh module worker per world step, with a deadline even for an infinite loop. */
export class CityRuntime {
  #pending = null;
  run(files, world, memory, options={}) {
    const { onLog, ...workerOptions } = options;
    if (this.#pending) return Promise.reject(new Error('Дождитесь завершения текущего шага.'));
    if (typeof Worker === 'undefined' || location.protocol === 'file:') {
      return Promise.reject(new Error('Для запуска кода откройте приложение через HTTP(S) в браузере с Web Worker.'));
    }
    try { validateFiles(files); validateMemory(memory); } catch (error) { return Promise.reject(error); }
    return new Promise((resolve, reject) => {
      let worker;
      try { worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }); }
      catch (error) { reject(error); return; }
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer); worker.terminate(); this.#pending = null;
        if (error) reject(error); else resolve(value);
      };
      const timer = setTimeout(() => finish(new Error('Шаг превысил 3 секунды. Проверьте циклы и незавершённые Promise.')), 3000);
      this.#pending = { cancel: () => finish(new Error('Запуск отменён.')) };
      worker.addEventListener('message', event => {
        const result = event.data;
        if (result?.type === 'log') {
          if (!settled && result.entry && typeof result.entry.text === 'string' && ['log','info','warn','error'].includes(result.entry.level)) {
            try { onLog?.({ level: result.entry.level, text: result.entry.text.slice(0, 2000) }); } catch { /* UI callbacks cannot change script execution. */ }
          }
          return;
        }
        if (!result?.ok) {
          const error = new Error(String(result?.error || 'Ошибка выполнения кода.'));
          error.scriptStack = typeof result?.stack === 'string' ? result.stack.slice(0, 6000) : '';
          finish(error); return;
        }
        try {
          if(options.mode==='practice'){
            const practice=result.practice;
            if(!practice||practice.id!==options.practice||typeof practice.passed!=='boolean'||!Array.isArray(practice.results)||practice.results.length>30||practice.results.some(test=>typeof test.name!=='string'||typeof test.detail!=='string'||typeof test.passed!=='boolean'))throw new Error('Некорректный результат тестов.');
            finish(null,{practice});return;
          }
          if(options.mode==='dashboard'){finish(null,{dashboard:validateDashboard(result.dashboard)});return;}
          const memory = validateMemory(result.memory);
          if (!Array.isArray(result.operations) || !Array.isArray(result.logs) || result.logs.length > 100 || !Array.isArray(result.reads) || result.reads.length > 1000 || result.reads.some(name => typeof name !== 'string') || !Array.isArray(result.modules) || result.modules.length > 20 || result.modules.some(name => typeof name !== 'string')) throw new Error('Некорректный ответ скрипта.');
          finish(null, { operations: result.operations, memory, reads: result.reads, modules: result.modules, logs: result.logs.map(line => String(line).slice(0, 2000)) });
        } catch (error) { finish(error); }
      });
      worker.addEventListener('error', event => { event.preventDefault(); finish(new Error(event.message || 'Не удалось загрузить скрипт.')); });
      worker.addEventListener('messageerror', () => finish(new Error('Не удалось прочитать ответ скрипта.')));
      try { worker.postMessage({ files, world, memory, ...workerOptions }); } catch (error) { finish(error); }
    });
  }
  cancel() { this.#pending?.cancel(); }
}
