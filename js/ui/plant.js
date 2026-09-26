/**
 * Второй акт: комбинат «Передел».
 *
 * Здесь игрок ведёт не функцию, а проект: слева глава и разбор, справа
 * файлы с редактором, снизу смена, которая считается его же кодом.
 * Раздел открывается, когда цепочка первого акта закрыта целиком.
 */
import { QUESTS } from '../data/quests.js';
import { CHAPTERS, chapterChain } from '../act2/chapters.js';
import { ScrapYard, KINDS } from '../act2/scrap.js';
import { runProject } from '../act2/runtime.js';
import {
  isQuestClosed, isChapterDone, completeChapter, projectFiles, projectEntries, projectEntry,
  openFile, setOpenFile, writeFile, saveFile, removeFile, recordShift, plantState, state,
} from '../state.js';
import { deepEqual, formatValue } from '../runner-core.js';
import { createEditor } from './editor.js';
import { escapeHtml } from './html.js';
import { fillBar } from './charts.js';
import { toast } from '../ui.js';

const yard = new ScrapYard();

/** Первый акт пройден целиком: только тогда открывается второй. */
export function isActOneDone() {
  return QUESTS.every(quest => isQuestClosed(quest.id));
}

export function closedQuests() {
  return QUESTS.filter(quest => isQuestClosed(quest.id)).length;
}

/** Текущая глава — первая незакрытая. */
export function currentChapter() {
  return chapterChain().find(chapter => !isChapterDone(chapter.id)) ?? null;
}

/* --- Проверка главы ------------------------------------------------------- */

/**
 * Короткая подпись вызова. Партия лома в JSON занимает полэкрана,
 * поэтому длинные аргументы сворачиваются до размера.
 */
export function describeCall({ fn, args = [] }) {
  const shown = args.map(arg => {
    if (Array.isArray(arg)) return `партия из ${arg.length}`;
    const text = formatValue(arg);
    return text.length > 24 ? `${text.slice(0, 21)}…` : text;
  });

  return `${fn}(${shown.join(', ')})`;
}

/**
 * Прогнать главу на проекте игрока: сперва структура, потом поведение.
 * Структура идёт первой намеренно — если файла нет, запускать нечего.
 *
 * @returns {Promise<{structure: Array, checks: Array, ok: boolean, logs: Array, error: string|null}>}
 */
export async function runChapterChecks(chapter, files) {
  const structure = chapter.structure.map(rule => ({
    name: rule.name,
    fix: rule.fix ?? '',
    pass: Boolean(rule.test(files)),
  }));

  if (structure.some(rule => !rule.pass)) {
    return { structure, checks: [], ok: false, logs: [], error: null };
  }

  const entries = Object.entries(files);
  const checks = [];
  const logs = [];

  for (const item of chapter.checks) {
    const result = await runProject({
      files: entries,
      entry: item.entry ?? projectEntry(),
      fn: item.fn,
      args: item.args,
    });

    logs.push(...result.logs);

    if (result.error) {
      checks.push({ name: item.name, call: describeCall(item), pass: false, error: result.error });
      // Ошибка сборки одинакова для всех проверок — дальше гонять нечего
      if (/ProjectError|точки входа|по кругу|такого файла/.test(result.error)) {
        return { structure, checks, ok: false, logs, error: result.error };
      }
      continue;
    }

    checks.push({
      name: item.name,
      call: describeCall(item),
      pass: deepEqual(result.value, item.expected),
      expected: formatValue(item.expected),
      actual: formatValue(result.value),
      error: null,
    });
  }

  return {
    structure,
    checks,
    ok: checks.length > 0 && checks.every(item => item.pass),
    logs,
    error: null,
  };
}

/* --- Разметка ------------------------------------------------------------- */

/**
 * Заметка о порядке: второй акт открыт сразу, но задуман как продолжение.
 * Показывается, только пока цепочка первого акта не закрыта.
 */
function orderNoteHtml() {
  if (isActOneDone()) return '';

  const closed = closedQuests();

  return `
    <p class="widget__note">
      Комбинат открыт заранее: первый акт пройден на ${closed} из ${QUESTS.length} заданий.
      Задуман он как продолжение — здесь пригодится всё, что вы уже написали, — но
      проходить его можно независимо.
    </p>`;
}

function lessonHtml(chapter) {
  return `
    <details class="lesson">
      <summary>Разбор темы: ${escapeHtml(chapter.topic)}</summary>
      ${chapter.lesson.map(part => `
        <div class="lesson__part">
          <h4 class="lesson__title">${escapeHtml(part.title)}</h4>
          <p class="lesson__text">${escapeHtml(part.text)}</p>
          ${part.code ? `<pre class="lesson__code mono">${escapeHtml(part.code)}</pre>` : ''}
        </div>`).join('')}
    </details>`;
}

