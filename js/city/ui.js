import { WorkspaceLayout } from './workspace-layout.js';
import { NetworkView } from './network-view.js';
import { PracticeView } from './practice-ui.js';
import { CityConsole } from './console-view.js';
import { CityNavigation } from './navigation.js';
import { RegionMap } from './region-map.js';
import { CityWorldView } from './world-view.js';
import { RunFeedback } from './run-feedback.js';
import { ProjectFiles } from './project.js';
import { ProjectExplorer } from './explorer.js';
import { DashboardController } from './dashboard-controller.js';
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
const money = value => number(value) + ' $';
const statuses = { available: 'Доступен', active: 'Принят', cooldown: 'Обновляется' };

export function mountCity(root) {
  let storage;
  try { storage = localStorage; } catch { /* readCitySave reports inaccessible storage */ }
  const loaded = readCitySave(storage);
  let save = loaded.save, engine = new CityEngine(save.world), lessons = new CityLessons(save.tutorial), project = new ProjectFiles(save.files,save.workspace), editor, file = project.active(), explorer, dashboards;
  let reference, practiceView;
  const openAPI = path => { navigation.open('api');reference?.open(path); };
  let disposed = false, busy = false, automatic = false, timer, generation = 0, lessonView, savedEngine = engine;
  const runtime = new CityRuntime();
  root.innerHTML = [
    '<header class="city-header"><div><p class="campaign-eyebrow">CodeQuest / песочница</p>',
    '<h1>Городской комбинат</h1><p>Ваша мастерская. Ваша стратегия. Ваш JavaScript.</p></div>',
    '<a href="#/campaigns" class="city-button">Выбор кампании</a></header>',
    '<p class="city-notice" data-notice role="status"></p>',
    '<details class="city-orientation city-panel"><summary>Как устроен мир · краткая инструкция</summary>',
    '<p>Вы владелец городской мастерской. Покупайте лом, превращайте его в товары и выбирайте между продажей на рынке, заказами города и доставкой в другие районы.</p>',
    '<ol class="city-world-cycle"><li><strong>1. Прочитать</strong><span>Получите состояние через cq.world.getState().</span></li>',
    '<li><strong>2. Решить</strong><span>Проверьте деньги, сырьё, спрос и оборудование.</span></li>',
    '<li><strong>3. Действовать</strong><span>Вызовите команды в main(cq). Они выполняются по порядку.</span></li>',
    '<li><strong>4. Перевести время</strong><span>После успешного запуска мир проходит один шаг: партии и доставки продвигаются.</span></li></ol>',
    '<p class="city-muted">Пробный запуск ничего не сохраняет. Ошибка отменяет весь шаг. «Пропустить шаг» двигает время без выполнения кода.</p>',
    '<div class="city-shortcuts"><button type="button" data-jump="task">Текущее задание</button><button type="button" data-jump="api">Справочник API</button><button type="button" data-jump="world">Мастерская и рынок</button></div>',
    '</details>',
    '<nav class="city-section-nav" aria-label="Разделы комбината"><button type="button" data-jump="workspace">Код и дашборды</button><button type="button" data-jump="task">Задания</button><button type="button" data-jump="world">Рынки</button><button type="button" data-jump="orders">Отложенные продажи</button><button type="button" data-jump="api">API</button></nav>',
    '<div class="city-metrics" data-metrics></div><div class="city-alerts" data-alerts aria-label="Подсказки по состоянию мира"></div>',
    '<div class="city-grid"><div class="city-primary">',
    '<section class="city-workspace city-panel" data-workspace aria-labelledby="city-code-title">',
    '<p class="city-current-task"><span>Сейчас</span> <strong data-current-lesson></strong> <button type="button" data-jump="task">Открыть задание</button></p>',
    '<div class="city-panel-heading"><h2 id="city-code-title">Рабочее пространство</h2><div class="city-ide-modes"><button type="button" data-mode="code">Код</button><button type="button" data-mode="dashboard">Дашборд</button><button type="button" data-mode="split" aria-pressed="true">Вместе</button><button type="button" data-add>+ Файл</button></div></div>',
    '<div class="city-actions"><button type="button" data-run>Запустить шаг</button>',
    '<button type="button" data-preview>Пробный запуск</button>',
    '<button type="button" data-auto aria-pressed="false">Автоматизация: выкл.</button>',
    '<button type="button" data-wait>Пропустить шаг</button><button type="button" data-cancel disabled>Отменить запуск</button></div>',
    '<div class="city-run-status" data-run-status role="status" aria-live="polite"><strong>Готово к запуску</strong><span>index.js меняет мир · дашборд читает данные</span></div><p class="city-save-status" data-save-status role="status">Сохранение в этом браузере</p>',
    '<div class="city-layout-tools"><button type="button" data-layout-swap>Консоль наверх ↑</button><button type="button" data-layout-reset>Сбросить размеры панелей</button><span data-layout-status role="status">Потяните границы панелей · стрелки меняют размер</span></div><div class="city-ide" data-ide data-mode="split"><aside class="city-files-panel"><div class="city-explorer" data-explorer></div></aside><div class="city-ide-editor"><div class="city-files" data-files role="group" aria-label="Вкладки файлов"></div><div data-editor></div><p class="city-project-path" data-project-status></p></div><div class="city-output-stack"><div class="city-dashboard-shell"><section class="city-dashboard-panel" data-dashboard aria-label="Мои дашборды"></section></div><section data-console></section></div></div>',
    '<p class="city-muted">main(cq) вызывается один раз на шаг. Автоматизация повторяет проект через секунду после завершения предыдущего запуска. При выходе в меню мир останавливается.</p>',
    '<p class="city-lesson-feedback" data-feedback role="status"></p>',
    '</section><section class="city-panel city-task" data-task aria-label="Учебное задание"></section></div><aside class="city-side">',
    '<section class="city-panel" data-board></section>',
    '<section class="city-panel city-network" data-network aria-label="Сеть предприятия"></section>',
    '<section class="city-panel" data-world-panel><h2>Центральная мастерская и рынки</h2><p class="city-muted">Здесь показан центральный склад. Филиалы имеют собственные inventory и lines в сети предприятия.</p><div class="city-market-filters"><label>Товар<select data-market-product><option value="">Все товары</option>' + Object.entries(PRODUCTS).map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('') + '</select></label><label>Регион<select data-market-region><option value="">Все регионы</option><option value="city">Город</option><option value="port">Порт</option><option value="highlands">Северные высоты</option></select></label></div><div data-world></div></section>',
    '<section class="city-panel"><h2>Городские контракты</h2><div data-contracts></div>',
    '<p class="city-muted">Два заказа одновременно. Сдайте до deadline; просрочка не списывает деньги. После выполнения заказ обновляется через 5 шагов.</p></section>',
    '<section class="city-panel"><h2>Доставка и исследования</h2><div data-expansion></div></section>',
    '<section class="city-panel"><h2>Регионы мира</h2><div data-regions></div></section>',
    '<section class="city-panel" data-orders-panel><h2>Отложенные продажи</h2><div data-orders></div></section>',
    '<section class="city-panel"><h2>Аналитика и планирование</h2><div data-costs></div></section>',
    '</aside></div>',
    '<section class="city-panel"><h2>Что возвращает getState()</h2>',
    '<p class="city-muted">Это снимок для чтения: изменение его полей не меняет мир. Используйте команды API. Программные ID товаров: scrap (лом), metal (металл), parts (детали), wire (провод), circuit (схемы).</p>',
    '<dl class="city-state-fields"><dt>balance, tick</dt><dd>Баланс в долларах США (USD) и текущий номер шага.</dd>',
    '<dt>inventory, capacity</dt><dd>Готовые товары центральной мастерской и её вместимость. getFreeSpace() учитывает партии и входящие внутренние перевозки.</dd>',
    '<dt>lines</dt><dd>Массив независимых линий: id, level, job. Для свободной линии job=null.</dd>',
    '<dt>buyers, supplier</dt><dd>Цены, спрос покупателей и запас поставщика. Для remote-покупателей нужна доставка.</dd>',
    '<dt>contracts, shipments, research</dt><dd>Принятые заказы, грузы в пути, ID открытых технологий. Каталоги и подробности — в соответствующих разделах API.</dd>',
    '<dt>network</dt><dd>Филиалы, внутренние перевозки, уровень транспорта. getSites() включает центральную мастерскую; network.sites в сохранении содержит филиалы.</dd><dt>metrics</dt><dd>Куплено, произведено, продано, доставлено, выполнено контрактов, выручка и все расходы.</dd></dl>',
    '<details><summary>Посмотреть текущее состояние целиком</summary><pre class="city-state-json" data-snapshot></pre></details></section>',
    '<section class="city-panel city-api" data-api></section>',
    '<section class="city-panel"><h2>Управление сохранением</h2><p class="city-muted">Мир, файлы, память и выполненные задания комбината сохраняются отдельно от космической кампании.</p>',
    '<button type="button" class="city-reset" data-reset>Начать комбинат заново</button></section>'
  ].join('');
  const el = selector => root.querySelector(selector);
  const navigation=new CityNavigation(root),regionMap=new RegionMap(el('[data-region-map]'),openAPI);
  function notice(message) { el('[data-notice]').textContent = message; el('[data-notice]').hidden = !message; }
  const consoleView = new CityConsole(el('[data-console]'),(path,line,column)=>{if(project.files()[path]===undefined){notice('Файл '+path+' отсутствует в проекте.');return;}openFile(path);editor?.goToLine(line,column);});
  function log(message, level='system', stack='') { consoleView.write({text:message,level,stack},{source:'Мир',tick:engine.getTime()}); }
  function scriptLog(source,tick) { return entry => { if(!disposed) consoleView.write(entry,{source,tick}); }; }
  function persist() {
    if (savedEngine !== engine || save.world.tick !== engine.getTime()) save.world = engine.snapshot();
    savedEngine = engine; save.tutorial = lessons.snapshot(); save.files=project.files();save.workspace=project.workspace();if(dashboards)save.dashboards=dashboards.snapshot();
    try {
      if (!storage) throw new Error('storage unavailable');
      storage.setItem(CITY_SAVE_KEY, JSON.stringify(save));
      el('[data-save-status]').textContent = 'Сохранено в этом браузере'; el('[data-save-status]').dataset.state = 'saved';
    } catch { el('[data-save-status]').textContent = 'Не удалось сохранить'; el('[data-save-status]').dataset.state = 'error'; notice('Не удалось сохранить прогресс. Не закрывайте страницу, если хотите продолжить.'); }
  }
  function openFile(path){if(busy||automatic)return;navigation.open('workspace');if(project.workspace().mode==='dashboard')setMode('split');if(path===file){editor?.focus();return;}project.open(path);file=path;renderEditor();renderFiles();explorer?.select(path);persist();}
  function renderFiles(){
    const root=el('[data-files]');root.replaceChildren();
    for(const path of project.workspace().tabs){
      const tab=document.createElement('span');tab.className='city-file-tab';const button=document.createElement('button');button.type='button';button.textContent=path;button.setAttribute('aria-pressed',String(path===file));button.onclick=()=>openFile(path);tab.append(button);
      if(path!=='index.js'){const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Закрыть вкладку '+path);close.onclick=()=>{if(busy||automatic)return;const previous=file;project.close(path);file=project.active();if(previous!==file)renderEditor();renderFiles();explorer?.select(file);persist();};tab.append(close);}
      root.append(tab);
    }
    el('[data-run]').textContent = busy ? 'Выполняется…' : file.startsWith('dashboards/') ? 'Запустить index.js' : 'Запустить шаг';
    el('[data-project-status]').textContent='codequest / '+file+' · запуск мира: index.js · черновик сохраняется';
  }
  function renderEditor(force=false){
    if(editor&&!force){editor.openFile(file,project.files()[file],project.files());return;}
    if(force)editor?.collapse();editor?.dispose();editor=createEditor(el('[data-editor]'),{filename:file,value:project.files()[file],siblings:project.files(),includeLiveFunctions:false,extraDeclarations:API_TYPES,
      onInput:code=>{try{project.write(file,code);practiceView?.invalidate();editor?.syncSiblings(project.files());persist();dashboards?.schedule();}catch(e){notice(e.message+' Черновик не сохранён.');}},
      onRun:()=>{if(!automatic){if(file.startsWith('dashboards/'))dashboards.refresh();else step(false);}}
    });
  }
  function mountProjectTools(){
    explorer=new ProjectExplorer(el('[data-explorer]'),project,{isLocked:()=>busy||automatic,onError:notice,onSelect:openFile,onChange:change=>{const next=project.active();if(file!==next||change.rename){file=next;renderEditor();}else editor?.syncSiblings(project.files());dashboards?.sync(change);persist();renderFiles();dashboards?.refresh();}});
    dashboards=new DashboardController(el('[data-dashboard]'),{preferences:save.dashboards,onLog:(entry,context)=>consoleView.write(entry,context),getFiles:()=>project.files(),getWorld:()=>engine.snapshot(),getMemory:()=>save.memory,
      onSave:prefs=>{save.dashboards=prefs;persist();},onOpen:openFile,onCreate:(path,code)=>{if(busy||automatic)throw new Error('Остановите запуск перед изменением файлов.');project.create(path,code);file=path;if(project.workspace().mode==='dashboard')setMode('split');renderEditor();renderFiles();explorer.select(path);persist();}
    });
  }
  const mountPractice=()=>{
    practiceView?.dispose();
    const section=el('[data-practice-area]')||document.createElement('section');
    section.dataset.practiceArea='';section.className='city-panel city-practice';el('[data-page="task"]').append(section);
    practiceView=new PracticeView(section,{getFiles:()=>project.files(),getWorld:()=>engine.snapshot(),getMemory:()=>save.memory,isLocked:()=>busy||automatic,onLog:(entry,context)=>consoleView.write(entry,context),onPrepare:(path,starter)=>{if(project.files()[path]===undefined){project.create(path,starter);editor?.syncSiblings(project.files());explorer.render();}openFile(path);}});
  };
  const workspaceLayout = new WorkspaceLayout(root, storage);
  const worldView = new CityWorldView(root), networkView = new NetworkView(el('[data-network]'),openAPI);
  function updateWorld() { worldView.render(engine);regionMap.render(engine);networkView.render(engine); }
  function update() {
    updateWorld(); lessonView.render();explorer?.render();
    el('[data-current-lesson]').textContent = lessons.current()?.title || 'Свободная стратегия';
    el('[data-workspace]').setAttribute('aria-busy', String(busy));
    el('[data-cancel]').disabled = !busy;
    el('[data-run]').textContent = busy ? 'Выполняется…' : file.startsWith('dashboards/') ? 'Запустить index.js' : 'Запустить шаг';
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
    busy = true; const mine = generation, startedAt = performance.now(); update();
    feedback.pending(preview);
    const files = { ...project.files(), [file]: editor.getValue() }, before = engine.snapshot();
    try {
      validateFiles(files);
      const result = await runtime.run(files, before, save.memory,{onLog:scriptLog(preview?'Проба index.js':'index.js',before.tick)});
      if (disposed || mine !== generation) return;
      const candidate = new CityEngine(before); candidate.apply(result.operations);
      const memory = validateMemory(result.memory);
      if (preview) {
        const w = candidate.snapshot();
        log('[проба] Шаг ' + w.tick + ', баланс ' + money(w.balance) + '. Прогресс и память не изменены.');
        evaluate(result, before, true); feedback.success(before, candidate.snapshot(), result.operations.length, performance.now()-startedAt, true);
      } else {
        engine = candidate; save.memory = memory;
        evaluate(result, before, false); persist();dashboards.refresh(); feedback.success(before, engine.snapshot(), result.operations.length, performance.now()-startedAt, false);
        log('Шаг ' + engine.snapshot().tick + ': выполнено команд — ' + result.operations.length + '.');
      }
    } catch (error) {
      if (disposed || mine !== generation) return;
      log('Ошибка: ' + error.message + ' Изменения шага отменены.','error',error.scriptStack);
      el('[data-feedback]').textContent = 'Шаг отменён: задания не засчитаны. Исправьте ошибку из консоли JavaScript.';
      feedback.error(error.message); stop();
    } finally {
      if (!disposed && mine === generation) {
        busy = false; update();
        if (automatic) timer = setTimeout(() => step(false), 1000);
      }
    }
  }
  const feedback = new RunFeedback(el('[data-run-status]'));
  el('[data-cancel]').onclick = () => { stop(); runtime.cancel(); };
  el('[data-run]').addEventListener('click', () => step(false));
  el('[data-preview]').addEventListener('click', () => step(true));
  el('[data-wait]').addEventListener('click', () => {
    if (busy || automatic) return;
    const before = engine.snapshot(); engine.advance();
    evaluate({ reads: [], operations: [], logs: [], memory: save.memory, modules: [] }, before, false);
    persist(); feedback.success(before, engine.snapshot(), 0, 0, false); log('Шаг ' + engine.snapshot().tick + ': ожидание.'); update();dashboards.refresh();
  });
  el('[data-auto]').addEventListener('click', () => { if (automatic) stop(); else if (!busy) { automatic = true; update(); step(false); } });
  el('[data-add]').onclick=()=>{const path=prompt('Путь JavaScript-файла (например strategies/trade.js):','strategy.js');if(!path)return;try{project.create(path);file=path;persist();renderEditor();renderFiles();explorer.select(path);dashboards.sync();update();}catch(e){notice(e.message);}};
  el('[data-reset]').addEventListener('click', () => {
    if (!window.confirm('Начать городской комбинат заново? Его деньги, файлы, память и задания будут очищены.')) return;
    stop(); generation++; runtime.cancel();dashboards.dispose();save=initialSave();engine=new CityEngine(save.world);lessons=new CityLessons(save.tutorial);project=new ProjectFiles(save.files,save.workspace);dashboards=null;
    lessonView = new LessonView(el('[data-board]'), el('[data-task]'), lessons, openAPI);
    el('[data-ide]').dataset.mode = 'split'; root.querySelectorAll('.city-ide-modes [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode==='split')));
    feedback.show('ready','Новая мастерская','Начните с первого задания.');
    file = 'index.js'; consoleView.clear(); el('[data-feedback]').textContent = '';
    persist(); renderEditor(true); renderFiles();mountProjectTools();mountPractice();update();
  });
  root.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => {
    navigation.open(button.dataset.jump);
    const selector = { workspace: '[data-workspace]', task: '[data-task]', api: '[data-api]', world: '[data-region-map]', orders: '[data-orders-panel]' }[button.dataset.jump];
    const target = el(selector); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  function setMode(mode){project.setMode(mode);persist();el('[data-ide]').dataset.mode=mode;root.querySelectorAll('.city-ide-modes [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));}
  root.querySelectorAll('.city-ide-modes [data-mode]').forEach(button=>button.onclick=()=>setMode(button.dataset.mode));
  el('[data-ide]').dataset.mode = project.workspace().mode;
  root.querySelectorAll('.city-ide-modes [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===project.workspace().mode)));
  notice(loaded.warning);
  lessonView = new LessonView(el('[data-board]'), el('[data-task]'), lessons, openAPI);
  reference = mountReference(el('[data-api]'));
  const backToCode = ()=>{navigation.open('workspace');if(project.workspace().mode==='dashboard')setMode('code');el('[data-workspace]').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});editor?.focus();};
  const goToPractice=()=>{navigation.open('task');el('[data-practice-area]').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  root.addEventListener('city-api-practice',goToPractice);
  root.addEventListener('city-api-back',backToCode); renderEditor(); renderFiles();mountProjectTools();mountPractice();update();
  log('Мастерская открыта. Текущее задание: '+(lessons.current()?.title||'Свободная стратегия')+'.');
  return () => {
    root.removeEventListener('city-api-back',backToCode);
    root.removeEventListener('city-api-practice',goToPractice);
    reference.dispose();workspaceLayout.dispose();disposed = true; generation++; clearTimeout(timer); automatic = false; runtime.cancel();dashboards.dispose();practiceView.dispose();consoleView.dispose();editor?.dispose();root.replaceChildren();
  };
}
