import { Database } from './db.js';

/**
 * Ядро проверки решений. Здесь нет ни DOM, ни воркера — только запуск
 * пользовательского кода и сравнение результатов с ожидаемыми.
 * Один и тот же модуль используют воркер игры и автотесты из tests/.
 */

/** Глубокое сравнение значений: числа, строки, массивы, простые объекты. */
export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
}

/** Человекочитаемое представление значения для отчёта о тесте. */
export function formatValue(value) {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') return 'function';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Значение в несколько строк, если одной строкой его уже не прочитать.
 * Длинный JSON в одну строку — главная причина, по которой отчёт о тесте
 * невозможно разобрать глазами.
 */
export function prettyValue(value, force = false) {
  const flat = formatValue(value);
  if (value === null || typeof value !== 'object') return flat;
  if (!force && flat.length <= 48) return flat;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return flat;
  }
}

/** Человеческое название типа — для объяснения, что именно вернулось. */
function typeName(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'массив';
  if (typeof value === 'object') return 'объект';
  if (typeof value === 'number') return 'число';
  if (typeof value === 'string') return 'строка';
  if (typeof value === 'boolean') return 'логическое значение';
  return typeof value;
}

/**
 * Чем полученное значение отличается от ожидаемого — словами.
 *
 * Сравнение «ждали {…} получили {…}» заставляет игрока искать различие
 * глазами по двум длинным строкам. Здесь различия названы по именам полей,
 * поэтому сразу видно, где именно код свернул не туда.
 *
 * @returns {string[]} до шести коротких объяснений
 */
export function describeDifference(expected, actual, path = '') {
  const at = path ? `${path}: ` : '';

  if (deepEqual(expected, actual)) return [];

  // Разные типы — всё остальное объяснять бессмысленно
  if (typeName(expected) !== typeName(actual)) {
    return [`${at}ждали ${typeName(expected)}, получили ${typeName(actual)} (${formatValue(actual)})`];
  }

  if (Array.isArray(expected)) {
    if (expected.length !== actual.length) {
      return [`${at}ждали элементов: ${expected.length}, получили ${actual.length}`];
    }
    const out = [];
    for (let i = 0; i < expected.length; i += 1) {
      out.push(...describeDifference(expected[i], actual[i], `${path}[${i}]`));
      if (out.length >= 6) break;
    }
    return out.slice(0, 6);
  }

  if (expected !== null && typeof expected === 'object') {
    const out = [];

    for (const key of Object.keys(expected)) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        out.push(`${at}нет поля ${key}`);
      } else {
        out.push(...describeDifference(expected[key], actual[key], path ? `${path}.${key}` : key));
      }
      if (out.length >= 6) break;
    }

    for (const key of Object.keys(actual)) {
      if (out.length >= 6) break;
      if (!Object.prototype.hasOwnProperty.call(expected, key)) {
        out.push(`${at}лишнее поле ${key}`);
      }
    }

    return out.slice(0, 6);
  }

  return [`${at}ждали ${formatValue(expected)}, получили ${formatValue(actual)}`];
}

/** Копия аргументов, чтобы решение не испортило исходные данные теста. */
function cloneArgs(args) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(args);
    } catch {
      /* значение не клонируется — падаем в запасной вариант */
    }
  }
  return JSON.parse(JSON.stringify(args));
}

/** Короткое описание теста для отчёта. */
function describeCall(fnName, test) {
  if (test.expr) return test.name;
  const args = test.args.map(formatValue).join(', ');
  return `${fnName}(${args})`;
}

/**
 * Тот же вызов, но с аргументами в столбик, если одной строкой он длинный.
 * Разворачиваем сразу все аргументы: вперемешку со сжатыми читать хуже,
 * чем одинаково развёрнутые.
 */
function describeCallPretty(fnName, test) {
  if (test.expr) return test.expr;

  const flat = describeCall(fnName, test);
  if (flat.length <= 56) return flat;

  const args = test.args
    .map(arg => {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return formatValue(arg);
      }
    })
    .map(text => text.replace(/^/gm, '  '))
    .join(',\n');

  return `${fnName}(\n${args}\n)`;
}

/** Выполняет код игрока и достаёт из него объявление с нужным именем. */
function buildTarget(source, fnName, consoleShim) {
  const factory = new Function(
    'console',
    `"use strict";\n${source}\n;return typeof ${fnName} !== "undefined" ? ${fnName} : undefined;`,
  );
  return factory(consoleShim);
}

