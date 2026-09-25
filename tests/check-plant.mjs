/**
 * Проверки второго акта (запуск: node tests/check-plant.mjs).
 *
 * 1. Загрузчик проекта: порядок модулей, подмена импортов, внятные ошибки.
 * 2. Цепочка глав: решение каждой главы проходит её проверки, заготовка — нет.
 * 3. Структурные требования главы выполняются решением и не выполняются заготовкой.
 *
 * Выполнение здесь настоящее: файлы кладутся во временную папку и грузятся
 * как обычные ES-модули. Подмену адресов проверяет отдельный блок и браузерный
 * смоук — там проект собирается blob-модулями, как в игре.
 */
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  normalizePath, resolveSpecifier, findImports, rewriteImports, orderModules, buildProject, ProjectError,
} from '../js/act2/loader.js';
import { CHAPTERS, chapterChain } from '../js/act2/chapters.js';
import { deepEqual } from '../js/runner-core.js';

let failures = 0;
const check = (ok, message, extra = '') => {
  if (ok) console.log('✓', message);
  else {
    failures += 1;
    console.error('✖', message, extra);
  }
};

/* --- 1. Загрузчик --------------------------------------------------------- */

check(normalizePath('./sort.js') === 'sort.js', 'путь приводится к одному виду');
check(resolveSpecifier('lib/furnace.js', '../config.js') === 'config.js', 'относительный путь поднимается на уровень выше');
check(resolveSpecifier('index.js', 'node:fs') === null, 'внешний адрес загрузчик не трогает');

const source = "import { a } from './a.js';\nexport { b } from './b.js';\nconst late = import('./c.js');\n";
const imports = findImports(source);
check(imports.length === 3, 'находятся импорт, реэкспорт и динамический импорт', String(imports.length));
check(imports.map(item => item.specifier).join(',') === './a.js,./b.js,./c.js', 'адреса разобраны по порядку');

const rewritten = rewriteImports('index.js', source, new Map([['a.js', 'blob:a'], ['b.js', 'blob:b'], ['c.js', 'blob:c']]));
check(rewritten.includes("from 'blob:a'") && rewritten.includes("import('blob:c')"), 'адреса подменяются на месте');
check(!rewritten.includes('./a.js'), 'старых путей в собранном модуле не остаётся');

const files = new Map([
  ['index.js', "import './lib/deep.js';"],
  ['lib/deep.js', "import '../base.js';"],
  ['base.js', 'export const x = 1;'],
]);
check(orderModules(files, 'index.js').join(' ') === 'base.js lib/deep.js index.js', 'зависимости грузятся раньше зависящих');

const cycle = new Map([['index.js', "import './a.js';"], ['a.js', "import './index.js';"]]);
try {
  orderModules(cycle, 'index.js');
  check(false, 'цикл импортов замечен');
} catch (error) {
  check(error instanceof ProjectError && error.message.includes('по кругу'), 'цикл импортов замечен и показан маршрутом');
}

try {
  orderModules(new Map([['index.js', "import './нет.js';"]]), 'index.js');
  check(false, 'пропавший файл замечен');
} catch (error) {
  check(error.message.includes('такого файла в проекте нет'), 'пропавший файл назван по имени');
}

try {
  orderModules(new Map([['a.js', '']]), 'index.js');
  check(false, 'отсутствие точки входа замечено');
} catch (error) {
  check(error.message.includes('Нет точки входа'), 'без точки входа проект не собирается');
}

const built = buildProject(files, 'index.js', (text, path) => `url:${path}`);
check(built.url === 'url:index.js', 'сборка возвращает адрес точки входа');
check(built.urls.size === 3, 'адрес выдан каждому файлу');

/* --- 2. Главы ------------------------------------------------------------- */

/** Положить проект на диск и вернуть адрес точки входа. */
async function materialize(project, entry) {
  const dir = await mkdtemp(join(tmpdir(), 'codequest-plant-'));
  for (const [path, text] of Object.entries(project)) {
    const full = join(dir, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, text, 'utf8');
  }
  return { dir, url: `${pathToFileURL(join(dir, entry)).href}?v=${Math.random()}` };
}

/** Прогнать проверки главы на готовом проекте. */
async function runChecks(project, chapter) {
  const results = [];

  for (const item of chapter.checks) {
    const entry = item.entry ?? 'index.js';
    const { dir, url } = await materialize(project, entry);
    try {
      const module = await import(url);
      const target = module[item.fn];
      if (typeof target !== 'function') {
        results.push({ name: item.name, pass: false, note: `${entry} не экспортирует ${item.fn}` });
        continue;
      }
      const actual = await target(...structuredClone(item.args));
      results.push({
        name: item.name,
        pass: deepEqual(actual, item.expected),
        note: `получили ${JSON.stringify(actual)}, ждали ${JSON.stringify(item.expected)}`,
      });
    } catch (error) {
      results.push({ name: item.name, pass: false, note: `${error.name}: ${error.message}` });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  return results;
}

const project = {};
const starterProject = {};

for (const chapter of chapterChain()) {
  // Заготовки главы появляются в проекте до того, как игрок что-то написал
  Object.assign(starterProject, project, chapter.starters ?? {});

  const starterStructure = chapter.structure.filter(rule => rule.test(starterProject));
  check(
    starterStructure.length < chapter.structure.length,
    `${chapter.id}: заготовка не проходит структурные требования`,
    starterStructure.map(rule => rule.name).join('; '),
  );

  Object.assign(project, chapter.solution);

  for (const rule of chapter.structure) {
    check(rule.test(project), `${chapter.id}: решение выполняет требование «${rule.name}»`);
  }

  const results = await runChecks(project, chapter);
  const failed = results.filter(item => !item.pass);
  check(
    failed.length === 0,
    `${chapter.id}: решение проходит все проверки (${results.length})`,
    failed.map(item => `${item.name}: ${item.note}`).join(' | '),
  );

  // Решение прошлой главы не должно проходить требования следующей —
  // иначе главе нечему учить
  if (chapter.order > 1) {
    const previous = chapterChain()[chapter.order - 2];
    const beforeProject = { ...project };
    for (const path of Object.keys(chapter.solution)) {
      if (previous.solution[path]) beforeProject[path] = previous.solution[path];
      else delete beforeProject[path];
    }
    const before = await runChecks(beforeProject, chapter);
    check(before.some(item => !item.pass), `${chapter.id}: прошлая версия проекта её проверки не проходит`);
  }
}

check(Object.keys(project).length === 5, 'к концу акта в проекте пять файлов', Object.keys(project).join(', '));
check(CHAPTERS.every(chapter => chapter.reward.credits > 0), 'у каждой главы есть награда');
check(CHAPTERS.every(chapter => chapter.lesson.length >= 2 && chapter.hints.length >= 2), 'у каждой главы есть разбор и подсказки');

console.log(failures === 0 ? '\nКомбинат: все проверки пройдены' : `\nКомбинат: проблем ${failures}`);
process.exit(failures === 0 ? 0 : 1);
