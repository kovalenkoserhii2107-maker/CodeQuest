/**
 * Операции редактирования текста: парные скобки, умный перевод строки,
 * отступы и комментарии.
 *
 * Здесь нет ни DOM, ни событий — каждая функция получает текст и положение
 * курсора, а возвращает новый текст с новым выделением (или null, если
 * вмешиваться не нужно и браузер справится сам). Поэтому всё это
 * проверяется обычными тестами в Node.
 */

export const INDENT = '  ';

/** Пары, которые закрываются автоматически. */
export const PAIRS = {
  '(': ')',
  '[': ']',
  '{': '}',
  "'": "'",
  '"': '"',
  '`': '`',
};

const CLOSERS = new Set(Object.values(PAIRS));
const QUOTES = new Set(["'", '"', '`']);

/** Отступ строки, в которой находится позиция. */
export function indentAt(value, position) {
  const lineStart = value.lastIndexOf('\n', position - 1) + 1;
  const line = value.slice(lineStart, position);
  return line.match(/^[ \t]*/)[0];
}

/** Границы строк, попавших в выделение. */
function selectedLines(value, start, end) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  let to = value.indexOf('\n', end);
  if (to === -1) to = value.length;
  return { from, to };
}

/**
 * Enter: сохраняет отступ строки, добавляет его после открывающей скобки
 * и расставляет закрывающую скобку на отдельной строке.
 */
export function handleEnter(value, start, end) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const indent = indentAt(value, start);
  const charBefore = before.slice(-1);
  const charAfter = after.charAt(0);

  const opensBlock = charBefore in PAIRS && !QUOTES.has(charBefore);

  if (opensBlock && PAIRS[charBefore] === charAfter) {
    // Курсор между скобками: тело на своей строке, закрывающая — под ней.
    const inner = `\n${indent}${INDENT}`;
    const tail = `\n${indent}`;
    return {
      value: before + inner + tail + after,
      cursor: start + inner.length,
    };
  }

  if (opensBlock) {
    const inserted = `\n${indent}${INDENT}`;
    return { value: before + inserted + after, cursor: start + inserted.length };
  }

  const inserted = `\n${indent}`;
  return { value: before + inserted + after, cursor: start + inserted.length };
}

/**
 * Ввод символа: автозакрытие пар, «проскок» закрывающей скобки и
 * оборачивание выделенного текста.
 * @returns {{value: string, start: number, end: number}|null}
 */
export function handleChar(value, start, end, char) {
  const hasSelection = start !== end;
  const before = value.slice(0, start);
  const after = value.slice(end);

  // Выделение + скобка = обернуть выделенное
  if (hasSelection && char in PAIRS) {
    const selected = value.slice(start, end);
    const wrapped = char + selected + PAIRS[char];
    return { value: before + wrapped + after, start: start + 1, end: end + 1 };
  }

  if (hasSelection) return null;

  // Закрывающая скобка прямо перед курсором — просто перешагиваем её
  if (CLOSERS.has(char) && after.charAt(0) === char && !QUOTES.has(char)) {
    return { value, start: start + 1, end: start + 1 };
  }

  if (QUOTES.has(char) && after.charAt(0) === char) {
    return { value, start: start + 1, end: start + 1 };
  }

  if (char in PAIRS) {
    const nextChar = after.charAt(0);
    const prevChar = before.slice(-1);

    // Кавычку не закрываем внутри слова: там это апостроф, а не строка
    if (QUOTES.has(char) && /[\wа-яё]/i.test(prevChar)) return null;
    // И не закрываем, если справа уже идёт слово
    if (nextChar && !/[\s)\]},;.]/.test(nextChar)) return null;

    const inserted = char + PAIRS[char];
    return { value: before + inserted + after, start: start + 1, end: start + 1 };
  }

  return null;
}

/** Backspace между парными скобками удаляет обе. */
export function handleBackspace(value, start, end) {
  if (start !== end || start === 0) return null;
  const charBefore = value[start - 1];
  const charAfter = value[start];
  if (charBefore in PAIRS && PAIRS[charBefore] === charAfter) {
    return { value: value.slice(0, start - 1) + value.slice(start + 1), cursor: start - 1 };
  }
  return null;
}

/** Tab и Shift+Tab: отступ для выделенных строк или вставка пробелов. */
export function handleTab(value, start, end, shift = false) {
  const multiline = value.slice(start, end).includes('\n');

  if (!multiline && !shift) {
    const inserted = INDENT;
    return { value: value.slice(0, start) + inserted + value.slice(end), start: start + inserted.length, end: start + inserted.length };
  }

  const { from, to } = selectedLines(value, start, end);
  const block = value.slice(from, to);
  const lines = block.split('\n');

  let firstDelta = 0;
  let totalDelta = 0;

  const shifted = lines.map((line, index) => {
    if (shift) {
      const removed = line.startsWith(INDENT) ? INDENT.length : line.startsWith(' ') ? 1 : 0;
      if (index === 0) firstDelta = -removed;
      totalDelta -= removed;
      return line.slice(removed);
    }
    if (index === 0) firstDelta = INDENT.length;
    totalDelta += INDENT.length;
    return INDENT + line;
  });

  const nextValue = value.slice(0, from) + shifted.join('\n') + value.slice(to);
  return {
    value: nextValue,
    start: Math.max(from, start + firstDelta),
    end: Math.max(from, end + totalDelta),
  };
}

/** Ctrl + / — закомментировать или раскомментировать строки. */
export function toggleComment(value, start, end) {
  const { from, to } = selectedLines(value, start, end);
  const lines = value.slice(from, to).split('\n');
  const meaningful = lines.filter(line => line.trim() !== '');
  const allCommented = meaningful.length > 0 && meaningful.every(line => line.trimStart().startsWith('//'));

  let firstDelta = 0;
  let totalDelta = 0;

  const next = lines.map((line, index) => {
    if (line.trim() === '') return line;
    if (allCommented) {
      const indent = line.match(/^[ \t]*/)[0];
      const rest = line.slice(indent.length).replace(/^\/\/ ?/, '');
      const delta = rest.length - (line.length - indent.length);
      if (index === 0) firstDelta = delta;
      totalDelta += delta;
      return indent + rest;
    }
    const indent = line.match(/^[ \t]*/)[0];
    if (index === 0) firstDelta = 3;
    totalDelta += 3;
    return `${indent}// ${line.slice(indent.length)}`;
  });

  return {
    value: value.slice(0, from) + next.join('\n') + value.slice(to),
    start: Math.max(from, start + firstDelta),
    end: Math.max(from, end + totalDelta),
  };
}

/**
 * Закрывающая фигурная скобка в начале строки подтягивает строку
 * на уровень влево — как в привычных редакторах.
 */
export function dedentClosingBrace(value, start, char) {
  if (char !== '}') return null;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const linePrefix = value.slice(lineStart, start);
  if (linePrefix.trim() !== '' || linePrefix.length < INDENT.length) return null;

  const trimmed = linePrefix.slice(0, linePrefix.length - INDENT.length);
  const nextValue = value.slice(0, lineStart) + trimmed + '}' + value.slice(start);
  const cursor = lineStart + trimmed.length + 1;
  return { value: nextValue, start: cursor, end: cursor };
}
