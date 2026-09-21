/**
 * Автопроверка цепочки заданий (запуск: node tests/check-quests.mjs).
 *
 * Проверяет, что:
 *  1. эталонное решение каждого задания проходит его тесты;
 *  2. заготовка кода тесты НЕ проходит;
 *  3. цепочка непрерывна: порядок 1…N без дыр и повторов;
 *  4. каждое задание открывает свой раздел, и этот раздел есть в интерфейсе;
 *  5. у каждого задания есть практика: команда для консоли и проверка результата.
 */
import { readFileSync } from 'node:fs';
import { QUESTS, questById, testsOf, stageChain } from '../js/data/quests.js';
import { runQuestTests } from '../js/runner-core.js';

let failures = 0;
const fail = message => {
  failures += 1;
  console.error('✖', message);
};

/* --- 1–2. Решения и заготовки -------------------------------------------- */

for (const quest of QUESTS) {
  const report = await runQuestTests(quest.solution, { fn: quest.fn, tests: testsOf(quest) });
  if (!report.ok) {
    const details = report.error ?? report.results
      .filter(result => !result.pass)
      .map(result => `${result.name}: ожидалось ${result.expected}, получено ${result.actual ?? result.error}`)
      .join('; ');
    fail(`Решение задания «${quest.title}» не проходит тесты — ${details}`);
  } else {
    const own = quest.tests.length;
    const total = report.results.length;
    console.log(`✓ ${quest.order}. ${quest.id}: ${total} тест(ов)${total > own ? ` (из них ${total - own} на прежнее поведение)` : ''}`);
  }

  const starter = await runQuestTests(quest.starter, { fn: quest.fn, tests: testsOf(quest) });
  if (starter.ok) fail(`Заготовка задания ${quest.id} проходит тесты — задание бессмысленно`);
}

/* --- 3. Непрерывность цепочки -------------------------------------------- */

const orders = QUESTS.map(quest => quest.order).sort((a, b) => a - b);
const expected = QUESTS.map((_, index) => index + 1);
if (JSON.stringify(orders) !== JSON.stringify(expected)) {
  fail(`Порядок заданий с дырами или повторами: ${orders.join(', ')}`);
}

const ids = new Set(QUESTS.map(quest => quest.id));
if (ids.size !== QUESTS.length) fail('Идентификаторы заданий повторяются');

for (const quest of QUESTS) {
  const required = ['story', 'brief', 'theory', 'fn', 'starter', 'solution', 'hints', 'tests', 'practice', 'signature', 'lesson'];
  if (!quest.extends) required.push('unlocks');

  for (const field of required) {
    if (!quest[field] || (Array.isArray(quest[field]) && quest[field].length === 0)) {
      fail(`У задания ${quest.id} не заполнено поле ${field}`);
    }
  }
  if (quest.reward?.credits <= 0) fail(`У задания ${quest.id} нет награды`);
}

/* --- 3.1. Учебная часть --------------------------------------------------- */

for (const quest of QUESTS) {
  // Сигнатура — первое, что видит игрок: она обязана называть нужную функцию
  if (!quest.signature?.includes(quest.fn)) {
    fail(`Сигнатура задания ${quest.id} не называет функцию ${quest.fn}`);
  }
  if (!quest.brief.includes(quest.fn)) {
    fail(`Условие задания ${quest.id} не называет функцию ${quest.fn}`);
  }

  // Условие должно перечислять, что вернуть, а не описывать это одной фразой
  if (!quest.brief.includes('•')) {
    fail(`Условие задания ${quest.id} не разбито на пункты — его тяжело читать`);
  }

  // Три подсказки — это ступеньки: направление, приём, почти решение
  if (quest.hints.length < 3) {
    fail(`У задания ${quest.id} меньше трёх подсказок: ступенек не хватает`);
  }

  // Подсказка, дословно повторяющая строку решения, лишает задание смысла
  const solutionLines = quest.solution
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 24);

  for (const hint of quest.hints) {
    if (solutionLines.includes(hint.trim())) {
      fail(`Подсказка задания ${quest.id} дословно повторяет строку решения`);
    }
  }

  // Разбор темы: объяснение своими словами, а не пересказ условия
  if (!Array.isArray(quest.lesson) || quest.lesson.length < 2) {
    fail(`У задания ${quest.id} меньше двух блоков разбора темы`);
  }

  for (const block of quest.lesson ?? []) {
    if (!block.title || !block.text) {
      fail(`В разборе темы задания ${quest.id} есть блок без заголовка или текста`);
    }
    if ((block.text ?? '').length < 80) {
      fail(`Блок «${block.title}» задания ${quest.id} слишком короткий, чтобы чему-то научить`);
    }
  }

  // Хотя бы один блок разбора должен показывать код: словами приём не объяснить
  if (!(quest.lesson ?? []).some(block => block.code)) {
    fail(`В разборе темы задания ${quest.id} нет ни одного примера кода`);
  }
}

console.log(`✓ разбор темы и подсказки на месте (${QUESTS.length})`);

/* --- 4. Разделы интерфейса ----------------------------------------------- */

const views = QUESTS.filter(quest => quest.unlocks).map(quest => quest.unlocks.view);
if (new Set(views).size !== views.length) fail('Два задания открывают один и тот же раздел');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const quest of QUESTS.filter(item => item.unlocks)) {
  const view = quest.unlocks.view;
  if (!html.includes(`id="view-${view}"`)) fail(`В интерфейсе нет раздела view-${view} для задания ${quest.id}`);
  if (!html.includes(`data-view-item="${view}"`)) fail(`В меню нет пункта для раздела ${view}`);
}

