/**
 * Экран задачи: условие, теория, редактор кода и отчёт по тестам.
 */
import { QUESTS, questById } from '../data/quests.js';
import {
  completeQuest, draftOf, isSolved, isPracticed, saveDraft, solutionOf, previousStageOf, stagesOf, revisionsOf, state,
} from '../state.js';
import { runSolution } from '../runner.js';
import { escapeHtml } from './html.js';
import { fillBar } from './charts.js';
import { lineDiff } from '../editor/diff.js';
import { createEditor } from './editor.js';

let activeEditor = null;
let renderGeneration = 0;
export function disposeTask() {
  renderGeneration++;
  activeEditor?.dispose();
  activeEditor = null;
}

/** Следующее задание цепочки — чтобы было куда идти после победы. */
function nextQuest(current) {
  return [...QUESTS]
    .sort((a, b) => a.order - b.order)
    .find(quest => quest.order > current.order && !isSolved(quest.id)) ?? null;
}

/**
 * Ход выполнения: один шаг — один тест.
 *
 * В шаге видно всё, что нужно для разбора: что ушло в функцию, что она
 * вернула и чем это отличается от ожидаемого. Шаги проявляются по очереди,
 * поэтому прогон читается как процесс, а не как готовая таблица.
 */
function traceStep(result, index) {
  const state = result.pass ? 'ok' : 'fail';
  const kept = result.inherited ?? result.name.includes('прежнее поведение');

  // Пройденный тест показываем сжато, провалившийся — подробно:
  // разбирают всегда именно его, и там важна каждая строка.
  const call = result.pass ? result.call : (result.callPretty ?? result.call);
  const out = result.error
    ? result.error
    : (result.pass ? result.actual : (result.actualPretty ?? result.actual));

  const diff = Array.isArray(result.diff) && result.diff.length
    ? `<ul class="trace__diff">${result.diff.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
    : '';

  const expected = result.pass
    ? ''
    : `
      <div class="trace__expected">
        <p class="trace__label mono">ждали</p>
        <pre class="trace__code mono">${escapeHtml(result.expectedPretty ?? result.expected)}</pre>
      </div>`;

  return `
    <li class="trace__step trace__step--${state}" style="animation-delay: ${index * 90}ms">
      <span class="trace__index mono" aria-hidden="true">${result.pass ? '✓' : '✗'}</span>
      <span class="trace__name">
        ${escapeHtml(result.name)}
        ${kept ? '<span class="badge badge--idle">регрессия</span>' : ''}
      </span>

      <div class="trace__in">
        <p class="trace__label mono">вызов</p>
        <pre class="trace__code mono">${escapeHtml(call)}</pre>
      </div>

      <span class="trace__arrow" aria-hidden="true">→</span>

      <div class="trace__out">
        <p class="trace__label mono">${result.error ? 'ошибка' : 'получили'}</p>
        <pre class="trace__code mono">${escapeHtml(out)}</pre>
      </div>

      ${expected}
      ${diff ? `<div class="trace__verdict"><p class="trace__label mono">что не так</p>${diff}</div>` : ''}
    </li>`;
}

/** Лента прогона целиком. */
function traceStrip(results) {
  if (results.length === 0) return '';

  return `
    <div class="trace">
      <p class="trace__title mono">Ход выполнения</p>
      <ol class="trace__steps">
        ${results.map((result, index) => traceStep(result, index)).join('')}
      </ol>
    </div>`;
}

/**
 * Условие задачи в разметку.
 *
 * Строки, начинающиеся с «•», собираются в список, остальные остаются
 * абзацами: сплошной текст с переносами читается заметно хуже.
 */
function briefHtml(brief) {
  const blocks = [];
  let list = [];

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(`<ul class="task__list">${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    list = [];
  };

  for (const rawLine of String(brief).split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('•')) {
      list.push(line.slice(1).trim());
      continue;
    }
    flushList();
    if (line) blocks.push(`<p>${escapeHtml(line)}</p>`);
  }
  flushList();

  return blocks.join('');
}