/** Пустая заглушка console: для виджетов вывод игрока не нужен. */
const silentConsole = { log() {}, info() {}, warn() {}, error() {} };

/**
 * Запускает выражение на коде игрока — так работают приборы Мостика.
 * Возвращает либо значение, либо текст ошибки, но никогда не бросает.
 *
 * @param {string} source код игрока
 * @param {string} fnName имя функции или класса, которое ждёт выражение
 * @param {string} expr тело функции; внутри доступно объявление fnName
 */
export async function runPlayerCode(source, fnName, expr) {
  let target;
  try {
    target = buildTarget(source, fnName, silentConsole);
  } catch (error) {
    return { value: null, error: `Код не запустился: ${error.message}` };
  }

  if (target === undefined) {
    return { value: null, error: `В коде нет объявления с именем ${fnName}` };
  }

  try {
    const run = new Function(fnName, `"use strict";\n${expr}`);
    return { value: await run(target), error: null };
  } catch (error) {
    return { value: null, error: `${error.name}: ${error.message}` };
  }
}

/**
 * Запускает решение против набора тестов задачи.
 *
 * @param {string} source исходный код пользователя
 * @param {{fn: string, tests: Array}} quest задача (нужны только имя функции и тесты)
 * @returns {Promise<{ok: boolean, results: Array, logs: string[], error: string|null}>}
 */
export async function runQuestTests(source, quest) {
  const logs = [];
  const consoleShim = {
    log: (...args) => logs.push(args.map(formatValue).join(' ')),
    info: (...args) => logs.push(args.map(formatValue).join(' ')),
    warn: (...args) => logs.push('⚠ ' + args.map(formatValue).join(' ')),
    error: (...args) => logs.push('✖ ' + args.map(formatValue).join(' ')),
  };

  let target;
  try {
    target = buildTarget(source, quest.fn, consoleShim);
  } catch (error) {
    return { ok: false, results: [], logs, error: `Код не запустился: ${error.message}` };
  }

  if (target === undefined) {
    return {
      ok: false,
      results: [],
      logs,
      error: `В коде нет объявления с именем ${quest.fn}. Проверьте название — оно важно.`,
    };
  }

  const results = [];
  for (const test of quest.tests) {
    const label = describeCall(quest.fn, test);
    try {
      let actual;
      if (test.expr) {
        const run = new Function(quest.fn, 'console', `"use strict";\n${test.expr}`);
        actual = await run(target, consoleShim);
      } else {
        actual = await target(...cloneArgs(test.args));
      }
      const pass = deepEqual(actual, test.expected);
      results.push({
        name: test.name,
        call: label,
        callPretty: test.expr ? test.expr : describeCallPretty(quest.fn, test),
        pass,
        expected: formatValue(test.expected),
        actual: formatValue(actual),
        // У провалившегося теста разворачиваем оба значения: одинаковый
        // формат нужен, чтобы сравнивать их глазами строка за строкой
        expectedPretty: prettyValue(test.expected, !pass),
        actualPretty: prettyValue(actual, !pass),
        diff: pass ? [] : describeDifference(test.expected, actual),
        error: null,
      });
    } catch (error) {
      results.push({
        name: test.name,
        call: label,
        callPretty: test.expr ? test.expr : describeCallPretty(quest.fn, test),
        pass: false,
        expected: formatValue(test.expected),
        actual: null,
        expectedPretty: prettyValue(test.expected, true),
        actualPretty: null,
        diff: [],
        error: `${error.name}: ${error.message}`,
      });
    }
  }

  return { ok: results.every(result => result.pass), results, logs, error: null };
}

/**
 * Данные без функций: значение из консоли должно пережить переход из
 * воркера, а методы через postMessage не передаются.
 */
export function toPlain(value, seen = new WeakSet()) {
  if (typeof value === 'function') return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[циклическая ссылка]';
  seen.add(value);

  if (Array.isArray(value)) return value.map(item => toPlain(item, seen));

  const plain = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'function') continue;
    plain[key] = toPlain(item, seen);
  }
  return plain;
}