// Разделы, закрытые заданиями, не должны быть видны до их решения
for (const quest of QUESTS.filter(item => item.unlocks)) {
  const item = html.match(new RegExp(`<li hidden data-view-item="${quest.unlocks.view}"`));
  if (!item) fail(`Пункт меню ${quest.unlocks.view} не скрыт по умолчанию`);
}

/* --- 5. Практическая часть ----------------------------------------------- */

for (const quest of QUESTS) {
  const practice = quest.practice;
  if (!practice) continue;

  for (const field of ['title', 'hint', 'example', 'validate', 'commit']) {
    if (!practice[field]) fail(`У практики задания ${quest.id} нет поля ${field}`);
  }

  // Функцию либо вызывают, либо передают по ссылке (как панель в dashboard.add)
  if (!new RegExp(`\\b${quest.fn}\\b`).test(practice.example)) {
    fail(`Пример практики ${quest.id} не использует функцию ${quest.fn}`);
  }

  // Валидатор обязан отсеивать мусор, иначе практику можно «пройти» чем угодно
  const context = { corp: { commander: { credits: 0, crew: [] }, modules: [] } };
  const garbage = [null, undefined, 42, 'строка', {}];
  const passedGarbage = garbage.filter(value => practice.validate(value, context) === true);
  if (passedGarbage.length > 0) {
    fail(`Валидатор практики ${quest.id} пропускает мусор: ${JSON.stringify(passedGarbage)}`);
  }

  // И обязан объяснять словами, что не так
  const verdict = practice.validate(null, context);
  if (typeof verdict !== 'string' || verdict.length < 10) {
    fail(`Валидатор практики ${quest.id} не объясняет ошибку понятным текстом`);
  }
}

console.log(`✓ практика описана у всех заданий (${QUESTS.length})`);

/* --- 6. Обновляемые практики --------------------------------------------- */

/*
 * Карточку в реестре можно обновить повторным вызовом — но только у практик,
 * которые ничего не тратят и не начисляют. Иначе повтор вызова означал бы
 * повторную выплату премии или повторное списание за найм.
 */
const MONEY_METHODS = ['hireCandidate', 'deliverExpedition', 'settleDeal', 'claimBounty'];

for (const quest of QUESTS.filter(item => item.practice.refresh)) {
  const commit = quest.practice.commit.toString();
  const dangerous = MONEY_METHODS.filter(method => commit.includes(method));

  if (dangerous.length > 0) {
    fail(`Практика ${quest.id} помечена обновляемой, но трогает счёт: ${dangerous.join(', ')}`);
  }
}

// И наоборот: практика, которая только пишет карточку, обновляемой быть должна
for (const quest of QUESTS) {
  const commit = quest.practice.commit.toString();
  const onlyRecords = commit.includes('setRecord') && !MONEY_METHODS.some(method => commit.includes(method));

  if (onlyRecords && !quest.practice.refresh) {
    fail(`Практика ${quest.id} только записывает карточку — её стоит пометить refresh: true`);
  }
}

console.log(`✓ обновляемые практики не трогают счёт (${QUESTS.filter(q => q.practice.refresh).length})`);

/* --- 7. Этапы развития функции -------------------------------------------- */

/*
 * Доработка начинается с кода прошлого этапа и обязана сохранить его
 * поведение. Проверяем всю цепочку: ссылка ведёт на существующее задание,
 * идёт раньше по порядку, объявляет ту же функцию; решение прошлого этапа
 * новые требования уже не проходит, а новое решение проходит и старые.
 */
for (const quest of QUESTS.filter(item => item.extends)) {
  const parent = questById(quest.extends);

  if (!parent) {
    fail(`Задание ${quest.id} ссылается на несуществующий этап ${quest.extends}`);
    continue;
  }
  if (parent.fn !== quest.fn) {
    fail(`Этап ${quest.id} дорабатывает ${quest.fn}, а предыдущий — ${parent.fn}`);
  }
  if (parent.order >= quest.order) {
    fail(`Этап ${quest.id} стоит в цепочке раньше своего предыдущего этапа`);
  }
  if (!quest.changes?.works || !quest.changes?.todo) {
    fail(`У этапа ${quest.id} не объяснено, что уже работает и что нужно добавить`);
  }
  if (!quest.inheritTests) {
    fail(`Этап ${quest.id} не прогоняет прежние проверки: доработка может сломать работающее`);
  }

  // Старый код обязан провалить новые требования, иначе задание пустое
  const withNew = await runQuestTests(parent.solution, { fn: quest.fn, tests: testsOf(quest) });
  if (withNew.ok) {
    fail(`Решение прошлого этапа проходит требования ${quest.id} — дорабатывать нечего`);
  }
}

for (const fn of new Set(QUESTS.map(quest => quest.fn))) {
  const chain = stageChain(fn);
  if (chain.length < 2) continue;

  // У каждого этапа, кроме первого, должна быть ссылка на предыдущий
  for (const [index, quest] of chain.entries()) {
    if (index === 0 && quest.extends) {
      fail(`Первый этап функции ${fn} (${quest.id}) ссылается на предыдущий, которого нет`);
    }
    if (index > 0 && quest.extends !== chain[index - 1].id) {
      fail(`Этап ${quest.id} должен продолжать ${chain[index - 1].id}`);
    }
  }
}

console.log(`✓ цепочки доработок согласованы (${QUESTS.filter(q => q.extends).length} этапов)`);

console.log(failures === 0 ? '\nЦепочка: все проверки пройдены' : `\nЦепочка: проблем ${failures}`);
process.exit(failures === 0 ? 0 : 1);
