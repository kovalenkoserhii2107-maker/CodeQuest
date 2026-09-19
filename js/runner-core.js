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
    const factory = new Function(
      'console',
      `"use strict";\n${source}\n;return typeof ${quest.fn} !== "undefined" ? ${quest.fn} : undefined;`,
    );
    target = factory(consoleShim);
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
      results.push({
        name: test.name,
        call: label,
        pass: deepEqual(actual, test.expected),
        expected: formatValue(test.expected),
        actual: formatValue(actual),
        error: null,
      });
    } catch (error) {
      results.push({
        name: test.name,
        call: label,
        pass: false,
        expected: formatValue(test.expected),
        actual: null,
        error: `${error.name}: ${error.message}`,
      });
    }
  }

  return { ok: results.every(result => result.pass), results, logs, error: null };
}
