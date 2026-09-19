/**
 * Консоль корпорации — практическая часть заданий.
 *
 * Здесь игрок вызывает свои функции с настоящими значениями: результат не
 * исчезает, а попадает в базу корпорации и открывает раздел интерфейса.
 * В области видимости — все решения, которые он уже написал, и объект corp
 * с реальными данными компании.
 */
import { QUESTS } from '../data/quests.js';
import {
  state, isSolved, isPracticed, currentQuest, solutionOf, markPracticed,
  setCorpRecord, pushConsoleHistory, spendCredits, addCrewMember, addLog,
  db, applyDbOps, panels,
} from '../state.js';
import { Shipyard } from '../shipyard.js';
import { LaborExchange } from '../crew.js';
import { runConsole } from '../runner.js';
import { escapeHtml } from './html.js';

const shipyard = new Shipyard();
const laborExchange = new LaborExchange();

let historyIndex = -1;

/** Код всех решённых заданий — он доступен в консоли. */
function playerSource() {
  return QUESTS.filter(quest => isSolved(quest.id))
    .map(quest => solutionOf(quest.id))
    .filter(Boolean)
    .join('\n\n');
}

/** Данные корпорации, доступные в команде как corp. */
function corpData() {
  const hiredIds = state.crew.map(member => member.id);
  return {
    corp: {
      credits: state.credits,
      commander: db.last('commanders')
        ? { ...db.last('commanders'), credits: state.credits, crew: state.crew.map(member => ({ ...member })) }
        : null,
      catalog: shipyard.getCatalog(),
      modules: state.inventory.map(item => ({ ...item })),
      crew: state.crew.map(member => ({ ...member })),
      candidates: laborExchange.getCandidates().filter(candidate => !hiredIds.includes(candidate.id)).map(c => ({ ...c })),
      warehouseCapacity: db.last('warehouses')?.capacity ?? null,
      ship: db.last('ships'),
      report: db.last('reports'),
    },
  };
}

/** Всё, что уходит в воркер: данные, снимок базы и список панелей. */
function consolePayload() {
  return { data: corpData(), dbStore: db.snapshot(), panels: panels() };
}

/** Что можно вызвать прямо сейчас — короткая справка сбоку. */
function availableFunctions() {
  return QUESTS.filter(quest => isSolved(quest.id)).map(quest => ({
    fn: quest.fn,
    title: quest.title,
    example: quest.practice.example,
  }));
}

/* --- Действия, которые консоль может совершить над корпорацией ----------- */

const commitApi = {
  setRecord: (key, value) => setCorpRecord(key, value),

  /** Найм по результату функции игрока: списываем ровно его сумму. */
  hireCandidate(candidateId, spent) {
    const candidate = laborExchange.getCandidates().find(item => item.id === candidateId);
    if (!candidate) return 'Кандидат не найден на бирже';
    if (!Number.isFinite(spent) || spent <= 0) return 'Ваша функция не списала кредиты — найм не засчитан';
    if (!spendCredits(spent)) return 'На счету не хватило кредитов';

    addCrewMember(laborExchange.hire(candidateId) ?? candidate);
    return `${candidate.name} принят в экипаж за ${spent.toLocaleString()} ¢`;
  },
};

/**
 * Проверка практики: если команда вызвала нужную функцию и результат
 * подошёл — задание закрывается и открывается раздел.
 */
function tryPractice(input, value) {
  const quest = currentQuest();
  if (!quest || !isSolved(quest.id) || isPracticed(quest.id)) return null;
  if (!input.includes(quest.fn)) return null;

  const context = corpData();
  const verdict = quest.practice.validate(value, context);
  if (verdict !== true) return { ok: false, message: verdict };

  const note = quest.practice.commit(value, commitApi, context);
  const result = markPracticed(quest.id, { note });
  return { ok: Boolean(result), message: note, quest };
}

/* --- Отрисовка ----------------------------------------------------------- */

function entryHtml(entry) {
  const output = entry.error
    ? `<p class="console__error">${escapeHtml(entry.error)}</p>`
    : `<p class="console__value mono">${escapeHtml(entry.preview ?? 'undefined')}</p>`;

  const logs = entry.logs?.length
    ? `<pre class="console__logs mono">${escapeHtml(entry.logs.join('\n'))}</pre>`
    : '';

  const note = entry.note
    ? `<p class="console__note">${escapeHtml(entry.note)}</p>`
    : '';

  const dbNote = entry.db
    ? `<p class="console__db">${escapeHtml(entry.db)}</p>`
    : '';

  const warn = entry.warn
    ? `<p class="console__warn">${escapeHtml(entry.warn)}</p>`
    : '';

  return `
    <div class="console__entry">
      <p class="console__command mono"><span class="console__prompt">›</span> ${escapeHtml(entry.input)}</p>
      ${output}
      ${logs}
      ${dbNote}
      ${note}
      ${warn}
    </div>`;
}

