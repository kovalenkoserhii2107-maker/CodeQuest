import { runPractice } from './practice.js';
import { formatConsoleValues } from './console-format.js';
import { validateDashboard } from './dashboard-model.js';
import { createCityAPI } from './api.js';
import { CityEngine, validateFiles, validateMemory } from './engine.js';
import { buildProject, orderModules, findImports, resolveSpecifier } from '../act2/loader.js';

self.addEventListener('message', async event => {
  const urls = [];
  try {
    const { files, world, memory, mode='main', entry:entryPath='index.js', inputs={}, practice } = event.data;
    const engine = new CityEngine(world), operations = [], logs = [], reads = [];
    const safeFiles = validateFiles(files);
    const reachable = orderModules(new Map(Object.entries(safeFiles)), mode !== 'main' ? entryPath : 'index.js');
    for (const name of reachable) {
      const code = safeFiles[name];
      for (const item of findImports(code)) {
        if (resolveSpecifier(name, item.specifier) === null) throw new Error('Импортируйте файлы проекта: например "./strategy.js".');
      }
    }
    const emit = (level, values) => {
      if (logs.length >= 100) return;
      const text = formatConsoleValues(values);
      logs.push(text);
      self.postMessage({ type: 'log', entry: { level, text } });
    };
    const print = (...values) => emit('log', values);
    const cq = createCityAPI(engine, memory, {
      onPrint: print,readOnly:mode!=='main',files:safeFiles,
      onRead: name => { if (reads.length < 1000) reads.push(name); },
      onCommand: operation => {
        if (operations.length >= 100) throw new Error('Допускается до 100 команд за шаг.');
        operations.push(operation);
      }
    });
    for (const level of ['log', 'info', 'warn', 'error']) console[level] = (...values) => emit(level, values);
    const project = buildProject(new Map(Object.entries(safeFiles)), mode!=='main'?entryPath:'index.js', (source, path) => {
      const url = URL.createObjectURL(new Blob([source + '\n//# sourceURL=city/' + path], { type: 'text/javascript' }));
      urls.push(url); return url;
    });
    const entry = await import(project.url);
    if(mode==='practice'){self.postMessage({ok:true,practice:await runPractice(practice,entry)});return;}
    if(mode==='dashboard'){if(typeof entry.render!=='function')throw new Error(entryPath+' должен экспортировать render(cq, view).');self.postMessage({ok:true,dashboard:validateDashboard(await entry.render(cq,{inputs:validateMemory(inputs)}))});return;}
    if (typeof entry.main !== 'function') throw new Error('index.js должен экспортировать функцию main(cq).');
    await entry.main(cq);
    self.postMessage({ ok: true, operations, memory: validateMemory(cq.memory), logs, reads, modules: project.order });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || String(error), stack: String(error?.stack || '').slice(0, 6000) });
  } finally {
    urls.forEach(url => URL.revokeObjectURL(url));
  }
});
