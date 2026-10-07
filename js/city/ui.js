import {
  CityEngine, CITY_SAVE_KEY, initialSave, readCitySave, validateFiles, validateMemory
} from './engine.js';
import { PRODUCTS } from './catalog.js';
import { CityRuntime } from './runtime.js';
import { CityLessons } from './lessons.js';
import { LessonView } from './lesson-ui.js';
import { API_TYPES, mountReference } from './api-reference.js';
import { createEditor } from '../ui/editor.js';
import { escapeHtml } from '../ui/html.js';

const number = value => value.toLocaleString('ru-RU');
const money = value => number(value) + ' ₽';
const statuses = { available: 'Доступен', active: 'Принят', cooldown: 'Обновляется' };

export function mountCity(root) {
  let storage;
  try { storage = localStorage; } catch { /* readCitySave reports inaccessible storage */ }
  const loaded = readCitySave(storage);
  let save = loaded.save, engine = new CityEngine(save.world), lessons = new CityLessons(save.tutorial), editor, file = 'index.js';
  let disposed = false, busy = false, automatic = false, timer, generation = 0, lessonView;
  const runtime = new CityRuntime(), output = [];
  root.innerHTML = [
    '<header class="city-header"><div><p class="campaign-eyebrow">CodeQuest / песочница</p>',
    '<h1>Городской комбинат</h1><p>Ваша мастерская. Ваша стратегия. Ваш JavaScript.</p></div>',
    '<a href="#/campaigns" class="city-button">Выбор кампании</a></header>',
    '<p class="city-notice" data-notice role="status"></p>',
    '<section class="city-orientation city-panel"><h2>Как устроен мир</h2>',
    '<p>Вы владелец городской мастерской. Покупайте лом, превращайте его в товары и выбирайте между продажей на рынке, заказами города и доставкой в другие районы.</p>',
    '<ol class="city-world-cycle"><li><strong>1. Прочитать</strong><span>Получите состояние через cq.world.getState().</span></li>',
    '<li><strong>2. Решить</strong><span>Проверьте деньги, сырьё, спрос и оборудование.</span></li>',
    '<li><strong>3. Действовать</strong><span>Вызовите команды в main(cq). Они выполняются по порядку.</span></li>',
    '<li><strong>4. Перевести время</strong><span>После успешного запуска мир проходит один шаг: партии и доставки продвигаются.</span></li></ol>',
    '<p class="city-muted">Пробный запуск ничего не сохраняет. Ошибка отменяет весь шаг. «Пропустить шаг» двигает время без выполнения кода.</p>',
    '<div class="city-shortcuts"><button type="button" data-jump="task">Текущее задание</button><button type="button" data-jump="api">Справочник API</button><button type="button" data-jump="world">Мастерская и рынок</button></div>',
    '</section>',
    '<div class="city-metrics" data-metrics></div>',
    '<div class="city-grid"><div class="city-primary">',
    '<section class="city-panel city-task" data-task aria-label="Учебное задание"></section>',
    '<section class="city-workspace city-panel" aria-labelledby="city-code-title">',
    '<div class="city-panel-heading"><h2 id="city-code-title">Проект мастерской</h2><button type="button" data-add>+ Файл</button></div>',
    '<div class="city-files" data-files role="group" aria-label="Файлы проекта"></div>',
    '<div data-editor></div>',
    '<div class="city-actions"><button type="button" data-run>Запустить шаг</button>',
    '<button type="button" data-preview>Пробный запуск</button>',
    '<button type="button" data-auto aria-pressed="false">Автоматизация: выкл.</button>',
    '<button type="button" data-wait>Пропустить шаг</button></div>',
    '<p class="city-muted">main(cq) вызывается один раз на шаг. Автоматизация повторяет проект через секунду после завершения предыдущего запуска. При выходе в меню мир останавливается.</p>',
    '<p class="city-lesson-feedback" data-feedback role="status"></p>',
    '<h3>Вывод скрипта</h3><pre class="city-output" data-output role="log" aria-label="Вывод скрипта" aria-live="polite"></pre>',
    '</section></div><aside class="city-side">',
    '<section class="city-panel" data-board></section>',
    '<section class="city-panel" data-world-panel><h2>Мастерская и рынок</h2><div data-world></div></section>',
    '<section class="city-panel"><h2>Городские контракты</h2><div data-contracts></div>',
    '<p class="city-muted">Два заказа одновременно. Сдайте до deadline; просрочка не списывает деньги. После выполнения заказ обновляется через 5 шагов.</p></section>',
    '<section class="city-panel"><h2>Доставка и исследования</h2><div data-expansion></div></section>',
    '</aside></div>',
    '<section class="city-panel"><h2>Что возвращает getState()</h2>',
    '<p class="city-muted">Это снимок для чтения: изменение его полей не меняет мир. Используйте команды API. Программные ID товаров: scrap (лом), metal (металл), parts (детали), wire (провод).</p>',
    '<dl class="city-state-fields"><dt>balance, tick</dt><dd>Баланс в рублях и текущий номер шага.</dd>',
    '<dt>inventory, capacity</dt><dd>Готовые товары на складе и его вместимость. getFreeSpace() также учитывает резерв незавершённых партий.</dd>',
    '<dt>lines</dt><dd>Массив независимых линий: id, level, job. Для свободной линии job=null.</dd>',
    '<dt>buyers, supplier</dt><dd>Цены, спрос покупателей и запас поставщика. Для remote-покупателей нужна доставка.</dd>',
    '<dt>contracts, shipments, research</dt><dd>Принятые заказы, грузы в пути, ID открытых технологий. Каталоги и подробности — в соответствующих разделах API.</dd>',
    '<dt>metrics</dt><dd>Куплено, произведено, продано, доставлено, выполнено контрактов, выручка и все расходы.</dd></dl>',
    '<details><summary>Посмотреть текущее состояние целиком</summary><pre class="city-state-json" data-snapshot></pre></details></section>',
    '<section class="city-panel city-api" data-api></section>',
    '<section class="city-panel"><h2>Управление сохранением</h2><p class="city-muted">Мир, файлы, память и выполненные задания комбината сохраняются отдельно от космической кампании.</p>',
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
    save.world = engine.snapshot(); save.tutorial = lessons.snapshot();
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
      button.addEventListener('click', () => { if (busy || automatic || file === name) return; file = name; renderEditor(); renderFiles(); });
      container.append(button);
    }
  }
  function renderEditor() {
    editor?.dispose();
    editor = createEditor(el('[data-editor]'), {
      filename: file, value: save.files[file], siblings: { ...save.files },
      includeLiveFunctions: false, extraDeclarations: API_TYPES,
      onInput: code => { save.files[file] = code; editor?.syncSiblings(save.files); persist(); },
      onRun: () => { if (!automatic) step(false); }
    });
  }
  function updateWorld() {
    const w = engine.snapshot(), used = Object.values(w.inventory).reduce((a, b) => a + b, 0);
    el('[data-metrics]').innerHTML = [
      ['Баланс', money(w.balance)], ['Шаг мира', number(w.tick)],
      ['Склад / свободно', used + '/' + w.capacity + ' · ' + engine.getFreeSpace()],
      ['Доходы − все расходы', money(w.metrics.revenue - w.metrics.spent)]
    ].map(([label, value]) => '<div><span>' + label + '</span><strong>' + value + '</strong></div>').join('');
    el('[data-world]').innerHTML =
      '<dl class="city-stock">' + Object.entries(w.inventory).map(([key, value]) =>
        '<dt>' + PRODUCTS[key] + ' <code>' + key + '</code></dt><dd>' + number(value) + '</dd>').join('') + '</dl>' +
      '<h3>Производственные линии</h3><div class="city-line-list">' + w.lines.map(line =>
        '<p><strong>' + line.id + ' · уровень ' + line.level + '</strong><br>' +
        (line.job ? PRODUCTS[line.job.product] + ': ' + line.job.quantity + ' ед.; осталось шагов: ' + line.job.remaining : 'Свободна · партия до ' + line.level * 8 + ' ед.') + '</p>').join('') + '</div>' +
      '<p>Поставщик yard: лом ' + money(w.supplier.price) + ' · в наличии ' + w.supplier.stock + '</p>' +
      '<div class="city-table-scroll"><table><caption>Покупатели</caption><thead><tr><th>Покупатель / ID</th><th>Товар</th><th>Цена</th><th>Спрос</th></tr></thead><tbody>' +
      w.buyers.map(b => '<tr><td>' + escapeHtml(b.name) + '<br><code>' + escapeHtml(b.id) + '</code>' + (b.remote ? '<br><small>Доставка</small>' : '') +
        '</td><td>' + PRODUCTS[b.product] + '</td><td>' + money(b.price) + '</td><td>' + b.demand + '</td></tr>').join('') + '</tbody></table></div>';
    el('[data-contracts]').innerHTML = engine.getContracts().map(order => '<article class="city-contract"><h3>' + escapeHtml(order.name) +
      '</h3><p><code>' + order.id + '</code> · ' + order.quantity + ' ' + PRODUCTS[order.product] + '</p><p>Награда: ' + money(order.reward) +
      ' · срок: ' + order.duration + ' шагов</p><p class="city-muted">' + (order.locked ? 'Нужна технология wire' : statuses[order.status]) +
      (order.status === 'active' ? ' · deadline=' + order.deadline + ' · осталось ' + (order.deadline - w.tick) :
        order.status === 'cooldown' ? ' · обновится через ' + (order.refreshAt - w.tick) : '') + '</p></article>').join('');
    el('[data-expansion]').innerHTML = '<h3>Маршруты</h3>' + engine.getRoutes().map(route =>
      '<p><code>' + route.id + '</code>: ' + route.duration + ' шаг. · ' + money(route.fee) + ' · до ' + route.capacity +
      ' ед. · ' + (route.busy ? 'занят' : 'свободен') + '</p>').join('') +
      '<h3>Грузы в пути</h3>' + (w.shipments.length ? w.shipments.map(s => '<p>№' + s.id + ' · ' + s.quantity + ' ' + PRODUCTS[s.product] +
        ' → <code>' + s.buyerId + '</code><br>Осталось ' + s.remaining + ' шаг. · ожидается ' + money(s.quantity * s.unitPrice) + '</p>').join('') : '<p class="city-muted">Нет грузов.</p>') +
      '<h3>Технологии</h3>' + engine.getResearch().map(t => '<p><strong>' + escapeHtml(t.name) + '</strong> <code>' + t.id + '</code><br>' +
        (t.unlocked ? 'Открыта' : money(t.cost)) + ' · ' + escapeHtml(t.description) + '</p>').join('') +
      '<h3>Доступные рецепты</h3>' + engine.getRecipes().map(r => '<p><code>' + r.product + '</code> = ' + r.amount + ' ' + PRODUCTS[r.input] +
        ' + ' + money(r.energy) + ' · ' + r.duration + ' шаг.</p>').join('');
    el('[data-snapshot]').textContent = JSON.stringify(w, null, 2);
  }
  function update() {
    updateWorld(); lessonView.render();
    for (const button of root.querySelectorAll('[data-run], [data-preview], [data-wait], [data-add], [data-reset], [data-files] button')) button.disabled = busy || automatic;
    el('[data-auto]').textContent = 'Автоматизация: ' + (automatic ? 'вкл.' : 'выкл.');
    el('[data-auto]').setAttribute('aria-pressed', String(automatic));
  }
  function stop() { automatic = false; clearTimeout(timer); if (!disposed) update(); }
  function evaluate(result, before, preview) {
    const completed = lessons.evaluate({ ...result, before, after: engine.snapshot(), automatic, preview });
    if (completed) {
      log('Задание выполнено: ' + completed.title);
      el('[data-feedback]').textContent = '✓ ' + completed.title + ' выполнено. ' +
        (lessons.current() ? 'Следующее: ' + lessons.current().title : 'Все учебные задания выполнены. Развивайте собственную стратегию!');
      lessonView.next(completed);
    } else {
      el('[data-feedback]').textContent = preview ? 'Проба: задания и прогресс не изменяются.' :
        lessons.current() ? 'Текущее задание: ' + lessons.current().title + '. Условие проверки указано в его карточке.' : 'Свободная стратегия: все учебные задания выполнены.';
    }
  }
  async function step(preview = false) {
    if (busy || disposed) return;
    busy = true; const mine = generation; update();
    const files = { ...save.files }, before = engine.snapshot();
    try {
      validateFiles(files);
      const result = await runtime.run(files, before, save.memory);
      if (disposed || mine !== generation) return;
      const candidate = new CityEngine(before); candidate.apply(result.operations);
      const memory = validateMemory(result.memory);
      result.logs.forEach(line => log((preview ? '[проба] ' : '') + line));
      if (preview) {
        const w = candidate.snapshot();
        log('[проба] Шаг ' + w.tick + ', баланс ' + money(w.balance) + '. Прогресс и память не изменены.');
        evaluate(result, before, true);
      } else {
        engine = candidate; save.memory = memory;
        evaluate(result, before, false); persist();
        log('Шаг ' + engine.snapshot().tick + ': выполнено команд — ' + result.operations.length + '.');
      }
    } catch (error) {
      if (disposed || mine !== generation) return;
      log('Ошибка: ' + error.message + ' Изменения шага отменены.');
      el('[data-feedback]').textContent = 'Шаг отменён: задания не засчитаны. Исправьте ошибку из вывода скрипта.';
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
  el('[data-wait]').addEventListener('click', () => {
    if (busy || automatic) return;
    const before = engine.snapshot(); engine.advance();
    evaluate({ reads: [], operations: [], logs: [], memory: save.memory, modules: [] }, before, false);
    persist(); log('Шаг ' + engine.snapshot().tick + ': ожидание.'); update();
  });
  el('[data-auto]').addEventListener('click', () => { if (automatic) stop(); else if (!busy) { automatic = true; update(); step(false); } });
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
    if (!window.confirm('Начать городской комбинат заново? Его деньги, файлы, память и задания будут очищены.')) return;
    stop(); generation++; runtime.cancel(); save = initialSave(); engine = new CityEngine(save.world); lessons = new CityLessons(save.tutorial);
    lessonView = new LessonView(el('[data-board]'), el('[data-task]'), lessons);
    file = 'index.js'; output.length = 0; el('[data-output]').textContent = ''; el('[data-feedback]').textContent = '';
    persist(); renderEditor(); renderFiles(); update();
  });
  root.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => {
    const selector = { task: '[data-task]', api: '[data-api]', world: '[data-world-panel]' }[button.dataset.jump];
    const target = el(selector); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  notice(loaded.warning);
  lessonView = new LessonView(el('[data-board]'), el('[data-task]'), lessons);
  mountReference(el('[data-api]')); renderEditor(); renderFiles(); update();
  log('Мастерская открыта. Начните с задания «1. Познакомьтесь с мастерской».');
  return () => {
    disposed = true; generation++; clearTimeout(timer); automatic = false; runtime.cancel(); editor?.dispose(); root.replaceChildren();
  };
}
