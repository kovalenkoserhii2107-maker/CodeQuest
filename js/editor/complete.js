/**
 * Подбор подсказок для автодополнения: что предложить в текущей позиции.
 * Модуль чистый — принимает текст и положение курсора, возвращает список.
 */
import { JS_API, MEMBERS_BY_TYPE } from '../data/js-api.js';

/** Объекты, у которых есть свои статические методы. */
const STATIC_OWNERS = ['Math', 'Object', 'Number', 'JSON', 'Promise', 'console'];

/**
 * Подсказки по имени переменной — в учебных задачах имена говорящие.
 * Это эвристика: если не угадали, покажем методы всех типов.
 */
const NAME_HINTS = [
  { type: 'Array', pattern: /^(cargo|routes|boxes|items|list|arr|array|grid|row|rows|samples|numbers|values|masses|result|queue|data)$/i },
  { type: 'String', pattern: /^(signal|raw|text|str|string|message|name|title|line|word|key)$/i },
];

/** Тип значения по объявлению переменной в коде. */
export function inferType(code, expression) {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  if (STATIC_OWNERS.includes(trimmed)) return trimmed;
  if (/^['"`]/.test(trimmed)) return 'String';
  if (/^\[/.test(trimmed)) return 'Array';
  if (/\]$/.test(trimmed)) return 'Array';
  if (/^\d/.test(trimmed)) return 'Number';

  const identifier = trimmed.match(/([A-Za-z_$][\w$]*)$/)?.[1];
  if (!identifier) return null;
  if (STATIC_OWNERS.includes(identifier)) return identifier;

  // Ищем последнее объявление переменной с таким именем
  const declaration = new RegExp(`(?:const|let|var)\\s+${identifier}\\s*=\\s*([\\s\\S]{0,2})`, 'g');
  let found = null;
  for (const match of code.matchAll(declaration)) found = match[1];
  if (found) {
    const head = found.trimStart().charAt(0);
    if (head === '[') return 'Array';
    if (head === "'" || head === '"' || head === '`') return 'String';
    if (head === '{') return 'Object';
    if (/\d/.test(head)) return 'Number';
  }

  // Методы, по которым понятно, что вернулось
  if (/\.(map|filter|slice|split|concat|flat|sort|reverse|keys|values|entries)\s*\([^)]*\)$/.test(trimmed)) return 'Array';
  if (/\.(join|trim|toLowerCase|toUpperCase|replace|replaceAll|padStart|repeat)\s*\([^)]*\)$/.test(trimmed)) return 'String';

  const hint = NAME_HINTS.find(item => item.pattern.test(identifier));
  return hint ? hint.type : null;
}

/** Имена, объявленные самим игроком: функции, переменные, параметры. */
export function localNames(code) {
  const names = new Set();
  for (const match of code.matchAll(/(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of code.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of code.matchAll(/function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/g)) {
    match[1]
      .split(',')
      .map(part => part.trim().split(/[=\s]/)[0])
      .filter(part => /^[A-Za-z_$][\w$]*$/.test(part))
      .forEach(part => names.add(part));
  }
  return [...names];
}

/** Контекст в точке курсора: после точки или обычное слово. */
export function completionContext(code, cursor) {
  const before = code.slice(0, cursor);
  const memberMatch = before.match(/([\w$\]).'"`]+)\.([A-Za-z_$][\w$]*)?$/);

  if (memberMatch) {
    return {
      kind: 'member',
      receiver: memberMatch[1],
      prefix: memberMatch[2] ?? '',
      from: cursor - (memberMatch[2]?.length ?? 0),
    };
  }

  const wordMatch = before.match(/([A-Za-z_$][\w$]*)$/);
  if (wordMatch) {
    return { kind: 'word', receiver: null, prefix: wordMatch[1], from: cursor - wordMatch[1].length };
  }

  return { kind: 'word', receiver: null, prefix: '', from: cursor };
}

/**
 * Список подсказок для текущей позиции.
 * @returns {{items: Array, from: number, prefix: string, kind: string, type: string|null}}
 */
export function suggest(code, cursor, { minPrefix = 1 } = {}) {
  const context = completionContext(code, cursor);
  const prefix = context.prefix.toLowerCase();

  if (context.kind === 'member') {
    const type = inferType(code, context.receiver);
    const pool = type && MEMBERS_BY_TYPE[type]
      ? MEMBERS_BY_TYPE[type]
      // Тип не угадан — показываем методы всех значений, помечая владельца
      : [...MEMBERS_BY_TYPE.Array, ...MEMBERS_BY_TYPE.String, ...MEMBERS_BY_TYPE.Object];

    const items = pool.filter(item => item.name.toLowerCase().startsWith(prefix));
    return { items, from: context.from, prefix: context.prefix, kind: 'member', type };
  }

  if (context.prefix.length < minPrefix) {
    return { items: [], from: context.from, prefix: context.prefix, kind: 'word', type: null };
  }

  const globals = JS_API.filter(item => item.owner === 'global' || ['Math', 'Object', 'Number'].includes(item.owner));
  const locals = localNames(code)
    .filter(name => name.toLowerCase().startsWith(prefix) && name.toLowerCase() !== prefix)
    .map(name => ({
      name,
      owner: 'ваш код',
      kind: 'из вашего кода',
      signature: name,
      summary: 'Объявлено в вашем решении.',
      details: 'Это имя встречается в коде задачи — можно подставить его целиком.',
      returns: '—',
      example: name,
      insert: name,
    }));

  const items = [
    ...locals,
    ...globals.filter(item => item.name.toLowerCase().startsWith(prefix)),
  ];

  return { items, from: context.from, prefix: context.prefix, kind: 'word', type: null };
}