/**
 * Разбор темы: короткий урок перед задачей.
 *
 * Теория в списке «что понадобится» — это напоминание для того, кто тему
 * уже знает. Разбор нужен тому, кто видит её впервые: объяснение своими
 * словами и рабочий пример, который можно прочитать построчно.
 */
function lessonHtml(quest) {
  if (!Array.isArray(quest.lesson) || quest.lesson.length === 0) return '';

  return `
    <details class="panel task__lesson" open>
      <summary>Разбор темы: ${escapeHtml(quest.topic)}</summary>
      <div class="lesson__grid">
      ${quest.lesson
        .map(block => `
          <section class="lesson__block">
            <h4 class="lesson__title">${escapeHtml(block.title)}</h4>
            <p class="lesson__text">${escapeHtml(block.text)}</p>
            ${block.code ? `<pre class="lesson__code mono">${escapeHtml(block.code)}</pre>` : ''}
          </section>`)
        .join('')}
      </div>
    </details>`;
}

/**
 * Код, с которого игрок начинает задание.
 *
 * У доработки это его собственное решение прошлого этапа: переписывать
 * заново нечего, менять нужно одно-два места. Черновик, если он есть,
 * всегда важнее — человек мог уже начать.
 */
function startingCode(quest) {
  const draft = draftOf(quest.id);
  if (draft !== null) return draft;

  if (isSolved(quest.id) && solutionOf(quest.id)) return solutionOf(quest.id);

  if (quest.extends) {
    const inherited = solutionOf(quest.extends);
    if (inherited) return inherited;
  }

  return quest.starter;
}

/** Блок «что уже работает, что меняется, что добавить». */
function changesHtml(quest) {
  if (!quest.extends) return '';

  const stages = stagesOf(quest.fn);
  const index = stages.findIndex(item => item.id === quest.id);
  const previous = previousStageOf(quest.id);
  const changes = quest.changes ?? {};

  return `
    <div class="task__evolution">
      <p class="task__evolution-label">
        Доработка функции ${escapeHtml(quest.fn)} · этап ${index + 1} из ${stages.length}
      </p>
      <dl class="evolution">
        ${changes.works ? `<dt>Уже работает</dt><dd>${escapeHtml(changes.works)}</dd>` : ''}
        ${changes.changed ? `<dt>Что изменилось</dt><dd>${escapeHtml(changes.changed)}</dd>` : ''}
        ${changes.todo ? `<dt>Что добавить</dt><dd>${escapeHtml(changes.todo)}</dd>` : ''}
      </dl>
      ${
        previous && solutionOf(previous.id)
          ? `<div class="task__actions task__actions--tight">
               <button class="btn btn--ghost btn--sm" type="button" id="show-previous">
                 Предыдущая версия
               </button>
               <button class="btn btn--ghost btn--sm" type="button" id="restore-previous">
                 Вернуть её в редактор
               </button>
             </div>
             <div id="previous-version"></div>`
          : ''
      }
    </div>`;
}

/** Построчное сравнение двух версий — что добавилось и что ушло. */
function diffHtml(before, after) {
  const rows = lineDiff(String(before), String(after));

  if (rows.length === 0) return '<p class="widget__note">Версии совпадают строка в строку.</p>';

  return `
    <pre class="diff mono">${rows
      .map(row => `<span class="diff__line diff__line--${row.kind}">${row.sign} ${escapeHtml(row.line)}</span>`)
      .join('\n')}</pre>`;
}

/* --- Панель вывода -------------------------------------------------------- */

/*
 * Здесь видно, как работает код: строки console.log идут по группам —
 * под каждым вызовом свои, — а ошибки и итог проверок ложатся в тот же
 * поток. Отдельно от разбора тестов: разбор отвечает «что не так»,
 * а вывод — «что происходило».
 */

/** Одна строка вывода. Уровень решает, как её подсветить. */
function logLine(line, prefix = '') {
  const level = typeof line === 'string' ? 'log' : (line?.level ?? 'log');
  const text = typeof line === 'string' ? line : String(line?.text ?? '');
  const mark = { warn: '⚠', error: '✖' }[level] ?? '›';

  return `
    <p class="log log--${escapeHtml(level)}">
      <span class="log__mark" aria-hidden="true">${mark}</span>
      <span class="log__text">${escapeHtml(prefix + text)}</span>
    </p>`;
}

