/**
 * Экран задачи: условие, теория, редактор кода и отчёт по тестам.
 */
import { MODULE_BY_ID } from '../data/modules.js';
import { SECTORS, QUESTS } from '../data/quests.js';
import { completeQuest, draftOf, isSolved, saveDraft } from '../state.js';
import { runSolution } from '../runner.js';

const escapeHtml = value =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

function sectorName(sectorId) {
  return SECTORS.find(sector => sector.id === sectorId)?.name ?? '';
}

/** Следующая нерешённая задача — чтобы было куда идти после победы. */
function nextQuest(current) {
  const index = QUESTS.findIndex(quest => quest.id === current.id);
  return QUESTS.slice(index + 1).find(quest => !isSolved(quest.id)) ?? null;
}

/** Табуляция в textarea вместо перехода по фокусу. */
function enableTabIndent(textarea) {
  textarea.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const { selectionStart, selectionEnd, value } = textarea;
    textarea.value = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
    textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
  });
}

/** Отчёт по одному тесту. */
function testRow(result) {
  const status = result.pass ? 'ok' : 'fail';
  const detail = result.error
    ? `<span class="test-row__detail">Ошибка: ${escapeHtml(result.error)}</span>`
    : result.pass
      ? ''
      : `<span class="test-row__detail">ожидалось <b>${escapeHtml(result.expected)}</b>, получено <b>${escapeHtml(result.actual)}</b></span>`;

  return `
    <li class="test-row test-row--${status}">
      <span class="test-row__mark" aria-hidden="true">${result.pass ? '✓' : '✗'}</span>
      <span class="test-row__body">
        <span class="test-row__name">${escapeHtml(result.name)}</span>
        <span class="test-row__call mono">${escapeHtml(result.call)}</span>
        ${detail}
      </span>
    </li>
  `;
}

/**
 * Отрисовать экран задачи.
 * @param {object} quest задача
 * @param {{onOpenQuest: Function, onSolved: Function}} handlers
 */
export function renderTask(quest, { onOpenQuest, onSolved }) {
  const root = document.getElementById('task-root');
  const solved = isSolved(quest.id);
  const module = MODULE_BY_ID[quest.module];
  let hintsShown = 0;

  root.innerHTML = `
    <div class="panel task__intro">
      <div class="panel__head">
        <div>
          <p class="task__crumbs mono">${escapeHtml(sectorName(quest.sector))} · ${escapeHtml(quest.topic)}</p>
          <h2 class="panel__title">${escapeHtml(quest.title)}</h2>
        </div>
        <span class="task__difficulty mono" title="Сложность ${quest.difficulty} из 5">${'★'.repeat(quest.difficulty)}${'☆'.repeat(5 - quest.difficulty)}</span>
        ${solved ? '<span class="badge badge--ok">решено</span>' : ''}
      </div>

      <p class="task__brief">${escapeHtml(quest.brief).replaceAll('\n', '<br>')}</p>

      <div class="task__reward mono">
        Награда: +${quest.reward.credits} ¢ · +${quest.reward.xp} XP · улучшает модуль «${escapeHtml(module.name)}»
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

      <label class="visually-hidden" for="code">Код решения</label>
      <textarea id="code" class="code-editor mono" spellcheck="false" autocomplete="off"></textarea>

      <div class="task__actions">
        <button class="btn btn--primary" type="button" id="run">Запустить тесты</button>
        <button class="btn btn--ghost" type="button" id="hint">Подсказка</button>
        <button class="btn btn--ghost" type="button" id="reset-code">Вернуть заготовку</button>
        <button class="btn btn--danger btn--sm" type="button" id="reveal">Показать решение</button>
      </div>

      <div class="task__report" id="report"></div>
    </div>
  `;

  const textarea = root.querySelector('#code');
  textarea.value = draftOf(quest.id) ?? quest.starter;
  enableTabIndent(textarea);
  textarea.addEventListener('input', () => saveDraft(quest.id, textarea.value));

  const report = root.querySelector('#report');
  const hints = root.querySelector('#task-hints');

  function showReport(html) {
    report.innerHTML = html;
  }

  async function run() {
    showReport('<p class="report__pending">Запускаем тесты…</p>');
    const result = await runSolution(textarea.value, quest);

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
      const alreadySolved = isSolved(quest.id);
      const outcome = alreadySolved ? null : completeQuest(quest.id);
      const next = nextQuest(quest);
      banner = `
        <div class="report__success">
          <p class="report__success-title">Все тесты пройдены${outcome ? `: +${outcome.credits} ¢, +${outcome.xp} XP` : ''}</p>
          <p class="report__success-text">${
            outcome
              ? `Модуль «${escapeHtml(module.name)}» улучшен.`
              : 'Задача уже была засчитана раньше — награда не повторяется.'
          }</p>
          ${next ? `<button class="btn btn--primary btn--sm" type="button" id="next-quest">Следующая задача: ${escapeHtml(next.title)}</button>` : ''}
        </div>
      `;
      if (outcome) onSolved(outcome);
    }

    showReport(`
      ${banner}
      <p class="report__summary mono">Пройдено ${passed} из ${result.results.length}</p>
      <ul class="test-list">${result.results.map(testRow).join('')}</ul>
      ${logs}
    `);

    const nextButton = report.querySelector('#next-quest');
    if (nextButton) nextButton.addEventListener('click', () => onOpenQuest(nextQuest(quest).id));
  }

  root.querySelector('#run').addEventListener('click', run);
  textarea.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      run();
    }
  });

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
    textarea.value = quest.starter;
    saveDraft(quest.id, quest.starter);
    showReport('');
  });

  root.querySelector('#reveal').addEventListener('click', () => {
    const confirmed = window.confirm(
      'Показать эталонное решение? Задача засчитается с половинной наградой.',
    );
    if (!confirmed) return;

    textarea.value = quest.solution;
    saveDraft(quest.id, quest.solution);
    const outcome = completeQuest(quest.id, { withSolution: true });
    if (outcome) onSolved(outcome);
    showReport(
      `<p class="report__note">Решение подставлено в редактор. Разберите его построчно и запустите тесты — ` +
      `так материал закрепится лучше.</p>`,
    );
  });
}