/** Читаемый вид значения — с методами, как их видит сам игрок. */
export function previewValue(value, depth = 0) {
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value !== 'object') return String(value);
  if (depth > 2) return Array.isArray(value) ? `Array(${value.length})` : '{…}';

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.slice(0, 5).map(item => previewValue(item, depth + 1));
    if (value.length > 5) items.push(`…ещё ${value.length - 5}`);
    return `[${items.join(', ')}]`;
  }

  // Один проход по собственным свойствам: методы попадают сюда же
  const entries = Object.entries(value).map(([key, item]) =>
    typeof item === 'function' ? `${key}: ƒ()` : `${key}: ${previewValue(item, depth + 1)}`,
  );
  return entries.length ? `{ ${entries.join(', ')} }` : '{}';
}

/**
 * Объекты db и dashboard для консоли.
 *
 * Код игрока выполняется в воркере, поэтому работает не с настоящей базой, а
 * с её копией: чтение отвечает сразу, а записи копятся списком операций и
 * применяются к настоящей базе уже в основном потоке. Ровно так же ведёт себя
 * обычный клиент базы данных.
 */
export function createConsoleApi(dbStore = {}, panels = []) {
  const local = new Database(dbStore);
  const ops = [];

  const db = {
    insert(name, record) {
      const saved = local.insert(name, record);
      ops.push({ type: 'insert', name, record });
      return saved;
    },
    update(name, id, patch) {
      const updated = local.update(name, id, patch);
      if (updated) ops.push({ type: 'update', name, id, patch });
      return updated;
    },
    remove(name, id) {
      const removed = local.remove(name, id);
      if (removed) ops.push({ type: 'remove', name, id });
      return removed;
    },
    all: name => local.all(name),
    get: (name, id) => local.get(name, id),
    last: name => local.last(name),
    find: (name, predicate) => local.find(name, predicate),
    filter: (name, predicate) => local.filter(name, predicate),
    count: name => local.count(name),
    collections: () => local.collections(),
  };

  const dashboard = {
    /** Зарегистрировать панель: исходник функции сохраняется и будет запускаться снова. */
    add(name, render, options = {}) {
      if (typeof name !== 'string' || !name.trim()) throw new Error('У панели должно быть имя');
      if (typeof render !== 'function') throw new Error('Панель — это функция, которая возвращает описание');

      const preview = render(db);
      ops.push({ type: 'panel.add', name, source: render.toString(), title: options.title ?? name });
      return preview;
    },
    remove(name) {
      ops.push({ type: 'panel.remove', name });
      return true;
    },
    list: () => panels.map(panel => ({ name: panel.name, title: panel.title })),
  };

  return { db, dashboard, ops };
}

/**
 * Выполнить произвольную команду из консоли на коде игрока.
 *
 * source — все решения, которые уже написал игрок (они попадают в область
 * видимости), input — то, что он набрал в строке. Сначала пробуем прочитать
 * ввод как выражение и вернуть его значение; если это не выражение, а набор
 * инструкций — выполняем как есть.
 *
 * @returns {Promise<{value, preview, logs, ops, error}>} ops — записи в базу, их применит основной поток
 */
export async function runConsoleInput(source, input, payload = {}) {
  const { data = {}, dbStore = {}, panels = [] } = payload;
  const { db, dashboard, ops } = createConsoleApi(dbStore, panels);
  const context = { ...data, db, dashboard };
  const logs = [];
  const consoleShim = {
    log: (...args) => logs.push(args.map(formatValue).join(' ')),
    info: (...args) => logs.push(args.map(formatValue).join(' ')),
    warn: (...args) => logs.push('⚠ ' + args.map(formatValue).join(' ')),
    error: (...args) => logs.push('✖ ' + args.map(formatValue).join(' ')),
  };

  const contextKeys = Object.keys(context);
  const contextValues = contextKeys.map(key => context[key]);

  const build = body => new Function('console', ...contextKeys, `"use strict";\n${source}\n${body}`);

  let run;
  try {
    // Сначала как выражение: createCommander("Имя") должно вернуть объект
    run = build(`return (async () => (${input}))();`);
  } catch {
    try {
      run = build(`return (async () => { ${input} })();`);
    } catch (error) {
      return { value: undefined, preview: null, logs, ops, error: `Синтаксическая ошибка: ${error.message}` };
    }
  }

  try {
    const value = await run(consoleShim, ...contextValues);
    return { value: toPlain(value), preview: previewValue(value), logs, ops, error: null };
  } catch (error) {
    return { value: undefined, preview: null, logs, ops, error: `${error.name}: ${error.message}` };
  }
}