/** Заголовок группы: какой вызов напечатал следующие строки. */
function logGroup(title, state = '') {
  return `<p class="log log--group ${state}"><span class="log__text">${escapeHtml(title)}</span></p>`;
}

/** Строка-итог под всем выводом. */
function logSummary(text, state) {
  return `<p class="log log--summary ${state}"><span class="log__text">${escapeHtml(text)}</span></p>`;
}

/**
 * Собрать вывод одного прогона: сперва то, что напечатал сам модуль,
 * потом по группе на каждый вызов, у которого есть что показать.
 */
export function runOutput(result) {
  const parts = [];

  if (result.error) {
    parts.push(logLine({ level: 'error', text: result.error }));
    if (result.logs?.length) parts.push(...result.logs.map(line => logLine(line)));
    return parts.join('');
  }

  if (result.setupLogs?.length) {
    parts.push(logGroup('при загрузке модуля'));
    parts.push(...result.setupLogs.map(line => logLine(line)));
  }

  for (const item of result.results) {
    const own = item.logs ?? [];
    // Молчаливая пройденная проверка в выводе не нужна: её место в разборе
    if (own.length === 0 && item.pass && !item.error) continue;

    // У проверок с выражением подпись и вызов совпадают — не дублируем
    const title = item.call && item.call !== item.name ? `${item.name} · ${item.call}` : item.name;
    parts.push(logGroup(`${item.pass ? '✓' : '✗'} ${title}`, item.pass ? '' : 'is-fail'));
    parts.push(...own.map(line => logLine(line)));
    if (item.error) parts.push(logLine({ level: 'error', text: item.error }));
    else if (!item.pass) {
      parts.push(logLine({ level: 'warn', text: `ждали ${item.expected}, получили ${item.actual}` }));
    }
  }

  const passed = result.results.filter(item => item.pass).length;
  const total = result.results.length;
  parts.push(logSummary(
    result.ok
      ? `все проверки пройдены: ${passed} из ${total}`
      : `пройдено ${passed} из ${total} — разбор ниже`,
    result.ok ? 'is-ok' : 'is-fail',
  ));

  return parts.join('');
}

/**
 * Отрисовать экран задачи.
 * @param {object} quest задача
 * @param {{onOpenQuest: Function, onSolved: Function}} handlers
 */