function renderOutput() {
  const host = document.getElementById('console-output');
  if (!host) return;

  const entries = state.consoleHistory;
  host.innerHTML = entries.length
    ? [...entries].reverse().map(entryHtml).join('')
    : `<p class="empty-state">Консоль пуста. Вызовите свою функцию — например, ${escapeHtml(
        currentQuest()?.practice.example ?? 'createCommander("Ваше имя")',
      )}</p>`;
  host.scrollTop = host.scrollHeight;
}

function renderSide() {
  const host = document.getElementById('console-side');
  if (!host) return;

  const quest = currentQuest();
  const needsPractice = quest && isSolved(quest.id) && !isPracticed(quest.id);

  const practiceCard = needsPractice
    ? `
      <div class="console__task">
        <p class="console__task-label">Практика задания ${quest.order}</p>
        <h3 class="console__task-title">${escapeHtml(quest.practice.title)}</h3>
        <p class="console__task-hint">${escapeHtml(quest.practice.hint)}</p>
        <code class="console__example mono">${escapeHtml(quest.practice.example)}</code>
        <button class="btn btn--primary btn--sm" type="button" id="console-fill">Подставить в строку</button>
      </div>`
    : quest
      ? `<p class="console__task-hint">Сначала пройдите тесты задания «${escapeHtml(quest.title)}» — после этого здесь появится практика.</p>`
      : '<p class="console__task-hint">Все задания закрыты. Консоль остаётся для экспериментов.</p>';

  const functions = availableFunctions();
  host.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Что делать</h3>
      <span class="panel__hint">практика</span>
    </div>
    ${practiceCard}
    <div class="console__reference">
      <p class="console__ref-title">Ваши функции</p>
      ${
        functions.length
          ? functions
              .map(item => `<button class="console__ref-item mono" type="button" data-fill="${escapeHtml(item.example)}">${escapeHtml(item.fn)}()</button>`)
              .join('')
          : '<p class="console__task-hint">Пока ни одна функция не написана.</p>'
      }
      <p class="console__ref-title">Данные корпорации</p>
      <p class="console__ref-list mono">corp.credits · corp.commander · corp.catalog · corp.modules · corp.crew · corp.candidates · corp.ship</p>
      <p class="console__ref-title">Бортовая база</p>
      <p class="console__ref-list mono">db.insert(коллекция, запись) · db.all(коллекция) · db.last(коллекция) · db.find(коллекция, условие) · db.count(коллекция)</p>
      <p class="console__ref-title">Свои панели</p>
      <p class="console__ref-list mono">dashboard.add(имя, функция) · dashboard.remove(имя)</p>
    </div>`;

  document.getElementById('console-fill')?.addEventListener('click', () => fillInput(quest.practice.example));
  for (const button of host.querySelectorAll('[data-fill]')) {
    button.addEventListener('click', () => fillInput(button.dataset.fill));
  }
}

function fillInput(text) {
  const input = document.getElementById('console-input');
  if (!input) return;
  input.value = text;
  input.focus();
  input.setSelectionRange(text.length, text.length);
}

/* --- Выполнение ---------------------------------------------------------- */

async function execute(input) {
  const source = playerSource();
  const result = await runConsole(source, input, consolePayload());

  // Операции над базой применяем к настоящему хранилищу
  const dbReport = applyDbOps(result.ops ?? []);

  const entry = {
    input,
    preview: result.preview,
    logs: result.logs,
    error: result.error,
    at: new Date().toISOString(),
  };

  const changes = [];
  if (dbReport.inserted) changes.push(`записей добавлено: ${dbReport.inserted}`);
  if (dbReport.updated) changes.push(`изменено: ${dbReport.updated}`);
  if (dbReport.removed) changes.push(`удалено: ${dbReport.removed}`);
  if (dbReport.panels) changes.push('панель обновлена');
  if (changes.length) entry.db = `База данных: ${changes.join(', ')}`;
  if (dbReport.errors.length) entry.warn = `База отказала: ${dbReport.errors.join('; ')}`;

  if (!result.error) {
    const practice = tryPractice(input, result.value);
    if (practice?.ok) entry.note = `✓ ${practice.message}`;
    else if (practice && !practice.ok) entry.warn = `Практика не засчитана: ${practice.message}`;
  }

  pushConsoleHistory(entry);
  historyIndex = -1;
  renderOutput();
  renderSide();
  return entry;
}

/** Отрисовать консоль и подключить обработчики. */
export function renderConsole() {
  renderOutput();
  renderSide();

  const form = document.getElementById('console-form');
  const input = document.getElementById('console-input');
  if (!form || !input || form.dataset.ready === 'yes') return;

  form.dataset.ready = 'yes';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;

    input.value = '';
    input.disabled = true;
    await execute(command);
    input.disabled = false;
    input.focus();
  });

  // Стрелки листают историю команд, как в настоящем терминале
  input.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const history = state.consoleHistory.map(entry => entry.input);
    if (history.length === 0) return;

    event.preventDefault();
    if (event.key === 'ArrowUp') historyIndex = Math.min(historyIndex + 1, history.length - 1);
    else historyIndex = Math.max(historyIndex - 1, -1);

    input.value = historyIndex === -1 ? '' : history[historyIndex];
    input.setSelectionRange(input.value.length, input.value.length);
  });
}
