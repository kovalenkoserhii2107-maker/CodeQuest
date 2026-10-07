import {
  CityEngine, CITY_SAVE_KEY, initialSave, readCitySave, validateFiles, validateMemory
} from './engine.js';
import { CityRuntime } from './runtime.js';
import { createEditor } from '../ui/editor.js';
import { escapeHtml } from '../ui/html.js';

const names = { scrap: 'Лом', metal: 'Металл', parts: 'Детали' };
const number = value => value.toLocaleString('ru-RU');
const money = value => number(value) + ' ₽';
const API_TYPES = [
  'interface CityBuyer { id: string; name: string; product: string; price: number; demand: number; limit: number; }',
  'interface CityState { tick: number; balance: number; capacity: number; machineLevel: number; warehouseLevel: number;',
  ' inventory: { scrap: number; metal: number; parts: number }; job: { product: string; quantity: number; remaining: number } | null;',
  ' supplier: { product: string; price: number; stock: number }; buyers: CityBuyer[]; metrics: Record<string, number>; }',
  'interface CityAPI { getState(): CityState; memory: Record<string, any>; print(...values: any[]): void;',
  ' buy(product: "scrap", quantity: number): number; produce(product: "metal" | "parts", quantity: number): any;',
  ' sell(product: "metal" | "parts", quantity: number, buyerId: string): number; upgrade(target: "warehouse" | "machine"): number; }'
].join('\n');

