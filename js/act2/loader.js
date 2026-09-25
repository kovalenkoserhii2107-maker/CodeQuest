/**
 * Сборка проекта игрока в граф настоящих ES-модулей.
 *
 * Файлы второго акта живут в памяти, а не на диске, поэтому браузеру их
 * нельзя отдать по пути. Вместо этого каждому файлу выдаётся собственный
 * адрес (blob в браузере, data в Node), а относительные импорты в исходнике
 * переписываются на эти адреса. Дальше модули грузит сам движок: инициализация
 * один раз, общее состояние модуля, живые ошибки импорта — всё настоящее.
 */

/** Путь без «./» и лишних слэшей: в проекте файл называется одним именем. */
export function normalizePath(path) {
  return String(path).replace(/^\.\//, '').replace(/^\/+/, '').trim();
}

/**
 * Куда ведёт импорт относительно файла, в котором он написан.
 * @returns {string|null} путь внутри проекта, либо null для внешнего адреса
 */
export function resolveSpecifier(fromPath, specifier) {
  const spec = String(specifier);
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null;

  const base = normalizePath(fromPath).split('/').slice(0, -1);
  const parts = spec.split('/');

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') base.pop();
    else base.push(part);
  }

  return base.join('/');
}

/*
 * Импорты ищутся разбором текста, а не парсером: в проекте нет сборщика,
 * а формы записи в учебном коде наперечёт. Каждая находка — это позиция
 * самого адреса в строке, чтобы потом подменить ровно его.
 */
const IMPORT_PATTERNS = [
  // import x from «файл» · export { x } from «файл»
  /(?:^|[\s;}])(?:import|export)\b[^'"()]*?\bfrom\s*(['"])([^'"]+)\1/g,
  // import «файл» — ради побочного эффекта
  /(?:^|[\s;}])import\s*(['"])([^'"]+)\1/g,
  // import(«файл») — динамический
  /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
];

/** Все адреса, на которые ссылается файл, с их местом в тексте. */
export function findImports(source) {
  const found = [];
  const text = String(source);

  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      // Позиция самого адреса: внутри кавычек, без них
      const quote = match[1];
      const specifier = match[2];
      const start = match.index + match[0].lastIndexOf(quote + specifier) + 1;
      if (!found.some(item => item.start === start)) {
        found.push({ specifier, start, end: start + specifier.length });
      }
      match = pattern.exec(text);
    }
  }

  return found.sort((a, b) => a.start - b.start);
}

/** Подменить адреса импортов на готовые — по карте «путь → адрес». */
export function rewriteImports(path, source, urls) {
  const text = String(source);
  const parts = [];
  let cursor = 0;

  for (const item of findImports(text)) {
    const target = resolveSpecifier(path, item.specifier);
    if (target === null) continue;  // внешний адрес оставляем как есть

    const url = urls.get(target);
    if (!url) continue;             // отсутствующий файл заметит проверка ниже

    parts.push(text.slice(cursor, item.start), url);
    cursor = item.end;
  }

  parts.push(text.slice(cursor));
  return parts.join('');
}

/** Ошибка сборки проекта: её текст читает игрок, а не разработчик. */
export class ProjectError extends Error {
  constructor(message, { path = null } = {}) {
    super(message);
    this.name = 'ProjectError';
    this.path = path;
  }
}

/**
 * Порядок загрузки: сначала то, от чего зависят, потом зависящее.
 * Цикл импортов — отдельная ошибка с полным маршрутом, иначе его не найти.
 */
export function orderModules(files, entry = 'index.js') {
  const start = normalizePath(entry);
  if (!files.has(start)) {
    throw new ProjectError(`Нет точки входа ${start}: с этого файла начинается проект`, { path: start });
  }

  const order = [];
  const done = new Set();
  const path = [];

  const walk = current => {
    if (done.has(current)) return;

    if (path.includes(current)) {
      const loop = [...path.slice(path.indexOf(current)), current].join(' → ');
      throw new ProjectError(`Импорты ходят по кругу: ${loop}`, { path: current });
    }

    path.push(current);
    for (const item of findImports(files.get(current))) {
      const target = resolveSpecifier(current, item.specifier);
      if (target === null) continue;

      if (!files.has(target)) {
        throw new ProjectError(
          `${current}: импорт «${item.specifier}» никуда не ведёт — такого файла в проекте нет`,
          { path: current },
        );
      }
      walk(target);
    }
    path.pop();

    done.add(current);
    order.push(current);
  };

  walk(start);
  return order;
}

/**
 * Собрать проект: выдать каждому файлу адрес и вернуть адрес точки входа.
 *
 * @param {Map<string, string>} files файлы проекта: путь → исходник
 * @param {string} entry точка входа
 * @param {(source: string, path: string) => string} makeUrl как выдать адрес
 * @returns {{url: string, order: string[], urls: Map<string, string>}}
 */
export function buildProject(files, entry, makeUrl) {
  const order = orderModules(files, entry);
  const urls = new Map();

  // Адрес модуля можно выдать только когда известны адреса всех его импортов,
  // поэтому идём снизу вверх — в том же порядке, что и загрузка
  for (const path of order) {
    urls.set(path, makeUrl(rewriteImports(path, files.get(path), urls), path));
  }

  return { url: urls.get(normalizePath(entry)), order, urls };
}