function briefHtml(text) {
  return String(text)
    .split('\n')
    .map(line => (line.trim().startsWith('•')
      ? `<li>${escapeHtml(line.replace(/^\s*•\s*/, ''))}</li>`
      : `<p>${escapeHtml(line)}</p>`))
    .join('')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
}

function filesHtml(files, current) {
  const entry = projectEntry();

  return Object.keys(files).sort().map(path => `
    <li class="filetree__item ${path === current ? 'is-open' : ''}">
      <button class="filetree__name mono" type="button" data-open="${escapeHtml(path)}">
        ${escapeHtml(path)}${path === entry ? ' <span class="filetree__tag">вход</span>' : ''}
      </button>
      ${
        path === entry
          ? ''
          : `<button class="filetree__drop" type="button" data-drop="${escapeHtml(path)}" aria-label="Удалить ${escapeHtml(path)}">×</button>`
      }
    </li>`).join('');
}

/** Одна строка вывода: те же классы, что и в панели задания первого акта. */
function logLine(line) {
  const level = line?.level ?? 'log';
  const mark = { warn: '⚠', error: '✖' }[level] ?? '›';

  return `<p class="log log--${escapeHtml(level)}"><span class="log__mark">${mark}</span><span class="log__text">${escapeHtml(String(line?.text ?? ''))}</span></p>`;
}

function reportHtml(report) {
  const parts = [];

  const brokenRules = report.structure.filter(rule => !rule.pass);
  if (brokenRules.length) {
    parts.push('<p class="log log--group is-fail"><span class="log__text">проект ещё не собран так, как нужно главе</span></p>');
    parts.push(...brokenRules.map(rule => logLine({ level: 'error', text: `${rule.name} — ${rule.fix}` })));
    return parts.join('');
  }

  parts.push('<p class="log log--group"><span class="log__text">структура проекта в порядке</span></p>');

  for (const item of report.checks) {
    parts.push(`<p class="log log--group ${item.pass ? '' : 'is-fail'}"><span class="log__text">${item.pass ? '✓' : '✗'} ${escapeHtml(item.name)} · ${escapeHtml(item.call)}</span></p>`);
    if (item.error) parts.push(logLine({ level: 'error', text: item.error }));
    else if (!item.pass) parts.push(logLine({ level: 'warn', text: `ждали ${item.expected}, получили ${item.actual}` }));
  }

  if (report.logs.length) {
    parts.push('<p class="log log--group"><span class="log__text">вывод проекта</span></p>');
    parts.push(...report.logs.map(logLine));
  }

  const passed = report.checks.filter(item => item.pass).length;
  parts.push(`<p class="log log--summary ${report.ok ? 'is-ok' : 'is-fail'}"><span class="log__text">${
    report.ok ? `глава пройдена: ${passed} из ${report.checks.length}` : `пройдено ${passed} из ${report.checks.length}`
  }</span></p>`);

  return parts.join('');
}