export function mountCity(root) {
  let storage;
  try { storage = localStorage; } catch { /* readCitySave reports inaccessible storage */ }
  const loaded = readCitySave(storage);
  let save = loaded.save, engine = new CityEngine(save.world), editor, file = 'index.js';
  let disposed = false, busy = false, automatic = false, timer, generation = 0;
  const runtime = new CityRuntime(), output = [];
  root.innerHTML = [
    '<header class="city-header"><div><p class="campaign-eyebrow">CodeQuest / песочница</p>',
    '<h1>Городской комбинат</h1><p>Ваша мастерская. Ваша стратегия. Ваш JavaScript.</p></div>',
    '<a href="#/campaigns" class="city-button">Выбор кампании</a></header>',
    '<p class="city-notice" data-notice role="status"></p>',
    '<div class="city-metrics" data-metrics></div>',
    '<div class="city-grid"><section class="city-workspace city-panel" aria-labelledby="city-code-title">',
    '<div class="city-panel-heading"><h2 id="city-code-title">Проект мастерской</h2><button type="button" data-add>+ Файл</button></div>',
    '<div class="city-files" data-files role="group" aria-label="Файлы проекта"></div>',
    '<div data-editor></div>',
    '<div class="city-actions"><button type="button" data-run>Запустить шаг</button>',
    '<button type="button" data-preview>Пробный запуск</button>',
    '<button type="button" data-auto aria-pressed="false">Автоматизация: выкл.</button>',
    '<button type="button" data-wait>Пропустить шаг</button></div>',
    '<p class="city-muted">main(cq) вызывается один раз на шаг. Автоматизация повторяет ваш код каждую секунду. При выходе в меню мир останавливается.</p>',
    '<h3>Вывод скрипта</h3><pre class="city-output" data-output role="log" aria-label="Вывод скрипта" aria-live="polite"></pre>',
    '</section><aside class="city-side">',
    '<section class="city-panel"><h2>Мастерская и рынок</h2><div data-world></div></section>',
    '<section class="city-panel"><h2>От первой строки к стратегии</h2><ol class="city-goals" data-goals></ol>',
    '<p class="city-muted">Это ориентиры: все команды доступны сразу, а решение и порядок действий выбираете вы.</p></section>',
    '</aside></div>',
    '<section class="city-panel city-api"><h2>API мастерской</h2>',
    '<p>В index.js экспортируйте <code>main(cq)</code>. Функция может быть async. Команды выполняются в порядке вызова; если шаг завершится ошибкой, его изменения отменяются.</p>',
    '<dl><dt>cq.getState()</dt><dd>Копия мира: balance, inventory, job, supplier, buyers, capacity, tick. Меняйте мир командами, а не полями этой копии.</dd>',
    '<dt>cq.buy("scrap", количество)</dt><dd>Лом стоит 4 ₽ за единицу. Учитывайте деньги, запас поставщика и свободное место.</dd>',
    '<dt>cq.produce("metal", количество)</dt><dd>1 металл = 2 лома + 2 ₽ энергии; партия готова через 2 шага.</dd>',
    '<dt>cq.produce("parts", количество)</dt><dd>1 деталь = 2 металла + 6 ₽ энергии; готова через 3 шага. Один станок, до 8 единиц за партию на первом уровне.</dd>',
    '<dt>cq.sell(товар, количество, buyerId)</dt><dd>Цена и спрос находятся в buyers. Выберите покупателя через find, filter или sort. Цены меняются каждый шаг.</dd>',
    '<dt>cq.upgrade("warehouse" | "machine")</dt><dd>Склад: +100 мест, от 500 ₽. Станок: +8 единиц за партию, от 750 ₽. Цена умножается на текущий уровень; максимум — 6.</dd>',
    '<dt>cq.print(...значения)</dt><dd>Вывод в журнал, также работает console.log.</dd>',
    '<dt>cq.memory</dt><dd>Объект для данных между шагами (до 16 КБ JSON). Обычные переменные модулей создаются заново при каждом запуске.</dd></dl>',
    '<details><summary>Подсказка: первая партия</summary><pre>',
    escapeHtml('/** @param {CityAPI} cq */\nexport function main(cq) {\n  const s = cq.getState();\n  if (s.inventory.scrap < 10 && !s.job) {\n    cq.buy("scrap", 10);\n  }\n  if (!cq.getState().job) {\n    cq.produce("metal", 5);\n  }\n}\n// После запуска пропустите шаг: партия будет готова.\n// Затем напишите продажу через cq.sell("metal", 5, "foundry").'),
    '</pre></details>',
    '<details><summary>Модули: вынесите стратегию в другой файл</summary><pre>',
    escapeHtml('// strategy.js\nexport function bestBuyer(buyers, product) {\n  return buyers.filter(b => b.product === product && b.demand > 0)\n    .sort((a, b) => b.price - a.price)[0];\n}\n\n// index.js\nimport { bestBuyer } from "./strategy.js";\n/** @param {CityAPI} cq */\nexport function main(cq) {\n  const s = cq.getState();\n  const buyer = bestBuyer(s.buyers, "metal");\n  const amount = Math.min(s.inventory.metal, buyer?.demand ?? 0);\n  if (amount > 0) cq.sell("metal", amount, buyer.id);\n}'),
    '</pre><p class="city-muted">Поддерживаются относительные импорты файлов проекта без циклов. До 20 файлов и 200 КБ кода; 100 команд и 3 секунды на шаг.</p></details>',
    '<button type="button" class="city-reset" data-reset>Начать комбинат заново</button></section>'
  ].join('');
  const el = selector => root.querySelector(selector);
  function notice(message) { el('[data-notice]').textContent = message; el('[data-notice]').hidden = !message; }
  function log(message) {
    output.push(message); if (output.length > 100) output.splice(0, output.length - 100);
    el('[data-output]').textContent = output.join('\n');
    el('[data-output]').scrollTop = el('[data-output]').scrollHeight;
  }
  function persist() {
    save.world = engine.snapshot();
    try {
      if (!storage) throw new Error('storage unavailable');
      storage.setItem(CITY_SAVE_KEY, JSON.stringify(save));
    } catch { notice('Не удалось сохранить прогресс. Не закрывайте страницу, если хотите продолжить.'); }
  }
  function renderFiles() {
    const container = el('[data-files]');
    container.replaceChildren();
    for (const name of Object.keys(save.files)) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = name; button.setAttribute('aria-pressed', String(name === file));
      button.addEventListener('click', () => { if (busy || file === name) return; file = name; renderEditor(); renderFiles(); });
      container.append(button);
    }
  }
  function renderEditor() {
    editor?.dispose();
    editor = createEditor(el('[data-editor]'), {
      filename: file, value: save.files[file], siblings: { ...save.files },
      includeLiveFunctions: false, extraDeclarations: API_TYPES,
      onInput: code => {
        save.files[file] = code; editor?.syncSiblings(save.files); persist();
      },
      onRun: () => step(false)
    });
  }
  function update() {
    const w = engine.snapshot(), used = Object.values(w.inventory).reduce((a, b) => a + b, 0);
    el('[data-metrics]').innerHTML = [
      ['Баланс', money(w.balance)], ['Шаг мира', number(w.tick)],
      ['Склад', used + ' / ' + w.capacity], ['Результат торговли', money(w.metrics.revenue - w.metrics.spent)]
    ].map(([label, value]) => '<div><span>' + label + '</span><strong>' + value + '</strong></div>').join('');
    el('[data-world]').innerHTML =
      '<dl class="city-stock">' + Object.entries(w.inventory).map(([key, value]) =>
        '<dt>' + names[key] + '</dt><dd>' + number(value) + '</dd>').join('') + '</dl>' +
      '<p><strong>Станок · уровень ' + w.machineLevel + '</strong><br>' +
      (w.job ? names[w.job.product] + ': ' + w.job.quantity + ' ед., осталось шагов: ' + w.job.remaining : 'Свободен · партия до ' + (w.machineLevel * 8) + ' ед.') + '</p>' +
      '<p>Лом: ' + money(w.supplier.price) + ' · в наличии ' + w.supplier.stock + '</p>' +
      '<div class="city-table-scroll"><table><caption>Покупатели</caption><thead><tr><th>Покупатель / ID</th><th>Товар</th><th>Цена</th><th>Спрос</th></tr></thead><tbody>' +
      w.buyers.map(b => '<tr><td>' + escapeHtml(b.name) + '<br><code>' + escapeHtml(b.id) + '</code></td><td>' + names[b.product] +
        '</td><td>' + money(b.price) + '</td><td>' + b.demand + '</td></tr>').join('') + '</tbody></table></div>';
    const goals = [
      [w.metrics.bought >= 10, 'Первая поставка', 'Купите 10 лома: вызовы функций и аргументы.'],
      [w.metrics.produced >= 5, 'Первая партия', 'Произведите 5 металла: объекты и условия.'],
      [w.metrics.sold >= 5, 'Первая продажа', 'Продайте 5 единиц: массив покупателей, find и Math.min.'],
      [w.metrics.revenue - w.metrics.spent >= 500, 'Прибыльная мастерская', 'Заработайте 500 ₽ сверх расходов: циклы, функции и стратегия.'],
      [Object.keys(save.files).length > 1 && /\b(?:import|export)\b[\s\S]*?['"]\.\//.test(save.files['index.js']) && w.metrics.runs >= 5,
        'Проект из модулей', 'Разделите стратегию на файлы и запустите её: import/export, память и автоматизация.']
    ];
    el('[data-goals]').innerHTML = goals.map(([done, title, description]) =>
      '<li class="' + (done ? 'is-complete' : '') + '"><strong>' + (done ? '✓ ' : '') + title + '</strong><p>' + description + '</p></li>').join('');
    for (const button of root.querySelectorAll('[data-run], [data-preview], [data-wait], [data-add], [data-reset], [data-files] button')) {
      button.disabled = busy || automatic;
    }
    el('[data-auto]').textContent = 'Автоматизация: ' + (automatic ? 'вкл.' : 'выкл.');
    el('[data-auto]').setAttribute('aria-pressed', String(automatic));
  }
  function stop() { automatic = false; clearTimeout(timer); if (!disposed) update(); }
  async function step(preview = false) {
    if (busy || disposed) return;
    busy = true; const mine = generation; update();
    const files = { ...save.files };
    try {
      validateFiles(files);
      const result = await runtime.run(files, engine.snapshot(), save.memory);
      if (disposed || mine !== generation) return;
      const candidate = new CityEngine(engine.snapshot());
      candidate.apply(result.operations);
      const memory = validateMemory(result.memory);
      result.logs.forEach(line => log((preview ? '[проба] ' : '') + line));
      if (preview) {
        const w = candidate.snapshot();
        log('[проба] Шаг ' + w.tick + ', баланс ' + money(w.balance) + '. Прогресс и память не изменены.');
      } else {
        engine = candidate; save.memory = memory; persist();
        log('Шаг ' + engine.snapshot().tick + ': выполнено команд — ' + result.operations.length + '.');
      }
    } catch (error) {
      if (disposed || mine !== generation) return;
      log('Ошибка: ' + error.message + ' Изменения шага отменены.');
      stop();
    } finally {
      if (!disposed && mine === generation) {
        busy = false; update();
        if (automatic) timer = setTimeout(() => step(false), 1000);
      }
    }
  }
  el('[data-run]').addEventListener('click', () => step(false));
  el('[data-preview]').addEventListener('click', () => step(true));
  el('[data-wait]').addEventListener('click', () => { if (busy || automatic) return; engine.advance(); persist(); log('Шаг ' + engine.snapshot().tick + ': ожидание.'); update(); });
  el('[data-auto]').addEventListener('click', () => {
    if (automatic) stop();
    else if (!busy) { automatic = true; update(); step(false); }
  });
  el('[data-add]').addEventListener('click', () => {
    const name = window.prompt('Имя нового JavaScript-файла (например strategy.js):', 'strategy.js');
    if (!name) return;
    try {
      if (Object.hasOwn(save.files, name)) throw new Error('Файл с таким именем уже существует.');
      const files = { ...save.files, [name]: '// Вынесите сюда часть вашей стратегии.\n' };
      validateFiles(files); save.files = files; file = name; persist(); renderEditor(); renderFiles(); update();
    } catch (error) { notice(error.message); }
  });
  el('[data-reset]').addEventListener('click', () => {
    if (!window.confirm('Начать городской комбинат заново? Его деньги, файлы и память будут очищены.')) return;
    stop(); generation++; runtime.cancel(); save = initialSave(); engine = new CityEngine(save.world);
    file = 'index.js'; output.length = 0; el('[data-output]').textContent = ''; persist(); renderEditor(); renderFiles(); update();
  });
  notice(loaded.warning);
  renderEditor(); renderFiles(); update();
  log('Мастерская открыта. Начните с cq.buy("scrap", 10).');
  return () => {
    disposed = true; generation++; clearTimeout(timer); automatic = false; runtime.cancel(); editor?.dispose();
    root.replaceChildren();
  };
}