export function renderTask(quest, { onOpenQuest, onSolved }) {
  disposeTask();
  const generation = renderGeneration;
  let running = false;
  let revealed = Boolean(state.solved[quest.id]?.withSolution);
  const root = document.getElementById('task-root');
  const solved = isSolved(quest.id);

  let hintsShown = 0;

  root.innerHTML = `
    <div class="workspace-sizing" aria-label="Размеры рабочего места">
      <label>Ширина задания <input id="workspace-width" type="range" min="28" max="55" value="38" aria-label="Ширина задания в процентах"></label>
      <label>Высота <input id="workspace-height" type="range" min="400" max="900" step="20" value="600" aria-label="Высота рабочего места в пикселях"></label>
      <button class="btn btn--ghost btn--sm" id="workspace-reset" type="button">Сбросить размеры</button>
    </div>
    <div class="task-workspace">
    <div class="panel task__intro" tabindex="0" aria-label="Описание задания">

      <div class="panel__head">
        <div>
          <p class="task__crumbs mono">Задание ${quest.order} · ${escapeHtml(quest.topic)}</p>
          <h2 class="panel__title">${escapeHtml(quest.title)}</h2>
        </div>
        <span class="task__difficulty mono" title="Сложность ${quest.difficulty} из 5">${'★'.repeat(quest.difficulty)}${'☆'.repeat(5 - quest.difficulty)}</span>
        ${solved ? '<span class="badge badge--ok">решено</span>' : ''}
      </div>

      <p class="task__story">${escapeHtml(quest.story)}</p>

      ${changesHtml(quest)}

      ${quest.signature ? `<p class="task__signature mono">${escapeHtml(quest.signature)}</p>` : ''}
      <div class="task__brief">${briefHtml(quest.brief)}</div>

      <div class="task__reward mono">
        Награда: +${quest.reward.credits} ¢ · ${
          quest.unlocks
            ? `открывает раздел «${escapeHtml(quest.unlocks.label)}»`
            : `улучшает ${escapeHtml(quest.fn)} во всём приложении`
        }
      </div>

      <div class="task__practice">
        <p class="task__practice-label">Практика после тестов</p>
        <p>${escapeHtml(quest.practice.hint)}</p>
        <code class="console__example mono">${escapeHtml(quest.practice.example)}</code>
      </div>

      <details class="task__theory" open>
        <summary>Что понадобится</summary>
        <ul>${quest.theory.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      </details>

      <div class="task__hints" id="task-hints"></div>
    </div>

    <div class="panel task__editor">
      <div class="panel__head">
        <h3 class="panel__title">Редактор</h3>
        <span class="panel__hint">Ctrl + Enter — запустить тесты</span>
      </div>


      <div id="editor-host"></div>

      <section class="task__console" id="run-console" aria-label="Вывод кода">
        <header class="task__console-head">
          <span class="task__console-title mono">Вывод</span>
          <span class="task__console-hint mono" id="run-console-hint"></span>
          <button class="btn btn--ghost btn--sm" type="button" id="run-console-clear">Очистить</button>
        </header>
        <div class="task__console-body" id="run-console-body" aria-live="polite"></div>
      </section>

      <div class="task__actions task__actions--primary">
        <button class="btn btn--primary" type="button" id="run">Запустить тесты</button>
        <button class="btn btn--ghost" type="button" id="hint">Подсказка</button>
      </div>
    </div>
    </div>
    <section class="panel workspace-extras" aria-label="Дополнительные инструменты">
      <h3 class="panel__title">Инструменты и результаты</h3>
      <div id="editor-tools"></div>
      <details class="workspace-history"><summary>История проверенных версий</summary>
        <p class="widget__note">Восстановление открывает версию в черновике. Рабочий код обновится после успешных проверок.</p>
        <select id="revision-select" aria-label="Проверенная версия"></select>
        <button id="restore-revision" class="btn btn--ghost btn--sm" type="button">Открыть в редакторе</button>
      </details>

      <div class="task__actions">
        <button class="btn btn--ghost" type="button" id="reset-code">Вернуть заготовку</button>
        <button class="btn btn--danger btn--sm" type="button" id="reveal">Показать решение</button>
      </div>

      <div class="task__report" id="report"></div>
    </section>

    ${lessonHtml(quest)}
  `;

  const workspace = root.querySelector('.task-workspace');
  const widthControl = root.querySelector('#workspace-width');
  const heightControl = root.querySelector('#workspace-height');
  const defaultHeight = Math.max(400, Math.min(700, window.innerHeight - 220));
  let size = { width: 38, height: defaultHeight };
  try { size = { ...size, ...JSON.parse(localStorage.getItem('codequest.workspace') || '{}') }; } catch {}
  widthControl.value = String(Math.max(28, Math.min(55, Number(size.width) || 38)));
  heightControl.value = String(Math.max(400, Math.min(900, Number(size.height) || defaultHeight)));
  function resizeWorkspace() {
    workspace.style.setProperty('--task-width', `${widthControl.value}%`);
    workspace.style.setProperty('--workspace-height', `${heightControl.value}px`);
    try { localStorage.setItem('codequest.workspace', JSON.stringify({ width: +widthControl.value, height: +heightControl.value })); } catch {}
  }
  widthControl.addEventListener('input', resizeWorkspace);
  heightControl.addEventListener('input', resizeWorkspace);
  root.querySelector('#workspace-reset').addEventListener('click', () => {
    widthControl.value = '38'; heightControl.value = String(defaultHeight); resizeWorkspace();
  });
  resizeWorkspace();

  const editor = createEditor(root.querySelector('#editor-host'), {
    value: startingCode(quest),
    toolsContainer: root.querySelector('#editor-tools'),
    filename: `${quest.fn}.js`, functionName: quest.fn,
    onInput: code => saveDraft(quest.id, code),
    onRun: () => run(),
  });

  activeEditor = editor;
  function renderHistory() {
    const history = revisionsOf(quest.id);
    const select = root.querySelector('#revision-select');
    select.innerHTML = history.length ? history.map((item,index)=>`<option value="${index}">Версия ${index+1} · ${item.at ? escapeHtml(new Date(item.at).toLocaleString('ru')) : 'из сохранения'}</option>`).reverse().join('') : '<option>Проверенных версий пока нет</option>';
    root.querySelector('#restore-revision').disabled = !history.length;
  }
  renderHistory();
  root.querySelector('#restore-revision').addEventListener('click',()=>{
    const revision = revisionsOf(quest.id)[Number(root.querySelector('#revision-select').value)];
    if (revision) { editor.setValue(revision.source); saveDraft(quest.id,revision.source); }
  });
  const report = root.querySelector('#report');
  const hints = root.querySelector('#task-hints');

  function showReport(html) {
    report.innerHTML = html;
    if (html && !html.includes('report__pending')) {
      editor.collapse();
      report.scrollIntoView({ block: 'nearest' });
    }
  }

  const consoleBody = root.querySelector('#run-console-body');
  const consoleHint = root.querySelector('#run-console-hint');

  const EMPTY_OUTPUT = '<p class="log log--empty">Пусто. Всё, что напечатает console.log, появится здесь.</p>';

  /** Показать вывод прогона. Пустая строка возвращает панель в исходное состояние. */
  function showOutput(html, hint = '') {
    consoleBody.innerHTML = html || EMPTY_OUTPUT;
    consoleHint.textContent = hint;
    // Читать вывод начинают сверху: это один прогон, а не бесконечная лента
    consoleBody.scrollTop = 0;
  }

  showOutput('');
  root.querySelector('#run-console-clear').addEventListener('click', () => showOutput(''));

  // Консоль должна стоять вплотную к коду, а не под справочником,
  // поэтому переносим её сразу под строку состояния редактора
  const statusLine = root.querySelector('#editor-host .workspace-status');
  if (statusLine) statusLine.after(root.querySelector('#run-console'));

  async function run() {
    if (running) return;
    running = true;
    const source = editor.getValue();
    const usedSolution = revealed;
    root.querySelector('#run').disabled = true;
    showReport('<p class="report__pending">Проверяем модуль и совместимость приложения…</p>');
    showOutput('<p class="log log--empty">Запуск…</p>', '');
    let result;
    try { result = await runSolution(source, quest); }
    catch (error) { result = { error: error.message }; }
    finally { running = false; if (generation === renderGeneration) root.querySelector('#run').disabled = false; }
    if (generation !== renderGeneration) return;
    if (editor.getValue() !== source) {
      showReport('<p class="report__note">Пока шли проверки, код изменился. Рабочая версия сохранена без изменений. Запустите тесты текущего черновика.</p>');
      showOutput('');
      return;
    }

    const runTime = new Date().toLocaleTimeString('ru');

    if (result.error) {
      showReport(`<p class="report__error">${escapeHtml(result.error)}</p>`);
      showOutput(runOutput(result), `запуск ${runTime} · код не выполнился`);
      return;
    }

    const passed = result.results.filter(item => item.pass).length;
    showOutput(runOutput(result), `запуск ${runTime} · ${passed} из ${result.results.length}`);

    let banner = '';
    if (result.ok) {
      // Код передаём всегда: на нём работают разделы корпорации.
      const outcome = completeQuest(quest.id, { source, withSolution: usedSolution });
      renderHistory();
      const practiceDone = isPracticed(quest.id);
      const next = nextQuest(quest);

      banner = practiceDone
        ? `
          <div class="report__success">
            <p class="report__success-title">Тесты пройдены${outcome ? `: +${outcome.credits} ¢, +${outcome.xp} XP` : ''}</p>
            <p class="report__success-text">Задание уже закрыто практикой — ${
              quest.unlocks
                ? `раздел «${escapeHtml(quest.unlocks.label)}» работает на вашем коде`
                : `новая версия ${escapeHtml(quest.fn)} уже работает в приложении`
            }.</p>
            ${next ? `<button class="btn btn--primary btn--sm" type="button" id="next-quest">Следующее задание: ${escapeHtml(next.title)}</button>` : ''}
          </div>`
        : `
          <div class="report__success">
            <p class="report__success-title">Тесты пройдены${outcome ? `: +${outcome.credits} ¢, +${outcome.xp} XP` : ''}</p>
            <p class="report__success-text">
              Осталась практическая часть: ${escapeHtml(quest.practice.title.toLowerCase())}.
              Откройте консоль и выполните команду${
                quest.unlocks
                  ? ` — объект попадёт в базу корпорации, и раздел «${escapeHtml(quest.unlocks.label)}» откроется`
                  : ' — сохраните результат применения новой версии'
              }.
            </p>
            <code class="console__example mono">${escapeHtml(quest.practice.example)}</code>
            <a class="btn btn--primary btn--sm" href="#/console">Перейти в консоль</a>
          </div>`;

      if (outcome) onSolved(outcome);
    }

    showReport(`
      ${banner}
      ${fillBar({ value: passed, max: result.results.length, label: 'Пройдено тестов', unit: 'шт', tone: 'progress' })}
      ${traceStrip(result.results)}
    `);

    const nextButton = report.querySelector('#next-quest');
    if (nextButton) nextButton.addEventListener('click', () => onOpenQuest(nextQuest(quest).id));
  }

  root.querySelector('#run').addEventListener('click', run);

  root.querySelector('#hint').addEventListener('click', () => {
    if (hintsShown >= quest.hints.length) return;
    hintsShown += 1;
    hints.innerHTML = quest.hints
      .slice(0, hintsShown)
      .map(hint => `<p class="task__hint">💡 ${escapeHtml(hint)}</p>`)
      .join('');
    hints.scrollIntoView({ block: 'nearest' });
    if (hintsShown >= quest.hints.length) {
      root.querySelector('#hint').disabled = true;
    }
  });

  root.querySelector('#reset-code').addEventListener('click', () => {
    const base = quest.extends ? (solutionOf(quest.extends) ?? quest.starter) : quest.starter;
    editor.setValue(base);
    saveDraft(quest.id, base);
    showReport('');
  });

  // Предыдущая версия: посмотреть, сравнить, вернуть в редактор
  const previous = previousStageOf(quest.id);
  const previousSource = previous ? solutionOf(previous.id) : null;
  const previousHost = root.querySelector('#previous-version');

  root.querySelector('#show-previous')?.addEventListener('click', () => {
    if (!previousHost) return;

    previousHost.innerHTML = previousHost.innerHTML
      ? ''
      : `
        <p class="task__evolution-label">Версия из задания «${escapeHtml(previous.title)}»</p>
        <pre class="lesson__code mono">${escapeHtml(previousSource)}</pre>
        <p class="task__evolution-label">Что изменилось в редакторе</p>
        ${diffHtml(previousSource, editor.getValue())}`;
  });

  root.querySelector('#restore-previous')?.addEventListener('click', () => {
    editor.setValue(previousSource);
    saveDraft(quest.id, previousSource);
    showReport('<p class="report__note">Предыдущая версия возвращена в редактор. Рабочий код корпорации не менялся.</p>');
  });

  root.querySelector('#reveal').addEventListener('click', () => {
    const confirmed = window.confirm(
      'Открыть учебный пример? Разберите его и запустите проверки. Награда за этот этап будет половинной.',
    );
    if (!confirmed) return;

    editor.setValue(quest.solution);
    saveDraft(quest.id, quest.solution);
    revealed = true;
    showReport(
      `<p class="report__note">Решение подставлено в редактор. Разберите его построчно и запустите тесты — ` +
      `после этого самостоятельно измените входные данные и объясните результат в консоли.</p>`,
    );
  });
}