function shiftHtml() {
  const plant = plantState();
  const batch = yard.getBatch(plant.shifts + 1);
  const total = batch.reduce((sum, item) => sum + item.mass, 0);

  return `
    <div class="panel__head">
      <h3 class="panel__title">Смена ${plant.shifts + 1}</h3>
      <span class="panel__hint">партия на приёмке</span>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Позиция</th><th>Вид</th><th class="table__num">Масса</th></tr></thead>
        <tbody>
          ${batch.map(item => `
            <tr>
              <td class="mono">${escapeHtml(item.id)}</td>
              <td>${escapeHtml(KINDS[item.kind] ?? item.kind)}</td>
              <td class="table__num">${item.mass} т</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="widget__row"><span>Всего в партии</span><b class="mono">${total} т</b></div>
    <div class="widget__row"><span>Смен закрыто</span><b class="mono">${plant.shifts}</b></div>
    <div class="widget__row"><span>Металла получено</span><b class="mono">${plant.metal} т</b></div>
    <div class="widget__row"><span>Заработано</span><b class="mono">${plant.earned.toLocaleString()} ¢</b></div>

    <div class="task__actions">
      <button class="btn btn--primary btn--sm" type="button" id="plant-run-shift">Провести смену</button>
    </div>
    <div id="plant-shift-result"></div>`;
}

/* --- Экран ---------------------------------------------------------------- */

let editor = null;
let generation = 0;

/*
 * Успешная проверка перерисовывает экран — иначе следующая глава не появится.
 * Чтобы отчёт не исчезал вместе со старой разметкой, он ждёт здесь и
 * попадает в новую панель вывода.
 */
let pendingOutput = null;

/** Главы, для которых игрок посмотрел решение: награда за них половинная. */
const revealed = new Set();

export function renderPlant() {
  const root = document.getElementById('plant-root');
  if (!root) return;

  generation += 1;
  const mine = generation;

  if (editor) {
    editor.dispose();
    editor = null;
  }

  const chapter = currentChapter();

  // Заготовки главы кладутся в проект один раз — дальше это уже файлы игрока
  if (chapter?.starters) {
    for (const [path, text] of Object.entries(chapter.starters)) {
      if (projectFiles()[path] === undefined) writeFile(path, text);
    }
  }

  const files = projectFiles();
  const current = openFile();
  const done = CHAPTERS.filter(item => isChapterDone(item.id)).length;

  root.innerHTML = `
    <div class="plant">
      <div class="panel plant__chapter">
        <div class="panel__head">
          <h3 class="panel__title">${chapter ? escapeHtml(chapter.title) : 'Комбинат работает'}</h3>
          <span class="panel__hint">${chapter ? `глава ${chapter.order} из ${CHAPTERS.length}` : 'все главы пройдены'}</span>
        </div>
        ${orderNoteHtml()}
        ${fillBar({ value: done, max: CHAPTERS.length, label: 'Глав пройдено', unit: 'шт', tone: 'progress' })}
        ${
          chapter
            ? `
              <p class="task__story">${escapeHtml(chapter.story)}</p>
              <div class="task__brief">${briefHtml(chapter.brief)}</div>
              <div class="task__reward mono">Награда: +${chapter.reward.credits} ¢</div>
              ${lessonHtml(chapter)}
              <div class="task__hints" id="plant-hints"></div>`
            : '<p class="widget__note">Проект собран: линия работает на вашем коде. Проводите смены — комбинат зарабатывает.</p>'
        }
      </div>

      <div class="panel plant__workspace">
        <div class="panel__head">
          <h3 class="panel__title">Проект</h3>
          <span class="panel__hint mono">точка входа ${escapeHtml(projectEntry())}</span>
        </div>

        <div class="plant__files">
          <ul class="filetree">${filesHtml(files, current)}</ul>
          <button class="btn btn--ghost btn--sm" type="button" id="plant-new-file">Новый файл</button>
        </div>

        <div id="plant-editor"></div>

        <section class="task__console" aria-label="Вывод проекта">
          <header class="task__console-head">
            <span class="task__console-title mono">Вывод</span>
            <span class="task__console-hint mono" id="plant-output-hint"></span>
          </header>
          <div class="task__console-body" id="plant-output" aria-live="polite"></div>
        </section>

        <div class="task__actions task__actions--primary">
          <button class="btn btn--primary" type="button" id="plant-check">Проверить главу</button>
          ${chapter ? '<button class="btn btn--ghost" type="button" id="plant-hint">Подсказка</button>' : ''}
          ${chapter ? '<button class="btn btn--danger btn--sm" type="button" id="plant-solution">Показать решение</button>' : ''}
        </div>
      </div>

      <div class="panel plant__shift" id="plant-shift">${shiftHtml()}</div>
    </div>`;

  const output = root.querySelector('#plant-output');
  const outputHint = root.querySelector('#plant-output-hint');
  const EMPTY = '<p class="log log--empty">Здесь появится, что напечатал проект и чем ответили проверки.</p>';
  output.innerHTML = EMPTY;

  const showOutput = (html, hint = '') => {
    output.innerHTML = html || EMPTY;
    outputHint.textContent = hint;
    output.scrollTop = 0;
  };

  if (pendingOutput) {
    showOutput(pendingOutput.html, pendingOutput.hint);
    pendingOutput = null;
  }

  if (!current) return;

  let openPath = current;
  editor = createEditor(root.querySelector('#plant-editor'), {
    value: files[openPath] ?? '',
    filename: openPath,
    siblings: files,
    onInput: code => saveFile(openPath, code),
    onRun: () => check(),
  });

  /* --- Файлы --- */

  for (const button of root.querySelectorAll('[data-open]')) {
    button.addEventListener('click', () => {
      const path = button.dataset.open;
      if (path === openPath) return;

      saveFile(openPath, editor.getValue());
      openPath = path;              // сначала переключаем, потом пишем: иначе текст уедет не в тот файл
      setOpenFile(path);
      editor.setValue(projectFiles()[path] ?? '');
      editor.syncSiblings?.(projectFiles());
      for (const item of root.querySelectorAll('.filetree__item')) {
        item.classList.toggle('is-open', item.contains(button));
      }
    });
  }

  for (const button of root.querySelectorAll('[data-drop]')) {
    button.addEventListener('click', () => {
      const path = button.dataset.drop;
      if (!window.confirm(`Удалить ${path}? Файл и его код пропадут.`)) return;
      saveFile(openPath, editor.getValue());
      removeFile(path);
      renderPlant();
    });
  }

  root.querySelector('#plant-new-file').addEventListener('click', () => {
    const name = window.prompt('Имя файла, например sort.js');
    if (!name) return;

    saveFile(openPath, editor.getValue());
    const created = writeFile(name, `// ${name}\n`);
    if (!created) {
      toast('Имя не подходит: буквы, цифры, точка и .js на конце');
      return;
    }
    setOpenFile(created);
    renderPlant();
  });

  /* --- Проверка главы --- */

  async function check() {
    if (!chapter) {
      showOutput('<p class="log log--empty">Главы кончились: остались смены.</p>');
      return;
    }

    saveFile(openPath, editor.getValue());
    editor.syncSiblings?.(projectFiles());
    showOutput('<p class="log log--empty">Собираем проект…</p>');

    const report = await runChapterChecks(chapter, projectFiles());
    if (mine !== generation) return;

    const hint = new Date().toLocaleTimeString('ru');
    showOutput(reportHtml(report), hint);

    if (!report.ok) return;

    // Награда за подсмотренное решение половинная — как и в первом акте
    const factor = revealed.has(chapter.id) ? 0.5 : 1;
    const outcome = completeChapter(chapter.id, {
      credits: Math.round(chapter.reward.credits * factor),
      xp: Math.round(chapter.reward.xp * factor),
    });
    if (outcome) toast(`Глава пройдена: +${outcome.credits} ¢`);

    pendingOutput = { html: reportHtml(report), hint };
    renderPlant();
  }

  root.querySelector('#plant-check').addEventListener('click', check);

  let hintsShown = 0;
  const hintButton = root.querySelector('#plant-hint');
  if (hintButton) {
    hintButton.addEventListener('click', () => {
      if (!chapter || hintsShown >= chapter.hints.length) return;
      hintsShown += 1;
      root.querySelector('#plant-hints').innerHTML = chapter.hints
        .slice(0, hintsShown)
        .map(hint => `<p class="task__hint">💡 ${escapeHtml(hint)}</p>`)
        .join('');
    });
  }

  const solutionButton = root.querySelector('#plant-solution');
  if (solutionButton) {
    solutionButton.addEventListener('click', () => {
      if (!chapter || !window.confirm('Показать готовые файлы главы? Награда за неё уменьшится вдвое.')) return;

      saveFile(openPath, editor.getValue());
      for (const [path, text] of Object.entries(chapter.solution)) writeFile(path, text);
      revealed.add(chapter.id);
      pendingOutput = {
        html: logLine({ level: 'warn', text: 'Файлы главы заполнены готовым решением: награда будет половинной' }),
        hint: 'решение показано',
      };
      renderPlant();
    });
  }

  /* --- Смена --- */

  root.querySelector('#plant-run-shift').addEventListener('click', async () => {
    saveFile(openPath, editor.getValue());

    const plant = plantState();
    const batch = yard.getBatch(plant.shifts + 1);
    const result = await runProject({
      files: projectEntries(),
      entry: projectEntry(),
      fn: 'runShift',
      args: [batch],
    });
    if (mine !== generation) return;

    const host = root.querySelector('#plant-shift-result');
    if (result.error) {
      showOutput(logLine({ level: 'error', text: result.error }), 'смена не прошла');
      host.innerHTML = `<p class="widget__note">Смена не состоялась: линия работает на вашем коде, а он не запустился.</p>`;
      return;
    }

    const value = result.value ?? {};
    const metal = Number(value.металл) || 0;
    const earned = Number(value.выручка) || 0;

    showOutput(
      [...result.logs.map(logLine), `<p class="log log--summary is-ok"><span class="log__text">смена посчитана: ${metal} т, ${earned} ¢</span></p>`].join(''),
      'прогон смены',
    );

    host.innerHTML = `
      <div class="widget__row"><span>Принято</span><b class="mono">${escapeHtml(formatValue(value.принято))} т</b></div>
      <div class="widget__row"><span>Металл</span><b class="mono">${metal} т</b></div>
      <div class="widget__row"><span>Выручка</span><b class="mono ${earned > 0 ? 'is-ok' : ''}">${earned.toLocaleString()} ¢</b></div>
      ${
        earned > 0
          ? '<div class="task__actions"><button class="btn btn--primary btn--sm" type="button" id="plant-close-shift">Закрыть смену</button></div>'
          : '<p class="widget__note">Выручки нет: её считает ваш проект — поле «выручка» появляется в третьей главе.</p>'
      }`;

    const closeButton = host.querySelector('#plant-close-shift');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        recordShift({ metal, earned, note: `смена ${plant.shifts + 1}` });
        toast(`Смена закрыта: +${earned.toLocaleString()} ¢`);
        pendingOutput = {
          html: `<p class="log log--summary is-ok"><span class="log__text">смена ${plant.shifts + 1} закрыта: ${metal} т металла, +${earned.toLocaleString()} ¢</span></p>`,
          hint: 'смена закрыта',
        };
        renderPlant();
      });
    }
  });
}
