import { createCityAPI } from './api.js';
import { CityEngine, validateFiles, validateMemory } from './engine.js';
import { buildProject, findImports, resolveSpecifier } from '../act2/loader.js';

self.addEventListener('message', async event => {
  const urls = [];
  try {
    const { files, world, memory } = event.data;
    const engine = new CityEngine(world), operations = [], logs = [], reads = [];
    const safeFiles = validateFiles(files);
    for (const [name, code] of Object.entries(safeFiles)) {
      for (const item of findImports(code)) {
        if (resolveSpecifier(name, item.specifier) === null) throw new Error('Импортируйте файлы проекта: например "./strategy.js".');
      }
    }
    const print = (...values) => {
      if (logs.length >= 100) return;
      logs.push(values.map(value => {
        try { return typeof value === 'string' ? value : JSON.stringify(value); }
        catch { return String(value); }
      }).join(' ').slice(0, 2000));
    };
    const cq = createCityAPI(engine, memory, {
      onPrint: print,
      onRead: name => { if (reads.length < 1000) reads.push(name); },
      onCommand: operation => {
        if (operations.length >= 100) throw new Error('Допускается до 100 команд за шаг.');
        operations.push(operation);
      }
    });
    console.log = print; console.info = print; console.warn = print; console.error = print;
    const project = buildProject(new Map(Object.entries(safeFiles)), 'index.js', (source, path) => {
      const url = URL.createObjectURL(new Blob([source + '\n//# sourceURL=city/' + path], { type: 'text/javascript' }));
      urls.push(url); return url;
    });
    const entry = await import(project.url);
    if (typeof entry.main !== 'function') throw new Error('index.js должен экспортировать функцию main(cq).');
    await entry.main(cq);
    self.postMessage({ ok: true, operations, memory: validateMemory(cq.memory), logs, reads, modules: project.order });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || String(error) });
  } finally {
    urls.forEach(url => URL.revokeObjectURL(url));
  }
});
