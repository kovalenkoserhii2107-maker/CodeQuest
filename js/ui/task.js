/**
 * Экран задачи: условие, теория, редактор кода и отчёт по тестам.
 */
import { QUESTS } from '../data/quests.js';
import { completeQuest, draftOf, isSolved, isPracticed, saveDraft } from '../state.js';
import { runSolution } from '../runner.js';
import { escapeHtml } from './html.js';
import { fillBar } from './charts.js';
import { createEditor } from './editor.js';

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
      <span class="trace__name">${escapeHtml(result.name)}</span>

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
 * Отрисовать экран задачи.
 * @param {object} quest задача
 * @param {{onOpenQuest: Function, onSolved: Function}} handlers
 */
export function renderTask(quest, { onOpenQuest, onSolved }) {
  const root = document.getElementById('task-root');
  const solved = isSolved(quest.id);

  let hintsShown = 0;

  root.innerHTML = `
    <div class="panel task__intro">
      <div class="panel__head">
        <div>
          <p class="task__crumbs mono">Задание ${quest.order} · ${escapeHtml(quest.topic)}</p>
          <h2 class="panel__title">${escapeHtml(quest.title)}</h2>
        </div>
        <span class="task__difficulty mono" title="Сложность ${quest.difficulty} из 5">${'★'.repeat(quest.difficulty)}${'☆'.repeat(5 - quest.difficulty)}</span>
        ${solved ? '<span class="badge badge--ok">решено</span>' : ''}
      </div>

      <p class="task__story">${escapeHtml(quest.story)}</p>

      ${quest.signature ? `<p class="task__signature mono">${escapeHtml(quest.signature)}</p>` : ''}
      <div class="task__brief">${briefHtml(quest.brief)}</div>

      <div class="task__reward mono">
        Награда: +${quest.reward.credits} ¢ · открывает раздел «${escapeHtml(quest.unlocks.label)}»
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

      <div class="task__actions">
        <button class="btn btn--primary" type="button" id="run">Запустить тесты</button>
        <button class="btn btn--ghost" type="button" id="hint">Подсказка</button>
        <button class="btn btn--ghost" type="button" id="reset-code">Вернуть заготовку</button>
        <button class="btn btn--danger btn--sm" type="button" id="reveal">Показать решение</button>
      </div>

      <div class="task__report" id="report"></div>
    </div>

    ${lessonHtml(quest)}
  `;

  const editor = createEditor(root.querySelector('#editor-host'), {
    value: draftOf(quest.id) ?? quest.starter,
    onInput: code => saveDraft(quest.id, code),
    onRun: () => run(),
  });

  const report = root.querySelector('#report');
  const hints = root.querySelector('#task-hints');

  function showReport(html) {
    report.innerHTML = html;
  }

  async function run() {
    showReport('<p class="report__pending">Запускаем тесты…</p>');
    const result = await runSolution(editor.getValue(), quest);

    if (result.error) {
      showReport(`<p class="report__error">${escapeHtml(result.error)}</p>`);
      return;
    }

    const passed = result.results.filter(item => item.pass).length;
    const logs = result.logs.length
      ? `<div class="report__console"><p class="report__console-title mono">console.log</p><pre>${escapeHtml(result.logs.join('\n'))}</pre></div>`
      : '';

    let banner = '';
    if (result.ok) {
      // Код передаём всегда: на нём работают разделы корпорации.
      const outcome = completeQuest(quest.id, { source: editor.getValue() });
      const practiceDone = isPracticed(quest.id);
      const next = nextQuest(quest);

      banner = practiceDone
        ? `
          <div class="report__success">
            <p class="report__success-title">Тесты пройдены${outcome ? `: +${outcome.credits} ¢, +${outcome.xp} XP` : ''}</p>
            <p class="report__success-text">Задание уже закрыто практикой — раздел «${escapeHtml(quest.unlocks.label)}» работает на вашем коде.</p>
            ${next ? `<button class="btn btn--primary btn--sm" type="button" id="next-quest">Следующее задание: ${escapeHtml(next.title)}</button>` : ''}
          </div>`
        : `
          <div class="report__success">
            <p class="report__success-title">Тесты пройдены${outcome ? `: +${outcome.credits} ¢, +${outcome.xp} XP` : ''}</p>
            <p class="report__success-text">
              Осталась практическая часть: ${escapeHtml(quest.practice.title.toLowerCase())}.
              Откройте консоль и выполните команду — объект попадёт в базу корпорации,
              и раздел «${escapeHtml(quest.unlocks.label)}» откроется.
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
      ${logs}
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
    if (hintsShown >= quest.hints.length) {
      root.querySelector('#hint').disabled = true;
    }
  });

  root.querySelector('#reset-code').addEventListener('click', () => {
    editor.setValue(quest.starter);
    saveDraft(quest.id, quest.starter);
    showReport('');
  });

  root.querySelector('#reveal').addEventListener('click', () => {
    const confirmed = window.confirm(
      'Показать эталонное решение? Задача засчитается с половинной наградой.',
    );
    if (!confirmed) return;

    editor.setValue(quest.solution);
    saveDraft(quest.id, quest.solution);
    const outcome = completeQuest(quest.id, { withSolution: true, source: quest.solution });
    if (outcome) onSolved(outcome);
    showReport(
      `<p class="report__note">Решение подставлено в редактор. Разберите его построчно и запустите тесты — ` +
      `так материал закрепится лучше.</p>`,
    );
  });
}
