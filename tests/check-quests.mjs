/**
 * Автопроверка учебного контента (запуск: node tests/check-quests.mjs).
 *
 * Проверяет, что:
 *  1. эталонное решение каждой задачи проходит все её тесты;
 *  2. заготовка кода тесты НЕ проходит (иначе задача решается сама собой);
 *  3. связи секторов и задач согласованы между собой.
 */
import { QUESTS, SECTORS, ROUTES } from '../js/data/quests.js';
import { MODULE_BY_ID, MODULES } from '../js/data/modules.js';
import { runQuestTests } from '../js/runner-core.js';

let failures = 0;
const fail = message => {
  failures += 1;
  console.error('✖', message);
};

/* --- 1. Эталонные решения --------------------------------------------- */
for (const quest of QUESTS) {
  const report = await runQuestTests(quest.solution, quest);
  if (!report.ok) {
    const details = report.error ?? report.results
      .filter(r => !r.pass)
      .map(r => `${r.name}: ожидалось ${r.expected}, получено ${r.actual ?? r.error}`)
      .join('; ');
    fail(`Решение задачи «${quest.title}» (${quest.id}) не проходит тесты — ${details}`);
  } else {
    console.log(`✓ ${quest.id}: ${report.results.length} тест(ов)`);
  }
}

/* --- 2. Заготовки не должны проходить тесты ---------------------------- */
for (const quest of QUESTS) {
  const report = await runQuestTests(quest.starter, quest);
  if (report.ok) fail(`Заготовка задачи ${quest.id} проходит тесты — задача бессмысленна`);
}

/* --- 3. Согласованность данных ----------------------------------------- */
const questIds = new Set(QUESTS.map(q => q.id));
const sectorIds = new Set(SECTORS.map(s => s.id));

for (const quest of QUESTS) {
  if (!sectorIds.has(quest.sector)) fail(`Задача ${quest.id} ссылается на неизвестный сектор ${quest.sector}`);
  if (!MODULE_BY_ID[quest.module]) fail(`Задача ${quest.id} ссылается на неизвестный модуль ${quest.module}`);
  if (!quest.tests.length) fail(`У задачи ${quest.id} нет тестов`);
}

for (const sector of SECTORS) {
  for (const required of sector.requires) {
    if (!questIds.has(required)) fail(`Сектор ${sector.id} требует несуществующую задачу ${required}`);
  }
}

for (const [from, to] of ROUTES) {
  if (!sectorIds.has(from) || !sectorIds.has(to)) fail(`Маршрут ${from}→${to} ведёт в неизвестный сектор`);
}

for (const module of MODULES) {
  const count = QUESTS.filter(q => q.module === module.id).length;
  if (count !== module.maxLevel) {
    fail(`У модуля ${module.id} maxLevel=${module.maxLevel}, а задач ${count} — уровни не сойдутся`);
  }
}

console.log(failures === 0 ? '\nВсе проверки пройдены' : `\nПроблем: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
