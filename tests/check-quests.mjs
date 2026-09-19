/**
 * Автопроверка цепочки заданий (запуск: node tests/check-quests.mjs).
 *
 * Проверяет, что:
 *  1. эталонное решение каждого задания проходит его тесты;
 *  2. заготовка кода тесты НЕ проходит;
 *  3. цепочка непрерывна: порядок 1…N без дыр и повторов;
 *  4. каждое задание открывает свой раздел, и этот раздел есть в интерфейсе.
 */
import { readFileSync } from 'node:fs';
import { QUESTS } from '../js/data/quests.js';
import { runQuestTests } from '../js/runner-core.js';

let failures = 0;
const fail = message => {
  failures += 1;
  console.error('✖', message);
};

/* --- 1–2. Решения и заготовки -------------------------------------------- */

for (const quest of QUESTS) {
  const report = await runQuestTests(quest.solution, quest);
  if (!report.ok) {
    const details = report.error ?? report.results
      .filter(result => !result.pass)
      .map(result => `${result.name}: ожидалось ${result.expected}, получено ${result.actual ?? result.error}`)
      .join('; ');
    fail(`Решение задания «${quest.title}» не проходит тесты — ${details}`);
  } else {
    console.log(`✓ ${quest.order}. ${quest.id}: ${report.results.length} тест(ов)`);
  }

  const starter = await runQuestTests(quest.starter, quest);
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
  for (const field of ['story', 'brief', 'theory', 'fn', 'starter', 'solution', 'hints', 'tests', 'unlocks']) {
    if (!quest[field] || (Array.isArray(quest[field]) && quest[field].length === 0)) {
      fail(`У задания ${quest.id} не заполнено поле ${field}`);
    }
  }
  if (quest.reward?.credits <= 0) fail(`У задания ${quest.id} нет награды`);
}

/* --- 4. Разделы интерфейса ----------------------------------------------- */

const views = QUESTS.map(quest => quest.unlocks.view);
if (new Set(views).size !== views.length) fail('Два задания открывают один и тот же раздел');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const quest of QUESTS) {
  const view = quest.unlocks.view;
  if (!html.includes(`id="view-${view}"`)) fail(`В интерфейсе нет раздела view-${view} для задания ${quest.id}`);
  if (!html.includes(`data-view-item="${view}"`)) fail(`В меню нет пункта для раздела ${view}`);
}

// Разделы, закрытые заданиями, не должны быть видны до их решения
for (const quest of QUESTS) {
  const item = html.match(new RegExp(`<li hidden data-view-item="${quest.unlocks.view}"`));
  if (!item) fail(`Пункт меню ${quest.unlocks.view} не скрыт по умолчанию`);
}

console.log(failures === 0 ? '\nЦепочка: все проверки пройдены' : `\nЦепочка: проблем ${failures}`);
process.exit(failures === 0 ? 0 : 1);
